import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { api } from "../../api";
import { useTheme } from "../../theme";

export function PostOptionsModal({
  post,
  currentUser,
  onClose,
  onReport,
  onBlock,
  onDelete,
  showAlert
}) {
  const { colors } = useTheme();
  if (!post) return null;

  const author = post.user || post.author || {};
  const authorId =
    author.id ||
    author._id ||
    author.userId ||
    author.user_id ||
    post.user_id ||
    post.userId ||
    post.author_id ||
    post.authorId;

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

  const authorHandle = author.username || author.handle || post.username || "usuario";
  const mediaUrl = post.imageUrl || post.image_url || post.videoUrl || post.video_url;

  const handleSave = async () => {
    onClose();
    try {
      await api.posts.save(post.id);
      setTimeout(() => {
        showAlert?.({
          type: "success",
          title: "Salvo!",
          message: "A publicação foi salva nos seus itens."
        });
      }, 100);
    } catch (_) {
      setTimeout(() => {
        showAlert?.({
          type: "error",
          title: "Erro",
          message: "Não foi possível salvar a publicação."
        });
      }, 100);
    }
  };

  const handleDownload = async () => {
    onClose();
    setTimeout(() => {
      showAlert?.({
        type: "info",
        title: "Baixar Mídia",
        message: "Deseja baixar esta mídia para a sua galeria?",
        buttonText: "Baixar",
        secondaryButtonText: "Cancelar",
        onSecondaryPress: () => showAlert?.({ visible: false }),
        onClose: async () => {
          showAlert?.({ visible: false });
          try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== "granted") {
              setTimeout(
                () =>
                  showAlert?.({
                    type: "error",
                    title: "Permissão negada",
                    message: "Precisamos de acesso à galeria para salvar a mídia."
                  }),
                100
              );
              return;
            }
            if (!mediaUrl) {
              setTimeout(
                () =>
                  showAlert?.({
                    type: "error",
                    title: "Erro",
                    message: "Esta publicação não tem mídia para baixar."
                  }),
                100
              );
              return;
            }
            const fileExt =
              typeof mediaUrl === "string" && mediaUrl.includes(".mp4") ? ".mp4" : ".jpg";
            const fileUri = FileSystem.documentDirectory + `tribo_${post.id}${fileExt}`;

            const downloadRes = await FileSystem.downloadAsync(mediaUrl, fileUri);

            if (downloadRes.status === 200 || downloadRes.status === 201) {
              await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
              await api.posts.download(post.id).catch(() => {});
              setTimeout(
                () =>
                  showAlert?.({
                    type: "success",
                    title: "Sucesso",
                    message: "Mídia salva na galeria com sucesso!"
                  }),
                100
              );
            } else {
              setTimeout(
                () =>
                  showAlert?.({
                    type: "error",
                    title: "Erro",
                    message: "Não foi possível baixar a mídia."
                  }),
                100
              );
            }
          } catch (_) {
            setTimeout(
              () =>
                showAlert?.({
                  type: "error",
                  title: "Erro",
                  message: "Ocorreu um erro ao tentar salvar a mídia."
                }),
              100
            );
          }
        }
      });
    }, 100);
  };

  const handleDelete = () => {
    onClose();
    setTimeout(() => {
      showAlert?.({
        type: "error",
        title: "Excluir publicação",
        message: "Tem certeza que deseja excluir esta publicação? Essa ação é permanente e sem volta.",
        buttonText: "Excluir",
        secondaryButtonText: "Cancelar",
        onSecondaryPress: () => showAlert?.({ visible: false }),
        onClose: () => {
          showAlert?.({ visible: false });
          onDelete?.(post.id);
        }
      });
    }, 100);
  };

  const handleBlock = () => {
    onClose();
    setTimeout(() => {
      showAlert?.({
        type: "warning",
        title: "Bloquear usuário",
        message: `Deseja bloquear @${authorHandle}? Você deixará de ver as publicações deste perfil.`,
        buttonText: "Bloquear",
        secondaryButtonText: "Cancelar",
        onSecondaryPress: () => showAlert?.({ visible: false }),
        onClose: () => {
          showAlert?.({ visible: false });
          onBlock?.(authorId, authorHandle);
        }
      });
    }, 100);
  };

  const handleReport = () => {
    onClose();
    onReport?.({
      targetType: "POST",
      targetId: post.id,
      authorId: authorId,
      targetName: `publicação de @${authorHandle}`
    });
  };

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View style={[styles.optionsSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.optionsHandle, { backgroundColor: colors.border }]} />
        <Text style={[styles.optionsTitle, { color: colors.text }]}>Ações da Publicação</Text>

        <Pressable style={styles.optionItem} onPress={handleSave}>
          <View style={[styles.optionIcon, { backgroundColor: colors.surfaceAlt }]}>
            <Feather name="bookmark" size={20} color={colors.text} />
          </View>
          <Text style={[styles.optionText, { color: colors.text }]}>Salvar publicação</Text>
        </Pressable>

        {!!mediaUrl && (
          <Pressable style={styles.optionItem} onPress={handleDownload}>
            <View style={[styles.optionIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Feather name="download" size={20} color={colors.text} />
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>Baixar Mídia</Text>
          </Pressable>
        )}

        {isMine ? (
          <Pressable style={styles.optionItem} onPress={handleDelete}>
            <View style={[styles.optionIcon, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
              <Feather name="trash-2" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.optionText, { color: "#ef4444" }]}>Excluir publicação</Text>
          </Pressable>
        ) : (
          <>
            <Pressable style={styles.optionItem} onPress={handleBlock}>
              <View style={[styles.optionIcon, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                <Feather name="user-x" size={20} color="#f59e0b" />
              </View>
              <Text style={[styles.optionText, { color: "#f59e0b" }]}>Bloquear @{authorHandle}</Text>
            </Pressable>

            <Pressable style={styles.optionItem} onPress={handleReport}>
              <View style={[styles.optionIcon, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                <Feather name="flag" size={20} color="#ef4444" />
              </View>
              <Text style={[styles.optionText, { color: "#ef4444" }]}>Denunciar e Bloquear</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  optionsSheet: {
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    gap: 8
  },
  optionsHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12
  },
  optionsTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center"
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 10
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  optionText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15
  }
});
