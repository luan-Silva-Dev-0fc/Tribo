import React from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";

export function MediaContextMenuSheet({
  visible,
  message,
  currentUser,
  isGroupAdmin = false,
  onReply,
  onSaveToGallery,
  onSaveSticker,
  onDeleteForMe,
  onDeleteForEveryone,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  if (!message) return null;

  const senderId =
    message.user_id ||
    message.userId ||
    message.sender?.id ||
    message.user?.id ||
    message.author?.id ||
    message.author_id;

  const currentUserId =
    currentUser?.id ||
    currentUser?.userId ||
    currentUser?._id ||
    currentUser?.sub;

  const isAuthor = Boolean(
    senderId && currentUserId && String(senderId) === String(currentUserId)
  );

  const canDeleteForEveryone = Boolean(isAuthor || isGroupAdmin);

  const urlStr = String(
    message.media_url ||
    message.mediaUrl ||
    message.video_url ||
    message.videoUrl ||
    message.url ||
    ""
  ).toLowerCase();

  const isSticker = Boolean(
    message.media_type === "STICKER" ||
    message.mediaType === "STICKER" ||
    message.type === "STICKER" ||
    message.sticker_id ||
    message.stickerId
  );

  const isVideo = Boolean(
    !isSticker && (
      message.media_type === "VIDEO" ||
      message.mediaType === "VIDEO" ||
      message.type === "VIDEO" ||
      urlStr.endsWith(".mp4") ||
      urlStr.endsWith(".mov") ||
      urlStr.endsWith(".webm") ||
      urlStr.includes("/videos/") ||
      urlStr.includes("video")
    )
  );

  const isPhoto = Boolean(
    (message.media_url || message.mediaUrl) && !isVideo && !isSticker
  );

  const mediaUrl = message.media_url || message.mediaUrl || message.video_url || message.url;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max((insets?.bottom || 0) + 20, 32) },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Barra superior de arraste */}
          <View style={styles.dragPill} />

          {/* Cabeçalho da Mídia / Mensagem */}
          <View style={styles.headerRow}>
            {isPhoto && mediaUrl ? (
              <Image source={{ uri: mediaUrl }} style={styles.headerThumb} resizeMode="cover" />
            ) : isVideo ? (
              <View style={[styles.headerThumb, styles.iconThumb]}>
                <Ionicons name="videocam" size={20} color="#38bdf8" />
              </View>
            ) : isSticker ? (
              <View style={[styles.headerThumb, styles.iconThumb]}>
                <MaterialCommunityIcons name="sticker-emoji" size={20} color="#f59e0b" />
              </View>
            ) : (
              <View style={[styles.headerThumb, styles.iconThumb]}>
                <Ionicons name="chatbubble-ellipses" size={20} color="#a1a1aa" />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {isPhoto
                  ? "Opções da Foto"
                  : isVideo
                  ? "Opções do Vídeo"
                  : isSticker
                  ? "Opções da Figurinha"
                  : "Opções da Mensagem"}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {message.user?.name || message.sender?.name || "Mensagem de grupo"}
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#a1a1aa" />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* Lista de Ações Modernas */}
          <View style={styles.optionsList}>
            {/* 1. Responder */}
            <Pressable
              style={({ pressed }) => [
                styles.optionItem,
                { backgroundColor: pressed ? "rgba(255,255,255,0.06)" : "transparent" },
              ]}
              onPress={() => {
                onClose();
                onReply?.(message);
              }}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: "rgba(56, 189, 248, 0.12)" }]}>
                <Ionicons name="arrow-undo-outline" size={19} color="#38bdf8" />
              </View>
              <Text style={styles.optionText}>Responder</Text>
            </Pressable>

            {/* 2. Salvar na Galeria (Foto) */}
            {isPhoto && (
              <Pressable
                style={({ pressed }) => [
                  styles.optionItem,
                  { backgroundColor: pressed ? "rgba(255,255,255,0.06)" : "transparent" },
                ]}
                onPress={() => {
                  onClose();
                  onSaveToGallery?.(message, "image");
                }}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: "rgba(34, 197, 94, 0.12)" }]}>
                  <Ionicons name="download-outline" size={19} color="#22c55e" />
                </View>
                <Text style={styles.optionText}>Salvar na Galeria</Text>
              </Pressable>
            )}

            {/* 3. Baixar Vídeo (Vídeo) */}
            {isVideo && (
              <Pressable
                style={({ pressed }) => [
                  styles.optionItem,
                  { backgroundColor: pressed ? "rgba(255,255,255,0.06)" : "transparent" },
                ]}
                onPress={() => {
                  onClose();
                  onSaveToGallery?.(message, "video");
                }}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: "rgba(34, 197, 94, 0.12)" }]}>
                  <Ionicons name="arrow-down-circle-outline" size={19} color="#22c55e" />
                </View>
                <Text style={styles.optionText}>Baixar Vídeo</Text>
              </Pressable>
            )}

            {/* 4. Salvar Figurinha (Sticker) */}
            {isSticker && (
              <Pressable
                style={({ pressed }) => [
                  styles.optionItem,
                  { backgroundColor: pressed ? "rgba(255,255,255,0.06)" : "transparent" },
                ]}
                onPress={() => {
                  onClose();
                  onSaveSticker?.(message);
                }}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}>
                  <Ionicons name="star-outline" size={19} color="#f59e0b" />
                </View>
                <Text style={styles.optionText}>Salvar Figurinha</Text>
              </Pressable>
            )}

            <View style={styles.subDivider} />

            {/* 5. Apagar para mim */}
            <Pressable
              style={({ pressed }) => [
                styles.optionItem,
                { backgroundColor: pressed ? "rgba(255,255,255,0.06)" : "transparent" },
              ]}
              onPress={() => {
                onClose();
                onDeleteForMe?.(message);
              }}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: "rgba(255, 255, 255, 0.08)" }]}>
                <Ionicons name="trash-outline" size={19} color="#e4e4e7" />
              </View>
              <Text style={styles.optionText}>Apagar para mim</Text>
            </Pressable>

            {/* 6. Apagar para todos (Autor / Admin) */}
            {canDeleteForEveryone && (
              <Pressable
                style={({ pressed }) => [
                  styles.optionItem,
                  { backgroundColor: pressed ? "rgba(239, 68, 68, 0.08)" : "transparent" },
                ]}
                onPress={() => {
                  onClose();
                  onDeleteForEveryone?.(message);
                }}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: "rgba(239, 68, 68, 0.14)" }]}>
                  <MaterialCommunityIcons name="trash-can-outline" size={19} color="#ff4444" />
                </View>
                <Text style={[styles.optionText, { color: "#ff4444", fontFamily: "Poppins_600SemiBold" }]}>
                  Apagar para todos
                </Text>
              </Pressable>
            )}
          </View>

          {/* Botão Cancelar */}
          <Pressable
            style={({ pressed }) => [
              styles.cancelBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={onClose}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#121214",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  headerThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  iconThumb: {
    backgroundColor: "#1f1f23",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
  headerSubtitle: {
    color: "#a1a1aa",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginVertical: 10,
  },
  subDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    marginVertical: 4,
  },
  optionsList: {
    gap: 4,
    marginBottom: 14,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    color: "#ffffff",
    fontSize: 14.5,
    fontFamily: "Poppins_500Medium",
  },
  cancelBtn: {
    backgroundColor: "#1f1f23",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  cancelBtnText: {
    color: "#a1a1aa",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
});
