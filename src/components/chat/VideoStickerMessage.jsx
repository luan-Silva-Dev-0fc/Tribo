import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View } from
"react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import {
  isStickerInInventory,
  removeStickerFromInventory,
  saveStickerToInventory } from
"../../services/stickerInventory";
import { CustomModal } from "../modals/CustomModal";
import { useStickerSpatialAudio } from "../../services/audioRecordingDucking";

const WINDOW_HEIGHT = Dimensions.get("window").height;

class VideoViewSafeGuard extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    // Silencia erros de player liberado pelo expo-video durante unmount
  }
  render() {
    if (this.state.hasError) {
      return (
        <View
          style={[
            this.props.fallbackStyle || {
              width: "100%",
              height: "100%",
              backgroundColor: "#18181b"
            }
          ]}
        />
      );
    }
    return this.props.children;
  }
}

const SafeStickerVideo = React.memo(function SafeStickerVideo({
  url,
  style,
  externalRef,
  isMuted,
  onMuteChange
}) {
  if (!url || typeof url !== "string" || !url.trim()) {
    return <View style={[style, { backgroundColor: "#18181b" }]} />;
  }
  return (
    <VideoViewSafeGuard fallbackStyle={style}>
      <ActiveStickerVideoInner
        url={url}
        style={style}
        externalRef={externalRef}
        isMuted={isMuted}
        onMuteChange={onMuteChange}
      />
    </VideoViewSafeGuard>
  );
});

function ActiveStickerVideoInner({
  url,
  style,
  externalRef,
  isMuted,
  onMuteChange
}) {
  const localRef = useRef(null);
  const targetRef = externalRef || localRef;
  const isMountedRef = useRef(true);
  const hasPlayedOnceRef = useRef(false);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const player = useVideoPlayer(url || "", (p) => {
    p.loop = true;
    p.muted = false;
    p.volume = 1.0;
    try {
      Promise.resolve(p.play()).catch(() => {});
    } catch (e) {}
  });

  // Detecta o fim da primeira reprodução e muta automaticamente
  useEffect(() => {
    if (!player) return;

    let subEnd = null;
    let subTime = null;

    try {
      if (typeof player.addListener === "function") {
        subEnd = player.addListener("playToEnd", () => {
          if (!hasPlayedOnceRef.current) {
            hasPlayedOnceRef.current = true;
            player.muted = true;
            player._triboMuted = true;
            onMuteChange?.(true);
          }
        });

        subTime = player.addListener("timeUpdate", (payload) => {
          const ct = payload?.currentTime ?? player.currentTime ?? 0;
          const dur = player.duration || 0;

          if (!hasPlayedOnceRef.current) {
            // Se chegou ao fim do vídeo ou fez o loop (tempo resetou)
            if (dur > 0 && (ct >= dur - 0.25 || (lastTimeRef.current > dur * 0.7 && ct < 0.5))) {
              hasPlayedOnceRef.current = true;
              player.muted = true;
              player._triboMuted = true;
              onMuteChange?.(true);
            }
          }
          lastTimeRef.current = ct;
        });
      }
    } catch (e) {}

    return () => {
      try {
        subEnd?.remove?.();
        subTime?.remove?.();
      } catch (e) {}
    };
  }, [player, onMuteChange]);

  // Aplica o mudo quando alterado pelo usuário (ao tocar na figurinha)
  useEffect(() => {
    if (!player) return;
    try {
      player._triboMuted = Boolean(isMuted);
      player.muted = Boolean(isMuted);
      if (!isMuted && !player.playing) {
        Promise.resolve(player.play()).catch(() => {});
      }
    } catch (e) {}
  }, [player, isMuted]);

  useStickerSpatialAudio(player, targetRef);

  return (
    <View ref={localRef} style={style} collapsable={false}>
      {isMountedRef.current && player ? (
        <VideoViewSafeGuard fallbackStyle={{ width: "100%", height: "100%", backgroundColor: "#18181b" }}>
          <VideoView
            key={url}
            player={player}
            nativeControls={false}
            contentFit="cover"
            style={{ width: "100%", height: "100%" }}
          />
        </VideoViewSafeGuard>
      ) : (
        <View style={{ width: "100%", height: "100%", backgroundColor: "#18181b" }} />
      )}
    </View>
  );
}

