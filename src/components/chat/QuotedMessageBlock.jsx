import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTheme } from "../../theme";

class VideoViewSafeGuard extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {}
  render() {
    if (this.state.hasError) {
      return <View style={[this.props.fallbackStyle || { width: 36, height: 36, backgroundColor: "#18181b", borderRadius: 6 }]} />;
    }
    return this.props.children;
  }
}

function SafeMiniStickerVideo({ url }) {
  const player = useVideoPlayer(url || "", (p) => {
    p.loop = true;
    p.muted = true;
    try {
      Promise.resolve(p.play()).catch(() => {});
    } catch (e) {}
  });

  if (!url) return null;

  return (
    <VideoViewSafeGuard fallbackStyle={styles.thumbnail}>
      <VideoView
        player={player}
        style={styles.thumbnail}
        contentFit="cover"
        nativeControls={false}
      />
    </VideoViewSafeGuard>
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
      "TEXT"
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
        (replyContext.preview_url || replyContext.media_url).includes("video")));

  const isImage =
    rawType === "IMAGE" ||
    Boolean(
      !isSticker &&
        !isVideo &&
        !isAudio &&
        (replyContext.preview_url ||
          replyContext.previewUrl ||
          replyContext.media_url ||
          replyContext.imageUrl)
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
      ? "Figurinha de vídeo"
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

  const headerColor = isMe ? "#ffffff" : "#38bdf8";
  const bodyColor = isMe ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.85)";
  const iconColor = isMe ? "#ffffff" : "#38bdf8";

  const renderMediaIconAndText = () => {
    switch (mediaType) {
      case "IMAGE":
        return (
          <View style={styles.mediaRow}>
            <Feather name="image" size={13} color={iconColor} />
            <Text style={[styles.summaryText, { color: bodyColor }]} numberOfLines={1} ellipsizeMode="tail">
              {textContent || "Foto"}
            </Text>
          </View>
        );

      case "VIDEO":
        return (
          <View style={styles.mediaRow}>
            <Feather name="video" size={13} color={iconColor} />
            <Text style={[styles.summaryText, { color: bodyColor }]} numberOfLines={1} ellipsizeMode="tail">
              {textContent || "Vídeo"}
            </Text>
          </View>
        );

      case "AUDIO":
        return (
          <View style={styles.mediaRow}>
            <Feather name="mic" size={13} color={isMe ? "#ffffff" : "#a855f7"} />
            <Text style={[styles.summaryText, { color: bodyColor }]} numberOfLines={1} ellipsizeMode="tail">
              {textContent || "Mensagem de voz"}
            </Text>
          </View>
        );

      case "STICKER":
        return (
          <View style={styles.mediaRow}>
            <MaterialCommunityIcons name="sticker-emoji" size={14} color={isMe ? "#ffffff" : "#f59e0b"} />
            <Text style={[styles.summaryText, { color: bodyColor }]} numberOfLines={1} ellipsizeMode="tail">
              {textContent || "Figurinha de vídeo"}
            </Text>
          </View>
        );

      default:
        return (
          <Text style={[styles.summaryText, { color: bodyColor }]} numberOfLines={1} ellipsizeMode="tail">
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
            replyContext.reply_to_id
        )
      }
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: isMe
            ? "rgba(0, 0, 0, 0.24)"
            : "rgba(255, 255, 255, 0.08)",
          borderLeftColor: isMe ? "#ffffff" : "#38bdf8",
          opacity: pressed ? 0.75 : 1
        }
      ]}
    >
      <View style={styles.contentColumn}>
        <View style={styles.headerRow}>
          <Ionicons name="arrow-undo" size={11} color={headerColor} />
          <Text
            style={[styles.senderName, { color: headerColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {senderName}
          </Text>
        </View>

        {renderMediaIconAndText()}
      </View>

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
      {mediaType === "AUDIO" && (
        <View style={[styles.thumbnail, styles.audioThumb, { backgroundColor: isMe ? "rgba(255,255,255,0.2)" : "rgba(168, 85, 247, 0.2)" }]}>
          <Feather name="headphones" size={16} color={isMe ? "#ffffff" : "#c084fc"} />
        </View>
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
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 6,
    gap: 8,
    width: "100%",
    alignSelf: "stretch",
    minWidth: 200
  },
  contentColumn: {
    flex: 1,
    minWidth: 0,
    gap: 3
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0
  },
  senderName: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    flexShrink: 1
  },
  mediaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0
  },
  summaryText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    flexShrink: 1
  },
  thumbnail: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)"
  },
  audioThumb: {
    alignItems: "center",
    justifyContent: "center"
  }
});