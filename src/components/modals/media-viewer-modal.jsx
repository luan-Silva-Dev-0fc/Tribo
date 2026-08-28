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
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  mediaType = "image",
  post = null,
  media = null,
  onDelete = null,
  onClose
}) {
  const insets = useSafeAreaInsets();
  const [controlsVisible, setControlsVisible] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [expandedText, setExpandedText] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const controlsFadeAnim = useRef(new Animated.Value(1)).current;
  const dismissTranslateY = useRef(new Animated.Value(0)).current;

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
    (typeof effectiveMediaUrl === "string" && (
      effectiveMediaUrl.endsWith(".mp4") ||
      effectiveMediaUrl.endsWith(".mov") ||
      effectiveMediaUrl.endsWith(".webm") ||
      effectiveMediaUrl.includes("video")
    ));

  const author =
    effectiveMedia?.user ||
    effectiveMedia?.author ||
    effectiveMedia?.sender ||
    null;
  const authorName = author ?
    (userName(author) || author.name || author.username) :
    "Membro";
  const authorHandle = author?.username ? `${author.username.replace(/^@/, '')}` : "membro";
  const postDate =
    effectiveMedia?.created_at || effectiveMedia?.createdAt ?
    formatRelativeTime(effectiveMedia.created_at || effectiveMedia.createdAt) :
    "";
  const postContent = effectiveMedia?.content || "";
  const isGroupPost = !!effectiveMedia?.group_id;
  const downloadsCount = effectiveMedia?.downloads_count || 0;

  useEffect(() => {
    if (visible) {
      setControlsVisible(true);
      setImageLoading(true);
      setExpandedText(false);
      currentScale.current = 1;
      scale.setValue(1);
      pan.setValue({ x: 0, y: 0 });
      dismissTranslateY.setValue(0);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      }).start();
    }
  }, [visible, fadeAnim, scale, pan, dismissTranslateY]);

  const toggleControls = useCallback(() => {
    const nextState = !controlsVisible;
    setControlsVisible(nextState);
    Animated.timing(controlsFadeAnim, {
      toValue: nextState ? 1 : 0,
      duration: 180,
      useNativeDriver: true
    }).start();
  }, [controlsVisible, controlsFadeAnim]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap.current && now - lastTap.current < DOUBLE_PRESS_DELAY) {
      if (currentScale.current > 1) {
        currentScale.current = 1;
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true })
        ]).start();
      } else {
        currentScale.current = 2.4;
        Animated.spring(scale, { toValue: 2.4, useNativeDriver: true }).start();
      }
      lastTap.current = null;
    } else {
      lastTap.current = now;
      toggleControls();
    }
  }, [scale, pan, toggleControls]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      }),
      Animated.timing(dismissTranslateY, {
        toValue: SCREEN_HEIGHT * 0.4,
        duration: 180,
        useNativeDriver: true
      })
    ]).start(() => {
      dismissTranslateY.setValue(0);
      onClose?.();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        currentScale.current > 1 || Math.abs(gesture.dy) > 8,
      onPanResponderMove: (_, gesture) => {
        if (currentScale.current > 1) {
          pan.setValue({ x: gesture.dx, y: gesture.dy });
        } else if (gesture.dy > 0) {
          dismissTranslateY.setValue(gesture.dy);
          const newOpacity = Math.max(0.3, 1 - gesture.dy / (SCREEN_HEIGHT * 0.7));
          fadeAnim.setValue(newOpacity);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (currentScale.current > 1) {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        } else if (gesture.dy > 110 || gesture.vy > 0.8) {
          handleClose();
        } else {
          Animated.parallel([
            Animated.spring(dismissTranslateY, { toValue: 0, useNativeDriver: true }),
            Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true })
          ]).start();
        }
      }
    })
  ).current;

  const handleShare = async () => {
    if (!effectiveMediaUrl) return;
    try {
      if (Platform.OS === "web") {
        if (navigator.share) {
          await navigator.share({
            title: `Mídia por @${authorHandle} na Tribo`,
            text: postContent || "Confira esta publicação na Tribo!",
            url: effectiveMediaUrl
          });
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(effectiveMediaUrl);
          alert("Link copiado para a área de transferência!");
        }
      } else {
        await Share.share({
          message: postContent ?
            `${postContent}\n\n${effectiveMediaUrl}` :
            effectiveMediaUrl,
          url: effectiveMediaUrl
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

  const topInset = Math.max(
    insets.top || 0,
    Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 44
  ) + 6;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent>
      
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
      
      <View style={styles.overlay}>
        {/* Media Container */}
        <Animated.View
          style={[
            styles.mediaContainer,
            {
              transform: [
                { translateY: dismissTranslateY }
              ]
            }
          ]}
          {...panResponder.panHandlers}>
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
                      { translateY: pan.y }
                    ]
                  }
                ]}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
              />

              {imageLoading && (
                <View style={styles.centerLoader}>
                  <ActivityIndicator size="large" color="#F59E0B" />
                </View>
              )}
            </Pressable>
          )}
        </Animated.View>

        {/* Top Floating Glass Header + Caption */}
        <Animated.View
          style={[
            styles.topHeaderContainer,
            {
              top: topInset,
              opacity: controlsFadeAnim
            }
          ]}
          pointerEvents={controlsVisible ? "auto" : "none"}>
          
          {/* Row 1: Author Pill + Actions */}
          <View style={styles.topBarRow}>
            {/* Author Glass Pill */}
            <View style={styles.authorPill}>
              <Avatar user={author} size={36} style={styles.avatarBorder} />
              <View style={styles.authorTexts}>
                <View style={styles.nameLine}>
                  <Text style={styles.authorName} numberOfLines={1}>
                    {authorName}
                  </Text>
                  <VerificationBadge user={author} size={13} />
                </View>
                <Text style={styles.authorHandle} numberOfLines={1}>
                  @{authorHandle}{postDate ? ` • ${postDate}` : ""}
                </Text>
              </View>
            </View>

            {/* Top Actions: Share, Download, Delete, Close */}
            <View style={styles.topActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionCircle,
                  { transform: [{ scale: pressed ? 0.92 : 1 }] }
                ]}
                onPress={handleShare}
                accessibilityLabel="Compartilhar">
                <Feather name="share-2" size={18} color="#ffffff" />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.actionCircle,
                  { transform: [{ scale: pressed ? 0.92 : 1 }] }
                ]}
                onPress={handleDownload}
                disabled={isDownloading}
                accessibilityLabel="Baixar mídia">
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                  <View style={styles.downloadContent}>
                    <Feather name="download" size={18} color="#ffffff" />
                    {downloadsCount > 0 && (
                      <Text style={styles.downloadCountText}>
                        {downloadsCount}
                      </Text>
                    )}
                  </View>
                )}
              </Pressable>

              {Boolean(onDelete) && (
                <Pressable
                  style={({ pressed }) => [
                    styles.actionCircle,
                    styles.deleteCircle,
                    { transform: [{ scale: pressed ? 0.92 : 1 }] }
                  ]}
                  onPress={() => onDelete(effectiveMedia)}
                  accessibilityLabel="Excluir mídia">
                  <Feather name="trash-2" size={17} color="#ef4444" />
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.actionCircle,
                  styles.closeCircle,
                  { transform: [{ scale: pressed ? 0.92 : 1 }] }
                ]}
                onPress={handleClose}
                accessibilityLabel="Fechar visualizador">
                <Feather name="x" size={20} color="#ffffff" />
              </Pressable>
            </View>
          </View>

          {/* Row 2: Caption Card at the Top (Cleanly positioned under Author & Actions) */}
          {!!postContent && (
            <Pressable
              onPress={() => setExpandedText(!expandedText)}
              style={styles.topCaptionCard}>
              <Text
                style={styles.captionText}
                numberOfLines={expandedText ? undefined : 3}>
                <Text style={styles.captionAuthor}>@{authorHandle} </Text>
                {postContent}
              </Text>
              {postContent.length > 80 && (
                <Text style={styles.seeMoreText}>
                  {expandedText ? "Ver menos" : "Ver mais"}
                </Text>
              )}
            </Pressable>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center"
  },
  mediaContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center"
  },
  imageTouch: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center"
  },
  videoTouch: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center"
  },
  fullImage: {
    width: "100%",
    height: "100%"
  },
  fullVideo: {
    width: "100%",
    height: "100%"
  },
  centerLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center"
  },
  topHeaderContainer: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 20,
    gap: 10
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  authorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(22, 22, 26, 0.85)",
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    maxWidth: SCREEN_WIDTH * 0.54,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6
  },
  avatarBorder: {
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)"
  },
  authorTexts: {
    flexShrink: 1
  },
  nameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  authorName: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12.5,
    letterSpacing: 0.1
  },
  authorHandle: {
    color: "rgba(255, 255, 255, 0.65)",
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  actionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(22, 22, 26, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6
  },
  closeCircle: {
    backgroundColor: "rgba(35, 35, 40, 0.88)",
    borderColor: "rgba(255, 255, 255, 0.18)"
  },
  deleteCircle: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "rgba(239, 68, 68, 0.4)"
  },
  downloadContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3
  },
  downloadCountText: {
    color: "#ffffff",
    fontSize: 10.5,
    fontFamily: "Poppins_600SemiBold"
  },
  topCaptionCard: {
    backgroundColor: "rgba(20, 20, 24, 0.85)",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6
  },
  captionAuthor: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  },
  captionText: {
    color: "#e2e8f0",
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 19
  },
  seeMoreText: {
    color: "#F59E0B",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    marginTop: 5
  }
});