const SafeIsolatedStickerPlayer = React.memo(
  function SafeIsolatedStickerPlayer({ url, style }) {
    if (!url || typeof url !== "string" || !url.trim()) {
      return <View style={[style, { backgroundColor: "#18181b" }]} />;
    }
    return (
      <VideoViewSafeGuard fallbackStyle={style}>
        <ActiveIsolatedStickerPlayerInner url={url} style={style} />
      </VideoViewSafeGuard>
    );
  }
);

function ActiveIsolatedStickerPlayerInner({ url, style }) {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const modalPlayer = useVideoPlayer(url || "", (p) => {
    p.loop = true;
    p.muted = false;
    p.volume = 1.0;
    try {
      Promise.resolve(p.play()).catch(() => {});
    } catch (e) {}
  });

  useStickerSpatialAudio(modalPlayer, null);

  if (!isMountedRef.current || !modalPlayer) {
    return <View style={[style, { backgroundColor: "#18181b" }]} />;
  }

  return (
    <VideoViewSafeGuard fallbackStyle={style}>
      <VideoView
        key={url}
        player={modalPlayer}
        nativeControls={false}
        contentFit="cover"
        style={style}
      />
    </VideoViewSafeGuard>
  );
}

export const VideoStickerMessage = React.memo(function VideoStickerMessage({
  item,
  isMe,
  onLongPress,
  onDelete,
  currentUser
}) {
  const { colors } = useTheme();
  const containerRef = useRef(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const isViewOnce = Boolean(item?.is_view_once || item?.isViewOnce);
  const videoUrl =
  item.media_url ||
  item.mediaUrl ||
  item.video_url ||
  item.videoUrl ||
  item.url;
  const stickerId = item.sticker_id || item.stickerId || item.id;


  useEffect(() => {
    let mounted = true;
    if (stickerId || videoUrl) {
      isStickerInInventory(stickerId, videoUrl).then((saved) => {
        if (mounted) setIsSaved(saved);
      });
    }
    return () => {
      mounted = false;
    };
  }, [stickerId, videoUrl]);

  const [customAlert, setCustomAlert] = useState({
    visible: false,
    type: "info",
    title: "",
    message: ""
  });

  const handleToggleSave = async () => {
    if (saving || !videoUrl) return;
    try {
      setSaving(true);
      if (isSaved) {
        await removeStickerFromInventory(stickerId, videoUrl);
        setIsSaved(false);
        setCustomAlert({
          visible: true,
          type: "info",
          title: "Figurinha Removida",
          message: "A figurinha foi removida do seu inventário."
        });
      } else {
        await saveStickerToInventory({
          id: stickerId,
          sticker_id: stickerId,
          video_url: videoUrl,
          media_url: videoUrl,
          sticker_name:
          item.sticker_name || item.stickerName || "Figurinha de Vídeo",
          pack_name: item.pack_name || item.packName || "Gerais",
          author_name: item.author_name || item.authorName || "Tribo",
          description: item.description || null
        });
        setIsSaved(true);
        setSuccessModalVisible(true);
      }
    } catch (e) {
      setCustomAlert({
        visible: true,
        type: "error",
        title: "Erro",
        message: "Não foi possível atualizar seu inventário de figurinhas."
      });
    } finally {
      setSaving(false);
    }
  };

  if (!videoUrl) return null;

  return (
    <View
      ref={containerRef}
      collapsable={false}
      style={[styles.container, isMe ? styles.alignRight : styles.alignLeft]}>
      
      <Pressable
        onPress={() => setIsMuted((prev) => !prev)}
        onLongPress={() => {
          if (onLongPress) {
            onLongPress(item);
          } else {
            setOptionsVisible(true);
          }
        }}
        delayLongPress={220}
        style={({ pressed }) => [
        styles.stickerFrame,
        {
          backgroundColor: "#18181b",
          borderColor: colors.border || "#27272a",
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }]
        }]
        }>
        
        <SafeStickerVideo
          url={videoUrl}
          style={styles.video}
          externalRef={containerRef}
          isMuted={isMuted}
          onMuteChange={setIsMuted} />

        {/* Botão de Áudio (Mudo / Desmudo) */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            setIsMuted((prev) => !prev);
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [
            styles.audioBadge,
            {
              backgroundColor: isMuted
                ? "rgba(0, 0, 0, 0.75)"
                : "rgba(34, 197, 94, 0.85)",
              opacity: pressed ? 0.8 : 1
            }
          ]}
          accessibilityLabel={isMuted ? "Desmutar figurinha" : "Mutar figurinha"}
        >
          <Feather
            name={isMuted ? "volume-x" : "volume-2"}
            size={16}
            color="#ffffff"
          />
        </Pressable>
        

        {/* Botão rápido de favoritar/salvar */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleToggleSave();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          disabled={saving}
          style={({ pressed }) => [
          styles.quickFavoriteBtn,
          {
            backgroundColor: isSaved ?
            "#f59e0b" :
            "rgba(0, 0, 0, 0.75)",
            opacity: pressed || saving ? 0.8 : 1
          }]
          }
          accessibilityLabel={isSaved ? "Remover figurinha" : "Salvar figurinha"}>
          
          <Ionicons
            name={isSaved ? "star" : "star-outline"}
            size={18}
            color="#ffffff" />
          
        </Pressable>

        {/* Badge da Figurinha */}
        <View style={styles.badgeContainer} pointerEvents="none">
          <View style={styles.badgePill}>
            <MaterialCommunityIcons
              name="sticker-emoji"
              size={13}
              color="#f59e0b" />
            
            <Text style={styles.badgeText}>Figurinha</Text>
          </View>
        </View>
      </Pressable>

      {}
      <Modal
        visible={optionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsVisible(false)}>
        
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setOptionsVisible(false)}>
          
          <Pressable
            style={[
            styles.modalContent,
            {
              backgroundColor: colors.card || "#18181b",
              borderColor: colors.border || "#27272a"
            }]
            }
            onPress={(e) => e.stopPropagation()}>
            
            {}
            <View style={styles.previewContainer}>
              <View style={styles.previewFrame}>
                {optionsVisible &&
                <SafeIsolatedStickerPlayer
                  url={videoUrl}
                  style={{ width: "100%", height: "100%" }} />

                }
              </View>

              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {item.sticker_name || item.stickerName || "Figurinha de Vídeo"}
              </Text>

              {}
              <View style={styles.metadataBadgesRow}>
                <View
                  style={[
                  styles.metaPill,
                  { backgroundColor: "rgba(245, 158, 11, 0.15)" }]
                  }>
                  
                  <Ionicons name="folder-outline" size={12} color="#f59e0b" />
                  <Text style={[styles.metaPillText, { color: "#f59e0b" }]}>
                    {item.pack_name || item.packName || "Gerais"}
                  </Text>
                </View>

                {item.author_name &&
                <View
                  style={[
                  styles.metaPill,
                  { backgroundColor: "rgba(37, 99, 235, 0.15)" }]
                  }>
                  
                    <Feather name="user" size={12} color="#3b82f6" />
                    <Text style={[styles.metaPillText, { color: "#3b82f6" }]}>
                      {item.author_name}
                    </Text>
                  </View>
                }
              </View>

              {}
              {item.description ?
              <View
                style={[
                styles.descContainer,
                { backgroundColor: colors.surfaceAlt || "#27272a" }]
                }>
                
                  <Text style={[styles.descLabel, { color: colors.muted }]}>
                    Significado / Contexto:
                  </Text>
                  <Text style={[styles.descContent, { color: colors.text }]}>
                    {item.description}
                  </Text>
                </View> :
              null}

              <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                Figurinha animada em loop infinito.
              </Text>
            </View>

            {}
            <View style={styles.buttonGroup}>
              <Pressable
                onPress={() => {
                  handleToggleSave();
                  setOptionsVisible(false);
                }}
                style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: isSaved ? "#ef4444" : "#f59e0b",
                  opacity: pressed ? 0.85 : 1
                }]
                }>
                
                <Ionicons
                  name={isSaved ? "trash-outline" : "star"}
                  size={18}
                  color="#ffffff" />
                
                <Text style={[styles.actionButtonText, { color: "#ffffff" }]}>
                  {isSaved ? "Remover do Inventário" : "Salvar Figurinha"}
                </Text>
              </Pressable>

              {isMe && onDelete ?
              <Pressable
                onPress={() => {
                  setOptionsVisible(false);
                  onDelete(item);
                }}
                style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: "#ef4444",
                  opacity: pressed ? 0.85 : 1
                }]
                }>
                
                  <Ionicons name="trash-outline" size={18} color="#ffffff" />
                  <Text style={[styles.actionButtonText, { color: "#ffffff" }]}>
                    Excluir video
                  </Text>
                </Pressable> :
              null}

              <Pressable
                onPress={() => setOptionsVisible(false)}
                style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor:
                  colors.surfaceAlt || "rgba(255, 255, 255, 0.08)",
                  opacity: pressed ? 0.85 : 1
                }]
                }>
                
                <Text style={[styles.actionButtonText, { color: colors.text }]}>
                  Fechar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {}
      <Modal
        visible={successModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModalVisible(false)}>
        
        <Pressable
          style={styles.successOverlay}
          onPress={() => setSuccessModalVisible(false)}>
          
          <Pressable
            style={[
            styles.successCard,
            {
              backgroundColor: colors.card || "#ffffff",
              borderColor: colors.border || "#e2e8f0"
            }]
            }
            onPress={(e) => e.stopPropagation()}>
            
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons name="star" size={28} color="#f59e0b" />
              </View>
            </View>

            <Text style={[styles.successHeadline, { color: colors.text }]}>
              Figurinha Salva! ⭐
            </Text>

            <Text
              style={[styles.successPrimaryMessage, { color: colors.text }]}>
              
              Figurinha salva no seu inventário com sucesso!
            </Text>

            <Text style={[styles.successSubtext, { color: colors.muted }]}>
              Você já pode usá-la e reenviá-la em todas as suas conversas da
              Tribo.
            </Text>

            <View style={styles.successPreviewBadge}>
              <View style={styles.miniStickerThumb}>
                {successModalVisible &&
                <SafeIsolatedStickerPlayer
                  url={videoUrl}
                  style={{ width: "100%", height: "100%" }} />

                }
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.miniStickerName, { color: colors.text }]}
                  numberOfLines={1}>
                  
                  {item.sticker_name ||
                  item.stickerName ||
                  "Figurinha de Vídeo"}
                </Text>
                <Text style={[styles.miniStickerPack, { color: colors.muted }]}>
                  Pasta: {item.pack_name || item.packName || "Gerais"}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setSuccessModalVisible(false)}
              style={({ pressed }) => [
              styles.successCtaBtn,
              {
                backgroundColor: colors.primary || "#0284c7",
                opacity: pressed ? 0.88 : 1
              }]
              }>
              
              <Text style={styles.successCtaBtnText}>Excelente</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <CustomModal
        visible={customAlert.visible}
        type={customAlert.type}
        title={customAlert.title}
        message={customAlert.message}
        onClose={() => setCustomAlert((prev) => ({ ...prev, visible: false }))} />
      
    </View>);

});

