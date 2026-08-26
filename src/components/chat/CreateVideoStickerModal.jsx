import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View } from
"react-native";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { api, getUploadUrl } from "../../api";
import { CustomModal } from "../modals/CustomModal";

const DEFAULT_PACKS = ["Memes", "Reações", "Tribo", "Gerais"];

function TrimmerVideoPreview({ url, startTime, style }) {
  const player = useVideoPlayer(url || "", (p) => {
    p.loop = true;
    p.muted = false;
    try {Promise.resolve(p.play()).catch(() => {});} catch (e) {}
  });

  useEffect(() => {
    if (!player || !url) return;
    try {
      player.currentTime = startTime;
      Promise.resolve(player.play()).catch(() => {});
    } catch (e) {}
  }, [startTime, player, url]);

  if (!url) return null;

  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="cover"
      style={style} />);


}

export function CreateVideoStickerModal({
  visible,
  onClose,
  onStickerCreated,
  currentUser,
  onShowGoldModal
}) {
  const { colors } = useTheme();
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [uploading, setUploading] = useState(false);


  const [totalDuration, setTotalDuration] = useState(30);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);


  const [stickerName, setStickerName] = useState("");
  const [packName, setPackName] = useState("Memes");
  const [customPack, setCustomPack] = useState("");
  const [authorName, setAuthorName] = useState(
    currentUser?.name || currentUser?.username || ""
  );
  const [description, setDescription] = useState("");
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

  const pickVideo = async () => {
    if (!isUserGold) {
      onClose();
      onShowGoldModal?.();
      return;
    }

    try {
      const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
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
        quality: 0.8
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const durationSec =
        Math.max(1, Math.round((asset.duration || 0) / 1000)) || 30;

        setTotalDuration(durationSec);
        setStartTime(0);
        setEndTime(Math.min(durationSec, 30));

        setSelectedVideo({
          uri: asset.uri,
          duration: durationSec,
          width: asset.width,
          height: asset.height
        });


        if (!stickerName) {
          setStickerName(
            `Figurinha ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          );
        }
      }
    } catch (e) {
      console.warn("Erro ao selecionar vídeo para figurinha:", e);
      showAlert({
        title: "Erro no Vídeo",
        message: "Não foi possível carregar o vídeo.",
        type: "error"
      });
    }
  };

  const adjustStartTime = (delta) => {
    const newStart = Math.max(0, Math.min(startTime + delta, endTime - 1));
    setStartTime(newStart);
    if (endTime - newStart > 30) {
      setEndTime(newStart + 30);
    }
  };

  const adjustEndTime = (delta) => {
    const newEnd = Math.min(
      totalDuration,
      Math.max(startTime + 1, endTime + delta)
    );
    if (newEnd - startTime > 30) {
      setStartTime(Math.max(0, newEnd - 30));
    }
    setEndTime(newEnd);
  };

  const clipDuration = Math.max(1, Math.round(endTime - startTime));

  const handleCreateSticker = async () => {
    if (!selectedVideo || uploading) return;

    if (!isUserGold) {
      showAlert({
        title: "Recurso Exclusivo",
        message:
        "Apenas usuários com Selo Dourado VIP podem criar figurinhas de vídeo.",
        type: "warning"
      });
      return;
    }

    const finalPack = customPack.trim() || packName || "Gerais";

    try {
      setUploading(true);
      const res = await api.uploads.video(selectedVideo.uri);
      const videoUrl = getUploadUrl(res);

      if (!videoUrl) {
        throw new Error("Falha ao obter URL do vídeo.");
      }


      const stickerPayload = {
        video_url: videoUrl,
        duration: clipDuration,
        start_time: startTime,
        end_time: endTime,
        sticker_name: stickerName.trim() || "Figurinha de Vídeo",
        pack_name: finalPack,
        author_name:
        authorName.trim() ||
        currentUser?.name ||
        currentUser?.username ||
        "Autor",
        description: description.trim() || null
      };

      let stickerRecord = null;
      try {
        stickerRecord = await api.stickers.create(stickerPayload);
      } catch (e) {
        stickerRecord = {
          id: `stk_${Date.now()}`,
          ...stickerPayload
        };
      }


      try {
        if (stickerRecord?.id) {
          await api.stickers.favorite(stickerRecord.id);
        }
      } catch (e) {}

      onStickerCreated?.({
        id: stickerRecord?.id,
        video_url: videoUrl,
        media_url: videoUrl,
        media_type: "STICKER",
        duration: clipDuration,
        sticker_name: stickerPayload.sticker_name,
        pack_name: stickerPayload.pack_name,
        author_name: stickerPayload.author_name,
        description: stickerPayload.description
      });

      handleClose();
    } catch (err) {
      console.error("Erro ao criar figurinha de vídeo:", err);
      showAlert({
        title: "Erro na Criação",
        message: "Não foi possível criar a figurinha de vídeo.",
        type: "error"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setSelectedVideo(null);
    setStickerName("");
    setCustomPack("");
    setDescription("");
    onClose();
  };

  const formatSeconds = (sec) => {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const remainder = s % 60;
    return `${m.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      
      <View style={styles.overlay}>
        <View
          style={[
          styles.container,
          {
            backgroundColor: colors.card || "#ffffff",
            borderColor: colors.border || "#e2e8f0"
          }]
          }>
          
          {}
          <View style={styles.header}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              
              <MaterialCommunityIcons name="crown" size={20} color="#f59e0b" />
              <Text style={[styles.title, { color: colors.text }]}>
                Criar Figurinha de Vídeo
              </Text>
            </View>
            <Pressable onPress={handleClose} style={{ padding: 4 }}>
              <Feather name="x" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 10 }}>
            
            {}
            {selectedVideo?.uri ?
            <View style={styles.previewSection}>
                {}
                <View style={styles.stickerPreviewCard}>
                  <TrimmerVideoPreview
                  url={selectedVideo.uri}
                  startTime={startTime}
                  style={styles.previewVideo} />
                
                  <View style={styles.liveIndicator}>
                    <Ionicons name="sparkles" size={10} color="#f59e0b" />
                    <Text style={styles.liveText}>{clipDuration}s</Text>
                  </View>
                </View>

                {}
                <View
                style={[
                styles.trimmerBox,
                {
                  backgroundColor:
                  colors.surfaceAlt || (
                  colors.mode === "dark" ? "#1e1e1e" : "#f8fafc"),
                  borderColor: colors.border || "#e2e8f0"
                }]
                }>
                
                  <View style={styles.trimmerHeader}>
                    <Text style={[styles.trimmerLabel, { color: colors.text }]}>
                      Recorte do Clipe (Máx. 30s)
                    </Text>
                    <Text
                    style={[styles.trimmerDurationText, { color: "#f59e0b" }]}>
                    
                      {clipDuration}s selecionados
                    </Text>
                  </View>

                  {}
                  <View style={styles.trimmerControlsRow}>
                    <View style={styles.trimmerColumn}>
                      <Text
                      style={[
                      styles.trimmerTimeLabel,
                      { color: colors.muted }]
                      }>
                      
                        Início ({formatSeconds(startTime)})
                      </Text>
                      <View style={styles.stepButtonGroup}>
                        <Pressable
                        onPress={() => adjustStartTime(-1)}
                        style={[
                        styles.stepBtn,
                        { backgroundColor: colors.card }]
                        }>
                        
                          <Feather name="minus" size={14} color={colors.text} />
                        </Pressable>
                        <Text
                        style={[styles.stepValue, { color: colors.text }]}>
                        
                          {formatSeconds(startTime)}
                        </Text>
                        <Pressable
                        onPress={() => adjustStartTime(1)}
                        style={[
                        styles.stepBtn,
                        { backgroundColor: colors.card }]
                        }>
                        
                          <Feather name="plus" size={14} color={colors.text} />
                        </Pressable>
                      </View>
                    </View>

                    <Feather
                    name="arrow-right"
                    size={16}
                    color={colors.muted}
                    style={{ marginTop: 14 }} />
                  

                    <View style={styles.trimmerColumn}>
                      <Text
                      style={[
                      styles.trimmerTimeLabel,
                      { color: colors.muted }]
                      }>
                      
                        Fim ({formatSeconds(endTime)})
                      </Text>
                      <View style={styles.stepButtonGroup}>
                        <Pressable
                        onPress={() => adjustEndTime(-1)}
                        style={[
                        styles.stepBtn,
                        { backgroundColor: colors.card }]
                        }>
                        
                          <Feather name="minus" size={14} color={colors.text} />
                        </Pressable>
                        <Text
                        style={[styles.stepValue, { color: colors.text }]}>
                        
                          {formatSeconds(endTime)}
                        </Text>
                        <Pressable
                        onPress={() => adjustEndTime(1)}
                        style={[
                        styles.stepBtn,
                        { backgroundColor: colors.card }]
                        }>
                        
                          <Feather name="plus" size={14} color={colors.text} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>

                {}
                <Pressable
                onPress={pickVideo}
                style={[
                styles.changeButton,
                { backgroundColor: colors.surfaceAlt }]
                }>
                
                  <Feather name="repeat" size={14} color={colors.text} />
                  <Text
                  style={[styles.changeButtonText, { color: colors.text }]}>
                  
                    Escolher outro vídeo
                  </Text>
                </Pressable>

                {}
                <View style={styles.formContainer}>
                  {}
                  <View style={styles.formGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      Nome da Figurinha
                    </Text>
                    <TextInput
                    placeholder="Ex: Risada do Luan"
                    placeholderTextColor={colors.subtext || "#94a3b8"}
                    value={stickerName}
                    onChangeText={setStickerName}
                    style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceAlt,
                      color: colors.text,
                      borderColor: colors.border
                    }]
                    } />
                  
                  </View>

                  {}
                  <View style={styles.formGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      Pasta / Pacote
                    </Text>
                    <View style={styles.packsRow}>
                      {DEFAULT_PACKS.map((pack) => {
                      const isSelected = packName === pack && !customPack;
                      return (
                        <Pressable
                          key={pack}
                          onPress={() => {
                            setPackName(pack);
                            setCustomPack("");
                          }}
                          style={[
                          styles.packChip,
                          {
                            backgroundColor: isSelected ?
                            "#f59e0b" :
                            colors.surfaceAlt,
                            borderColor: isSelected ?
                            "#f59e0b" :
                            colors.border
                          }]
                          }>
                          
                            <Text
                            style={[
                            styles.packChipText,
                            { color: isSelected ? "#000000" : colors.text }]
                            }>
                            
                              {pack}
                            </Text>
                          </Pressable>);

                    })}
                    </View>
                    <TextInput
                    placeholder="Ou digite uma nova pasta..."
                    placeholderTextColor={colors.subtext || "#94a3b8"}
                    value={customPack}
                    onChangeText={(val) => {
                      setCustomPack(val);
                      if (val) setPackName("");
                    }}
                    style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceAlt,
                      color: colors.text,
                      borderColor: customPack ? "#f59e0b" : colors.border,
                      marginTop: 6
                    }]
                    } />
                  
                  </View>

                  {}
                  <View style={styles.formGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>
                      Autor / Criador Original
                    </Text>
                    <TextInput
                    placeholder="Ex: @criador_original"
                    placeholderTextColor={colors.subtext || "#94a3b8"}
                    value={authorName}
                    onChangeText={setAuthorName}
                    style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceAlt,
                      color: colors.text,
                      borderColor: colors.border
                    }]
                    } />
                  
                  </View>

                  {}
                  <View style={styles.formGroup}>
                    <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between"
                    }}>
                    
                      <Text style={[styles.inputLabel, { color: colors.text }]}>
                        Significado / Descrição (Opcional)
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.muted }}>
                        Metadado
                      </Text>
                    </View>
                    <TextInput
                    placeholder="Descreva o contexto ou significado desta figurinha..."
                    placeholderTextColor={colors.subtext || "#94a3b8"}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={2}
                    style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceAlt,
                      color: colors.text,
                      borderColor: colors.border,
                      minHeight: 56,
                      textAlignVertical: "top"
                    }]
                    } />
                  
                    <Text style={[styles.helperText, { color: colors.muted }]}>
                      🔒 Esse texto é salvo apenas para busca e detalhes. Ele
                      NÃO será exibido por cima do vídeo.
                    </Text>
                  </View>
                </View>
              </View> :

            <Pressable
              onPress={pickVideo}
              style={[
              styles.uploadBox,
              {
                borderColor: "#f59e0b",
                backgroundColor: "rgba(245, 158, 11, 0.05)"
              }]
              }>
              
                <View style={styles.uploadIconContainer}>
                  <Feather name="video" size={32} color="#f59e0b" />
                </View>
                <Text style={[styles.uploadTitle, { color: colors.text }]}>
                  Escolher Vídeo da Galeria
                </Text>
                <Text style={[styles.uploadSubtitle, { color: colors.muted }]}>
                  Vídeos longos podem ser recortados em até 30s
                </Text>
              </Pressable>
            }
          </ScrollView>

          {}
          <View style={styles.footer}>
            <Pressable
              onPress={selectedVideo ? handleCreateSticker : pickVideo}
              disabled={uploading}
              style={({ pressed }) => [
              styles.createButton,
              {
                backgroundColor: "#f59e0b",
                opacity: pressed || uploading ? 0.85 : 1
              }]
              }>
              
              {uploading ?
              <ActivityIndicator size="small" color="#000000" /> :

              <>
                  <Ionicons name="sparkles" size={18} color="#000000" />
                  <Text style={styles.createButtonText}>
                    {selectedVideo ?
                  "Criar Figurinha de Vídeo" :
                  "Selecionar Vídeo"}
                  </Text>
                </>
              }
            </Pressable>
          </View>
        </View>
      </View>

      <CustomModal
        visible={customAlert.visible}
        type={customAlert.type}
        title={customAlert.title}
        message={customAlert.message}
        onClose={() => setCustomAlert((prev) => ({ ...prev, visible: false }))} />
      
    </Modal>);

}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  container: {
    width: "100%",
    maxHeight: "92%",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  title: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold"
  },
  uploadBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 20,
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 14
  },
  uploadIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  uploadTitle: {
    fontSize: 14.5,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 4
  },
  uploadSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular"
  },
  previewSection: {
    alignItems: "center",
    paddingTop: 4
  },
  stickerPreviewCard: {
    width: 170,
    height: 170,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#f59e0b",
    position: "relative",
    marginBottom: 12,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  previewVideo: {
    width: "100%",
    height: "100%"
  },
  liveIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  liveText: {
    color: "#ffffff",
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold"
  },
  trimmerBox: {
    width: "100%",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10
  },
  trimmerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  trimmerLabel: {
    fontSize: 12.5,
    fontFamily: "Poppins_600SemiBold"
  },
  trimmerDurationText: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold"
  },
  trimmerControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  trimmerColumn: {
    alignItems: "center",
    gap: 4
  },
  trimmerTimeLabel: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular"
  },
  stepButtonGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0"
  },
  stepValue: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    minWidth: 42,
    textAlign: "center"
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 14
  },
  changeButtonText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium"
  },
  formContainer: {
    width: "100%",
    gap: 12
  },
  formGroup: {
    gap: 4
  },
  inputLabel: {
    fontSize: 12.5,
    fontFamily: "Poppins_600SemiBold"
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5
  },
  packsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2
  },
  packChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1
  },
  packChipText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold"
  },
  helperText: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    marginTop: 2,
    lineHeight: 15
  },
  footer: {
    width: "100%",
    paddingTop: 10
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3
  },
  createButtonText: {
    color: "#000000",
    fontSize: 14.5,
    fontFamily: "Poppins_700Bold"
  }
});