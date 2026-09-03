import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../api";
import { IconButton } from "../ui/ui";
import { errorMessage } from "../../lib/format";
import { useTheme } from "../../theme";
import { NativeOptimization } from "../../services/nativeOptimization";
import { getSecuritySettings, authenticateWithBiometrics } from "../../services/biometricsService";

export function CreateStoryModal({ visible, onClose, onSuccess }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 44);

  const [media, setMedia] = useState(null);
  const [caption, setCaption] = useState("");
  const [isSingleView, setIsSingleView] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [videoPartsCount, setVideoPartsCount] = useState(1);

  const processSelectedMedia = async (asset) => {
    if (!asset) return;
    let parts = 1;

    const isVideo = asset.type === "video" || asset.mimeType?.includes("video") || asset.uri?.match(/\.(mp4|mov|mkv|webm)$/i);

    if (isVideo) {
      let durationSec = asset.duration ? (asset.duration > 1000 ? asset.duration / 1000 : asset.duration) : 0;
      if (!durationSec) {
        const metadata = await NativeOptimization.getVideoDuration(asset.uri);
        if (metadata?.durationSeconds) {
          durationSec = metadata.durationSeconds;
        }
      }

      if (durationSec && durationSec > 30) {
        parts = Math.ceil(durationSec / 30);
      }
    }

    setVideoPartsCount(parts);
    setMedia(asset);
  };

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Permita o acesso à galeria para postar stories.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      await processSelectedMedia(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Permita o acesso à câmera para tirar foto do story.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.85
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      await processSelectedMedia(result.assets[0]);
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setMedia(null);
    setCaption("");
    setIsSingleView(false);
    setVideoPartsCount(1);
    setUploadProgressText("");
    onClose();
  };

  const handleUpload = async () => {
    if (!media) return;
    try {
      const security = await getSecuritySettings();
      if (security.postLock) {
        const auth = await authenticateWithBiometrics(
          "Confirme sua digital para publicar este Story"
        );
        if (!auth.success && !auth.bypassed) {
          return;
        }
      }

      setUploading(true);
      const isVideo = media.type === "video" || media.mimeType?.includes("video") || media.uri?.match(/\.(mp4|mov|mkv|webm)$/i);
      const fileName = media.fileName || (isVideo ? "story.mp4" : "story.jpg");
      const mimeType = media.mimeType || (isVideo ? "video/mp4" : "image/jpeg");

      const totalParts = isVideo && videoPartsCount > 1 ? videoPartsCount : 1;

      for (let i = 0; i < totalParts; i++) {
        if (totalParts > 1) {
          setUploadProgressText(`Publicando parte ${i + 1} de ${totalParts}...`);
        } else {
          setUploadProgressText("Publicando Story...");
        }

        const form = new FormData();
        if (Platform.OS === "web") {
          const res = await globalThis.fetch(media.uri);
          const blob = await res.blob();
          form.append("file", blob, fileName);
        } else {
          form.append("file", {
            uri: media.uri,
            name: fileName,
            type: mimeType
          });
        }

        const partCaption = totalParts > 1
          ? (caption.trim() ? `${caption.trim()} (${i + 1}/${totalParts})` : `Parte ${i + 1}/${totalParts}`)
          : caption.trim();

        if (partCaption) {
          form.append("caption", partCaption);
        }

        form.append("is_single_view", isSingleView ? "true" : "false");

        await api.stories.create(form);
      }

      setMedia(null);
      setCaption("");
      setIsSingleView(false);
      setVideoPartsCount(1);
      setUploadProgressText("");
      onSuccess?.();
      onClose();
    } catch (err) {
      Alert.alert("Erro ao publicar Story", errorMessage(err));
    } finally {
      setUploading(false);
      setUploadProgressText("");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.card || "#121214",
              borderColor: colors.border,
              marginTop: topOffset,
              paddingBottom: Math.max(insets.bottom, 16)
            }
          ]}>
          <View style={[styles.header, { borderBottomColor: colors.line }]}>
            <IconButton name="x" color={colors.text} onPress={handleClose} label="Fechar" />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Novo Story</Text>
            <View style={{ width: 40 }} />
          </View>

          {media ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: media.uri }} style={styles.previewMedia} resizeMode="cover" />

              {videoPartsCount > 1 && (
                <View style={styles.partsBadge}>
                  <Ionicons name="cut-outline" size={14} color="#ffffff" style={{ marginRight: 5 }} />
                  <Text style={styles.partsBadgeText}>
                    Vídeo dividido em {videoPartsCount} blocos de 30s
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.captionBar,
                  {
                    backgroundColor:
                      colors.mode === "light"
                        ? "rgba(255, 255, 255, 0.92)"
                        : "rgba(18, 18, 18, 0.85)",
                    borderColor: colors.border
                  }
                ]}>
                <TextInput
                  placeholder="Adicionar legenda..."
                  placeholderTextColor={colors.muted}
                  value={caption}
                  onChangeText={setCaption}
                  maxLength={200}
                  style={[
                    styles.captionInput,
                    { color: colors.mode === "light" ? "#0F1419" : "#FFFFFF" }
                  ]}
                  editable={!uploading}
                />

                <Pressable
                  onPress={() => setIsSingleView((prev) => !prev)}
                  style={[
                    styles.singleViewToggle,
                    isSingleView && styles.singleViewToggleActive
                  ]}>
                  <MaterialCommunityIcons
                    name={isSingleView ? "numeric-1-circle" : "numeric-1-circle-outline"}
                    size={22}
                    color={isSingleView ? "#38bdf8" : colors.muted}
                  />
                  <Text
                    style={[
                      styles.singleViewToggleText,
                      { color: isSingleView ? "#38bdf8" : colors.muted }
                    ]}>
                    1x
                  </Text>
                </Pressable>
              </View>

              {isSingleView && (
                <View style={styles.singleViewBanner}>
                  <Feather name="shield" size={13} color="#38bdf8" style={{ marginRight: 6 }} />
                  <Text style={styles.singleViewBannerText}>
                    Visualização única ativada • Protegido contra prints
                  </Text>
                </View>
              )}

              <View style={styles.bottomBar}>
                <Pressable
                  style={[
                    styles.changeMediaBtn,
                    {
                      backgroundColor:
                        colors.mode === "light"
                          ? "rgba(255, 255, 255, 0.9)"
                          : "rgba(24, 24, 24, 0.75)",
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => !uploading && setMedia(null)}>
                  <Feather
                    name="refresh-cw"
                    size={17}
                    color={colors.mode === "light" ? "#0F1419" : "#FFFFFF"}
                  />
                  <Text
                    style={[
                      styles.changeMediaText,
                      { color: colors.mode === "light" ? "#0F1419" : "#FFFFFF" }
                    ]}>
                    Trocar
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.publishBtn,
                    { backgroundColor: colors.primary || "#0095f6" },
                    uploading && { opacity: 0.7 }
                  ]}
                  onPress={handleUpload}
                  disabled={uploading}>
                  {uploading ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.publishBtnText}>
                        {uploadProgressText || "Publicando..."}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.publishBtnText}>
                        {videoPartsCount > 1 ? `Publicar (${videoPartsCount} partes)` : "Publicar"}
                      </Text>
                      <Feather name="send" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.pickerContainer}>
              <View style={styles.pickerGraphic}>
                <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft || "rgba(0,149,246,0.12)" }]}>
                  <Feather name="camera" size={40} color={colors.primary || "#0095f6"} />
                </View>
                <Text style={[styles.pickerHeading, { color: colors.text }]}>
                  Compartilhe seu momento
                </Text>
                <Text style={[styles.pickerSubheading, { color: colors.subtext || colors.muted }]}>
                  Vídeos longos são divididos automaticamente em blocos de 30s.
                </Text>
              </View>

              <View style={styles.pickerButtons}>
                <Pressable style={styles.pickerOption} onPress={takePhoto}>
                  <View
                    style={[
                      styles.pickerOptionIcon,
                      { backgroundColor: colors.surfaceAlt, borderColor: colors.border }
                    ]}>
                    <Feather name="camera" size={24} color={colors.text} />
                  </View>
                  <Text style={[styles.pickerOptionText, { color: colors.text }]}>Câmera</Text>
                </Pressable>

                <Pressable style={styles.pickerOption} onPress={pickMedia}>
                  <View
                    style={[
                      styles.pickerOptionIcon,
                      { backgroundColor: colors.surfaceAlt, borderColor: colors.border }
                    ]}>
                    <Feather name="image" size={24} color={colors.text} />
                  </View>
                  <Text style={[styles.pickerOptionText, { color: colors.text }]}>Galeria</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end"
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: "92%",
    flex: 1
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold"
  },
  previewContainer: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
    position: "relative"
  },
  previewMedia: {
    width: "100%",
    height: "68%",
    borderRadius: 18,
    backgroundColor: "#000"
  },
  partsBadge: {
    position: "absolute",
    top: 28,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    zIndex: 10
  },
  partsBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Poppins_500Medium"
  },
  captionBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 8
  },
  captionInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: "Poppins_400Regular",
    paddingVertical: 6
  },
  singleViewToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3
  },
  singleViewToggleActive: {
    backgroundColor: "rgba(56, 189, 248, 0.15)"
  },
  singleViewToggleText: {
    fontSize: 12,
    fontFamily: "Poppins_700Bold"
  },
  singleViewBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 6
  },
  singleViewBannerText: {
    color: "#38bdf8",
    fontSize: 11.5,
    fontFamily: "Poppins_500Medium"
  },
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10
  },
  changeMediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6
  },
  changeMediaText: {
    fontSize: 13.5,
    fontFamily: "Poppins_500Medium"
  },
  publishBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14
  },
  publishBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold"
  },
  pickerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 40
  },
  pickerGraphic: {
    alignItems: "center",
    marginBottom: 36
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18
  },
  pickerHeading: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    marginBottom: 6
  },
  pickerSubheading: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 19
  },
  pickerButtons: {
    flexDirection: "row",
    gap: 20
  },
  pickerOption: {
    alignItems: "center",
    gap: 8
  },
  pickerOptionIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  pickerOptionText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium"
  }
});