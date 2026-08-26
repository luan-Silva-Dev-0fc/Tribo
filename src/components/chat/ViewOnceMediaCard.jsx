import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import {
  disableScreenCaptureProtection,
  enableScreenCaptureProtection,
} from "../../services/screenCapture";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function FullscreenViewOnceVideo({ url, onEnded, style }) {
  const player = useVideoPlayer(url || "", (p) => {
    p.loop = false;
    p.muted = false;
    try { Promise.resolve(p.play()).catch(() => {}); } catch (e) {}
  });

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener?.("playToEnd", () => {
      setTimeout(() => {
        onEnded?.();
      }, 800);
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
      contentFit="contain"
      style={style}
    />
  );
}

export const ViewOnceMediaCard = React.memo(function ViewOnceMediaCard({
  item,
  isMe,
  onExpire,
  groupId,
  currentUser,
}) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [isExpired, setIsExpired] = useState(
    Boolean(
      item?.is_viewed || item?.isViewed || item?.is_expired || item?.isExpired,
    ),
  );

  const mediaUrl = item.media_url || item.mediaUrl || item.url || item.file_url;
  const isVideo =
    item.media_type === "video" ||
    item.mediaType === "video" ||
    (typeof mediaUrl === "string" &&
      (mediaUrl.endsWith(".mp4") ||
        mediaUrl.endsWith(".mov") ||
        mediaUrl.includes("video")));

  const handleOpen = async () => {
    if (isExpired) return;
    await enableScreenCaptureProtection();
    setModalVisible(true);
  };

  const handleCloseAndExpire = async () => {
    await disableScreenCaptureProtection();
    setModalVisible(false);
    setIsExpired(true);
    onExpire?.(item);
  };

  return (
    <View
      style={[styles.container, isMe ? styles.alignRight : styles.alignLeft]}
    >
      {isExpired ? (
        /* Card de Mídia Aberta / Expirada - Design Minimalista e Elegante */
        <View
          style={[
            styles.expiredCard,
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
              styles.expiredIconBox,
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
              {isVideo
                ? "Vídeo de visualização única"
                : "Foto de visualização única"}
            </Text>
            <Text style={[styles.expiredSubtitle, { color: colors.muted }]}>
              Mídia aberta • Expirada
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
        /* Card Fechado com Bloqueio de Print Screen */
        <Pressable
          onPress={handleOpen}
          style={({ pressed }) => [
            styles.closedCard,
            {
              backgroundColor: colors.mode === "dark" ? "#111827" : "#0f172a",
              borderColor: "#3b82f6",
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          {/* Header com Ícone de 1 e Cadeado */}
          <View style={styles.cardHeader}>
            <View style={styles.viewOncePill}>
              <MaterialCommunityIcons
                name="numeric-1-circle"
                size={18}
                color="#38bdf8"
              />
              <Text style={styles.viewOncePillText}>Visualização Única</Text>
            </View>
            <Ionicons name="lock-closed" size={16} color="#38bdf8" />
          </View>

          {/* Banner de Segurança Nativo */}
          <View style={styles.securityBanner}>
            <Feather
              name="shield"
              size={14}
              color="#f59e0b"
              style={{ marginTop: 2 }}
            />
            <Text style={styles.securityBannerText}>
              🔒 Atenção: Visualização Única. A captura de tela e gravação foram
              desativadas. Apenas você tem acesso.
            </Text>
          </View>

          {/* Botão de Abrir */}
          <View style={styles.openCta}>
            <View style={styles.mediaTypeIconBg}>
              <Feather
                name={isVideo ? "play" : "image"}
                size={16}
                color="#ffffff"
              />
            </View>
            <Text style={styles.openCtaText}>
              Toque para abrir {isVideo ? "o vídeo" : "a foto"}
            </Text>
            <Feather name="chevron-right" size={16} color="#94a3b8" />
          </View>
        </Pressable>
      )}

      {/* Modal de Exibição em Tela Cheia (Com Proteção de Print Screen Ativa) */}
      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="fade"
        onRequestClose={handleCloseAndExpire}
      >
        <View style={styles.fullscreenOverlay}>
          {/* Top Bar com Aviso de Proteção */}
          <View style={styles.fullscreenTopBar}>
            <View style={styles.topSecurityBadge}>
              <MaterialCommunityIcons
                name="numeric-1-circle"
                size={18}
                color="#38bdf8"
              />
              <Text style={styles.topSecurityText}>
                Visualização Única Ativa
              </Text>
            </View>

            <Pressable
              onPress={handleCloseAndExpire}
              style={styles.closeFullscreenBtn}
              accessibilityLabel="Fechar e expirar"
            >
              <Feather name="x" size={24} color="#ffffff" />
            </Pressable>
          </View>

          {/* Conteúdo da Mídia */}
          <View style={styles.mediaContainer}>
            {isVideo && modalVisible ? (
              <FullscreenViewOnceVideo
                url={mediaUrl}
                onEnded={handleCloseAndExpire}
                style={styles.fullscreenVideo}
              />
            ) : (
              <Image
                source={{ uri: mediaUrl }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Footer Informativo */}
          <View style={styles.fullscreenFooter}>
            <Text style={styles.footerWarningText}>
              Esta mídia será destruída assim que você sair desta tela.
            </Text>
            <Pressable onPress={handleCloseAndExpire} style={styles.finishBtn}>
              <Text style={styles.finishBtnText}>Concluir Visualização</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    maxWidth: "85%",
  },
  alignRight: {
    alignSelf: "flex-end",
  },
  alignLeft: {
    alignSelf: "flex-start",
  },
  closedCard: {
    width: 270,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  viewOncePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  viewOncePillText: {
    color: "#38bdf8",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },
  securityBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  securityBannerText: {
    flex: 1,
    color: "#fef3c7",
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    lineHeight: 16,
  },
  openCta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    padding: 8,
    gap: 8,
  },
  mediaTypeIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
  },
  openCtaText: {
    flex: 1,
    color: "#ffffff",
    fontSize: 12.5,
    fontFamily: "Poppins_600SemiBold",
  },
  expiredCard: {
    flexDirection: "row",
    alignItems: "center",
    width: 230,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    gap: 10,
    opacity: 0.7,
  },
  expiredIconBox: {
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
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "space-between",
  },
  fullscreenTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    zIndex: 10,
  },
  topSecurityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topSecurityText: {
    color: "#38bdf8",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  closeFullscreenBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  fullscreenVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  fullscreenFooter: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: "center",
    gap: 12,
  },
  footerWarningText: {
    color: "#94a3b8",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
  finishBtn: {
    width: "100%",
    backgroundColor: "#3b82f6",
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
  },
  finishBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
});
