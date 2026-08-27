import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { api, getUploadUrl } from "../../api";
import { NativeOptimization } from "../../services/nativeOptimization";
import { CustomModal } from "./CustomModal";

const MAX_STICKER_DURATION = 60;

function SafeStickerPlayerInner({ url, startTime, style }) {
  const [isReady, setIsReady] = useState(false);
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = false;
    try {
      p.play();
    } catch (_) {}
  });

  useEffect(() => {
    if (!player) return;
    setIsReady(true);
    try {
      player.currentTime = startTime;
      player.play();
    } catch (_) {}
  }, [startTime, player]);

  if (!player || !isReady) {
    return (
      <View style={[style, styles.playerLoading]}>
        <ActivityIndicator size="small" color="#f59e0b" />
      </View>
    );
  }

  return (
    <VideoView
      key={url}
      player={player}
      nativeControls={false}
      contentFit="cover"
      style={style}
    />
  );
}

function SafeStickerPlayer({ url, startTime, style }) {
  if (!url) return null;
  return <SafeStickerPlayerInner key={url} url={url} startTime={startTime} style={style} />;
}

function formatSec(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem < 10 ? "0" : ""}${rem}`;
}

export function VideoStickerEditorModal({
  visible,
  initialVideoAsset = null,
  onClose,
  onStickerCreated,
  currentUser,
  onShowGoldModal
}) {
  const { colors } = useTheme();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [trimmingStatus, setTrimmingStatus] = useState("");

  const [totalDuration, setTotalDuration] = useState(60);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(60);

  const [customAlert, setCustomAlert] = useState({
    visible: false,
    type: "info",
    title: "",
    message: ""
  });

  const showAlert = (cfg) => {
    setCustomAlert({
      visible: true,
      type: cfg.type || "info",
      title: cfg.title || "",
      message: cfg.message || "",
      primaryText: cfg.primaryText || "Entendido",
      onPrimaryPress: cfg.onPrimaryPress || null
    });
  };

  const isUserGold = Boolean(
    currentUser?.badge_type === "GOLD" ||
    currentUser?.badgeType === "GOLD" ||
    currentUser?.is_gold ||
    currentUser?.isGold ||
    currentUser?.isVip ||
    currentUser?.is_vip
  );

  const setupVideo = async (asset) => {
    if (!asset) return;
    let durationSec = Math.max(1, Math.round((asset.duration || 0) / 1000)) || 60;

    try {
      const meta = await NativeOptimization.getVideoDuration(asset.uri);
      if (meta?.durationSeconds) {
        durationSec = Math.max(1, Math.round(meta.durationSeconds));
      }
    } catch (_) {}

    setTotalDuration(durationSec);
    setStartTime(0);
    setEndTime(Math.min(durationSec, MAX_STICKER_DURATION));

    setSelectedVideo({
      uri: asset.uri,
      duration: durationSec,
      width: asset.width,
      height: asset.height
    });

    if (durationSec > MAX_STICKER_DURATION) {
      showAlert({
        title: "Vídeo Longo",
        message: "Este vídeo tem mais de 1 minuto. Selecione o melhor trecho de até 60 segundos para cortar.",
        type: "info",
        primaryText: "Cortar Trecho"
      });
    }
  };

  useEffect(() => {
    if (visible && initialVideoAsset) {
      setupVideo(initialVideoAsset);
    }
  }, [visible, initialVideoAsset]);

  const pickVideo = async () => {
    if (!isUserGold) {
      onClose();
      onShowGoldModal?.();
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert({
          title: "Permissão Necessária",
          message: "Permita o acesso à galeria para selecionar seu vídeo.",
          type: "warning"
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.85
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await setupVideo(result.assets[0]);
      }
    } catch (_) {
      showAlert({
        title: "Erro no Vídeo",
        message: "Não foi possível carregar o vídeo.",
        type: "error"
      });
    }
  };

  const applyRange = (start, duration) => {
    const s = Math.max(0, Math.min(start, totalDuration - 1));
    const e = Math.min(totalDuration, s + Math.min(duration, MAX_STICKER_DURATION));
    setStartTime(s);
    setEndTime(e);
  };

  const adjustStart = (delta) => {
    const newStart = Math.max(0, Math.min(startTime + delta, endTime - 1));
    setStartTime(newStart);
    if (endTime - newStart > MAX_STICKER_DURATION) {
      setEndTime(newStart + MAX_STICKER_DURATION);
    }
  };

  const adjustEnd = (delta) => {
    const newEnd = Math.min(totalDuration, Math.max(startTime + 1, endTime + delta));
    if (newEnd - startTime > MAX_STICKER_DURATION) {
      setStartTime(Math.max(0, newEnd - MAX_STICKER_DURATION));
    }
    setEndTime(newEnd);
  };

  const clipDuration = Math.max(1, Math.round(endTime - startTime));

  const handleCreateSticker = async () => {
    if (!selectedVideo || uploading) return;

    if (!isUserGold) {
      showAlert({
        title: "Recurso Exclusivo",
        message: "Apenas usuários com Selo Dourado VIP podem criar figurinhas de vídeo.",
        type: "warning"
      });
      return;
    }

    try {
      setUploading(true);
      setTrimmingStatus("Cortando vídeo no dispositivo...");

      const trimmedRes = await NativeOptimization.trimVideo(
        selectedVideo.uri,
        startTime,
        endTime
      );

      const finalVideoUri = trimmedRes?.uri || selectedVideo.uri;

      setTrimmingStatus("Enviando figurinha...");
      const uploadRes = await api.uploads.video(finalVideoUri);
      const videoUrl = getUploadUrl(uploadRes);

      if (!videoUrl) {
        throw new Error("Falha ao obter URL do vídeo.");
      }

      const stickerPayload = {
        video_url: videoUrl,
        duration: clipDuration,
        start_time: 0,
        end_time: clipDuration,
        sticker_name: `Figurinha ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        pack_name: "Memes",
        author_name: currentUser?.name || currentUser?.username || "Autor",
        description: null
      };

      let stickerRecord = null;
      try {
        stickerRecord = await api.stickers.create(stickerPayload);
      } catch (_) {
        stickerRecord = {
          id: `stk_${Date.now()}`,
          ...stickerPayload
        };
      }

      try {
        if (stickerRecord?.id) {
          await api.stickers.favorite(stickerRecord.id);
        }
      } catch (_) {}

      onStickerCreated?.({
        id: stickerRecord?.id,
        video_url: videoUrl,
        media_url: videoUrl,
        media_type: "STICKER",
        duration: clipDuration,
        sticker_name: stickerPayload.sticker_name,
        pack_name: stickerPayload.pack_name,
        author_name: stickerPayload.author_name
      });

      handleClose();
    } catch (err) {
      showAlert({
        title: "Erro ao Criar",
        message: err?.message || "Não foi possível gerar a figurinha.",
        type: "error"
      });
    } finally {
      setUploading(false);
      setTrimmingStatus("");
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setSelectedVideo(null);
    setStartTime(0);
    setEndTime(60);
    setTrimmingStatus("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.vipBadge}>
                <Ionicons name="sparkles" size={13} color="#f59e0b" />
                <Text style={styles.vipBadgeText}>VIP</Text>
              </View>
              <Text style={styles.headerTitle}>Criar Figurinha</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} disabled={uploading}>
              <Feather name="x" size={20} color="#a1a1aa" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {!selectedVideo ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconCircle}>
                    <MaterialCommunityIcons name="movie-filter" size={44} color="#f59e0b" />
                  </View>
                  <Text style={styles.emptyHeading}>Escolha um Vídeo</Text>
                  <Text style={styles.emptySubheading}>
                    Selecione um vídeo da galeria para cortar e transformar em figurinha animada.
                  </Text>
                  <Pressable style={styles.primaryPickBtn} onPress={pickVideo}>
                    <Feather name="plus-circle" size={18} color="#000" />
                    <Text style={styles.primaryPickBtnText}>Escolher Vídeo</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.editorArea}>
                <View style={styles.previewSection}>
                  <View style={styles.previewGlowBorder}>
                    <SafeStickerPlayer
                      url={selectedVideo.uri}
                      startTime={startTime}
                      style={styles.previewVideo}
                    />
                    <View style={styles.floatingDurationTag}>
                      <Ionicons name="timer-outline" size={13} color="#ffffff" />
                      <Text style={styles.floatingDurationText}>{clipDuration}s (máx 60s)</Text>
                    </View>
                  </View>

                  <Pressable style={styles.changeBtnMinimal} onPress={pickVideo} disabled={uploading}>
                    <Feather name="repeat" size={13} color="#a1a1aa" />
                    <Text style={styles.changeBtnText}>Trocar vídeo</Text>
                  </Pressable>
                </View>

                <View style={styles.trimmerCard}>
                  <View style={styles.trimmerHeader}>
                    <Text style={styles.sectionLabel}>Trecho Selecionado</Text>
                    <Text style={styles.timeRangeBadge}>
                      {formatSec(startTime)} até {formatSec(endTime)}
                    </Text>
                  </View>

                  <View style={styles.timelineTrack}>
                    <View
                      style={[
                        styles.timelineSelection,
                        {
                          left: `${(startTime / Math.max(1, totalDuration)) * 100}%`,
                          width: `${((endTime - startTime) / Math.max(1, totalDuration)) * 100}%`
                        }
                      ]}
                    />
                  </View>

                  <View style={styles.presetButtonsRow}>
                    <Pressable
                      style={[styles.presetBtn, clipDuration === 15 && startTime === 0 && styles.presetBtnActive]}
                      onPress={() => applyRange(0, 15)}>
                      <Text style={[styles.presetBtnText, clipDuration === 15 && startTime === 0 && styles.presetBtnTextActive]}>
                        15s
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.presetBtn, clipDuration === 30 && startTime === 0 && styles.presetBtnActive]}
                      onPress={() => applyRange(0, 30)}>
                      <Text style={[styles.presetBtnText, clipDuration === 30 && startTime === 0 && styles.presetBtnTextActive]}>
                        30s
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.presetBtn, clipDuration === 60 && startTime === 0 && styles.presetBtnActive]}
                      onPress={() => applyRange(0, 60)}>
                      <Text style={[styles.presetBtnText, clipDuration === 60 && startTime === 0 && styles.presetBtnTextActive]}>
                        60s (Máx)
                      </Text>
                    </Pressable>
                    {totalDuration > 60 && (
                      <Pressable
                        style={[styles.presetBtn, startTime > 0 && styles.presetBtnActive]}
                        onPress={() => applyRange(Math.min(totalDuration - 60, Math.floor(totalDuration / 2)), 60)}>
                        <Text style={[styles.presetBtnText, startTime > 0 && styles.presetBtnTextActive]}>
                          Próx. 60s
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.fineAdjustRow}>
                    <View style={styles.fineAdjustCol}>
                      <Text style={styles.fineAdjustLabel}>Início ({formatSec(startTime)})</Text>
                      <View style={styles.fineAdjustBtns}>
                        <Pressable style={styles.nudgeBtn} onPress={() => adjustStart(-5)}>
                          <Text style={styles.nudgeBtnText}>-5s</Text>
                        </Pressable>
                        <Pressable style={styles.nudgeBtn} onPress={() => adjustStart(-1)}>
                          <Text style={styles.nudgeBtnText}>-1s</Text>
                        </Pressable>
                        <Pressable style={styles.nudgeBtn} onPress={() => adjustStart(1)}>
                          <Text style={styles.nudgeBtnText}>+1s</Text>
                        </Pressable>
                        <Pressable style={styles.nudgeBtn} onPress={() => adjustStart(5)}>
                          <Text style={styles.nudgeBtnText}>+5s</Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.fineAdjustCol}>
                      <Text style={styles.fineAdjustLabel}>Fim ({formatSec(endTime)})</Text>
                      <View style={styles.fineAdjustBtns}>
                        <Pressable style={styles.nudgeBtn} onPress={() => adjustEnd(-5)}>
                          <Text style={styles.nudgeBtnText}>-5s</Text>
                        </Pressable>
                        <Pressable style={styles.nudgeBtn} onPress={() => adjustEnd(-1)}>
                          <Text style={styles.nudgeBtnText}>-1s</Text>
                        </Pressable>
                        <Pressable style={styles.nudgeBtn} onPress={() => adjustEnd(1)}>
                          <Text style={styles.nudgeBtnText}>+1s</Text>
                        </Pressable>
                        <Pressable style={styles.nudgeBtn} onPress={() => adjustEnd(5)}>
                          <Text style={styles.nudgeBtnText}>+5s</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>

                <Pressable
                  style={[styles.primaryActionBtn, uploading && { opacity: 0.7 }]}
                  onPress={handleCreateSticker}
                  disabled={uploading}>
                  {uploading ? (
                    <View style={styles.actionRow}>
                      <ActivityIndicator size="small" color="#000000" />
                      <Text style={styles.primaryActionBtnText}>
                        {trimmingStatus || "Processando..."}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.actionRow}>
                      <Ionicons name="cut" size={18} color="#000" />
                      <Text style={styles.primaryActionBtnText}>
                        Cortar e Criar Figurinha ({clipDuration}s)
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      <CustomModal
        visible={customAlert.visible}
        onClose={() => setCustomAlert((prev) => ({ ...prev, visible: false }))}
        title={customAlert.title}
        message={customAlert.message}
        type={customAlert.type}
        primaryButtonText={customAlert.primaryText}
        onPrimaryPress={() => {
          if (customAlert.onPrimaryPress) customAlert.onPrimaryPress();
          setCustomAlert((prev) => ({ ...prev, visible: false }));
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end"
  },
  container: {
    backgroundColor: "#111113",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderBottomWidth: 0,
    maxHeight: "92%",
    flex: 1
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)"
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  vipBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3
  },
  vipBadgeText: {
    color: "#f59e0b",
    fontSize: 11,
    fontFamily: "Poppins_700Bold"
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#ffffff"
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)"
  },
  scrollBody: {
    flex: 1
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  emptyContainer: {
    paddingVertical: 36
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 28,
    alignItems: "center"
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  emptyHeading: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#ffffff",
    textAlign: "center"
  },
  emptySubheading: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#a1a1aa",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 24
  },
  primaryPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8
  },
  primaryPickBtnText: {
    color: "#000000",
    fontSize: 14,
    fontFamily: "Poppins_700Bold"
  },
  editorArea: {
    gap: 18
  },
  previewSection: {
    alignItems: "center",
    gap: 10
  },
  previewGlowBorder: {
    width: 170,
    height: 170,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: "#f59e0b",
    overflow: "hidden",
    backgroundColor: "#000000",
    position: "relative"
  },
  previewVideo: {
    width: "100%",
    height: "100%"
  },
  playerLoading: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18181b"
  },
  floatingDurationTag: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  floatingDurationText: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold"
  },
  changeBtnMinimal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10
  },
  changeBtnText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#a1a1aa"
  },
  trimmerCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 16,
    gap: 14
  },
  trimmerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#ffffff"
  },
  timeRangeBadge: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    color: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  timelineTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 4,
    overflow: "hidden",
    position: "relative"
  },
  timelineSelection: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "#f59e0b",
    borderRadius: 4
  },
  presetButtonsRow: {
    flexDirection: "row",
    gap: 6
  },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center"
  },
  presetBtnActive: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.4)"
  },
  presetBtnText: {
    fontSize: 11.5,
    fontFamily: "Poppins_600SemiBold",
    color: "#d4d4d8"
  },
  presetBtnTextActive: {
    color: "#f59e0b"
  },
  fineAdjustRow: {
    flexDirection: "row",
    gap: 12
  },
  fineAdjustCol: {
    flex: 1,
    gap: 6
  },
  fineAdjustLabel: {
    fontSize: 11.5,
    fontFamily: "Poppins_500Medium",
    color: "#a1a1aa"
  },
  fineAdjustBtns: {
    flexDirection: "row",
    gap: 4
  },
  nudgeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center"
  },
  nudgeBtnText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: "#ffffff"
  },
  primaryActionBtn: {
    backgroundColor: "#f59e0b",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    color: "#000000"
  }
});
