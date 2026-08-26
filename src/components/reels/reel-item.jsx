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
  View,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const ReelItem = React.memo(function ReelItem({
  item,
  isActive,
  shouldPreload,
  onToggleLike,
  onMoreLikeThis,
  onNotInterested,
  onOpenPreferences,
  containerHeight,
}) {
  const [liked, setLiked] = useState(item.isLiked || false);
  const [likesCount, setLikesCount] = useState(item.likesCount || 0);
  const [isExpandedTitle, setIsExpandedTitle] = useState(false);
  const [moreLikeActive, setMoreLikeActive] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  
  const webViewRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      setIsPlaying(false);
      setShowOptions(false);
      // Inject pause if we scroll away
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
      // Inject play if we scroll to it and it's already ready
      if (isReady && Platform.OS !== "web" && webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          var iframes = document.getElementsByTagName('iframe');
          if (iframes.length > 0) {
            iframes[0].contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          }
          true;
        `);
      }
    }
  }, [isActive, isReady]);

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
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(bigHeartOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ])
    ]).start();

    if (!liked) {
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.35, duration: 120, useNativeDriver: true }),
        Animated.spring(heartScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      ]).start();

      setLiked(true);
      setLikesCount((prev) => prev + 1);
      
      if (onToggleLike) {
        onToggleLike(item.videoId, item.category);
      }
    }
  }

  async function handleLike() {
    // Animação de pulsar o coração
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.35,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    if (onToggleLike) {
      onToggleLike(item.videoId, item.category);
    }
  }

  async function handleMoreLikeThis() {
    Animated.sequence([
      Animated.timing(moreLikeScale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.spring(moreLikeScale, { toValue: 1, friction: 4, useNativeDriver: true }),
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
      Animated.spring(hideScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    if (onNotInterested) {
      onNotInterested(item.videoId, item.category);
    }
  }

  async function handleShare() {
    try {
      const shareUrl = item.videoUrl || `https://www.youtube.com/shorts/${item.videoId}`;
      await Share.share({
        message: `${item.title}\n\nAssista no Tribo: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      console.warn("Erro ao compartilhar reel:", err.message);
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
            position: relative;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          iframe {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 100vw;
            height: 100vh;
            border: none;
            transform: translate(-50%, -50%) scale(1.3);
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="video-container">
          <iframe 
            src="https://www.youtube.com/embed/${item.videoId}?autoplay=0&mute=0&controls=0&loop=1&playlist=${item.videoId}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=https://lonelycpp.github.io" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
          </iframe>
        </div>
      </body>
    </html>
  `, [item.videoId]);

  return (
    <View style={[styles.container, { height: itemHeight }]}>
      {/* Player de Vídeo ou Placeholder */}
      <View style={StyleSheet.absoluteFillObject}>
        {/* Capa fica visível enquanto o vídeo não carregar ou se não estiver ativo */}
        {(!isActive || !isReady) && (
          <Image
            source={{ uri: `https://img.youtube.com/vi/${item.videoId}/hqdefault.jpg` }}
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000000", zIndex: 2 }]}
            resizeMode="cover"
          />
        )}

        {/* WebView monta se estiver ativo ou se for o próximo/anterior (shouldPreload) */}
        {(isActive || shouldPreload) && (
          Platform.OS === "web" ? (
            <iframe
              id={`youtube-iframe-${item.videoId}`}
              onLoad={() => {
                setTimeout(() => setIsReady(true), 800);
              }}
              src={`https://www.youtube.com/embed/${item.videoId}?autoplay=1&mute=0&controls=1&loop=1&playlist=${item.videoId}&playsinline=1&rel=0&modestbranding=1`}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                backgroundColor: "#000000",
                position: "absolute",
                zIndex: 1,
              }}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <WebView
              ref={webViewRef}
              source={{ html: embedHtml, baseUrl: 'https://lonelycpp.github.io' }}
              onLoad={() => {
                setTimeout(() => setIsReady(true), 800);
              }}
              style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scrollEnabled={false}
              bounces={false}
              androidLayerType="hardware"
              originWhitelist={["*"]}
            />
          )
        )}
      </View>

      {/* Escudo invisível para impedir que o WebView capture gestos e permitir Play/Pause estilo TikTok */}
      <Pressable 
        style={[StyleSheet.absoluteFillObject, { zIndex: 1, justifyContent: "center", alignItems: "center" }]} 
        onPress={handleScreenPress}
      >
        {!isPlaying && (
          <Ionicons name="play" size={100} color="rgba(255, 255, 255, 0.85)" style={styles.playIconShadow} />
        )}
        <Animated.View style={{
          position: "absolute",
          opacity: bigHeartOpacity,
          transform: [{ scale: bigHeartScale }]
        }}>
          <Ionicons name="heart" size={120} color="#ef4444" style={styles.playIconShadow} />
        </Animated.View>
      </Pressable>

      {/* Gradientes para contraste e legibilidade */}
      <LinearGradient
        colors={["rgba(0,0,0,0.8)", "transparent"]}
        style={[styles.topGradient, { pointerEvents: "none" }]}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.9)"]}
        style={[styles.bottomGradient, { pointerEvents: "none" }]}
      />

      {/* Marca d'água Estratégica (Top Left) */}
      <View style={styles.watermarkContainer} pointerEvents="none">
        <Ionicons name="play-circle" size={16} color="rgba(255,255,255,0.8)" style={{ marginRight: 4 }} />
        <Text style={styles.watermarkText}>Tribo Reels</Text>
      </View>

      {/* Ações Flutuantes Laterais (Direita) - Estilo TikTok */}
      <View style={styles.rightActions}>
        {showOptions && (
          <>
            {/* Tópicos/Algoritmo */}
            <Pressable onPress={handleMoreLikeThis} style={styles.actionBtn}>
              <Animated.View style={[styles.actionIconContainer, { transform: [{ scale: moreLikeScale }] }]}>
                <Ionicons name="sparkles" size={30} color={moreLikeActive ? "#f59e0b" : "#ffffff"} />
              </Animated.View>
              <Text style={styles.actionCount}>{moreLikeActive ? "Anotado!" : "Mais disso"}</Text>
            </Pressable>

            {/* Não tenho interesse */}
            <Pressable onPress={handleNotInterested} style={styles.actionBtn}>
              <Animated.View style={[styles.actionIconContainer, { transform: [{ scale: hideScale }] }]}>
                <Ionicons name="eye-off-outline" size={30} color="#ffffff" />
              </Animated.View>
              <Text style={styles.actionCount}>Ocultar</Text>
            </Pressable>

            {/* Preferências */}
            <Pressable onPress={onOpenPreferences} style={styles.actionBtn}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="options-outline" size={30} color="#ffffff" />
              </View>
              <Text style={styles.actionCount}>Filtros</Text>
            </Pressable>
          </>
        )}

        {/* Like */}
        <Pressable onPress={handleLike} style={styles.actionBtn}>
          <Animated.View style={[styles.actionIconContainer, { transform: [{ scale: heartScale }] }]}>
            <Ionicons name={liked ? "heart" : "heart"} size={38} color={liked ? "#ef4444" : "#ffffff"} />
          </Animated.View>
          <Text style={styles.actionCount}>{likesCount > 0 ? likesCount : "Curtir"}</Text>
        </Pressable>

        {/* Compartilhar */}
        <Pressable onPress={handleShare} style={styles.actionBtn}>
          <View style={styles.actionIconContainer}>
            <Ionicons name="share-social" size={34} color="#ffffff" />
          </View>
          <Text style={styles.actionCount}>Enviar</Text>
        </Pressable>

        {/* Botão de Mais Opções */}
        <Pressable onPress={() => setShowOptions(!showOptions)} style={styles.actionBtn}>
          <View style={styles.actionIconContainer}>
            <Ionicons name={showOptions ? "close" : "ellipsis-horizontal"} size={34} color="#ffffff" />
          </View>
          <Text style={styles.actionCount}>{showOptions ? "Fechar" : "Mais"}</Text>
        </Pressable>
      </View>

      {/* Metadados e Informações Inferiores */}
      <View style={styles.bottomInfoContainer}>
        {/* Categoria Badge */}
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

        {/* Canal */}
        <Text style={styles.channelName}>
          @{item.channel || item.channelTitle || "YouTube"}
        </Text>

        {/* Título do Shorts */}
        <Pressable onPress={() => setIsExpandedTitle(!isExpandedTitle)}>
          <Text
            numberOfLines={isExpandedTitle ? 6 : 2}
            style={styles.videoTitle}
          >
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
    overflow: "hidden",
  },
  mediaWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#050505",
    justifyContent: "center",
    alignItems: "center",
  },
  webview: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
  },
  watermarkContainer: {
    position: "absolute",
    top: 25,
    left: 16,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  watermarkText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    zIndex: 2,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 380,
    zIndex: 2,
  },
  rightActions: {
    position: "absolute",
    right: 12,
    bottom: 120,
    alignItems: "center",
    gap: 20,
    zIndex: 10,
  },
  actionBtn: {
    alignItems: "center",
    gap: 6,
  },
  actionIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 8,
  },
  actionCount: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginTop: 4,
  },
  playIconShadow: {
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  bottomInfoContainer: {
    position: "absolute",
    bottom: 110,
    left: 16,
    right: 80,
    zIndex: 10,
    gap: 10,
  },
  categoryBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  categoryBadgeIcon: {
    width: 16,
    height: 16,
  },
  categoryBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.5,
  },
  youtubeLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  youtubeLinkText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  channelName: {
    color: "#ffffff",
    fontSize: 17,
    fontFamily: "Poppins_700Bold",
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 0.2,
  },
  videoTitle: {
    color: "#f3f4f6",
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    lineHeight: 22,
    textShadowColor: "rgba(0, 0, 0, 0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
