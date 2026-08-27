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
  StatusBar } from
"react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../api";
import { IconButton } from "../ui/ui";
import { errorMessage } from "../../lib/format";
import { useTheme } from "../../theme";

export function CreateStoryModal({ visible, onClose, onSuccess }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topOffset = Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight || 28) : 44);
  const [media, setMedia] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

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
      setMedia(result.assets[0]);
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
      setMedia(result.assets[0]);
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setMedia(null);
    setCaption("");
    onClose();
  };

  const handleUpload = async () => {
    if (!media) return;
    try {
      setUploading(true);
      const form = new FormData();
      const isVideo = media.type === "video" || media.uri?.endsWith(".mp4");
      const fileName = media.fileName || (isVideo ? "story.mp4" : "story.jpg");
      const mimeType = media.mimeType || (isVideo ? "video/mp4" : "image/jpeg");

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

      if (caption.trim()) {
        form.append("caption", caption.trim());
      }

      await api.stories.create(form);
      setMedia(null);
      setCaption("");
      onSuccess?.();
      onClose();
    } catch (err) {
      Alert.alert("Erro ao publicar Story", errorMessage(err));
    } finally {
      setUploading(false);
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
            backgroundColor: colors.card,
            borderColor: colors.border,
            marginTop: topOffset,
            paddingBottom: Math.max(insets.bottom, 16)
          }]
          }>
          
          {}
          <View style={[styles.header, { borderBottomColor: colors.line }]}>
            <IconButton name="x" color={colors.text} onPress={handleClose} label="Fechar" />
            <Text style={[styles.headerTitle, { color: colors.text }]}>Novo Story</Text>
            <View style={{ width: 40 }} />
          </View>

          {}
          {media ?
          <View style={styles.previewContainer}>
              <Image source={{ uri: media.uri }} style={styles.previewMedia} resizeMode="cover" />

              {}
              <View
              style={[
              styles.captionBar,
              {
                backgroundColor:
                colors.mode === "light" ?
                "rgba(255, 255, 255, 0.9)" :
                "rgba(18, 18, 18, 0.75)",
                borderColor: colors.border
              }]
              }>
              
                <TextInput
                placeholder="Adicionar legenda..."
                placeholderTextColor={colors.muted}
                value={caption}
                onChangeText={setCaption}
                maxLength={200}
                style={[
                styles.captionInput,
                { color: colors.mode === "light" ? "#0F1419" : "#FFFFFF" }]
                }
                editable={!uploading} />
              
              </View>

              {}
              <View style={styles.bottomBar}>
                <Pressable
                style={[
                styles.changeMediaBtn,
                {
                  backgroundColor:
                  colors.mode === "light" ?
                  "rgba(255, 255, 255, 0.9)" :
                  "rgba(24, 24, 24, 0.75)",
                  borderColor: colors.border
                }]
                }
                onPress={() => !uploading && setMedia(null)}>
                
                  <Feather
                  name="refresh-cw"
                  size={18}
                  color={colors.mode === "light" ? "#0F1419" : "#FFFFFF"} />
                
                  <Text
                  style={[
                  styles.changeMediaText,
                  { color: colors.mode === "light" ? "#0F1419" : "#FFFFFF" }]
                  }>
                  
                    Trocar
                  </Text>
                </Pressable>

                <Pressable
                style={[
                styles.publishBtn,
                { backgroundColor: colors.primary || colors.accent },
                uploading && { opacity: 0.7 }]
                }
                onPress={handleUpload}
                disabled={uploading}>
                
                  {uploading ?
                <ActivityIndicator size="small" color="#ffffff" /> :

                <>
                      <Text style={styles.publishBtnText}>Publicar</Text>
                      <Feather name="send" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                    </>
                }
                </Pressable>
              </View>
            </View> :

          <View style={styles.pickerContainer}>
              <View style={styles.pickerGraphic}>
                <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
                  <Feather name="camera" size={40} color={colors.primary || colors.accent} />
                </View>
                <Text style={[styles.pickerHeading, { color: colors.text }]}>
                  Compartilhe seu momento
                </Text>
                <Text style={[styles.pickerSubheading, { color: colors.subtext }]}>
                  Stories desaparecem automaticamente após 24 horas.
                </Text>
              </View>

              <View style={styles.pickerButtons}>
                <Pressable style={styles.pickerOption} onPress={takePhoto}>
                  <View
                  style={[
                  styles.pickerOptionIcon,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]
                  }>
                  
                    <Feather name="camera" size={24} color={colors.text} />
                  </View>
                  <Text style={[styles.pickerOptionText, { color: colors.text }]}>Câmera</Text>
                </Pressable>

                <Pressable style={styles.pickerOption} onPress={pickMedia}>
                  <View
                  style={[
                  styles.pickerOptionIcon,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]
                  }>
                  
                    <Feather name="image" size={24} color={colors.text} />
                  </View>
                  <Text style={[styles.pickerOptionText, { color: colors.text }]}>Galeria</Text>
                </Pressable>
              </View>
            </View>
          }
        </View>
      </KeyboardAvoidingView>
    </Modal>);

}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end"
  },
  container: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    borderTopWidth: 1
  },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    zIndex: 10
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16
  },
  previewContainer: {
    flex: 1,
    position: "relative",
    padding: 12
  },
  previewMedia: {
    width: "100%",
    height: "100%",
    borderRadius: 24
  },
  captionBar: {
    position: "absolute",
    bottom: 84,
    left: 24,
    right: 24,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1
  },
  captionInput: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    minHeight: 24
  },
  bottomBar: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  changeMediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    borderWidth: 1,
    gap: 8
  },
  changeMediaText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  },
  publishBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4
  },
  publishBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#ffffff"
  },
  pickerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24
  },
  pickerGraphic: {
    alignItems: "center",
    marginBottom: 48
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20
  },
  pickerHeading: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    textAlign: "center"
  },
  pickerSubheading: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 280
  },
  pickerButtons: {
    flexDirection: "row",
    gap: 28
  },
  pickerOption: {
    alignItems: "center",
    gap: 10
  },
  pickerOptionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  pickerOptionText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5
  }
});