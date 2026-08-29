import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { api, getUploadUrl } from "../../../api";
import { errorMessage, userName } from "../../../lib/format";
import { useTheme } from "../../../theme";
import { Avatar, EmptyState, IconButton, VerificationBadge, AppHeader } from "../../../components/ui/ui";
import { Composer } from "../../../components/feed/Composer";
import { PostCard } from "../../../components/feed/PostCard";
import { MediaViewerModal } from "../../../components/modals/media-viewer-modal";
import { TriboAlertModal } from "../../../components/modals/tribo-alert-modal";
import { AudioMessagePlayer } from "../../../components/chat/AudioMessagePlayer";
import { setOptimizedAudioMode } from "../../../services/audioRecordingDucking";

export function GroupFeedTab({
  groupId,
  user,
  colors: propColors,
  group,
  isAdmin,
  onOpenProfile
}) {
  const { colors: themeColors } = useTheme();
  const colors = propColors || themeColors;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [alertState, setAlertState] = useState({ visible: false });
  const [commentPost, setCommentPost] = useState(null);

  const loadFeed = useCallback(async () => {
    try {
      const res = await api.groups.getFeed(groupId);
      const data = Array.isArray(res)
        ? res
        : res.feed || res.posts || res.data || [];
      setPosts(data);
    } catch (err) {
      console.warn("Error loading group feed", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleLike = async (post) => {
    const isCurrentlyLiked = post.is_liked || post.isLiked;
    const currentCount = parseInt(post.likes_count || 0, 10);

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === post.id) {
          return {
            ...p,
            is_liked: !isCurrentlyLiked,
            likes_count: isCurrentlyLiked
              ? Math.max(0, currentCount - 1)
              : currentCount + 1
          };
        }
        return p;
      })
    );

    try {
      if (isCurrentlyLiked) {
        await api.groups.unlikePost(groupId, post.id);
      } else {
        await api.groups.likePost(groupId, post.id);
      }
    } catch (err) {
      console.warn("Error toggling like", err);
      loadFeed();
    }
  };

  const handleSave = async (post) => {
    const isCurrentlySaved = post.is_saved || post.isSaved;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === post.id) {
          return { ...p, is_saved: !isCurrentlySaved };
        }
        return p;
      })
    );

    try {
      if (isCurrentlySaved) {
        await api.groups.unsavePost(groupId, post.id);
      } else {
        await api.groups.savePost(groupId, post.id);
      }
    } catch (err) {
      console.warn("Error toggling save", err);
      loadFeed();
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    setAlertState({
      visible: true,
      type: "danger",
      title: "Apagar",
      message: "Tem certeza que deseja apagar esta publicação?",
      buttonText: "Apagar",
      secondaryButtonText: "Cancelar",
      onSecondaryPress: () => setAlertState({ visible: false }),
      onClose: async () => {
        setAlertState({ visible: false });
        try {
          await api.groups.deleteFeedPost(groupId, selectedPost.id);
          setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
          setSelectedPost(null);
        } catch (err) {
          setTimeout(
            () =>
              setAlertState({
                visible: true,
                type: "danger",
                title: "Erro",
                message: "Não foi possível apagar a publicação.",
                buttonText: "OK",
                onClose: () => setAlertState({ visible: false })
              }),
            300
          );
        }
      }
    });
  };

  const handleKickUser = async () => {
    if (!selectedPost) return;
    const authorId =
      selectedPost.user?.id || selectedPost.userId || selectedPost.user_id;
    setAlertState({
      visible: true,
      type: "danger",
      title: "Remover Membro",
      message: "Deseja realmente expulsar este usuário do grupo?",
      buttonText: "Expulsar",
      secondaryButtonText: "Cancelar",
      onSecondaryPress: () => setAlertState({ visible: false }),
      onClose: async () => {
        setAlertState({ visible: false });
        try {
          await api.groups.kickMember(groupId, authorId);
          setTimeout(
            () =>
              setAlertState({
                visible: true,
                type: "success",
                title: "Sucesso",
                message: "Usuário removido do grupo.",
                buttonText: "OK",
                onClose: () => setAlertState({ visible: false })
              }),
            300
          );
          setSelectedPost(null);
          loadFeed();
        } catch (err) {
          setTimeout(
            () =>
              setAlertState({
                visible: true,
                type: "danger",
                title: "Erro",
                message: "Não foi possível remover o usuário.",
                buttonText: "OK",
                onClose: () => setAlertState({ visible: false })
              }),
            300
          );
        }
      }
    });
  };

  return (
    <View style={styles.tabContent}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(i) => String(i.id)}
          ListHeaderComponent={
            <View style={styles.composerWrapper}>
              <Composer
                user={user}
                onCreate={(data) => {
                  const payload = {
                    content: data.content,
                    mediaUrl:
                      data.imageUrl || data.videoUrl || data.mediaUrl || null
                  };
                  return api.groups.createPost(groupId, payload);
                }}
                onPublished={() => {
                  loadFeed();
                }}
              />
            </View>
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUser={user}
              onLike={() => handleLike(item)}
              onComment={() => setCommentPost(item)}
              onSave={() => handleSave(item)}
              onPressMedia={(media) => setFullscreenMedia({ ...media, post: item })}
              onOptions={() => setSelectedPost(item)}
              onOpenProfile={onOpenProfile}
            />
          )}
          ListEmptyComponent={
            <Text
              style={{
                color: colors.muted,
                textAlign: "center",
                marginTop: 40,
                fontFamily: "Poppins_400Regular"
              }}
            >
              Nenhuma postagem na tribo ainda.
            </Text>
          }
        />
      )}

      {commentPost && (
        <GroupComments
          groupId={groupId}
          post={commentPost}
          currentUser={user}
          onClose={() => setCommentPost(null)}
          onOpenProfile={onOpenProfile}
        />
      )}

      <MediaViewerModal
        visible={Boolean(fullscreenMedia)}
        mediaUrl={fullscreenMedia?.url}
        mediaType={fullscreenMedia?.type || "image"}
        post={fullscreenMedia?.post}
        onDelete={(media) => {
          const targetPost = media?.post || fullscreenMedia?.post;
          setFullscreenMedia(null);
          if (targetPost) {
            setSelectedPost(targetPost);
          }
        }}
        onClose={() => setFullscreenMedia(null)}
      />

      {selectedPost && (
        <Modal
          transparent
          visible
          animationType="slide"
          onRequestClose={() => setSelectedPost(null)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setSelectedPost(null)}
          >
            <View
              style={[
                styles.optionsSheet,
                { backgroundColor: colors.surface || "#1e1e24" }
              ]}
            >
              <View
                style={[
                  styles.sheetHandle,
                  { backgroundColor: colors.border || "#333" }
                ]}
              />

              <Text
                style={{
                  color: colors.text,
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 18,
                  marginBottom: 20,
                  textAlign: "center"
                }}
              >
                Opções da Publicação
              </Text>

              {(isAdmin ||
                String(
                  selectedPost.user?.id ||
                    selectedPost.userId ||
                    selectedPost.user_id
                ) === String(user?.id)) && (
                <Pressable
                  style={({ pressed }) => [
                    styles.settingRow,
                    {
                      backgroundColor: pressed
                        ? colors.surfaceAlt || "#2a2a30"
                        : "transparent"
                    }
                  ]}
                  onPress={handleDeletePost}
                >
                  <View style={styles.dangerIconBox}>
                    <Feather
                      name="trash-2"
                      size={18}
                      color={colors.danger || "#ef4444"}
                    />
                  </View>
                  <Text
                    style={{
                      color: colors.danger || "#ef4444",
                      fontSize: 16,
                      fontFamily: "Poppins_500Medium",
                      marginLeft: 16
                    }}
                  >
                    Apagar Publicação
                  </Text>
                </Pressable>
              )}

              {isAdmin &&
                String(
                  selectedPost.user?.id ||
                    selectedPost.userId ||
                    selectedPost.user_id
                ) !== String(user?.id) && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.settingRow,
                      {
                        backgroundColor: pressed
                          ? colors.surfaceAlt || "#2a2a30"
                          : "transparent"
                      }
                    ]}
                    onPress={handleKickUser}
                  >
                    <View style={styles.dangerIconBox}>
                      <Feather
                        name="user-x"
                        size={18}
                        color={colors.danger || "#ef4444"}
                      />
                    </View>
                    <Text
                      style={{
                        color: colors.danger || "#ef4444",
                        fontSize: 16,
                        fontFamily: "Poppins_500Medium",
                        marginLeft: 16
                      }}
                    >
                      Remover Autor do Grupo
                    </Text>
                  </Pressable>
                )}

              <Pressable
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    backgroundColor: pressed
                      ? colors.surfaceAlt || "#2a2a30"
                      : colors.background,
                    borderColor: colors.border || "#333"
                  }
                ]}
                onPress={() => setSelectedPost(null)}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 16
                  }}
                >
                  Cancelar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      <TriboAlertModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttonText={alertState.buttonText}
        onClose={() => {
          if (alertState.onClose) alertState.onClose();
          setAlertState({ visible: false });
        }}
        secondaryButtonText={alertState.secondaryButtonText}
        onSecondaryPress={alertState.onSecondaryPress}
      />
    </View>
  );
}

