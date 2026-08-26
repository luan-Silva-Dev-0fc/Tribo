import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTheme } from "../../theme";

function SafeMiniStickerVideo({ url }) {
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
      style={styles.thumbnail}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export function QuotedMessageBlock({ replyContext, isMe, onPress }) {
  const { colors } = useTheme();

  if (!replyContext) return null;

  const senderName =
    replyContext.sender_name ||
    replyContext.senderName ||
    replyContext.author_name ||
    replyContext.reply_sender_name ||
    replyContext.user?.name ||
    replyContext.sender?.name ||
    replyContext.author?.name ||
    replyContext.user?.username ||
    "Usuário";

  const rawType = String(
    replyContext.media_type ||
      replyContext.mediaType ||
      replyContext.reply_media_type ||
      replyContext.type ||
      "TEXT",
  ).toUpperCase();

  const isSticker =
    rawType === "STICKER" ||
    Boolean(replyContext.sticker_id || replyContext.stickerId);

  const isAudio =
    rawType === "AUDIO" ||
    Boolean(replyContext.audio_url || replyContext.audioUrl);

  const isVideo =
    rawType === "VIDEO" ||
    (typeof (replyContext.preview_url || replyContext.media_url) === "string" &&
      ((replyContext.preview_url || replyContext.media_url).endsWith(".mp4") ||
        (replyContext.preview_url || replyContext.media_url).includes(
          "video",
        )));

  const isImage =
    rawType === "IMAGE" ||
    Boolean(
      !isSticker &&
      !isVideo &&
      !isAudio &&
      (replyContext.preview_url ||
        replyContext.previewUrl ||
        replyContext.media_url ||
        replyContext.imageUrl),
    );

  const mediaType = isSticker
    ? "STICKER"
    : isAudio
      ? "AUDIO"
      : isVideo
        ? "VIDEO"
        : isImage
          ? "IMAGE"
          : "TEXT";

  const textContent =
    replyContext.text_content ||
    replyContext.textContent ||
    replyContext.reply_text ||
    replyContext.replyText ||
    replyContext.text ||
    replyContext.content ||
    replyContext.message ||
    replyContext.body ||
    (isSticker
      ? "Figurinha"
      : isAudio
        ? "Mensagem de voz"
        : isVideo
          ? "Vídeo"
          : isImage
            ? "Foto"
            : "Mensagem");

  const previewUrl =
    replyContext.preview_url ||
    replyContext.previewUrl ||
    replyContext.media_url ||
    replyContext.video_url ||
    replyContext.imageUrl ||
    null;

  const renderMediaIconAndText = () => {
    switch (mediaType) {
      case "IMAGE":
        return (
          <View style={styles.mediaRow}>
            <Feather
              name="image"
              size={13}
              color={isMe ? "#0369a1" : colors.muted}
            />
            <Text
              style={[
                styles.summaryText,
                { color: isMe ? "#0369a1" : colors.muted },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {textContent || "Foto"}
            </Text>
          </View>
        );
      case "VIDEO":
        return (
          <View style={styles.mediaRow}>
            <Feather
              name="video"
              size={13}
              color={isMe ? "#0369a1" : colors.muted}
            />
            <Text
              style={[
                styles.summaryText,
                { color: isMe ? "#0369a1" : colors.muted },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {textContent || "Vídeo"}
            </Text>
          </View>
        );
      case "AUDIO":
        return (
          <View style={styles.mediaRow}>
            <Feather
              name="mic"
              size={13}
              color={isMe ? "#0369a1" : colors.muted}
            />
            <Text
              style={[
                styles.summaryText,
                { color: isMe ? "#0369a1" : colors.muted },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {textContent || "Mensagem de voz"}
            </Text>
          </View>
        );
      case "STICKER":
        return (
          <View style={styles.mediaRow}>
            <MaterialCommunityIcons
              name="sticker-emoji"
              size={14}
              color={isMe ? "#0369a1" : "#f59e0b"}
            />
            <Text
              style={[
                styles.summaryText,
                { color: isMe ? "#0369a1" : colors.text },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {textContent || "Figurinha"}
            </Text>
          </View>
        );
      default:
        return (
          <Text
            style={[
              styles.summaryText,
              { color: isMe ? "#0369a1" : colors.subtext || colors.muted },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {textContent || "Mensagem"}
          </Text>
        );
    }
  };

  return (
    <Pressable
      onPress={() =>
        onPress?.(
          replyContext.id ||
            replyContext.message_id ||
            replyContext.reply_to_id,
        )
      }
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isMe
            ? "rgba(2, 132, 199, 0.12)"
            : colors.mode === "dark"
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(0, 0, 0, 0.04)",
          borderLeftColor: isMe ? "#0284c7" : colors.primary || "#0284c7",
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={styles.contentColumn}>
        <View style={styles.headerRow}>
          <Ionicons
            name="return-down-forward"
            size={11}
            color={isMe ? "#0284c7" : colors.primary || "#0284c7"}
          />
          <Text
            style={[
              styles.senderName,
              { color: isMe ? "#0284c7" : colors.primary || "#0284c7" },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {senderName}
          </Text>
        </View>

        {renderMediaIconAndText()}
      </View>

      {/* Miniatura do Anexo / Figurinha */}
      {!!previewUrl && mediaType === "STICKER" && (
        <SafeMiniStickerVideo url={previewUrl} />
      )}
      {!!previewUrl && mediaType === "IMAGE" && (
        <Image
          source={{ uri: previewUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeftWidth: 3.5,
    borderRadius: 8,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginBottom: 6,
    gap: 8,
    width: "100%",
    alignSelf: "stretch",
    minWidth: 190,
  },
  contentColumn: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  senderName: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    flexShrink: 1,
  },
  mediaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },
  summaryText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    flexShrink: 1,
  },
  thumbnail: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
});