const styles = StyleSheet.create({
  container: {
    marginVertical: 2
  },
  alignRight: {
    alignSelf: "flex-end"
  },
  alignLeft: {
    alignSelf: "flex-start"
  },
  stickerFrame: {
    width: 190,
    height: 190,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    position: "relative"
  },
  video: {
    width: "100%",
    height: "100%"
  },
  quickFavoriteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    zIndex: 9999,
    elevation: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 4
  },
  audioBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    zIndex: 9999,
    elevation: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 4
  },
  badgeContainer: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center"
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(245, 158, 11, 0.3)"
  },
  badgeText: {
    color: "#f59e0b",
    fontSize: 11,
    fontFamily: "Poppins_700Bold"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalContent: {
    width: "90%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6
  },
  previewContainer: {
    alignItems: "center",
    marginBottom: 16,
    width: "100%"
  },
  previewFrame: {
    width: 140,
    height: 140,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  previewVideo: {
    width: "100%",
    height: "100%"
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    marginBottom: 4,
    textAlign: "center"
  },
  metadataBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 8
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  metaPillText: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium"
  },
  descContainer: {
    width: "100%",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10
  },
  descLabel: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 2
  },
  descContent: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    lineHeight: 16
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    paddingHorizontal: 10,
    lineHeight: 16
  },
  buttonGroup: {
    width: "100%",
    gap: 10
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold"
  },
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  successCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    paddingVertical: 26,
    paddingHorizontal: 22,
    borderWidth: 1,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8
  },
  successIconOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  successIconInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(245, 158, 11, 0.25)",
    alignItems: "center",
    justifyContent: "center"
  },
  successHeadline: {
    fontSize: 19,
    fontFamily: "Poppins_700Bold",
    marginBottom: 6,
    textAlign: "center"
  },
  successPrimaryMessage: {
    fontSize: 14.5,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
    marginBottom: 6,
    paddingHorizontal: 8
  },
  successSubtext: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 10,
    marginBottom: 18
  },
  successPreviewBadge: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    borderRadius: 16,
    padding: 10,
    marginBottom: 20,
    gap: 12
  },
  miniStickerThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  miniStickerName: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold"
  },
  miniStickerPack: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular"
  },
  successCtaBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  successCtaBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Poppins_700Bold"
  }
});