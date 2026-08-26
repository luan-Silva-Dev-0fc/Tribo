import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { api, getUploadUrl } from "../../api";
import { useTheme } from "../../theme";
import { Avatar, IconButton, VerificationBadge } from "../ui/ui";
import { errorMessage, formatRelativeTime, userName } from "../../lib/format";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

function CommentAudioPlayer({ url, colors }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync().catch(() => {});
        }
      : undefined;
  }, [sound]);

  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const playPause = async () => {
    try {
      if (!sound) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true },
          onPlaybackStatusUpdate
        );
        setSound(newSound);
      } else {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          if (position >= duration && duration > 0) {
            await sound.replayAsync();
          } else {
            await sound.playAsync();
          }
        }
      }
    } catch (e) {
      console.warn("Erro ao reproduzir áudio do comentário:", e);
    }
  };

  const formatTime = (millis) => {
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View
      style={[
        styles.audioPlayerBox,
        {
          backgroundColor: colors.surfaceAlt || "rgba(255, 255, 255, 0.05)",
          borderColor: colors.border || "rgba(255, 255, 255, 0.08)",
        },
      ]}
    >
      <Pressable
        onPress={playPause}
        style={[
          styles.audioPlayBtn,
          { backgroundColor: colors.accent || colors.primary || "#3b82f6" },
        ]}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={16}
          color="#ffffff"
          style={{ marginLeft: isPlaying ? 0 : 2 }}
        />
      </Pressable>

      <View style={{ flex: 1 }}>
        <View style={styles.audioProgressBarBg}>
          <View
            style={[
              styles.audioProgressBarFill,
              {
                width: `${Math.min(100, Math.max(0, progress))}%`,
                backgroundColor: colors.accent || colors.primary || "#3b82f6",
              },
            ]}
          />
        </View>
        <Text
          style={[styles.audioTimeText, { color: colors.muted || "#a1a1aa" }]}
        >
          {formatTime(position)} / {formatTime(duration)}
        </Text>
      </View>
    </View>
  );
}