function GroupComments({
  groupId,
  post,
  onClose,
  onOpenProfile,
  currentUser,
  onReportComment,
  onBlockUser
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [optionsComment, setOptionsComment] = useState(null);
  const [deleteConfirmComment, setDeleteConfirmComment] = useState(null);
  const [deleteAlert, setDeleteAlert] = useState({
    visible: false,
    type: "success",
    title: "",
    message: ""
  });

  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef(null);

  const load = useCallback(async () => {
    if (!post) return;
    try {
      if (groupId) {
        const res = await api.groups.getComments(groupId, post.id);
        const data = Array.isArray(res)
          ? res
          : res?.comments || res?.data?.comments || res?.data || [];
        setItems(data);
      } else {
        const res = await api.comments.list(post.id);
        const data = Array.isArray(res)
          ? res
          : res?.comments || res?.data?.comments || res?.data || [];
        setItems(data);
      }
    } catch (error) {
      console.warn("Erro ao carregar comentários:", error);
    }
  }, [post, groupId]);

  useEffect(() => {
    setItems([]);
    if (post) load();
  }, [post, load]);

  useEffect(() => {
    return () => {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        setDeleteAlert({
          visible: true,
          type: "error",
          title: "Permissão",
          message: "Permita o uso do microfone."
        });
        return;
      }
      await setOptimizedAudioMode(true);
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      await recording.stopAndUnloadAsync();
      await setOptimizedAudioMode(false);
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
      setIsRecording(false);
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
  };

  const cancelRecording = async () => {
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    if (recording) await recording.stopAndUnloadAsync().catch(() => {});
    setRecording(null);
    setIsRecording(false);
    setAudioUri(null);
    setRecordingDuration(0);
    await setOptimizedAudioMode(false);
  };

  const send = async () => {
    if ((!content.trim() && !audioUri) || sending) return;
    try {
      setSending(true);
      let uploadedAudioUrl = null;
      if (audioUri) {
        const uploadRes = await api.uploads.audio(audioUri);
        uploadedAudioUrl = getUploadUrl(uploadRes);
      }

      if (groupId) {
        const res = await api.groups.addComment(
          groupId,
          post.id,
          content.trim() || undefined,
          uploadedAudioUrl
        );
        if (res?.comment) {
          const newComment = {
            ...res.comment,
            username: currentUser?.username,
            name: currentUser?.name,
            user_avatar: currentUser?.avatar_url,
            badge_type: currentUser?.badge_type,
            email_verified: currentUser?.email_verified,
            user: currentUser
          };
          setItems((prev) => [...prev, newComment]);
        }
      } else {
        const res = await api.comments.create({
          content: content.trim() || undefined,
          postId: post.id,
          audio_url: uploadedAudioUrl
        });
        if (res) {
          setItems((prev) => [...prev, res]);
        }
      }
      setContent("");
      setAudioUri(null);
      setRecordingDuration(0);
      load();
    } catch (error) {
      setDeleteAlert({
        visible: true,
        type: "error",
        title: "Comentário não enviado",
        message: errorMessage(error)
      });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!post) return;
    const onBackPress = () => {
      onClose();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [post, onClose]);

  if (!post) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: colors.background, zIndex: 99999 }
      ]}
    >
      <AppHeader title="Comentários" onBack={onClose} />
      <FlatList
        data={items}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item, index) => String(item.id || index)}
        contentContainerStyle={styles.commentsList}
        renderItem={({ item }) => {
          const commentUser =
            item.user ||
            item.author || {
              id: item.user_id || item.userId,
              username: item.username,
              name: item.name,
              avatar_url: item.user_avatar || item.avatar_url,
              badge_type: item.badge_type,
              email_verified: item.email_verified
            };
          const commentHandle =
            commentUser.username || commentUser.handle || item.username || "";
          return (
            <View style={styles.commentItem}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abrir perfil de ${userName(commentUser)}`}
                onPress={() => onOpenProfile?.(commentUser)}
              >
                <Avatar user={commentUser} fallbackUser={currentUser} size={34} />
              </Pressable>
              <View style={styles.flex}>
                <View style={{ flexDirection: "column", marginBottom: 2 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.text }]}>
                      {userName(commentUser)}
                    </Text>
                    <VerificationBadge user={commentUser} size={13} />
                  </View>
                  {Boolean(commentHandle) && (
                    <Text
                      style={{
                        fontFamily: "Poppins_400Regular",
                        fontSize: 11,
                        color: colors.subtext,
                        marginTop: -2
                      }}
                    >
                      @{commentHandle}
                    </Text>
                  )}
                </View>
                {Boolean(item.content) && (
                  <Text selectable style={[styles.commentText, { color: colors.text }]}>
                    {item.content}
                  </Text>
                )}
                {(item.audioUrl || item.audio_url) && (
                  <AudioMessagePlayer
                    audioUrl={item.audioUrl || item.audio_url}
                    isMe={false}
                  />
                )}
              </View>
              <IconButton
                name="more-horizontal"
                small
                label="Opções do comentário"
                onPress={() => setOptionsComment(item)}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="message-circle">
            Seja a primeira pessoa a comentar.
          </EmptyState>
        }
      />

      <View
        style={[
          styles.reply,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border || "#e5e7eb",
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 10,
            paddingHorizontal: 12,
            gap: 10
          }
        ]}
      >
        {isRecording ? (
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              backgroundColor: colors.surfaceAlt || "#f0f0f0",
              borderRadius: 26,
              borderWidth: 1,
              borderColor: colors.border || "#e5e7eb",
              paddingVertical: 10,
              minHeight: 52
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  height: 10,
                  width: 10,
                  borderRadius: 5,
                  backgroundColor: "#ff3b30",
                  marginRight: 8
                }}
              />
              <Text
                style={{
                  color: "#ff3b30",
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 15
                }}
              >
                {Math.floor(recordingDuration / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(recordingDuration % 60).toString().padStart(2, "0")}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable
                onPress={cancelRecording}
                style={{
                  padding: 10,
                  borderRadius: 20,
                  backgroundColor: "rgba(255, 59, 48, 0.1)"
                }}
                accessibilityLabel="Cancelar gravação"
              >
                <Feather name="trash-2" size={18} color="#ff3b30" />
              </Pressable>
              <Pressable
                onPress={stopRecording}
                style={{
                  padding: 10,
                  backgroundColor: "#ff3b30",
                  borderRadius: 20
                }}
                accessibilityLabel="Parar gravação"
              >
                <Feather name="square" size={18} color="#fff" />
              </Pressable>
            </View>
          </View>
        ) : audioUri ? (
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              backgroundColor: colors.surfaceAlt || "#f0f0f0",
              borderRadius: 26,
              borderWidth: 1,
              borderColor: colors.border || "#e5e7eb",
              paddingVertical: 10,
              minHeight: 52
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: colors.primary,
                  padding: 6,
                  borderRadius: 16,
                  marginRight: 10
                }}
              >
                <Feather name="mic" size={18} color="#fff" />
              </View>
              <Text
                style={{
                  color: colors.text,
                  fontFamily: "Poppins_500Medium",
                  fontSize: 14
                }}
              >
                Áudio pronto
              </Text>
            </View>
            <Pressable
              onPress={cancelRecording}
              style={{
                padding: 10,
                borderRadius: 20,
                backgroundColor: "rgba(255, 59, 48, 0.1)"
              }}
              accessibilityLabel="Descartar áudio"
            >
              <Feather name="trash-2" size={18} color="#ff3b30" />
            </Pressable>
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.surfaceAlt || "#222",
              borderRadius: 26,
              borderWidth: 1,
              borderColor: colors.border || "#e5e7eb",
              paddingHorizontal: 14,
              paddingVertical: Platform.OS === "ios" ? 10 : 6,
              minHeight: 52,
              justifyContent: "center"
            }}
          >
            <TextInput
              placeholder="Escreva um comentário..."
              placeholderTextColor={colors.subtext || "#8E8E93"}
              value={content}
              onChangeText={setContent}
              style={{
                flex: 1,
                color: colors.text,
                fontFamily: "Poppins_400Regular",
                fontSize: 16,
                lineHeight: 22,
                maxHeight: 120,
                paddingVertical: 4
              }}
              multiline
            />

            {!content.trim() && (
              <Pressable
                onPress={startRecording}
                style={({ pressed }) => [
                  {
                    padding: 6,
                    borderRadius: 16,
                    backgroundColor: pressed ? "rgba(0,0,0,0.05)" : "transparent"
                  }
                ]}
                accessibilityLabel="Gravar áudio"
              >
                <Feather name="mic" size={22} color={colors.primary} />
              </Pressable>
            )}
          </View>
        )}

        <Pressable
          onPress={send}
          disabled={sending || (!content.trim() && !audioUri)}
          style={({ pressed }) => [
            {
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor:
                sending || (!content.trim() && !audioUri)
                  ? colors.mode === "dark"
                    ? "#333"
                    : "#e2e8f0"
                  : colors.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.8 : 1
            }
          ]}
          accessibilityLabel="Enviar comentário"
        >
          {sending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Feather
              name="send"
              size={20}
              color={
                sending || (!content.trim() && !audioUri)
                  ? colors.subtext || "#94a3b8"
                  : "#ffffff"
              }
              style={{ marginLeft: -1, marginTop: 1 }}
            />
          )}
        </Pressable>
      </View>

      <CommentOptionsModal
        comment={optionsComment}
        currentUser={currentUser}
        postAuthorId={post?.author_id || post?.user_id || post?.author?.id}
        onClose={() => setOptionsComment(null)}
        onReport={(data) => {
          setOptionsComment(null);
          onReportComment?.(data);
        }}
        onBlock={(authorId, authorHandle) => {
          setOptionsComment(null);
          setItems((prev) =>
            prev.filter((c) => {
              const cUser = c.user || c.author || {};
              const cId = cUser.id || cUser.userId || c.userId;
              return String(cId) !== String(authorId);
            })
          );
          onBlockUser?.(authorId, authorHandle);
        }}
        onDelete={(commentToDelete) => {
          setOptionsComment(null);
          setDeleteConfirmComment(commentToDelete);
        }}
      />

      <Modal
        visible={Boolean(deleteConfirmComment)}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmComment(null)}
      >
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0,0,0,0.72)",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999
            }
          ]}
          onPress={() => setDeleteConfirmComment(null)}
        >
          <Pressable
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 24,
              width: "85%",
              maxWidth: 380,
              padding: 24,
              alignItems: "center",
              elevation: 10
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16
              }}
            >
              <Feather name="trash-2" size={26} color="#EF4444" />
            </View>

            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                marginBottom: 8,
                textAlign: "center",
                fontFamily: "Poppins_700Bold"
              }}
            >
              Excluir comentário
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: 14,
                fontFamily: "Poppins_400Regular",
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 20
              }}
            >
              Você deseja excluir este comentário? Esta ação não poderá ser
              desfeita.
            </Text>

            <View style={{ width: "100%", gap: 10 }}>
              <Pressable
                style={{
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: "#EF4444",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                onPress={async () => {
                  const c = deleteConfirmComment;
                  setDeleteConfirmComment(null);
                  try {
                    if (groupId) {
                      await api.groups.deleteComment(groupId, post.id, c.id);
                    } else {
                      await api.comments.remove(c.id);
                    }
                    setItems((prev) => prev.filter((item) => item.id !== c.id));
                  } catch (err) {
                    setDeleteAlert({
                      visible: true,
                      type: "error",
                      title: "Erro",
                      message:
                        errorMessage(err) ||
                        "Não foi possível excluir o comentário."
                    });
                  }
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 15
                  }}
                >
                  Excluir
                </Text>
              </Pressable>

              <Pressable
                style={{
                  paddingVertical: 14,
                  borderRadius: 14,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.border
                }}
                onPress={() => setDeleteConfirmComment(null)}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: "Poppins_600SemiBold",
                    fontSize: 15
                  }}
                >
                  Cancelar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <TriboAlertModal
        visible={deleteAlert.visible}
        type={deleteAlert.type}
        title={deleteAlert.title}
        message={deleteAlert.message}
        buttonText="Entendido"
        onClose={() => setDeleteAlert({ visible: false, type: "success", title: "", message: "" })}
      />
    </View>
  );
}

function CommentOptionsModal({
  comment,
  currentUser,
  postAuthorId,
  onClose,
  onReport,
  onBlock,
  onDelete
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!comment) return null;

  const author = comment.author || comment.user || {};
  const authorId =
    author.id ||
    author._id ||
    author.userId ||
    comment.user_id ||
    comment.userId ||
    comment.author_id;

  const currentUserId =
    currentUser?.id ||
    currentUser?._id ||
    currentUser?.userId ||
    currentUser?.user_id ||
    currentUser?.sub;

  const isMine = Boolean(
    authorId &&
      currentUserId &&
      String(authorId).toLowerCase() === String(currentUserId).toLowerCase()
  );

  const isPostAuthor = Boolean(
    postAuthorId &&
      currentUserId &&
      String(postAuthorId).toLowerCase() === String(currentUserId).toLowerCase()
  );

  const authorHandle =
    author.username || author.handle || comment.username || "usuario";

  const handleBlock = () => {
    if (isMine) return;
    onClose();
    onBlock?.(authorId, authorHandle);
  };

  const handleReport = () => {
    if (isMine) return;
    onClose();
    onReport?.({
      targetType: "COMMENT",
      targetId: comment.id,
      authorId: authorId,
      targetName: `comentário de @${authorHandle}`
    });
  };

  const handleDelete = () => {
    onClose();
    onDelete?.(comment);
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end"
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
            paddingBottom: Math.max(insets.bottom + 16, 28)
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: 3,
              backgroundColor: colors.border,
              alignSelf: "center",
              marginBottom: 16
            }}
          />

          <Text
            style={{
              fontFamily: "Poppins_600SemiBold",
              fontSize: 16,
              color: colors.text,
              textAlign: "center",
              marginBottom: 16
            }}
          >
            Ações do Comentário
          </Text>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 4 }}
          >
            {(isMine || isPostAuthor) && (
              <Pressable
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  gap: 12
                }}
                onPress={handleDelete}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    justifyContent: "center",
                    alignItems: "center"
                  }}
                >
                  <Feather name="trash-2" size={18} color="#ef4444" />
                </View>
                <Text
                  style={{
                    fontFamily: "Poppins_500Medium",
                    fontSize: 15,
                    color: "#ef4444"
                  }}
                >
                  Excluir Comentário
                </Text>
              </Pressable>
            )}

            {!isMine && (
              <>
                <Pressable
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    gap: 12
                  }}
                  onPress={handleBlock}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      justifyContent: "center",
                      alignItems: "center"
                    }}
                  >
                    <Feather name="slash" size={18} color="#ef4444" />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins_500Medium",
                      fontSize: 15,
                      color: "#ef4444"
                    }}
                  >
                    Bloquear @{authorHandle}
                  </Text>
                </Pressable>

                <Pressable
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 12,
                    gap: 12
                  }}
                  onPress={handleReport}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      justifyContent: "center",
                      alignItems: "center"
                    }}
                  >
                    <Feather name="flag" size={20} color="#ef4444" />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Poppins_500Medium",
                      fontSize: 15,
                      color: "#ef4444"
                    }}
                  >
                    Denunciar e Bloquear
                  </Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tabContent: { flex: 1 },
  composerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end"
  },
  optionsSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    elevation: 10
  },
  sheetHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 24
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8
  },
  dangerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239,68,68,0.1)",
    justifyContent: "center",
    alignItems: "center"
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1
  },
  commentsList: { padding: 15, paddingBottom: 100 },
  commentItem: {
    flexDirection: "row",
    marginBottom: 20
  },
  flex: { flex: 1, marginLeft: 10 },
  nameRow: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 14, fontFamily: "Poppins_600SemiBold", marginRight: 5 },
  commentText: { fontSize: 14, fontFamily: "Poppins_400Regular", marginTop: 2 },
  reply: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1
  }
});
