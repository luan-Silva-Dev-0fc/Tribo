import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { Avatar, VerificationBadge } from "../ui/ui";
import { formatRelativeTime, userName } from "../../lib/format";
import { api } from "../../api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function SafeMediaVideoView({ url, style, nativeControls = true }) {
  if (!url || typeof url !== "string" || !url.trim()) return null;
  return (
    <ActiveMediaVideoViewInner
      url={url}
      style={style}
      nativeControls={nativeControls}
    />
  );
}

function ActiveMediaVideoViewInner({ url, style, nativeControls = true }) {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = false;
    try {
      Promise.resolve(p.play()).catch(() => {});
    } catch (e) {}
  });

  if (!isMountedRef.current || !player) {
    return <View style={[style, { backgroundColor: "#000000" }]} />;
  }

  return (
    <VideoView
      key={url}
      player={player}
      style={style}
      contentFit="contain"
      nativeControls={nativeControls}
      fullscreenOptions={{ enable: true }}
    />
  );
}

export function MediaViewerModal({
  visible,
  mediaUrl,
  mediaType = "image", // 'image' | 'video'
  post = null,
  media = null,
  onDelete = null,
  onClose,
}) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedText, setExpandedText] = useState(false);

  const videoRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const controlsFadeAnim = useRef(new Animated.Value(1)).current;

  // Zoom & Pan Animations for Image
  const scale = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const currentScale = useRef(1);
  const lastTap = useRef(null);

  const effectiveMedia = media || post || null;
  const effectiveMediaUrl =
    mediaUrl ||
    effectiveMedia?.url ||
    effectiveMedia?.media_url ||
    effectiveMedia?.mediaUrl ||
    effectiveMedia?.videoUrl ||
    effectiveMedia?.video_url ||
    effectiveMedia?.imageUrl ||
    effectiveMedia?.image_url;

  const isVideo =
    mediaType === "video" ||
    effectiveMedia?.type === "video" ||
    effectiveMedia?.media_type === "VIDEO" ||
    effectiveMedia?.mediaType === "VIDEO" ||
    effectiveMedia?.videoUrl ||
    effectiveMedia?.video_url ||
    (typeof effectiveMediaUrl === "string" &&
      (effectiveMediaUrl.endsWith(".mp4") ||
        effectiveMediaUrl.endsWith(".mov") ||
        effectiveMediaUrl.endsWith(".webm") ||
        effectiveMediaUrl.includes("video")));

  const author =
    effectiveMedia?.user ||
    effectiveMedia?.author ||
    effectiveMedia?.sender ||
    null;
  const authorName = author
    ? userName(author) || author.name || author.username
    : "Membro";
  const authorHandle = author?.username ? `${author.username.replace(/^@/, '')}` : "membro";
  const postDate =
    effectiveMedia?.created_at || effectiveMedia?.createdAt
      ? formatRelativeTime(effectiveMedia.created_at || effectiveMedia.createdAt)
      : "";
  const postContent = effectiveMedia?.content || "";
  const isGroupPost = !!effectiveMedia?.group_id;
  const downloadsCount = effectiveMedia?.downloads_count || 0;
  
  // Reset states on open/close
  useEffect(() => {
    if (visible) {
      setControlsVisible(true);
      setImageLoading(true);
      setExpandedText(false);
      currentScale.current = 1;
      scale.setValue(1);
      pan.setValue({ x: 0, y: 0 });

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim, scale, pan]);

  // Toggle Controls Visibility with animation
  const toggleControls = useCallback(() => {
    const nextState = !controlsVisible;
    setControlsVisible(nextState);
    Animated.timing(controlsFadeAnim, {
      toValue: nextState ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible, controlsFadeAnim]);

  // Handle Double Tap Zoom
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
      if (currentScale.current > 1) {
        currentScale.current = 1;
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
        ]).start();
      } else {
        currentScale.current = 2.2;
        Animated.spring(scale, { toValue: 2.2, useNativeDriver: true }).start();
      }
      lastTap.current = null;
    } else {
      lastTap.current = now;
      toggleControls();
    }
  }, [scale, pan, toggleControls]);

  // Pan Responder for Pinch / Drag
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        currentScale.current > 1 || Math.abs(gesture.dy) > 10,
      onPanResponderMove: (_, gesture) => {
        if (currentScale.current > 1) {
          pan.setValue({ x: gesture.dx, y: gesture.dy });
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (currentScale.current > 1) {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        } else if (Math.abs(gesture.dy) > 120 && Math.abs(gesture.dx) < 80) {
          // Swipe down or up to dismiss
          handleClose();
        }
      },
    })
  ).current;

  const handleClose = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose?.();
    });
  };

  const handleShare = async () => {
    if (!effectiveMediaUrl) return;
    try {
      if (Platform.OS === "web") {
        if (navigator.share) {
          await navigator.share({
            title: `Mídia por @${authorHandle} na Tribo`,
            text: postContent || "Confira esta publicação na Tribo!",
            url: effectiveMediaUrl,
          });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(effectiveMediaUrl);
          alert("Link copiado para a área de transferência!");
        }
      } else {
        await Share.share({
          message: postContent
            ? `${postContent}\n\n${effectiveMediaUrl}`
            : effectiveMediaUrl,
          url: effectiveMediaUrl,
        });
      }
    } catch (_) {}
  };

  const handleDownload = async () => {
    if (!effectiveMediaUrl || isDownloading) return;
    try {
      setIsDownloading(true);
      if (Platform.OS === "web") {
        try {
          const response = await fetch(effectiveMediaUrl);
          if (!response.ok) throw new Error("Network response was not ok");
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = isVideo ? "tribo-video.mp4" : "tribo-foto.jpg";
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch (e) {
          // Fallback para CORS blocking: abrir a imagem/vídeo em nova aba
          window.open(effectiveMediaUrl, "_blank");
        }
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          alert('Precisamos da permissão de galeria para salvar a mídia.');
          return;
        }

        const ext = isVideo ? "mp4" : "jpg";
        const fileUri = `${FileSystem.documentDirectory}tribo_${Date.now()}.${ext}`;
        const { uri } = await FileSystem.downloadAsync(effectiveMediaUrl, fileUri);
        
        await MediaLibrary.saveToLibraryAsync(uri);
        alert("Mídia salva na galeria!");
      }

      // Track download on the backend
      if (post?.id) {
        if (isGroupPost) {
          await api.groups.downloadPostMedia(post.group_id, post.id).catch(() => {});
        } else {
          await api.posts.download(post.id).catch(() => {});
        }
      }

    } catch (err) {
      console.warn("Erro ao baixar mídia:", err);
    } finally {
      setIsDownloading(false);
    }
  };



  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {/* Media Container */}
        <View style={styles.mediaContainer} {...panResponder.panHandlers}>
          {isVideo && visible && !!effectiveMediaUrl ? (
            <Pressable style={styles.videoTouch} onPress={toggleControls}>
              <SafeMediaVideoView
                url={effectiveMediaUrl}
                style={styles.fullVideo}
                nativeControls={true}
              />
            </Pressable>
          ) : (
            <Pressable style={styles.imageTouch} onPress={handleDoubleTap}>
              <Animated.Image
                source={{ uri: effectiveMediaUrl }}
                style={[
                  styles.fullImage,
                  {
                    transform: [
                      { scale: scale },
                      { translateX: pan.x },
                      { translateY: pan.y },
                    ],
                  },
                ]}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
              />
              {imageLoading && (
                <View style={styles.centerLoader}>
                  <ActivityIndicator size="large" color="#ffffff" />
                </View>
              )}
            </Pressable>
          )}
        </View>

        {/* Top Floating Header Controls */}
        <Animated.View
          style={[styles.topBar, { opacity: controlsFadeAnim }]}
          pointerEvents={controlsVisible ? "auto" : "none"}
        >
          <View style={styles.authorRow}>
            <Avatar user={author} size={38} />
            <View style={styles.authorTexts}>
              <View style={styles.nameLine}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {authorName}
                </Text>
                <VerificationBadge user={author} size={14} />
              </View>
              <Text style={styles.authorHandle} numberOfLines={1}>
                @{authorHandle} • {postDate}
              </Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <Pressable
              style={styles.iconButtonPill}
              onPress={handleShare}
              accessibilityLabel="Compartilhar"
            >
              <Feather name="share-2" size={19} color="#ffffff" />
            </Pressable>

            <Pressable
              style={styles.iconButtonPill}
              onPress={handleDownload}
              disabled={isDownloading}
              accessibilityLabel="Baixar mídia"
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="download" size={19} color="#ffffff" />
                  {downloadsCount > 0 && (
                    <Text style={{ color: "#ffffff", fontSize: 11, fontFamily: "Poppins_600SemiBold" }}>
                      {downloadsCount}
                    </Text>
                  )}
                </View>
              )}
            </Pressable>

            {Boolean(onDelete) && (
              <Pressable
                style={[
                  styles.iconButtonPill,
                  {
                    backgroundColor: "rgba(239, 68, 68, 0.25)",
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {
                  onDelete(effectiveMedia);
                }}
                accessibilityLabel="Opções de exclusão"
              >
                <Feather name="trash-2" size={18} color="#ef4444" />
              </Pressable>
            )}

            <Pressable
              style={[styles.iconButtonPill, styles.closePill]}
              onPress={handleClose}
              accessibilityLabel="Fechar visualizador"
            >
              <Feather name="x" size={22} color="#ffffff" />
            </Pressable>
          </View>
        </Animated.View>

        {/* Bottom Floating Info and Media Controls */}
        <Animated.View
          style={[styles.bottomBar, { opacity: controlsFadeAnim }]}
          pointerEvents={controlsVisible ? "auto" : "none"}
        >


          {!!postContent && (
            <Pressable
              onPress={() => setExpandedText(!expandedText)}
              style={styles.captionContainer}
            >
              <Text
                style={styles.captionText}
                numberOfLines={expandedText ? undefined : 2}
              >
                <Text style={styles.captionAuthor}>@{authorHandle} </Text>
                {postContent}
              </Text>
              {postContent.length > 90 && (
                <Text style={styles.seeMoreText}>
                  {expandedText ? "Menos" : "Mais"}
                </Text>
              )}
            </Pressable>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  imageTouch: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  videoTouch: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.82,
  },
  fullVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.82,
  },
  centerLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 32,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(20, 20, 20, 0.75)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    maxWidth: SCREEN_WIDTH * 0.55,
  },
  authorTexts: {
    flexShrink: 1,
  },
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  authorName: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  authorHandle: {
    color: "rgba(255, 255, 255, 0.65)",
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButtonPill: {
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(20, 20, 20, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  closePill: {
    paddingHorizontal: 0,
    width: 40,
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    borderColor: "rgba(239, 68, 68, 0.9)",
  },
  bottomBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 36 : 24,
    left: 16,
    right: 16,
    zIndex: 20,
    gap: 12,
  },
  videoControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20, 20, 20, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  videoControlBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  progressBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#1D9BF0",
    borderRadius: 2,
  },
  captionContainer: {
    backgroundColor: "rgba(20, 20, 20, 0.8)",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  captionAuthor: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  captionText: {
    color: "#e2e8f0",
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  seeMoreText: {
    color: "#1D9BF0",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    marginTop: 4,
  },
});
