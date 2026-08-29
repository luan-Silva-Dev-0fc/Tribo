import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
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
      return (
        <View
          style={[
            this.props.fallbackStyle || {
              width: 38,
              height: 38,
              backgroundColor: "#18181b",
              borderRadius: 8
            }
          ]}
        />
      );
    }
    return this.props.children;
  }
}

function SafeMiniStickerVideo({ url, style }) {
  const player = useVideoPlayer(url || "", (p) => {
    p.loop = true;
    p.muted = true;
    try {
      Promise.resolve(p.play()).catch(() => {});
    } catch (e) {}
  });

  if (!url) return null;

  return (
    <VideoViewSafeGuard fallbackStyle={style}>
      <VideoView
        player={player}
        style={style}
        contentFit="cover"
        nativeControls={false}
      />
    </VideoViewSafeGuard>
  );
}

export function ReplyPreviewBar({ replyMessage, onCancelReply }) {
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (replyMessage) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 90,
        friction: 9,
        useNativeDriver: true
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
      "TEXT"
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
        replyMessage.image_url)
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
            size={14}
            color="#f59e0b"
          />
          <Text style={[styles.contentText, { color: colors.text }]} numberOfLines={1}>
            {textBody || "Figurinha de vídeo"}
          </Text>
        </View>
      );
    }

    if (isAudio) {
      return (
        <View style={styles.mediaRow}>
          <Feather name="mic" size={13} color="#a855f7" />
          <Text style={[styles.contentText, { color: colors.text }]} numberOfLines={1}>
            {textBody || "Mensagem de voz"}
          </Text>
        </View>
      );
    }

    if (isVideo) {
      return (
        <View style={styles.mediaRow}>
          <Feather name="video" size={13} color="#38bdf8" />
          <Text style={[styles.contentText, { color: colors.text }]} numberOfLines={1}>
            {textBody || "Vídeo"}
          </Text>
        </View>
      );
    }

    if (isImage) {
      return (
        <View style={styles.mediaRow}>
          <Feather name="image" size={13} color="#0284c7" />
          <Text style={[styles.contentText, { color: colors.text }]} numberOfLines={1}>
            {textBody || "Foto"}
          </Text>
        </View>
      );
    }

    return (
      <Text style={[styles.contentText, { color: colors.text }]} numberOfLines={1}>
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
                outputRange: [16, 0]
              })
            }
          ]
        }
      ]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: "#1e1e24",
            borderColor: "rgba(255, 255, 255, 0.1)"
          }
        ]}
      >
        {/* Linha de Destaque */}
        <View style={styles.accentLine} />

        <View style={styles.contentColumn}>
          <View style={styles.headerRow}>
            <Ionicons name="arrow-undo" size={12} color="#0284c7" />
            <Text style={styles.headerLabel}>Respondendo a</Text>
            <Text style={styles.senderName} numberOfLines={1}>
              {senderName}
            </Text>
          </View>

          {renderMediaInfo()}
        </View>

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
        {isAudio && (
          <View style={[styles.previewImage, styles.audioIconBox]}>
            <Feather name="headphones" size={16} color="#c084fc" />
          </View>
        )}

        <Pressable
          onPress={onCancelReply}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [
            styles.cancelBtn,
            {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              opacity: pressed ? 0.7 : 1
            }
          ]}
          accessibilityLabel="Cancelar resposta"
        >
          <Feather name="x" size={15} color="#ffffff" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    marginBottom: 4
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
    gap: 10
  },
  accentLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: "#0284c7"
  },
  contentColumn: {
    flex: 1,
    gap: 2,
    paddingLeft: 4
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  headerLabel: {
    fontSize: 11.5,
    fontFamily: "Poppins_400Regular",
    color: "rgba(255, 255, 255, 0.6)"
  },
  senderName: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: "#38bdf8"
  },
  mediaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  contentText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#ffffff"
  },
  previewImage: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)"
  },
  audioIconBox: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(168, 85, 247, 0.2)"
  },
  cancelBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center"
  }
});