export function CommentsModal({
  post,
  onClose,
  onOpenProfile,
  currentUser,
  onReportComment,
  onBlockUser,
  showAlert: showAlertProp,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [optionsComment, setOptionsComment] = useState(null);
  const [deleteConfirmComment, setDeleteConfirmComment] = useState(null);

  // Audio recording states
  const [recording, setRecording] = useState(null);
  const [audioUri, setAudioUri] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimer = useRef(null);
  const recordingRef = useRef(null);

  const showAlert =
    showAlertProp ||
    ((cfg) => {
      console.warn(cfg?.title, cfg?.message);
    });

  const load = useCallback(async () => {
    if (!post) return;
    try {
      setLoading(true);
      const res = await api.comments.list(post.id);
      const data = Array.isArray(res)
        ? res
        : res?.comments || res?.data?.comments || res?.data || [];
      setItems(data);
    } catch (error) {
      console.warn("Erro ao carregar comentários:", error);
    } finally {
      setLoading(false);
    }
  }, [post]);

  useEffect(() => {
    setItems([]);
    setContent("");
    setAudioUri(null);
    setOptionsComment(null);
    setDeleteConfirmComment(null);
    if (post) {
      load();
    }
  }, [post, load]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    return () => {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      if (recordingRef.current) {
        try {
          recordingRef.current.stopAndUnloadAsync().catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {}
        recordingRef.current = null;
      }
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {}
        setRecording(null);
      }

      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        return showAlert({
          type: "error",
          title: "Permissão",
          message: "Permita o uso do microfone para gravar áudio.",
        });
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = newRecording;
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      if (recordingTimer.current) clearInterval(recordingTimer.current);
      recordingTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Falha ao gravar áudio:", err);
      setIsRecording(false);
      setRecording(null);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
      setIsRecording(false);
    } catch (err) {
      console.error("Falha ao parar gravação:", err);
    }
  };

  const cancelRecording = async () => {
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch (e) {}
    }
    setRecording(null);
    setIsRecording(false);
    setAudioUri(null);
    setRecordingDuration(0);
  };

  const send = async () => {
    const textToSend = content.trim();
    if ((!textToSend && !audioUri) || sending) return;

    try {
      setSending(true);
      let uploadedAudioUrl = null;
      if (audioUri) {
        const uploadRes = await api.uploads.audio(audioUri);
        uploadedAudioUrl = getUploadUrl(uploadRes);
      }

      // Optimistic update
      const tempId = "temp_" + Date.now();
      const optimisticComment = {
        id: tempId,
        content: textToSend || null,
        audio_url: uploadedAudioUrl || audioUri,
        audioUrl: uploadedAudioUrl || audioUri,
        created_at: new Date().toISOString(),
        user: currentUser,
        author: currentUser,
        userId: currentUser?.id,
      };

      setItems((prev) => [...prev, optimisticComment]);
      setContent("");
      setAudioUri(null);
      setRecordingDuration(0);

      const res = await api.comments.create({
        content: textToSend || undefined,
        postId: post.id,
        audio_url: uploadedAudioUrl,
      });

      if (res) {
        setItems((prev) => prev.map((c) => (c.id === tempId ? res : c)));
      }
      load();
    } catch (error) {
      showAlert({
        type: "error",
        title: "Comentário não enviado",
        message: errorMessage(error),
      });
      load();
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentId) return;
    try {
      setItems((prev) => prev.filter((c) => String(c.id) !== String(commentId)));
      setDeleteConfirmComment(null);
      setOptionsComment(null);
      await (api.comments.delete ? api.comments.delete(commentId) : api.comments.remove(commentId));
      load();
    } catch (err) {
      console.warn("Erro ao deletar comentário:", err);
      load();
    }
  };

  if (!post) return null;

  // Checagem de permissão para o comentário selecionado
  const selectedCommentAuthor = optionsComment?.user || optionsComment?.author || {};
  const selectedCommentAuthorId =
    selectedCommentAuthor.id ||
    selectedCommentAuthor.userId ||
    optionsComment?.userId ||
    optionsComment?.author_id ||
    optionsComment?.user_id;

  const currentUserId = currentUser?.id || currentUser?.userId || currentUser?.sub;
  const postAuthorId = post?.author_id || post?.user_id || post?.author?.id;

  const isMineComment = Boolean(
    selectedCommentAuthorId &&
    currentUserId &&
    String(selectedCommentAuthorId).toLowerCase() === String(currentUserId).toLowerCase()
  );

  const isPostAuthor = Boolean(
    postAuthorId &&
    currentUserId &&
    String(postAuthorId).toLowerCase() === String(currentUserId).toLowerCase()
  );

  const canDeleteSelected = isMineComment || isPostAuthor || currentUser?.role === "ADMIN";
  const selectedHandle =
    selectedCommentAuthor.username || selectedCommentAuthor.handle || "usuario";

  return (
    <Modal
      visible={Boolean(post)}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop para fechar ao tocar fora */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Bottom Sheet Animado e Colado com Teclado */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={styles.sheetWrapper}
        >
          <View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: colors.surface || "#121214",
                borderColor: colors.border || "rgba(255, 255, 255, 0.08)",
              },
            ]}
          >
            {/* Pílula de Arraste Superior (Drag Indicator) */}
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>

            {/* Cabeçalho do Bottom Sheet */}
            <View
              style={[
                styles.sheetHeader,
                { borderBottomColor: colors.border || "rgba(255, 255, 255, 0.08)" },
              ]}
            >
              <Text style={[styles.sheetHeaderTitle, { color: colors.text }]}>
                Comentários {items.length > 0 ? `(${items.length})` : ""}
              </Text>
              <Pressable
                onPress={onClose}
                style={styles.sheetCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Fechar comentários"
              >
                <Feather name="x" size={19} color={colors.muted || "#a1a1aa"} />
              </Pressable>
            </View>

            {/* Lista Fluida de Comentários */}
            <FlatList
              data={items}
              keyExtractor={(item, index) => String(item.id || index)}
              contentContainerStyle={[styles.commentsList, { paddingBottom: 16 }]}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              refreshing={loading}
              onRefresh={load}
              renderItem={({ item }) => {
                const commentUser =
                  item.user ||
                  item.author ||
                  (item.userId === currentUser?.id ? currentUser : {});
                const commentHandle =
                  commentUser.username || commentUser.handle || "";
                const createdAt = item.created_at || item.createdAt;

                return (
                  <View style={styles.commentItem}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Perfil de ${userName(commentUser)}`}
                      onPress={() => {
                        onClose();
                        onOpenProfile?.(commentUser);
                      }}
                    >
                      <Avatar
                        user={commentUser}
                        fallbackUser={currentUser}
                        size={38}
                      />
                    </Pressable>

                    <View style={styles.commentBody}>
                      <View style={styles.commentHeaderRow}>
                        <View style={styles.commentUserRow}>
                          <Text
                            style={[
                              styles.commentUserName,
                              { color: colors.text },
                            ]}
                          > 
                            {userName(commentUser)}
                          </Text>
                          <VerificationBadge user={commentUser} size={12} />
                          {!!createdAt && (
                            <Text
                              style={[
                                styles.commentTimeText,
                                { color: colors.muted || "#71717a" },
                              ]}
                            >
                              • {formatRelativeTime(createdAt)}
                            </Text>
                          )}
                        </View>

                        <IconButton
                          name="more-horizontal"
                          small
                          label="Opções do comentário"
                          onPress={() => setOptionsComment(item)}
                        />
                      </View>

                      {!!commentHandle && (
                        <Text
                          style={[
                            styles.commentHandleText,
                            { color: colors.subtext || "#a1a1aa" },
                          ]}
                        >
                          @{commentHandle}
                        </Text>
                      )}

                      {!!item.content && (
                        <Text
                          selectable
                          style={[
                            styles.commentContentText,
                            { color: colors.text },
                          ]}
                        >
                          {item.content}
                        </Text>
                      )}

                      {(item.audioUrl || item.audio_url) && (
                        <CommentAudioPlayer
                          url={item.audioUrl || item.audio_url}
                          colors={colors}
                        />
                      )}
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                !loading && (
                  <View style={styles.emptyContainer}>
                    <View
                      style={[
                        styles.emptyIconCircle,
                        {
                          backgroundColor:
                            colors.cardSecondary ||
                            "rgba(255, 255, 255, 0.05)",
                        },
                      ]}
                    >
                      <Feather
                        name="message-circle"
                        size={28}
                        color={colors.muted || "#71717a"}
                      />
                    </View>
                    <Text
                      style={[styles.emptyTitle, { color: colors.text }]}
                    >
                      Nenhum comentário ainda
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtitle,
                        { color: colors.subtext || "#71717a" },
                      ]}
                    >
                      Seja a primeira pessoa a compartilhar sua opinião!
                    </Text>
                  </View>
                )
              }
            />

            {/* Input Fixo no Rodapé (Sobe colado no Teclado) */}
            <View
              style={[
                styles.footerInputBar,
                {
                  backgroundColor: colors.surface || "#121214",
                  borderTopColor:
                    colors.border || "rgba(255, 255, 255, 0.08)",
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}
            >
              <Avatar user={currentUser} size={36} />

              {isRecording ? (
                <View
                  style={[
                    styles.recordingBox,
                    {
                      backgroundColor:
                        colors.surfaceAlt || "rgba(255, 59, 48, 0.08)",
                      borderColor: "rgba(255, 59, 48, 0.3)",
                    },
                  ]}
                >
                  <View style={styles.recordingTimerRow}>
                    <View style={styles.recordingPulseDot} />
                    <Text style={styles.recordingTimerText}>
                      {Math.floor(recordingDuration / 60)
                        .toString()
                        .padStart(2, "0")}
                      :{(recordingDuration % 60).toString().padStart(2, "0")}
                    </Text>
                  </View>
                  <View style={styles.recordingActionsRow}>
                    <Pressable
                      onPress={cancelRecording}
                      style={styles.recordingTrashBtn}
                      accessibilityLabel="Cancelar gravação"
                    >
                      <Feather name="trash-2" size={17} color="#ff3b30" />
                    </Pressable>
                    <Pressable
                      onPress={stopRecording}
                      style={styles.recordingStopBtn}
                      accessibilityLabel="Parar gravação"
                    >
                      <Feather name="square" size={16} color="#ffffff" />
                    </Pressable>
                  </View>
                </View>
              ) : audioUri ? (
                <View
                  style={[
                    styles.audioReadyBox,
                    {
                      backgroundColor:
                        colors.surfaceAlt || "rgba(255, 255, 255, 0.06)",
                      borderColor:
                        colors.border || "rgba(255, 255, 255, 0.12)",
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        backgroundColor: colors.accent || colors.primary || "#3b82f6",
                        padding: 5,
                        borderRadius: 12,
                      }}
                    >
                      <Feather name="mic" size={15} color="#fff" />
                    </View>
                    <Text
                      style={{
                        color: colors.text,
                        fontFamily: "Poppins_500Medium",
                        fontSize: 13,
                      }}
                    >
                      Áudio gravado
                    </Text>
                  </View>
                  <Pressable
                    onPress={cancelRecording}
                    style={{ padding: 6 }}
                    accessibilityLabel="Descartar áudio"
                  >
                    <Feather name="trash-2" size={17} color="#ff3b30" />
                  </Pressable>
                </View>
              ) : (
                <View
                  style={[
                    styles.inputFieldWrapper,
                    {
                      backgroundColor:
                        colors.cardSecondary ||
                        colors.surfaceAlt ||
                        "rgba(255, 255, 255, 0.06)",
                      borderColor:
                        colors.border || "rgba(255, 255, 255, 0.1)",
                    },
                  ]}
                >
                  <TextInput
                    placeholder="Escreva um comentário..."
                    placeholderTextColor={colors.muted || "#71717a"}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    style={[
                      styles.textInput,
                      { color: colors.text },
                    ]}
                  />

                  {!content.trim() && (
                    <Pressable
                      onPress={startRecording}
                      style={({ pressed }) => [
                        styles.micBtn,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      accessibilityLabel="Gravar áudio"
                    >
                      <Feather
                        name="mic"
                        size={20}
                        color={colors.accent || colors.primary || "#3b82f6"}
                      />
                    </Pressable>
                  )}
                </View>
              )}

              <Pressable
                onPress={send}
                disabled={sending || (!content.trim() && !audioUri)}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    backgroundColor:
                      sending || (!content.trim() && !audioUri)
                        ? "rgba(255, 255, 255, 0.08)"
                        : colors.accent || colors.primary || "#3b82f6",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityLabel="Enviar comentário"
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={
                      sending || (!content.trim() && !audioUri)
                        ? colors.muted || "#52525b"
                        : "#ffffff"
                    }
                  />
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* OVERLAY INLINE: Menu de Ações do Comentário */}
        {!!optionsComment && (
          <View style={styles.internalOverlay}>
            <Pressable
              style={styles.internalBackdrop}
              onPress={() => setOptionsComment(null)}
            />
            <View
              style={[
                styles.optionsSheet,
                {
                  backgroundColor: colors.surface || "#18181b",
                  borderColor: colors.border || "rgba(255, 255, 255, 0.1)",
                },
              ]}
            >
              <View style={styles.optionsHandle} />
              <Text style={[styles.optionsTitle, { color: colors.text }]}>
                Ações do Comentário
              </Text>

              {canDeleteSelected && (
                <Pressable
                  style={styles.optionItem}
                  onPress={() => {
                    const cToDelete = optionsComment;
                    setOptionsComment(null);
                    setDeleteConfirmComment(cToDelete);
                  }}
                >
                  <View
                    style={[
                      styles.optionIcon,
                      { backgroundColor: "rgba(239, 68, 68, 0.15)" },
                    ]}
                  >
                    <Feather name="trash-2" size={20} color="#ef4444" />
                  </View>
                  <Text style={[styles.optionText, { color: "#ef4444" }]}>
                    Excluir Comentário
                  </Text>
                </Pressable>
              )}

              {!isMineComment && (
                <>
                  <Pressable
                    style={styles.optionItem}
                    onPress={() => {
                      const c = optionsComment;
                      setOptionsComment(null);
                      onBlockUser?.(selectedCommentAuthorId, selectedHandle);
                    }}
                  >
                    <View
                      style={[
                        styles.optionIcon,
                        { backgroundColor: "rgba(245, 158, 11, 0.15)" },
                      ]}
                    >
                      <Feather name="user-x" size={20} color="#f59e0b" />
                    </View>
                    <Text style={[styles.optionText, { color: "#f59e0b" }]}>
                      Bloquear @{selectedHandle}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.optionItem}
                    onPress={() => {
                      const c = optionsComment;
                      setOptionsComment(null);
                      onReportComment?.({
                        targetType: "COMMENT",
                        targetId: c.id,
                        authorId: selectedCommentAuthorId,
                        targetName: `comentário de @${selectedHandle}`,
                      });
                    }}
                  >
                    <View
                      style={[
                        styles.optionIcon,
                        { backgroundColor: "rgba(239, 68, 68, 0.15)" },
                      ]}
                    >
                      <Feather name="flag" size={20} color="#ef4444" />
                    </View>
                    <Text style={[styles.optionText, { color: "#ef4444" }]}>
                      Denunciar Comentário
                    </Text>
                  </Pressable>
                </>
              )}

              <Pressable
                onPress={() => setOptionsComment(null)}
                style={[
                  styles.cancelOptionBtn,
                  { borderColor: colors.border || "rgba(255, 255, 255, 0.12)" },
                ]}
              >
                <Text style={[styles.cancelOptionText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* OVERLAY INLINE: Confirmação de Exclusão */}
        {!!deleteConfirmComment && (
          <View style={styles.internalOverlayCenter}>
            <Pressable
              style={styles.internalBackdrop}
              onPress={() => setDeleteConfirmComment(null)}
            />
            <View
              style={[
                styles.deleteModalCard,
                {
                  backgroundColor: colors.surface || "#18181b",
                  borderColor: colors.border || "rgba(255, 255, 255, 0.1)",
                },
              ]}
            >
              <View style={styles.deleteIconCircle}>
                <Feather name="trash-2" size={24} color="#EF4444" />
              </View>

              <Text style={[styles.deleteTitle, { color: colors.text }]}>
                Excluir comentário
              </Text>
              <Text
                style={[
                  styles.deleteSubtitle,
                  { color: colors.muted || "#a1a1aa" },
                ]}
              >
                Deseja excluir este comentário permanentemente? Esta ação não pode ser desfeita.
              </Text>

              <View style={{ width: "100%", gap: 10 }}>
                <Pressable
                  onPress={() => handleDeleteComment(deleteConfirmComment?.id)}
                  style={styles.confirmDeleteBtn}
                >
                  <Text style={styles.confirmDeleteText}>Sim, excluir</Text>
                </Pressable>

                <Pressable
                  onPress={() => setDeleteConfirmComment(null)}
                  style={[
                    styles.cancelDeleteBtn,
                    {
                      borderColor:
                        colors.border || "rgba(255, 255, 255, 0.15)",
                    },
                  ]}
                >
                  <Text style={[styles.cancelDeleteText, { color: colors.text }]}>
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

export { CommentsModal as Comments };

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetWrapper: {
    width: "100%",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    width: "100%",
    height: SCREEN_HEIGHT * 0.80,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 20,
  },
  dragHandleContainer: {
    width: "100%",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#3F3F46",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheetHeaderTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingTop: 14,
    flexGrow: 1,
  },
  commentItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  commentBody: {
    flex: 1,
  },
  commentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  commentUserRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
  },
  commentUserName: {
    fontSize: 13.5,
    fontFamily: "Poppins_600SemiBold",
  },
  commentTimeText: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },
  commentHandleText: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    marginTop: -2,
    marginBottom: 4,
  },
  commentContentText: {
    fontSize: 13.5,
    fontFamily: "Poppins_400Regular",
    lineHeight: 19.5,
  },
  audioPlayerBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 6,
    gap: 10,
    borderWidth: 1,
    maxWidth: 240,
  },
  audioPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  audioProgressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
  },
  audioProgressBarFill: {
    height: "100%",
  },
  audioTimeText: {
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  footerInputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputFieldWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    minHeight: 46,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 19,
    paddingVertical: 4,
  },
  micBtn: {
    padding: 6,
    marginLeft: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 46,
  },
  recordingTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingPulseDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#ff3b30",
  },
  recordingTimerText: {
    color: "#ff3b30",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  recordingActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordingTrashBtn: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255, 59, 48, 0.12)",
  },
  recordingStopBtn: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: "#ff3b30",
  },
  audioReadyBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 46,
  },
  internalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 9999,
  },
  internalOverlayCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    zIndex: 10000,
  },
  internalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  optionsSheet: {
    padding: 22,
    paddingBottom: 36,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    gap: 8,
  },
  optionsHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3F3F46",
    alignSelf: "center",
    marginBottom: 10,
  },
  optionsTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15.5,
    marginBottom: 12,
    textAlign: "center",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 12,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14.5,
  },
  cancelOptionBtn: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelOptionText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  deleteModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  deleteIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  deleteTitle: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
    marginBottom: 6,
    textAlign: "center",
  },
  deleteSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  confirmDeleteBtn: {
    backgroundColor: "#EF4444",
    borderRadius: 14,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteText: {
    color: "#ffffff",
    fontSize: 13.5,
    fontFamily: "Poppins_700Bold",
  },
  cancelDeleteBtn: {
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelDeleteText: {
    fontSize: 13.5,
    fontFamily: "Poppins_600SemiBold",
  },
});