import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  View } from
"react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Feather } from "@expo/vector-icons";
import { api } from "../../api";
import { Avatar, IconButton, VerificationBadge } from "../ui/ui";
import { errorMessage, formatRelativeTime, userName } from "../../lib/format";
import { useTheme } from "../../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STORY_DURATION = 60000;

function SafeStoryVideoView({ url, paused, style }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = false;
    if (!paused) {
      p.play();
    }
  });

  useEffect(() => {
    if (!player) return;
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused, player]);

  if (!url) return null;

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="contain"
      nativeControls={false} />);


}

export function StoryViewerModal({
  visible,
  initialUserGroup,
  userGroups = [],
  currentUser,
  onClose,
  onStoryDeleted
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const [sendingReply, setSendingReply] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionValue, setCaptionValue] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [myGroups, setMyGroups] = useState([]);
  const [shareTab, setShareTab] = useState("followers");
  const [localLikes, setLocalLikes] = useState({});

  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);


  const activeGroup = userGroups[currentUserIndex] || initialUserGroup;
  const stories = activeGroup?.stories || [];
  const currentStory = stories[currentStoryIndex];

  const author = activeGroup?.user || currentStory?.user || currentStory?.author || {};
  const currentStoryUserId = String(
    currentStory?.userId ||
    currentStory?.user_id ||
    currentStory?.authorId ||
    currentStory?.author_id ||
    author?.id ||
    activeGroup?.userId ||
    ""
  );


  const mediaUri =
  currentStory?.mediaUrl ||
  currentStory?.media_url ||
  currentStory?.imageUrl ||
  currentStory?.image_url ||
  currentStory?.url || "";

  const isVideo = mediaUri.toLowerCase().match(/\.(mp4|mov|mkv|webm)$/i);

  const currentUid = String(currentUser?.id || "");
  const isOwner = Boolean(currentUid && currentStoryUserId && currentUid === currentStoryUserId);


  useEffect(() => {
    if (visible && initialUserGroup) {
      const idx = userGroups.findIndex(
        (g) => String(g.user?.id || g.userId) === String(initialUserGroup.user?.id || initialUserGroup.userId)
      );
      setCurrentUserIndex(idx >= 0 ? idx : 0);
      setCurrentStoryIndex(0);
      setReplyText("");
      setMenuVisible(false);
      setEditingCaption(false);
    }
  }, [visible, initialUserGroup, userGroups]);

  const handleNext = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
    } else if (currentUserIndex < userGroups.length - 1) {
      setCurrentUserIndex((prev) => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      onClose();
    }
  }, [currentStoryIndex, stories.length, currentUserIndex, userGroups.length, onClose]);

  const handlePrevious = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex((prev) => prev - 1);
    } else if (currentUserIndex > 0) {
      const prevUserIdx = currentUserIndex - 1;
      const prevGroupStories = userGroups[prevUserIdx]?.stories || [];
      setCurrentUserIndex(prevUserIdx);
      setCurrentStoryIndex(Math.max(0, prevGroupStories.length - 1));
    }
  }, [currentStoryIndex, currentUserIndex, userGroups]);


  useEffect(() => {
    if (!visible || !currentStory || paused || menuVisible || editingCaption || shareModalVisible) {
      progressAnim.stopAnimation();
      return;
    }

    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false
    });

    anim.start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    return () => {
      progressAnim.stopAnimation();
    };
  }, [visible, currentStory, currentStoryIndex, currentUserIndex, paused, menuVisible, editingCaption, shareModalVisible, handleNext, progressAnim]);


  const handleDeleteStory = () => {
    if (!currentStory?.id) return;
    setMenuVisible(false);
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteStory = async () => {
    setDeleteConfirmVisible(false);
    try {
      await api.stories.delete(currentStory.id);
      setMenuVisible(false);
      onStoryDeleted?.(currentStory.id);
      onClose();
    } catch (err) {
      Alert.alert("Erro ao excluir", errorMessage(err));
    }
  };


  const handleSaveCaption = async () => {
    if (!currentStory?.id) return;
    try {
      setSavingCaption(true);
      await api.stories.updateCaption(currentStory.id, captionValue.trim());
      currentStory.caption = captionValue.trim();
      setEditingCaption(false);
    } catch (err) {
      Alert.alert("Erro ao editar legenda", errorMessage(err));
    } finally {
      setSavingCaption(false);
    }
  };


  const handleSendReply = async () => {
    if (!replyText.trim() || sendingReply || !currentStory) return;
    try {
      setSendingReply(true);
      const receiverId = author?.id || currentStory?.userId;
      await api.messages.send({
        receiver_id: receiverId,
        content: replyText.trim(),
        story_id: currentStory.id
      });
      setReplyText("");
      Alert.alert("Mensagem enviada", "Sua resposta foi enviada no bate-papo.");
    } catch (err) {
      Alert.alert("Não foi possível enviar resposta", errorMessage(err));
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentStory?.id) return;
    const storyId = currentStory.id;
    const currentLikeState = localLikes[storyId] || {
      isLiked: Boolean(currentStory.is_liked || currentStory.isLiked),
      likesCount: Number(currentStory.likes_count || currentStory.likesCount || 0)
    };

    const newIsLiked = !currentLikeState.isLiked;
    const newLikesCount = newIsLiked ? currentLikeState.likesCount + 1 : Math.max(0, currentLikeState.likesCount - 1);

    setLocalLikes((prev) => ({
      ...prev,
      [storyId]: { isLiked: newIsLiked, likesCount: newLikesCount }
    }));

    try {
      if (newIsLiked) {
        await api.stories.like(storyId);
      } else {
        await api.stories.unlike(storyId);
      }
    } catch (err) {

      setLocalLikes((prev) => ({
        ...prev,
        [storyId]: currentLikeState
      }));
      Alert.alert("Erro", "Não foi possível curtir o story.");
    }
  };


  const handleOpenShare = async () => {
    setShareModalVisible(true);
    try {
      setLoadingFollowers(true);
      const [followersRes, groupsRes] = await Promise.all([
      api.users.following(currentUser?.id).catch(() => []),
      api.groups.list().catch(() => [])]
      );
      const list = Array.isArray(followersRes) ? followersRes : followersRes?.following || followersRes?.users || [];
      setFollowers(list);
      setMyGroups(Array.isArray(groupsRes) ? groupsRes : groupsRes?.groups || []);
    } catch {

    } finally {
      setLoadingFollowers(false);
    }
  };

  const handleSendToUser = async (targetUser) => {
    if (!currentStory?.id || !targetUser?.id) return;
    try {
      await api.stories.send(currentStory.id, targetUser.id);
      Alert.alert("Enviado!", `Story enviado para @${targetUser.username || userName(targetUser)}.`);
      setShareModalVisible(false);
    } catch (err) {
      Alert.alert("Erro ao enviar story", errorMessage(err));
    }
  };

  const handleSendToGroup = async (targetGroup) => {
    if (!currentStory?.id || !targetGroup?.id) return;
    try {
      const mediaUrl = currentStory.mediaUrl || currentStory.media_url || currentStory.url;
      await api.groups.sendChatMessage(targetGroup.id, "Compartilhou um story", mediaUrl, null, currentStory.id);
      Alert.alert("Enviado!", `Story compartilhado no grupo ${targetGroup.name}.`);
      setShareModalVisible(false);
    } catch (err) {
      Alert.alert("Erro ao enviar story", errorMessage(err));
    }
  };

  if (!visible || !currentStory) return null;

  return (
    <Modal visible={visible} statusBarTranslucent animationType="fade" transparent onRequestClose={onClose}>
      <StatusBar hidden={visible} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.container, { backgroundColor: "#000000", paddingTop: insets.top }]}>
        
        {}
        {isVideo && visible && !!mediaUri ?
        <SafeStoryVideoView
          url={mediaUri}
          paused={paused}
          style={styles.storyMedia} /> :


        <Image
          source={{ uri: mediaUri }}
          style={styles.storyMedia}
          resizeMode="contain" />

        }

        {}
        <View style={[styles.overlay, { paddingTop: insets.top > 0 ? insets.top + 10 : 40 }]}>
          <View style={styles.topContainer}>
            {}
            <View style={styles.progressContainer}>
            {stories.map((s, idx) => {
                const isPast = idx < currentStoryIndex;
                const isCurrent = idx === currentStoryIndex;
                return (
                  <View key={s.id || idx} style={styles.progressBarBackground}>
                  {isPast && <View style={[styles.progressBarFill, { width: "100%" }]} />}
                  {isCurrent &&
                    <Animated.View
                      style={[
                      styles.progressBarFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"]
                        })
                      }]
                      } />

                    }
                </View>);

              })}
          </View>

          {}
          <View style={styles.header}>
            <View style={styles.headerAuthor}>
              <Avatar user={author} size={38} />
              <View style={styles.headerAuthorDetails}>
                <View style={styles.nameRow}>
                  <Text style={[styles.authorName, { color: "#ffffff", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }]}>{userName(author)}</Text>
                  <VerificationBadge user={author} size={14} />
                </View>
                <Text style={[styles.timeAgo, { color: "rgba(255,255,255,0.8)", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }]}>
                  {formatRelativeTime(currentStory.createdAt || currentStory.created_at)}
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              {isOwner &&
                <IconButton
                  name="more-horizontal"
                  color="#ffffff"
                  style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                  onPress={() => {
                    setCaptionValue(currentStory.caption || "");
                    setMenuVisible(true);
                  }}
                  label="Opções do story" />

                }
              <IconButton name="x" color="#ffffff" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onPress={onClose} label="Fechar story" />
            </View>
          </View>
          </View>

          {}
          <View style={styles.touchZones}>
            <Pressable
              style={styles.touchLeft}
              onPress={handlePrevious}
              onLongPress={() => setPaused(true)}
              onPressOut={() => setPaused(false)} />
            
            <Pressable
              style={styles.touchCenter}
              onLongPress={() => setPaused(true)}
              onPressOut={() => setPaused(false)} />
            
            <Pressable
              style={styles.touchRight}
              onPress={handleNext}
              onLongPress={() => setPaused(true)}
              onPressOut={() => setPaused(false)} />
            
          </View>

          <View style={styles.bottomContainer}>
            {}
            {!!currentStory.caption && !editingCaption &&
            <View
              style={[
              styles.captionContainer,
              {
                backgroundColor: "rgba(0,0,0,0.6)"
              }]
              }>
              
                <Text style={[styles.captionText, { color: "#ffffff", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }]}>{currentStory.caption}</Text>
              </View>
            }

          {}
          {editingCaption &&
            <View
              style={[
              styles.editCaptionBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1
              }]
              }>
              
              <TextInput
                value={captionValue}
                onChangeText={setCaptionValue}
                placeholder="Editar legenda..."
                placeholderTextColor={colors.muted}
                style={[styles.editCaptionInput, { color: colors.text }]}
                autoFocus />
              
              <View style={styles.editCaptionButtons}>
                <Pressable
                  style={styles.editCancelBtn}
                  onPress={() => setEditingCaption(false)}>
                  
                  <Text style={[styles.editCancelText, { color: colors.subtext }]}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[styles.editSaveBtn, { backgroundColor: colors.primary || colors.accent }]}
                  onPress={handleSaveCaption}
                  disabled={savingCaption}>
                  
                  {savingCaption ?
                  <ActivityIndicator size="small" color="#fff" /> :

                  <Text style={styles.editSaveText}>Salvar</Text>
                  }
                </Pressable>
              </View>
            </View>
            }

          {}
          {!isOwner &&
            <View style={styles.footer}>
              <View
                style={[
                styles.replyInputContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border
                }]
                }>
                
                <TextInput
                  placeholder="Enviar mensagem..."
                  placeholderTextColor={colors.muted}
                  value={replyText}
                  onChangeText={setReplyText}
                  style={[styles.replyInput, { color: colors.text }]}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)} />
                
                {!!replyText.trim() &&
                <Pressable
                  style={styles.sendReplyBtn}
                  onPress={handleSendReply}
                  disabled={sendingReply}>
                  
                    {sendingReply ?
                  <ActivityIndicator size="small" color={colors.primary} /> :

                  <Feather name="send" size={18} color={colors.primary || colors.accent} />
                  }
                  </Pressable>
                }
              </View>

              {(() => {
                const storyId = currentStory.id;
                const likeState = localLikes[storyId] || {
                  isLiked: Boolean(currentStory.is_liked || currentStory.isLiked),
                  likesCount: Number(currentStory.likes_count || currentStory.likesCount || 0)
                };
                return (
                  <Pressable
                    style={[
                    styles.shareIconBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      marginRight: 8
                    }]
                    }
                    onPress={handleToggleLike}
                    accessibilityLabel="Curtir story">
                    
                    <Feather
                      name="heart"
                      size={20}
                      color={likeState.isLiked ? "#ef4444" : colors.text} />
                    
                  </Pressable>);

              })()}

              <Pressable
                style={[
                styles.shareIconBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border
                }]
                }
                onPress={handleOpenShare}
                accessibilityLabel="Compartilhar story">
                
                <Feather name="send" size={20} color={colors.text} />
              </Pressable>
            </View>
            }
          </View>
        </View>

        
          {}
          {menuVisible &&
        <View style={[StyleSheet.absoluteFill, { zIndex: 9998 }]}>
              <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
              <View style={[styles.menuSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setEditingCaption(true);
                }}>
                
                  <Feather name="edit-3" size={20} color={colors.text} />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>Editar Legenda</Text>
                </Pressable>

                <Pressable
                style={[styles.menuItem, { borderTopWidth: 1, borderColor: colors.line }]}
                onPress={handleDeleteStory}>
                
                  <Feather name="trash-2" size={20} color={colors.danger || "#ef4444"} />
                  <Text style={[styles.menuItemText, { color: colors.danger || "#ef4444" }]}>Excluir Story</Text>
                </Pressable>
              </View>
            </Pressable>
          
            </View>
        }
  

        
        {}
        {shareModalVisible &&
        <View style={[StyleSheet.absoluteFill, { zIndex: 9997 }]}>
            <View style={styles.modalOverlay}>
              <View style={[styles.shareSheet, { backgroundColor: colors.card, borderColor: colors.border, borderTopWidth: 1 }]}>
                <View style={styles.shareSheetHeader}>
                  <Text style={[styles.shareSheetTitle, { color: colors.text }]}>Enviar para...</Text>
                  <IconButton name="x" color={colors.text} onPress={() => setShareModalVisible(false)} />
                </View>

                {}
                <View style={styles.shareTabsContainer}>
                  <Pressable
                  style={[styles.shareTab, shareTab === "followers" && styles.shareTabActive, shareTab === "followers" && { borderBottomColor: colors.primary || colors.accent }]}
                  onPress={() => setShareTab("followers")}>
                  
                    <Text style={[styles.shareTabText, shareTab === "followers" && { color: colors.primary || colors.accent }]}>Seguidores</Text>
                  </Pressable>
                  <Pressable
                  style={[styles.shareTab, shareTab === "groups" && styles.shareTabActive, shareTab === "groups" && { borderBottomColor: colors.primary || colors.accent }]}
                  onPress={() => setShareTab("groups")}>
                  
                    <Text style={[styles.shareTabText, shareTab === "groups" && { color: colors.primary || colors.accent }]}>Meus Grupos</Text>
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}>
                  {shareTab === "followers" ?
                loadingFollowers ?
                <ActivityIndicator size="small" color={colors.primary || colors.accent} style={{ marginVertical: 20 }} /> :
                followers.length === 0 ?
                <Text style={[styles.noFollowersText, { color: colors.muted }]}>Nenhum seguidor encontrado.</Text> :

                followers.map((item) => {
                  const u = item.following || item.user || item;
                  return (
                    <Pressable
                      key={u.id}
                      style={styles.followerRow}
                      onPress={() => handleSendToUser(u)}>
                      
                            <Avatar user={u} size={40} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={[styles.followerName, { color: colors.text }]}>{userName(u)}</Text>
                              <Text style={[styles.followerHandle, { color: colors.subtext }]}>@{u.username || "usuario"}</Text>
                            </View>
                            <Feather name="send" size={18} color={colors.primary || colors.accent} />
                          </Pressable>);

                }) :


                loadingFollowers ?
                <ActivityIndicator size="small" color={colors.primary || colors.accent} style={{ marginVertical: 20 }} /> :
                myGroups.length === 0 ?
                <Text style={[styles.noFollowersText, { color: colors.muted }]}>Você não está em nenhum grupo.</Text> :

                myGroups.map((group) =>
                <Pressable
                  key={group.id}
                  style={styles.followerRow}
                  onPress={() => handleSendToGroup(group)}>
                  
                          <Image source={{ uri: group.avatar_url || group.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border }} />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.followerName, { color: colors.text }]}>{group.name}</Text>
                          </View>
                          <Feather name="send" size={18} color={colors.primary || colors.accent} />
                        </Pressable>
                )

                }
                </ScrollView>

              </View>
            </View>
          </View>
        }
  
      
        {}
        {deleteConfirmVisible &&
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
            <Pressable style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)' }]} onPress={() => setDeleteConfirmVisible(false)}>
              <Pressable style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, width: '85%', padding: 24 }]} onPress={(e) => e.stopPropagation()}>
                <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18, marginBottom: 8, textAlign: 'center' }]}>
                  Excluir Story
                </Text>
                <Text style={{ color: colors.muted, fontSize: 14, fontFamily: "Poppins_400Regular", textAlign: 'center', marginBottom: 24 }}>
                  Tem certeza que deseja excluir esta publicação temporária?
                </Text>
                
                <View style={{ gap: 12 }}>
                  <Pressable
                  style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: "#EF4444", alignItems: 'center' }}
                  onPress={confirmDeleteStory}>
                  
                    <Text style={{ color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 15 }}>Excluir</Text>
                  </Pressable>

                  <Pressable
                  style={{ paddingVertical: 14, borderRadius: 12, backgroundColor: colors.surfaceAlt, alignItems: 'center' }}
                  onPress={() => setDeleteConfirmVisible(false)}>
                  
                    <Text style={{ color: colors.text, fontFamily: "Poppins_600SemiBold", fontSize: 15 }}>Cancelar</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </View>
        }

      </KeyboardAvoidingView>
    </Modal>);

}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  storyMedia: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 48 : 20,
    paddingBottom: 20
  },
  progressContainer: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 8
  },
  progressBarBackground: {
    flex: 1,
    height: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    borderRadius: 4,
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#ffffff"
  },
  topContainer: {
    paddingTop: 8
  },
  bottomContainer: {
    paddingBottom: 8,
    width: "100%",
    alignItems: "center"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
    zIndex: 10
  },
  headerAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  headerAuthorDetails: {
    justifyContent: "center"
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  authorName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14
  },
  timeAgo: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  touchZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 5
  },
  touchLeft: {
    width: "30%",
    height: "80%",
    marginTop: 70
  },
  touchCenter: {
    width: "40%",
    height: "80%",
    marginTop: 70
  },
  touchRight: {
    width: "30%",
    height: "80%",
    marginTop: 70
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 12,
    alignSelf: "center"
  },
  captionText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    textAlign: "center"
  },
  editCaptionBox: {
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    zIndex: 20
  },
  editCaptionInput: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    minHeight: 40
  },
  editCaptionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 10
  },
  editCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14
  },
  editCancelText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13
  },
  editSaveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14
  },
  editSaveText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#fff"
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
    gap: 12,
    zIndex: 10
  },
  replyInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    height: 50
  },
  replyInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5
  },
  sendReplyBtn: {
    padding: 4
  },
  shareIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end"
  },
  menuSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    paddingBottom: 36
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 14
  },
  menuItemText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15
  },
  shareSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "70%"
  },
  shareSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16
  },
  shareSheetTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16
  },
  noFollowersText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginVertical: 20
  },
  followerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10
  },
  followerName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14
  },
  followerHandle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12
  },
  shareTabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(150, 150, 150, 0.2)",
    marginBottom: 10
  },
  shareTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  shareTabActive: {},
  shareTabText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#6b7280"
  }
});