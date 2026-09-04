import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  UIManager,
  View
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useVideoPlayer, VideoView } from "expo-video";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../../api";
import { Avatar, IconButton, VerificationBadge } from "../ui/ui";
import { errorMessage, formatRelativeTime, userName } from "../../lib/format";
import { useTheme } from "../../theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeOptimization } from "../../services/nativeOptimization";
import { TriboAlertModal } from "./tribo-alert-modal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STORY_PHOTO_DURATION = 6000;

function SafeStoryVideoView({ url, paused, style, onVideoEnd }) {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.muted = false;
    if (!paused) {
      try {
        p.play();
      } catch (_) {}
    }
  });

  useEffect(() => {
    if (!player || !isMountedRef.current) return;
    try {
      if (paused) {
        player.pause();
      } else {
        player.play();
      }
    } catch (_) {}
  }, [paused, player]);

  useEffect(() => {
    if (!player || !isMountedRef.current) return;
    let sub = null;
    try {
      sub = player.addListener("playToEnd", () => {
        if (isMountedRef.current) {
          onVideoEnd?.();
        }
      });
    } catch (_) {}

    return () => {
      try {
        sub?.remove?.();
      } catch (_) {}
    };
  }, [player, onVideoEnd]);

  if (!url || !player) {
    return <View style={[style, { backgroundColor: "#000000" }]} />;
  }

  return (
    <VideoView
      key={url}
      player={player}
      style={style}
      contentFit="contain"
      nativeControls={false}
    />
  );
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    type: "success",
    title: "",
    message: "",
    buttonText: "OK"
  });

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        try {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        } catch (_) {}
        const h = e.endCoordinates?.height || 0;
        if (h > 50) {
          setKeyboardHeight(h);
        }
        setIsInputFocused(true);
        setPaused(true);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        try {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        } catch (_) {}
        setKeyboardHeight(0);
        setIsInputFocused(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const effectiveKeyboardOffset =
    keyboardHeight > 50
      ? keyboardHeight
      : isInputFocused
      ? Math.min(Math.max(SCREEN_HEIGHT * 0.36, 290), 360)
      : 0;

  const progressAnim = useRef(new Animated.Value(0)).current;

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

  const isVideo = Boolean(mediaUri.toLowerCase().match(/\.(mp4|mov|mkv|webm)$/i));

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

  const handleCloseViewer = useCallback(() => {
    Keyboard.dismiss();
    setIsInputFocused(false);
    setKeyboardHeight(0);
    NativeOptimization.disableScreenSecurity();
    onClose?.();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex((prev) => prev + 1);
    } else if (currentUserIndex < userGroups.length - 1) {
      setCurrentUserIndex((prev) => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      handleCloseViewer();
    }
  }, [currentStoryIndex, stories.length, currentUserIndex, userGroups.length, handleCloseViewer]);

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
    if (!visible || !currentStory) {
      NativeOptimization.disableScreenSecurity();
      return;
    }

    if (currentStory.is_single_view) {
      NativeOptimization.enableScreenSecurity();
    } else {
      NativeOptimization.disableScreenSecurity();
    }

    if (currentStory.id) {
      api.stories.view(currentStory.id).catch(() => {});
    }

    return () => {
      NativeOptimization.disableScreenSecurity();
    };
  }, [visible, currentStory?.id, currentStory?.is_single_view]);

  useEffect(() => {
    if (!visible || !currentStory || isVideo || paused || menuVisible || editingCaption || shareModalVisible) {
      progressAnim.stopAnimation();
      return;
    }

    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_PHOTO_DURATION,
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
  }, [visible, currentStory, currentStoryIndex, currentUserIndex, isVideo, paused, menuVisible, editingCaption, shareModalVisible, handleNext, progressAnim]);

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
      handleCloseViewer();
    } catch (err) {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Erro ao excluir",
        message: errorMessage(err) || "Não foi possível excluir o story.",
        buttonText: "Entendido"
      });
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
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Erro ao editar",
        message: errorMessage(err) || "Não foi possível editar a legenda.",
        buttonText: "Entendido"
      });
    } finally {
      setSavingCaption(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || sendingReply || !currentStory) return;
    try {
      setSendingReply(true);
      const receiverId = author?.id || currentStory?.userId;
      if (!receiverId) throw new Error("Usuário destinatário não identificado");

      await api.messages.send({
        receiver_id: receiverId,
        content: replyText.trim(),
        story_id: currentStory.id
      });

      setReplyText("");
      Keyboard.dismiss();
      setIsInputFocused(false);
      setKeyboardHeight(0);
      setAlertConfig({
        visible: true,
        type: "success",
        title: "Sucesso",
        message: "Resposta enviada com sucesso!",
        buttonText: "OK"
      });
    } catch (err) {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Erro ao enviar",
        message: errorMessage(err) || "Não foi possível enviar a resposta.",
        buttonText: "Entendido"
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleLike = async () => {
    if (!currentStory) return;
    const storyId = currentStory.id;
    const isCurrentlyLiked = localLikes[storyId]?.isLiked ?? Boolean(currentStory.is_liked || currentStory.isLiked);
    const currentCount = localLikes[storyId]?.likesCount ?? Number(currentStory.likes_count || currentStory.likesCount || 0);

    const nextLiked = !isCurrentlyLiked;
    const nextCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    setLocalLikes((prev) => ({
      ...prev,
      [storyId]: { isLiked: nextLiked, likesCount: nextCount }
    }));

    try {
      if (nextLiked) {
        await api.stories.like(storyId);
      } else {
        await api.stories.unlike(storyId);
      }
    } catch (e) {
      setLocalLikes((prev) => ({
        ...prev,
        [storyId]: { isLiked: isCurrentlyLiked, likesCount: currentCount }
      }));
    }
  };

  const handleOpenShare = async () => {
    setPaused(true);
    setShareModalVisible(true);
    try {
      setLoadingFollowers(true);
      const [fRes, gRes] = await Promise.all([
        api.follows.getFollowers(currentUser?.id || "").catch(() => ({ followers: [] })),
        api.groups.list().catch(() => ({ groups: [] }))
      ]);
      setFollowers(fRes.followers || fRes.data || []);
      setMyGroups(gRes.groups || gRes.data || []);
    } catch (e) {
      console.warn("Erro ao carregar dados de compartilhamento:", e);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const handleSendToUser = async (targetUser) => {
    if (!currentStory || !targetUser?.id) return;
    try {
      await api.messages.send({
        receiver_id: targetUser.id,
        content: "Compartilhou um story",
        story_id: currentStory.id
      });
      setShareModalVisible(false);
      setPaused(false);
      setAlertConfig({
        visible: true,
        type: "success",
        title: "Enviado",
        message: `Story enviado para @${targetUser.username || targetUser.name}`,
        buttonText: "OK"
      });
    } catch (e) {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Erro ao compartilhar",
        message: "Não foi possível compartilhar este story.",
        buttonText: "Entendido"
      });
    }
  };

  const handleSendToGroup = async (group) => {
    if (!currentStory || !group?.id) return;
    try {
      await api.groups.sendMessage(group.id, {
        content: "Compartilhou um story",
        media_url: mediaUri,
        media_type: "STORY_SHARE",
        story_id: currentStory.id
      });
      setShareModalVisible(false);
      setPaused(false);
      setAlertConfig({
        visible: true,
        type: "success",
        title: "Enviado",
        message: `Story compartilhado no grupo ${group.name}`,
        buttonText: "OK"
      });
    } catch (e) {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Erro ao compartilhar",
        message: "Não foi possível compartilhar no grupo.",
        buttonText: "Entendido"
      });
    }
  };

  if (!visible || !currentStory) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={handleCloseViewer}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}>
        <View style={styles.content}>
          <View style={styles.mediaWrapper}>
            {isVideo ? (
              <SafeStoryVideoView
                key={mediaUri}
                url={mediaUri}
                paused={paused || menuVisible || editingCaption || shareModalVisible}
                style={styles.fullscreenMedia}
                onVideoEnd={handleNext}
              />
            ) : (
              <Image
                source={{ uri: mediaUri }}
                style={styles.fullscreenMedia}
                resizeMode="contain"
              />
            )}
          </View>

          <View style={[styles.topControls, { paddingTop: Math.max(insets.top, 16) + 4 }]}>
            <View style={styles.progressBars}>
              {stories.map((s, index) => {
                const isPassed = index < currentStoryIndex;
                const isCurrent = index === currentStoryIndex;
                return (
                  <View
                    key={s.id || index}
                    style={[styles.progressBarBg, { backgroundColor: "rgba(255,255,255,0.3)" }]}>
                    {isPassed && (
                      <View style={[styles.progressBarFill, { width: "100%", backgroundColor: "#ffffff" }]} />
                    )}
                    {isCurrent && (
                      <Animated.View
                        style={[
                          styles.progressBarFill,
                          {
                            backgroundColor: "#ffffff",
                            width: progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0%", "100%"]
                            })
                          }
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.header}>
              <View style={styles.headerAuthor}>
                <Avatar user={author} size={38} />
                <View style={styles.headerAuthorDetails}>
                  <View style={styles.nameRow}>
                    <Text style={styles.authorName}>{userName(author)}</Text>
                    <VerificationBadge user={author} size={14} />
                    {currentStory.is_single_view && (
                      <View style={styles.singleViewBadge}>
                        <MaterialCommunityIcons name="numeric-1-circle" size={13} color="#38bdf8" />
                        <Text style={styles.singleViewBadgeText}>1x</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.timeAgo}>
                    {formatRelativeTime(currentStory.createdAt || currentStory.created_at)}
                  </Text>
                </View>
              </View>

              <View style={styles.headerRight}>
                {isOwner && (
                  <IconButton
                    name="more-horizontal"
                    color="#ffffff"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                    onPress={() => {
                      setCaptionValue(currentStory.caption || "");
                      setMenuVisible(true);
                    }}
                    label="Opções do story"
                  />
                )}
                <IconButton
                  name="x"
                  color="#ffffff"
                  style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                  onPress={handleCloseViewer}
                  label="Fechar story"
                />
              </View>
            </View>
          </View>

          <View style={styles.touchZones}>
            <Pressable
              style={styles.touchLeft}
              onPress={() => {
                if (isInputFocused) {
                  Keyboard.dismiss();
                  setIsInputFocused(false);
                  return;
                }
                handlePrevious();
              }}
              onLongPress={() => setPaused(true)}
              onPressOut={() => {
                if (!isInputFocused) setPaused(false);
              }}
            />
            <Pressable
              style={styles.touchCenter}
              onPress={() => {
                if (isInputFocused) {
                  Keyboard.dismiss();
                  setIsInputFocused(false);
                }
              }}
              onLongPress={() => setPaused(true)}
              onPressOut={() => {
                if (!isInputFocused) setPaused(false);
              }}
            />
            <Pressable
              style={styles.touchRight}
              onPress={() => {
                if (isInputFocused) {
                  Keyboard.dismiss();
                  setIsInputFocused(false);
                  return;
                }
                handleNext();
              }}
              onLongPress={() => setPaused(true)}
              onPressOut={() => {
                if (!isInputFocused) setPaused(false);
              }}
            />
          </View>

          <View
            style={[
              styles.bottomContainer,
              {
                bottom:
                  effectiveKeyboardOffset > 0
                    ? effectiveKeyboardOffset + (Platform.OS === "android" ? 10 : 8)
                    : 0,
                paddingBottom:
                  effectiveKeyboardOffset > 0
                    ? 8
                    : Math.max(insets.bottom, 16) + 6
              }
            ]}>
            {!!currentStory.caption && !editingCaption && (
              <View style={styles.captionContainer}>
                <Text style={styles.captionText}>{currentStory.caption}</Text>
              </View>
            )}

            {editingCaption && (
              <View
                style={[
                  styles.editCaptionBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1
                  }
                ]}>
                <TextInput
                  value={captionValue}
                  onChangeText={setCaptionValue}
                  placeholder="Editar legenda..."
                  placeholderTextColor={colors.muted}
                  style={[styles.editCaptionInput, { color: colors.text }]}
                  autoFocus
                  underlineColorAndroid="transparent"
                  onFocus={() => {
                    try {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    } catch (_) {}
                    setIsInputFocused(true);
                    setPaused(true);
                  }}
                  onBlur={() => {
                    try {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    } catch (_) {}
                    setIsInputFocused(false);
                  }}
                />
                <View style={styles.editCaptionActions}>
                  <Pressable
                    style={[styles.editBtn, { backgroundColor: colors.surfaceAlt }]}
                    onPress={() => setEditingCaption(false)}>
                    <Text style={[styles.editBtnText, { color: colors.text }]}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.editBtn, { backgroundColor: colors.primary }]}
                    onPress={handleSaveCaption}
                    disabled={savingCaption}>
                    {savingCaption ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={[styles.editBtnText, { color: "#ffffff" }]}>Salvar</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {!isOwner && !editingCaption && (
              <View style={styles.replyBar}>
                <View
                  style={[
                    styles.replyInputContainer,
                    {
                      backgroundColor: "rgba(0,0,0,0.6)",
                      borderColor: "rgba(255,255,255,0.2)"
                    }
                  ]}>
                  <TextInput
                    placeholder="Enviar mensagem..."
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={replyText}
                    onChangeText={setReplyText}
                    style={styles.replyInput}
                    editable={!sendingReply}
                    returnKeyType="send"
                    onSubmitEditing={handleSendReply}
                    underlineColorAndroid="transparent"
                    onFocus={() => {
                      try {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      } catch (_) {}
                      setIsInputFocused(true);
                      setPaused(true);
                    }}
                    onBlur={() => {
                      try {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      } catch (_) {}
                      setIsInputFocused(false);
                      if (!replyText.trim()) setPaused(false);
                    }}
                  />
                  {!!replyText.trim() && (
                    <Pressable
                      onPress={handleSendReply}
                      disabled={sendingReply}
                      style={styles.sendReplyBtn}>
                      {sendingReply ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Feather name="send" size={18} color="#ffffff" />
                      )}
                    </Pressable>
                  )}
                </View>

                {(() => {
                  const storyId = currentStory.id;
                  const likeState = localLikes[storyId] || {
                    isLiked: Boolean(currentStory.is_liked || currentStory.isLiked),
                    likesCount: Number(currentStory.likes_count || currentStory.likesCount || 0)
                  };
                  return (
                    <Pressable
                      style={styles.iconCircleBtn}
                      onPress={handleToggleLike}
                      accessibilityLabel="Curtir story">
                      <Feather
                        name="heart"
                        size={20}
                        color={likeState.isLiked ? "#ef4444" : "#ffffff"}
                      />
                    </Pressable>
                  );
                })()}

                <Pressable
                  style={styles.iconCircleBtn}
                  onPress={handleOpenShare}
                  accessibilityLabel="Compartilhar story">
                  <Feather name="send" size={20} color="#ffffff" />
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {menuVisible && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 9998 }]}>
            <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
              <View
                style={[
                  styles.menuSheet,
                  {
                    backgroundColor: colors.card || "#18181b",
                    borderColor: colors.border || "rgba(255,255,255,0.1)",
                    paddingBottom: Math.max(insets.bottom + 12, 34)
                  }
                ]}>
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
                  <Feather name="trash-2" size={20} color="#ef4444" />
                  <Text style={[styles.menuItemText, { color: "#ef4444" }]}>Excluir Story</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        )}

        {shareModalVisible && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 9997 }]}>
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.shareSheet,
                  {
                    backgroundColor: colors.card || "#18181b",
                    borderColor: colors.border || "rgba(255,255,255,0.1)",
                    borderTopWidth: 1,
                    paddingBottom: Math.max(insets.bottom + 12, 34)
                  }
                ]}>
                <View style={styles.shareSheetHeader}>
                  <Text style={[styles.shareSheetTitle, { color: colors.text }]}>Enviar para...</Text>
                  <IconButton name="x" color={colors.text} onPress={() => setShareModalVisible(false)} />
                </View>

                <View style={styles.shareTabsContainer}>
                  <Pressable
                    style={[
                      styles.shareTab,
                      shareTab === "followers" && styles.shareTabActive,
                      shareTab === "followers" && { borderBottomColor: colors.primary || "#0095f6" }
                    ]}
                    onPress={() => setShareTab("followers")}>
                    <Text style={[styles.shareTabText, shareTab === "followers" && { color: colors.primary || "#0095f6" }]}>
                      Seguidores
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.shareTab,
                      shareTab === "groups" && styles.shareTabActive,
                      shareTab === "groups" && { borderBottomColor: colors.primary || "#0095f6" }
                    ]}
                    onPress={() => setShareTab("groups")}>
                    <Text style={[styles.shareTabText, shareTab === "groups" && { color: colors.primary || "#0095f6" }]}>
                      Meus Grupos
                    </Text>
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}>
                  {shareTab === "followers" ? (
                    loadingFollowers ? (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
                    ) : followers.length === 0 ? (
                      <Text style={[styles.noFollowersText, { color: colors.muted }]}>Nenhum seguidor encontrado.</Text>
                    ) : (
                      followers.map((item) => {
                        const u = item.following || item.user || item;
                        return (
                          <Pressable key={u.id} style={styles.followerRow} onPress={() => handleSendToUser(u)}>
                            <Avatar user={u} size={40} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={[styles.followerName, { color: colors.text }]}>{userName(u)}</Text>
                              <Text style={[styles.followerHandle, { color: colors.subtext }]}>@{u.username || "usuario"}</Text>
                            </View>
                            <Feather name="send" size={18} color={colors.primary || "#0095f6"} />
                          </Pressable>
                        );
                      })
                    )
                  ) : loadingFollowers ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
                  ) : myGroups.length === 0 ? (
                    <Text style={[styles.noFollowersText, { color: colors.muted }]}>Você não está em nenhum grupo.</Text>
                  ) : (
                    myGroups.map((group) => (
                      <Pressable key={group.id} style={styles.followerRow} onPress={() => handleSendToGroup(group)}>
                        <Image source={{ uri: group.avatar_url || group.avatarUrl }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.border }} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={[styles.followerName, { color: colors.text }]}>{group.name}</Text>
                        </View>
                        <Feather name="send" size={18} color={colors.primary || "#0095f6"} />
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>
          </View>
        )}

        {deleteConfirmVisible && (
          <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
            <Pressable
              style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)' }]}
              onPress={() => setDeleteConfirmVisible(false)}>
              <Pressable
                style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 20, width: '85%', padding: 24 }]}
                onPress={(e) => e.stopPropagation()}>
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
        )}

        <TriboAlertModal
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttonText={alertConfig.buttonText}
          onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  content: {
    flex: 1,
    position: "relative",
    backgroundColor: "#000000"
  },
  mediaWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000"
  },
  fullscreenMedia: {
    width: "100%",
    height: "100%"
  },
  topControls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 12
  },
  progressBars: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 10
  },
  progressBarBg: {
    flex: 1,
    height: 2.5,
    borderRadius: 1.5,
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 1.5
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
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
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  singleViewBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    borderColor: "#38bdf8",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    gap: 2
  },
  singleViewBadgeText: {
    color: "#38bdf8",
    fontSize: 10.5,
    fontFamily: "Poppins_700Bold"
  },
  timeAgo: {
    fontSize: 11.5,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255,255,255,0.8)",
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  touchZones: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    bottom: 90,
    flexDirection: "row",
    zIndex: 5
  },
  touchLeft: {
    flex: 1
  },
  touchCenter: {
    flex: 1
  },
  touchRight: {
    flex: 1
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 14
  },
  captionContainer: {
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 10,
    alignSelf: "center",
    maxWidth: "92%"
  },
  captionText: {
    color: "#ffffff",
    fontSize: 13.5,
    fontFamily: "Poppins_400Regular",
    textAlign: "center"
  },
  editCaptionBox: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    minHeight: 48
  },
  editCaptionInput: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    minHeight: 40,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: "center"
  },
  editCaptionActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold"
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  replyInputContainer: {
    flex: 1,
    minHeight: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 12,
    borderRadius: 25,
    borderWidth: 1
  },
  replyInput: {
    flex: 1,
    color: "#ffffff",
    fontFamily: "Poppins_400Regular",
    fontSize: 16,
    includeFontPadding: false,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: "center"
  },
  sendReplyBtn: {
    padding: 4
  },
  iconCircleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end"
  },
  menuSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingVertical: 12
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: "Poppins_500Medium"
  },
  shareSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16
  },
  shareSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  shareSheetTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold"
  },
  shareTabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    marginBottom: 12
  },
  shareTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  shareTabActive: {},
  shareTabText: {
    fontSize: 13.5,
    fontFamily: "Poppins_600SemiBold",
    color: "#a1a1aa"
  },
  followerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10
  },
  followerName: {
    fontSize: 13.5,
    fontFamily: "Poppins_600SemiBold"
  },
  followerHandle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular"
  },
  noFollowersText: {
    textAlign: "center",
    marginVertical: 20,
    fontSize: 13.5,
    fontFamily: "Poppins_400Regular"
  },
  modalContent: {
    alignItems: "center"
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold"
  }
});