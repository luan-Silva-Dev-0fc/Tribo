import React, { useState, useRef, useEffect } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import { isReelSaved, toggleSaveReel } from "./SavedReelsModal";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const ReelItem = React.memo(function ReelItem({
  item,
  isActive,
  shouldPreload,
  onToggleLike,
  onMoreLikeThis,
  onNotInterested,
  onOpenPreferences,
  onOpenShare,
  onToggleSave,
  containerHeight
}) {
  const [liked, setLiked] = useState(item.isLiked || false);
  const [likesCount, setLikesCount] = useState(item.likesCount || 0);
  const [saved, setSaved] = useState(false);
  const [isExpandedTitle, setIsExpandedTitle] = useState(false);
  const [moreLikeActive, setMoreLikeActive] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  const webViewRef = useRef(null);
  const posterOpacity = useRef(new Animated.Value(1)).current;

  const shouldMountPlayer = isActive || shouldPreload;

  useEffect(() => {
    const vId = item.videoId || item.video_id;
    if (vId) {
      isReelSaved(vId).then((res) => setSaved(res));
    }
  }, [item.videoId, item.video_id]);

  useEffect(() => {
    if (isActive && isReady) {
      Animated.timing(posterOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    } else if (!isActive) {
      posterOpacity.setValue(1);
      setIsReady(false);
    }
  }, [isActive, isReady, posterOpacity]);

  useEffect(() => {
    if (!isActive) {
      setIsPlaying(false);
      setShowOptions(false);

      if (Platform.OS !== "web" && webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          var iframes = document.getElementsByTagName('iframe');
          if (iframes.length > 0) {
            iframes[0].contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          }
          true;
        `);
      }
    } else {
      setIsPlaying(true);

      if (Platform.OS !== "web" && webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          var iframes = document.getElementsByTagName('iframe');
          if (iframes.length > 0) {
            iframes[0].contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          }
          true;
        `);
      }
      const safetyTimer = setTimeout(() => setIsReady(true), 400);
      return () => clearTimeout(safetyTimer);
    }
  }, [isActive]);

  function handleVideoTap() {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    if (Platform.OS !== "web" && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        var msg = '{"event":"command","func":"${nextPlaying ? 'playVideo' : 'pauseVideo'}","args":""}';
        var iframes = document.getElementsByTagName('iframe');
        if (iframes.length > 0) {
          iframes[0].contentWindow.postMessage(msg, '*');
        }
        true;
      `);
    } else if (Platform.OS === "web") {
      const iframe = document.getElementById(`youtube-iframe-${item.videoId}`);
      if (iframe) {
        iframe.contentWindow.postMessage('{"event":"command","func":"' + (nextPlaying ? 'playVideo' : 'pauseVideo') + '","args":""}', '*');
      }
    }
  }

  const heartScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;
  const moreLikeScale = useRef(new Animated.Value(1)).current;
  const hideScale = useRef(new Animated.Value(1)).current;
  const bigHeartScale = useRef(new Animated.Value(0)).current;
  const bigHeartOpacity = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef(null);

  const itemHeight = containerHeight || SCREEN_HEIGHT;

  function handleScreenPress() {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_PRESS_DELAY) {
      clearTimeout(tapTimeoutRef.current);
      lastTapRef.current = 0;
      handleDoubleTapLike();
    } else {
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        if (isReady) handleVideoTap();
      }, DOUBLE_PRESS_DELAY);
    }
  }

  function handleDoubleTapLike() {
    bigHeartScale.setValue(0.5);
    bigHeartOpacity.setValue(1);

    Animated.parallel([
      Animated.spring(bigHeartScale, {
        toValue: 1.2,
        friction: 4,
        useNativeDriver: true
      }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(bigHeartOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ])
    ]).start();

    if (!liked) {
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
        Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true })
      ]).start();

      setLiked(true);
      setLikesCount((prev) => prev + 1);

      if (onToggleLike) {
        onToggleLike(item.videoId, item.category);
      }
    }
  }

  async function handleLike() {
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.35,
        duration: 120,
        useNativeDriver: true
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true
      })
    ]).start();

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    if (onToggleLike) {
      onToggleLike(item.videoId, item.category);
    }
  }

  async function handleSave() {
    Animated.sequence([
      Animated.timing(bookmarkScale, {
        toValue: 1.35,
        duration: 120,
        useNativeDriver: true
      }),
      Animated.spring(bookmarkScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true
      })
    ]).start();

    const isNowSaved = await toggleSaveReel(item);
    setSaved(isNowSaved);

    if (onToggleSave) {
      onToggleSave(item, isNowSaved);
    }
  }

  async function handleMoreLikeThis() {
    Animated.sequence([
      Animated.timing(moreLikeScale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.spring(moreLikeScale, { toValue: 1, friction: 4, useNativeDriver: true })
    ]).start();

    setMoreLikeActive(true);
    if (onMoreLikeThis) {
      onMoreLikeThis(item.videoId, item.category);
    }
    setTimeout(() => setMoreLikeActive(false), 2500);
  }

  async function handleNotInterested() {
    Animated.sequence([
      Animated.timing(hideScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(hideScale, { toValue: 1, friction: 4, useNativeDriver: true })
    ]).start();

    if (onNotInterested) {
      onNotInterested(item.videoId, item.category);
    }
  }

  function handleShare() {
    if (onOpenShare) {
      onOpenShare(item);
    } else {
      try {
        const shareUrl = item.videoUrl || `https://www.youtube.com/shorts/${item.videoId}`;
        Share.share({
          message: `${item.title}\n\nAssista no Tribo: ${shareUrl}`,
          url: shareUrl
        });
      } catch (err) {
        console.warn("Erro ao compartilhar reel:", err.message);
      }
    }
  }

  function handleOpenYoutube() {
    const url = item.videoUrl || `https://www.youtube.com/shorts/${item.videoId}`;
    Linking.openURL(url).catch(() => {});
  }

  const embedHtml = React.useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html { width: 100%; height: 100%; background-color: #000; overflow: hidden; }
          .video-container {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            overflow: hidden;
            background-color: #000;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          iframe {
            position: absolute;
            top: 50%; left: 50%;
            width: 100vw;
            height: 177.77vw;
            min-height: 100vh;
            min-width: 56.25vh;
            transform: translate(-50%, -50%);
            border: 0;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="video-container">
          <iframe 
            id="ytplayer"
            src="https://www.youtube.com/embed/${item.videoId}?autoplay=${isActive ? 1 : 0}&mute=0&controls=0&loop=1&playlist=${item.videoId}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&disablekb=1&fs=0&iv_load_policy=3&showinfo=0&autohide=1&origin=https://lonelycpp.github.io" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        </div>
      </body>
    </html>
  `, [item.videoId, isActive]);

  return (
    <View style={[styles.container, { height: itemHeight }]}>
      <View style={StyleSheet.absoluteFillObject}>
        {shouldMountPlayer && (
          Platform.OS === "web" ? (
            <iframe
              id={`youtube-iframe-${item.videoId}`}
              onLoad={() => {
                setTimeout(() => setIsReady(true), 200);
              }}
              src={`https://www.youtube.com/embed/${item.videoId}?autoplay=${isActive ? 1 : 0}&mute=${isActive ? 0 : 1}&controls=0&loop=1&playlist=${item.videoId}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&disablekb=1&fs=0&iv_load_policy=3&showinfo=0&autohide=1`}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                backgroundColor: "#000000",
                position: "absolute",
                zIndex: 1
              }}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <WebView
              ref={webViewRef}
              source={{
                html: embedHtml,
                baseUrl: "https://lonelycpp.github.io"
              }}
              onLoad={() => {
                setTimeout(() => setIsReady(true), 350);
              }}
              style={[StyleSheet.absoluteFillObject, { zIndex: 1, backgroundColor: "#000000" }]}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              cacheEnabled={true}
              cacheMode="LOAD_DEFAULT"
              scrollEnabled={false}
              bounces={false}
              overScrollMode="never"
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              androidLayerType="hardware"
              androidHardwareAccelerationDisabled={false}
              originWhitelist={["*"]}
            />
          )
        )}

        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            { zIndex: 2, opacity: posterOpacity }
          ]}>
          <Image
            source={{ uri: `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg` }}
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000000" }]}
            resizeMode="cover"
          />
        </Animated.View>
      </View>

      <Pressable
        style={[StyleSheet.absoluteFillObject, { zIndex: 1, justifyContent: "center", alignItems: "center" }]}
        onPress={handleScreenPress}>
        <Animated.View
          style={{
            position: "absolute",
            opacity: bigHeartOpacity,
            transform: [{ scale: bigHeartScale }]
          }}>
          <Ionicons name="heart" size={120} color="#ef4444" style={styles.playIconShadow} />
        </Animated.View>
      </Pressable>

      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "transparent"]}
        style={[styles.topGradient, { pointerEvents: "none" }]}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.92)"]}
        style={[styles.bottomGradient, { pointerEvents: "none" }]}
      />

      <View style={styles.rightActions}>
        {showOptions && (
          <>
            <Pressable onPress={handleMoreLikeThis} style={styles.actionBtn}>
              <Animated.View style={[styles.actionIconContainer, { transform: [{ scale: moreLikeScale }] }]}>
                <Ionicons name="sparkles" size={28} color={moreLikeActive ? "#f59e0b" : "#ffffff"} />
              </Animated.View>
              <Text style={styles.actionCount}>{moreLikeActive ? "Anotado!" : "Mais disso"}</Text>
            </Pressable>

            <Pressable onPress={handleNotInterested} style={styles.actionBtn}>
              <Animated.View style={[styles.actionIconContainer, { transform: [{ scale: hideScale }] }]}>
                <Ionicons name="eye-off-outline" size={28} color="#ffffff" />
              </Animated.View>
              <Text style={styles.actionCount}>Ocultar</Text>
            </Pressable>

            <Pressable onPress={onOpenPreferences} style={styles.actionBtn}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="options-outline" size={28} color="#ffffff" />
              </View>
              <Text style={styles.actionCount}>Filtros</Text>
            </Pressable>
          </>
        )}

        <Pressable onPress={handleLike} style={styles.actionBtn}>
          <Animated.View style={[styles.actionIconContainer, { transform: [{ scale: heartScale }] }]}>
            <Ionicons name={liked ? "heart" : "heart"} size={36} color={liked ? "#ef4444" : "#ffffff"} />
          </Animated.View>
          <Text style={styles.actionCount}>{likesCount > 0 ? likesCount : "Curtir"}</Text>
        </Pressable>

        <Pressable onPress={handleShare} style={styles.actionBtn}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="share-social" size={32} color="#ffffff" />
          </View>
          <Text style={styles.actionCount}>Enviar</Text>
        </Pressable>

        <Pressable onPress={handleSave} style={styles.actionBtn}>
          <Animated.View style={[styles.actionIconContainer, { transform: [{ scale: bookmarkScale }] }]}>
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={32} color={saved ? "#f59e0b" : "#ffffff"} />
          </Animated.View>
          <Text style={[styles.actionCount, saved && { color: "#f59e0b" }]}>{saved ? "Salvo" : "Salvar"}</Text>
        </Pressable>

        <Pressable onPress={() => setShowOptions(!showOptions)} style={styles.actionBtn}>
          <View style={styles.actionIconContainer}>
            <Ionicons name={showOptions ? "close" : "ellipsis-horizontal"} size={30} color="#ffffff" />
          </View>
          <Text style={styles.actionCount}>{showOptions ? "Fechar" : "Mais"}</Text>
        </Pressable>
      </View>

      <View style={styles.bottomInfoContainer}>
        <View style={styles.categoryBadgeRow}>
          <View style={styles.categoryBadge}>
            <Image
              source={{ uri: item.categoryIconUrl || `https://pub-08d4ac7de5354fadbfe07fcbc70237ba.r2.dev/${item.category}.png` }}
              style={styles.categoryBadgeIcon}
              resizeMode="contain"
            />
            <Text style={styles.categoryBadgeText}>{item.categoryLabel || item.category}</Text>
          </View>

          <Pressable onPress={handleOpenYoutube} style={styles.youtubeLinkBtn}>
            <Ionicons name="logo-youtube" size={14} color="#ff0000" />
            <Text style={styles.youtubeLinkText}>YouTube</Text>
          </Pressable>
        </View>

        <Text style={styles.channelName}>
          @{item.channel || item.channelTitle || "YouTube"}
        </Text>

        <Pressable onPress={() => setIsExpandedTitle(!isExpandedTitle)}>
          <Text numberOfLines={isExpandedTitle ? 6 : 2} style={styles.videoTitle}>
            {item.title}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    backgroundColor: "#000000",
    position: "relative",
    overflow: "hidden"
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 2
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 380,
    zIndex: 2
  },
  rightActions: {
    position: "absolute",
    right: 12,
    bottom: 110,
    alignItems: "center",
    gap: 16,
    zIndex: 10
  },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center"
  },
  actionCount: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    marginTop: 4,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  bottomInfoContainer: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 76,
    zIndex: 10,
    gap: 8
  },
  categoryBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37, 99, 235, 0.85)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6
  },
  categoryBadgeIcon: {
    width: 14,
    height: 14,
    tintColor: "#ffffff"
  },
  categoryBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold"
  },
  youtubeLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4
  },
  youtubeLinkText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold"
  },
  channelName: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  videoTitle: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    lineHeight: 18,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3
  },
  playIconShadow: {
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  }
});