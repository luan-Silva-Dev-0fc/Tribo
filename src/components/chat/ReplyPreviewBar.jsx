import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTheme } from "../../theme";

function SafeMiniStickerVideo({ url, style }) {
  const player = useVideoPlayer(url ? url : "", (p) => {
    p.loop = true;
    p.muted = true;
    if (url) {
      try { Promise.resolve(p.play()).catch(() => {}); } catch (e) {}
    }
  });

  if (!url) return null;

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export function ReplyPreviewBar({ replyMessage, onCancelReply }) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (replyMessage) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [replyMessage]);

  if (!replyMessage) return null;

  const senderName =
    replyMessage.user?.name ||
    replyMessage.sender?.name ||
    replyMessage.author?.name ||
    replyMessage.sender_name ||
    replyMessage.reply_sender_name ||
    replyMessage.user?.username ||
    replyMessage.sender?.username ||
    "Usuário";

  const rawType = String(
    replyMessage.media_type ||
      replyMessage.mediaType ||
      replyMessage.type ||
      replyMessage.reply_media_type ||
      "TEXT",
  ).toUpperCase();

  const isSticker =
    rawType === "STICKER" ||
    Boolean(replyMessage.sticker_id || replyMessage.stickerId);

  const isAudio =
    rawType === "AUDIO" ||
    Boolean(replyMessage.audio_url || replyMessage.audioUrl);

  const isVideo =
    rawType === "VIDEO" ||
    (typeof (
      replyMessage.media_url ||
      replyMessage.mediaUrl ||
      replyMessage.video_url ||
      replyMessage.videoUrl
    ) === "string" &&
      ((
        replyMessage.media_url ||
        replyMessage.mediaUrl ||
        replyMessage.video_url ||
        replyMessage.videoUrl
      ).endsWith(".mp4") ||
        (
          replyMessage.media_url ||
          replyMessage.mediaUrl ||
          replyMessage.video_url ||
          replyMessage.videoUrl
        ).includes("video")));

  const isImage = Boolean(
    !isSticker &&
    !isVideo &&
    !isAudio &&
    (replyMessage.media_url ||
      replyMessage.mediaUrl ||
      replyMessage.imageUrl ||
      replyMessage.image_url),
  );

  const previewUrl =
    replyMessage.media_url ||
    replyMessage.mediaUrl ||
    replyMessage.video_url ||
    replyMessage.videoUrl ||
    replyMessage.imageUrl ||
    replyMessage.image_url ||
    replyMessage.url ||
    null;

  const textBody =
    replyMessage.content ||
    replyMessage.text ||
    replyMessage.message ||
    replyMessage.body ||
    replyMessage.text_content ||
    replyMessage.reply_text ||
    "";

  const renderMediaInfo = () => {
    if (isSticker) {
      return (
        <View style={styles.mediaRow}>
          <MaterialCommunityIcons
            name="sticker-emoji"
            size={15}
            color="#f59e0b"
          />
          <Text
            style={[styles.contentText, { color: colors.text }]}
            numberOfLines={1}
          >
            {textBody || "Figurinha de vídeo"}
          </Text>
        </View>
      );
    }

    if (isAudio) {
      return (
        <View style={styles.mediaRow}>
          <Feather name="mic" size={14} color="#8b5cf6" />
          <Text
            style={[styles.contentText, { color: colors.text }]}
            numberOfLines={1}
          >
            {textBody || "Mensagem de voz"}
          </Text>
        </View>
      );
    }

    if (isVideo) {
      return (
        <View style={styles.mediaRow}>
          <Feather name="video" size={14} color="#3b82f6" />
          <Text
            style={[styles.contentText, { color: colors.text }]}
            numberOfLines={1}
          >
            {textBody || "Vídeo"}
          </Text>
        </View>
      );
    }

    if (isImage) {
      return (
        <View style={styles.mediaRow}>
          <Feather name="image" size={14} color="#0284c7" />
          <Text
            style={[styles.contentText, { color: colors.text }]}
            numberOfLines={1}
          >
            {textBody || "Foto"}
          </Text>
        </View>
      );
    }

    return (
      <Text
        style={[styles.contentText, { color: colors.text }]}
        numberOfLines={1}
      >
        {textBody || "Mensagem"}
      </Text>
    );
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor:
              colors.mode === "dark"
                ? "rgba(30, 41, 59, 0.95)"
                : "rgba(241, 245, 249, 0.98)",
            borderColor: colors.border || "#e2e8f0",
          },
        ]}
      >
        {/* Accent Bar Lateral */}
        <View
          style={[
            styles.accentLine,
            { backgroundColor: colors.primary || "#0284c7" },
          ]}
        />

        {/* Informações da Mensagem Citada */}
        <View style={styles.contentColumn}>
          <View style={styles.headerRow}>
            <Ionicons
              name="arrow-undo"
              size={13}
              color={colors.primary || "#0284c7"}
            />
            <Text style={[styles.headerLabel, { color: colors.muted }]}>
              Respondendo a
            </Text>
            <Text
              style={[
                styles.senderName,
                { color: colors.primary || "#0284c7" },
              ]}
              numberOfLines={1}
            >
              {senderName}
            </Text>
          </View>

          {renderMediaInfo()}
        </View>

        {/* Miniatura do Anexo / Figurinha */}
        {!!previewUrl && isSticker && (
          <SafeMiniStickerVideo url={previewUrl} style={styles.previewImage} />
        )}
        {!!previewUrl && isImage && (
          <Image
            source={{ uri: previewUrl }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        )}

        {/* Botão Fechar / Cancelar Resposta */}
        <Pressable
          onPress={onCancelReply}
          style={({ pressed }) => [
            styles.cancelBtn,
            {
              backgroundColor:
                colors.mode === "dark"
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.06)",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityLabel="Cancelar resposta"
        >
          <Feather name="x" size={16} color={colors.text} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  accentLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  contentColumn: {
    flex: 1,
    gap: 3,
    paddingLeft: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  headerLabel: {
    fontSize: 11.5,
    fontFamily: "Poppins_400Regular",
  },
  senderName: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  mediaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contentText: {
    fontSize: 12.5,
    fontFamily: "Poppins_400Regular",
  },
  previewImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  cancelBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
