import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import * as FileSystem from "expo-file-system/legacy";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";

const WINDOW_HEIGHT = Dimensions.get("window").height;

function ActiveViewOnceSticker({ url, onEnded, style }) {
  const player = useVideoPlayer(url || "", (p) => {
    p.loop = false; // Toca apenas uma única vez
    p.muted = false;
    try { Promise.resolve(p.play()).catch(() => {}); } catch (e) {}
  });

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener?.("playToEnd", () => {
      setTimeout(() => {
        onEnded?.();
      }, 600);
    });
    return () => {
      sub?.remove?.();
    };
  }, [player, onEnded]);

  if (!url) return null;

  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="cover"
      style={style}
    />
  );
}

export const ViewOnceStickerMessage = React.memo(
  function ViewOnceStickerMessage({ item, isMe, onExpire }) {
    const { colors } = useTheme();
    const containerRef = useRef(null);
    const [isExpired, setIsExpired] = useState(
      Boolean(
        item?.is_viewed ||
        item?.isViewed ||
        item?.is_expired ||
        item?.isExpired,
      ),
    );
    const [hasStartedViewing, setHasStartedViewing] = useState(false);

    const videoUrl =
      item.media_url ||
      item.mediaUrl ||
      item.video_url ||
      item.videoUrl ||
      item.url;

    const handleExpire = async () => {
      if (isExpired) return;
      setIsExpired(true);

      // Destrói arquivo do cache/local se aplicável
      if (typeof videoUrl === "string" && videoUrl.startsWith("file://")) {
        try {
          await FileSystem.deleteAsync(videoUrl, { idempotent: true });
        } catch (e) {}
      }

      onExpire?.(item);
    };

    // Monitora a saída do viewport após ter iniciado a visualização
    const checkViewportVisibility = () => {
      if (isExpired || !containerRef.current) return;

      containerRef.current.measureInWindow((x, y, width, height) => {
        if (typeof y !== "number" || isNaN(y)) return;

        const isInsideViewport = y + height > 0 && y < WINDOW_HEIGHT;

        if (isInsideViewport) {
          if (!hasStartedViewing) {
            setHasStartedViewing(true);
          }
        } else if (hasStartedViewing) {
          // Estava visível e saiu do viewport -> expira imediatamente
          handleExpire();
        }
      });
    };

    useEffect(() => {
      if (isExpired) return;
      const interval = setInterval(checkViewportVisibility, 400);
      return () => clearInterval(interval);
    }, [isExpired, hasStartedViewing]);

    if (!videoUrl) return null;

    return (
      <View
        ref={containerRef}
        onLayout={checkViewportVisibility}
        style={[styles.container, isMe ? styles.alignRight : styles.alignLeft]}
      >
        {isExpired ? (
          /* Figurinha Expirada - Design Minimalista e Elegante */
          <View
            style={[
              styles.expiredBox,
              {
                backgroundColor:
                  colors.mode === "dark"
                    ? "rgba(255, 255, 255, 0.05)"
                    : "rgba(0, 0, 0, 0.04)",
                borderColor:
                  colors.mode === "dark"
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.08)",
              },
            ]}
          >
            <View
              style={[
                styles.expiredIcon,
                {
                  backgroundColor:
                    colors.mode === "dark"
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              <MaterialCommunityIcons
                name="numeric-1-circle-outline"
                size={20}
                color={colors.muted}
              />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 2 }}>
              <Text style={[styles.expiredTitle, { color: colors.text }]}>
                Figurinha de visualização única
              </Text>
              <Text style={[styles.expiredSubtitle, { color: colors.muted }]}>
                Figurinha aberta • Expirada
              </Text>
            </View>
            <Feather
              name="check"
              size={15}
              color={colors.muted}
              style={{ opacity: 0.8 }}
            />
          </View>
        ) : (
          /* Figurinha Ativa com Reprodução Única (Sem Loop e Sem Opção de Salvar) */
          <View
            style={[
              styles.stickerFrame,
              {
                backgroundColor:
                  colors.surfaceAlt ||
                  (colors.mode === "dark" ? "#1e1e1e" : "#f1f5f9"),
                borderColor: "#f59e0b",
              },
            ]}
          >
            <ActiveViewOnceSticker
              url={videoUrl}
              onEnded={handleExpire}
              style={styles.video}
            />

            {/* Badge Superior de Visualização Única */}
            <View style={styles.topBadge}>
              <MaterialCommunityIcons
                name="numeric-1-circle"
                size={16}
                color="#f59e0b"
              />
              <Text style={styles.topBadgeText}>Visualização Única (1x)</Text>
            </View>

            {/* Botão de Fechar e Destruir */}
            <Pressable
              onPress={handleExpire}
              style={styles.dismissBtn}
              accessibilityLabel="Fechar e expirar figurinha"
            >
              <Feather name="x" size={14} color="#ffffff" />
            </Pressable>
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    maxWidth: "80%",
  },
  alignRight: {
    alignSelf: "flex-end",
  },
  alignLeft: {
    alignSelf: "flex-start",
  },
  stickerFrame: {
    width: 190,
    height: 190,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  topBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  topBadgeText: {
    color: "#f59e0b",
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
  },
  dismissBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  expiredBox: {
    flexDirection: "row",
    alignItems: "center",
    width: 250,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    gap: 10,
    opacity: 0.75,
  },
  expiredIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  expiredTitle: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
  expiredSubtitle: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
  },
});
