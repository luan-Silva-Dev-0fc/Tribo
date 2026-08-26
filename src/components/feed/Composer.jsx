import { CommentOptionsModal } from './PostCard';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  LayoutAnimation,
  BackHandler,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Audio } from "expo-av";
import { api, getUploadUrl } from "../../api";
import {
  Avatar,
  EmptyState,
  IconButton,
  VerificationBadge,
} from "../../components/ui/ui";
import { ReportModal } from "../../components/modals/report-modal";
import { AppLayout } from "../../components/layout/AppLayout";
import { StoriesBar } from "../../components/stories/stories-bar";
import { CommunityGuidelinesModal } from "../../components/modals/community-guidelines-modal";
import { MediaViewerModal } from "../../components/modals/media-viewer-modal";
import { RepostModal } from "../../components/modals/repost-modal";
import { TriboAlertModal } from "../../components/modals/tribo-alert-modal";
import { AppHeader } from "../../components/ui/ui";
import { useUserContext } from "../../context/user-context";
import {
  errorMessage,
  formatRelativeTime,
  listFrom,
  userName,
} from "../../lib/format";
import { useTheme } from "../../theme";


function getYouTubeId(url) {
  if (!url || typeof url !== "string") return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.trim().match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function Composer({ user, onPublished, onCreate }) {
  const { colors } = useTheme();
  const [content, setContent] = useState("");
  const [mediaList, setMediaList] = useState([]); // Array of { uri, fileName, mimeType, type }
  const [busy, setBusy] = useState(false);
  const [youtubeModalVisible, setYoutubeModalVisible] = useState(false);
  const [youtubeInputUrl, setYoutubeInputUrl] = useState("");
  const [attachedYoutubeId, setAttachedYoutubeId] = useState(null);
  const [attachedYoutubeUrl, setAttachedYoutubeUrl] = useState(null);

  const [alertConfig, setAlertConfig] = useState({ visible: false });

  const showAlert = (config) => {
    setAlertConfig({ visible: true, ...config });
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return showAlert({
        type: "error",
        title: "Permissão necessária",
        message: "Permita o acesso às fotos para publicar.",
        onClose: () => showAlert({ visible: false }),
      });
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const newMedia = result.assets.map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName || `photo_${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        type: "image",
      }));
      setMediaList((prev) => [...prev, ...newMedia].slice(0, 10));
    }
  };

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted)
      return showAlert({
        type: "error",
        title: "Permissão necessária",
        message: "Permita o acesso aos vídeos para publicar.",
        onClose: () => showAlert({ visible: false }),
      });
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const newMedia = result.assets.map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName || `video_${Date.now()}.mp4`,
        mimeType: asset.mimeType || "video/mp4",
        type: "video",
      }));
      setMediaList((prev) => [...prev, ...newMedia].slice(0, 10));
    }
  };

  const publish = async () => {
    if (!content.trim() && mediaList.length === 0) {
      return showAlert({
        type: "error",
        title: "Campo Vazio",
        message: "Escreva algo ou anexe uma mídia para publicar.",
        onClose: () => showAlert({ visible: false }),
      });
    }
    try {
      setBusy(true);
      const media_attachments = [];

      for (const m of mediaList) {
        let uploadRes;
        if (m.type === "video" || m.mimeType?.startsWith("video")) {
          uploadRes = await api.uploads.video(m.uri, m.fileName, m.mimeType);
        } else {
          uploadRes = await api.uploads.photo(m.uri, m.fileName, m.mimeType);
        }

        const mediaUrl = getUploadUrl(uploadRes);
        if (mediaUrl) {
          media_attachments.push({
            url: mediaUrl,
            type: m.type,
            mimeType: m.mimeType,
            fileName: m.fileName,
          });
        }
      }

      const postData = {
        content: content.trim(),
        media_attachments,
        youtube_url: attachedYoutubeUrl || undefined,
        type: attachedYoutubeId ? "youtube" : undefined,
      };

      if (onCreate) {
        await onCreate(postData);
      } else {
        await api.posts.create(postData);
      }
      setContent("");
      setMediaList([]);
      setAttachedYoutubeId(null);
      setAttachedYoutubeUrl(null);
      onPublished();
    } catch (error) {
      const isNsfwError =
        error?.payload?.error_code === "NSFW_CONFIG_DISABLED" ||
        error?.response?.data?.error_code === "NSFW_CONFIG_DISABLED" ||
        error?.error_code === "NSFW_CONFIG_DISABLED" ||
        error?.payload?.error_code === "NSFW_REQUIRED" ||
        error?.response?.data?.error_code === "NSFW_REQUIRED" ||
        error?.error_code === "NSFW_REQUIRED" ||
        String(error?.message || "").includes("teor adulto") ||
        String(error?.message || "").includes("conteúdo sexual") ||
        String(error?.payload?.message || "").includes("conteúdo sexual") ||
        String(error?.payload?.message || "").includes("teor adulto");

      if (isNsfwError) {
        const officialMsg =
          error?.payload?.message ||
          error?.response?.data?.message ||
          error?.message ||
          "Este conteúdo contém teor adulto/sexual e não pode ser publicado porque a opção +18 está desativada na sua conta. Nossa plataforma segue artigos rígidos de conformidade digital e determinações judiciais. Para publicar este tipo de conteúdo, ative a opção +18 nas Configurações do seu Perfil.";

        showAlert({
          type: "warning",
          title: "🛡️ Diretrizes Rígidas de Conteúdo (+18)",
          message: officialMsg,
          buttonText: "Entendido",
          onClose: () => showAlert({ visible: false }),
        });
        return;
      }

      showAlert({
        type: "error",
        title: "Publicação não enviada",
        message: errorMessage(error),
        onClose: () => showAlert({ visible: false }),
      });
    } finally {
      setBusy(false);
    }
  };

  const isPublishDisabled = (!content.trim() && mediaList.length === 0 && !attachedYoutubeId) || busy;

  return (
    <View
      style={[
        styles.composerCardWrapper,
        {
          backgroundColor: colors.card || colors.surface,
          borderColor: colors.border || colors.line,
        },
      ]}
    >
      <View style={styles.composer}>
        <View style={styles.composerTop}>
          <Avatar user={user} size={42} />
          <View
            style={[
              styles.composerInputWrapper,
              {
                backgroundColor:
                  colors.cardSecondary ||
                  colors.surfaceAlt ||
                  colors.background,
                borderColor: colors.border || colors.line,
              },
            ]}
          >
            <TextInput
              multiline
              placeholder="Compartilhe o seu conhecimento ou acontecimentos com a gente..."
              placeholderTextColor={colors.subtext || colors.muted}
              value={content}
              onChangeText={setContent}
              style={[styles.composerInput, { color: colors.text }]}
            />
          </View>
        </View>

        {mediaList.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 12, marginBottom: 8, paddingLeft: 60 }}
          >
            {mediaList.map((m, index) => (
              <View
                key={index}
                style={[styles.preview, { marginRight: 10, marginTop: 0 }]}
              >
                <Image source={{ uri: m.uri }} style={styles.previewImage} />
                {m.type === "video" && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 6,
                      left: 6,
                      backgroundColor: "rgba(0,0,0,0.6)",
                      borderRadius: 8,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <Feather
                      name="video"
                      size={10}
                      color="#FFFFFF"
                      style={{ marginRight: 3 }}
                    />
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 10,
                        fontFamily: "Poppins_600SemiBold",
                      }}
                    >
                      Vídeo
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={() =>
                    setMediaList((prev) => prev.filter((_, i) => i !== index))
                  }
                  style={styles.removeImageBtn}
                  accessibilityLabel="Remover mídia"
                >
                  <Feather name="x" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}


        {/* Prévia do Vídeo do YouTube Anexado */}
        {!!attachedYoutubeId && (
          <View style={{ marginTop: 12, marginBottom: 8, paddingHorizontal: 16 }}>
            <View
              style={{
                borderRadius: 14,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(239, 68, 68, 0.35)",
                backgroundColor: "#121212",
                position: "relative",
              }}
            >
              <Image
                source={{ uri: `https://img.youtube.com/vi/${attachedYoutubeId}/hqdefault.jpg` }}
                style={{ width: "100%", height: 160 }}
                resizeMode="cover"
              />
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  backgroundColor: "rgba(0,0,0,0.75)",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <MaterialCommunityIcons name="youtube" size={14} color="#ef4444" />
                <Text style={{ color: "#ffffff", fontSize: 11, fontFamily: "Poppins_600SemiBold" }}>
                  Vídeo do YouTube Anexado
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setAttachedYoutubeId(null);
                  setAttachedYoutubeUrl(null);
                }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "rgba(0,0,0,0.75)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityLabel="Remover vídeo do YouTube"
              >
                <Feather name="x" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        )}

        <View
          style={[
            styles.composerDivider,
            { backgroundColor: colors.border || colors.line },
          ]}
        />

        <View style={styles.composerFoot}>
          <View style={styles.composerIcons}>
            <Pressable
              onPress={pickImage}
              style={({ pressed }) => [
                styles.composerActionBtn,
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: pressed
                    ? colors.cardSecondary || "rgba(0,0,0,0.05)"
                    : "transparent",
                },
              ]}
              accessibilityLabel="Adicionar imagem"
            >
              <Feather
                name="image"
                size={19}
                color={colors.primary || colors.accent}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                setYoutubeInputUrl(attachedYoutubeUrl || "");
                setYoutubeModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.composerActionBtn,
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: pressed
                    ? colors.cardSecondary || "rgba(0,0,0,0.05)"
                    : "transparent",
                },
              ]}
              accessibilityLabel="Adicionar vídeo do YouTube"
            >
              <MaterialCommunityIcons
                name="youtube"
                size={22}
                color={attachedYoutubeId ? "#ef4444" : (colors.primary || colors.accent)}
              />
            </Pressable>
            <Pressable
              onPress={pickVideo}
              style={({ pressed }) => [
                styles.composerActionBtn,
                {
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: pressed
                    ? colors.cardSecondary || "rgba(0,0,0,0.05)"
                    : "transparent",
                },
              ]}
              accessibilityLabel="Adicionar vídeo"
            >
              <Feather
                name="video"
                size={19}
                color={colors.primary || colors.accent}
              />
            </Pressable>
          </View>
          <Pressable
            onPress={publish}
            disabled={isPublishDisabled}
            style={({ pressed }) => [
              styles.publishButton,
              {
                backgroundColor: colors.primary || colors.accent,
                opacity: isPublishDisabled ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.publishButtonText}>Publicar</Text>
            )}
          </Pressable>
        </View>
      </View>


      {/* Modal Moderno para Inserir Link do YouTube */}
      <Modal
        visible={youtubeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setYoutubeModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.82)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 440,
              backgroundColor: colors.surface || "#18181b",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons name="youtube" size={22} color="#ef4444" />
                </View>
                <Text style={{ color: colors.text, fontSize: 16, fontFamily: "Poppins_700Bold" }}>
                  Vídeo do YouTube
                </Text>
              </View>
              <Pressable
                onPress={() => setYoutubeModalVisible(false)}
                style={{ padding: 4 }}
              >
                <Feather name="x" size={20} color={colors.muted || "#a1a1aa"} />
              </Pressable>
            </View>

            <Text style={{ color: colors.subtext || "#a1a1aa", fontSize: 13, fontFamily: "Poppins_400Regular", marginBottom: 12 }}>
              Cole o link de um vídeo ou clipe do YouTube para publicar no feed com reprodução automática:
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.cardSecondary || colors.surfaceAlt || "#27272a",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border || "rgba(255, 255, 255, 0.12)",
                paddingHorizontal: 12,
                marginBottom: 16,
              }}
            >
              <Feather name="link" size={16} color={colors.muted || "#71717a"} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="https://www.youtube.com/watch?v=..."
                placeholderTextColor={colors.muted || "#71717a"}
                value={youtubeInputUrl}
                onChangeText={setYoutubeInputUrl}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  flex: 1,
                  height: 46,
                  color: colors.text,
                  fontSize: 13.5,
                  fontFamily: "Poppins_400Regular",
                }}
              />
              {!!youtubeInputUrl && (
                <Pressable onPress={() => setYoutubeInputUrl("")} style={{ padding: 4 }}>
                  <Feather name="x-circle" size={16} color={colors.muted || "#71717a"} />
                </Pressable>
              )}
            </View>

            {/* Prévia em tempo real se o link for válido */}
            {(() => {
              const detectedId = getYouTubeId(youtubeInputUrl);
              if (!detectedId) return null;
              return (
                <View
                  style={{
                    borderRadius: 14,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    marginBottom: 16,
                    backgroundColor: "#09090b",
                  }}
                >
                  <Image
                    source={{ uri: `https://img.youtube.com/vi/${detectedId}/hqdefault.jpg` }}
                    style={{ width: "100%", height: 140 }}
                    resizeMode="cover"
                  />
                  <View style={{ padding: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    <Text style={{ color: "#22c55e", fontSize: 12, fontFamily: "Poppins_600SemiBold" }}>
                      Vídeo válido identificado!
                    </Text>
                  </View>
                </View>
              );
            })()}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                onPress={() => setYoutubeModalVisible(false)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border || "rgba(255, 255, 255, 0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.text, fontSize: 13.5, fontFamily: "Poppins_600SemiBold" }}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  const detectedId = getYouTubeId(youtubeInputUrl);
                  if (!detectedId) {
                    return showAlert({
                      type: "error",
                      title: "Link Inválido",
                      message: "Insira um link válido do YouTube (ex: https://youtube.com/watch?v=... ou https://youtu.be/...)",
                    });
                  }
                  setAttachedYoutubeId(detectedId);
                  setAttachedYoutubeUrl(youtubeInputUrl.trim());
                  setYoutubeModalVisible(false);
                }}
                disabled={!getYouTubeId(youtubeInputUrl)}
                style={({ pressed }) => [
                  {
                    flex: 1.4,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: getYouTubeId(youtubeInputUrl) ? "#ef4444" : "#52525b",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.88 : 1,
                    shadowColor: "#ef4444",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: getYouTubeId(youtubeInputUrl) ? 0.35 : 0,
                    shadowRadius: 5,
                    elevation: 3,
                  },
                ]}
              >
                <Text style={{ color: "#ffffff", fontSize: 13.5, fontFamily: "Poppins_700Bold" }}>
                  Anexar Vídeo
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <TriboAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={
          alertConfig.onClose || (() => setAlertConfig({ visible: false }))
        }
      />
    </View>
  );
}

function CommentAudioPlayer({ url, colors }) {
  const [sound, setSound] = useState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const loadSound = async () => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
      );
      setSound(newSound);
      setIsPlaying(true);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis);
          setDuration(status.durationMillis);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
            newSound.setPositionAsync(0);
          }
        }
      });
    } catch (err) {
      console.error("Error loading sound", err);
    }
  };

  const togglePlay = async () => {
    if (!sound) {
      await loadSound();
      return;
    }
    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  const formatTime = (millis) => {
    if (!millis) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surfaceAlt,
        padding: 8,
        borderRadius: 12,
        marginTop: 4,
      }}
    >
      <Pressable
        onPress={togglePlay}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.accent,
          justifyContent: "center",
          alignItems: "center",
          marginRight: 8,
        }}
      >
        <Feather
          name={isPlaying ? "pause" : "play"}
          size={16}
          color="#FFF"
          style={{ marginLeft: isPlaying ? 0 : 2 }}
        />
      </Pressable>
      <View
        style={{
          flex: 1,
          height: 4,
          backgroundColor: colors.border,
          borderRadius: 2,
          marginRight: 8,
        }}
      >
        <View
          style={{
            width: `${progress}%`,
            height: "100%",
            backgroundColor: colors.accent,
            borderRadius: 2,
          }}
        />
      </View>
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Poppins_400Regular",
          color: colors.subtext,
        }}
      >
        {formatTime(position)}
      </Text>
    </View>
  );
}

import { CommentsModal, Comments } from "./CommentsModal";
export { CommentsModal, Comments };

const styles = StyleSheet.create({
  quotedPostContainer: {
    margin: 12,
    marginTop: 4,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  quoteAuthorName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  quoteContent: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    paddingTop: 4,
    paddingHorizontal: 0,
    paddingBottom: 110,
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 4,
  },

  composerCardWrapper: {
    borderRadius: 30,
    borderWidth: 0,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  composer: {
    width: "100%",
  },
  composerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  composerInputWrapper: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 46,
    borderWidth: 0,
    justifyContent: "center",
  },
  composerInput: {
    flex: 1,
    minHeight: 46,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "center",
    padding: 0,
    margin: 0,
  },
  preview: {
    marginTop: 12,
    position: "relative",
    alignSelf: "flex-start",
    marginLeft: 54,
  },
  previewImage: {
    width: 90,
    height: 70,
    borderRadius: 14,
  },
  removeImageBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  composerDivider: {
    display: "none",
  },
  composerFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingLeft: 54,
  },
  composerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  composerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  publishButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 88,
  },
  publishButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },

  postCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  postHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  handle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  commentHandle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
  },
  postText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    marginTop: 12,
  },
  postImage: {
    width: "100%",
    borderRadius: 16,
  },
  nsfwContainer: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
  },
  nsfwBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  nsfwBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  nsfwContent: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  nsfwHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  nsfwTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  nsfwHint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 16,
  },
  nsfwRevealBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  nsfwRevealText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  nsfwHideBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  nsfwHideBadgeText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#FFFFFF",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionCount: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },

  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  commentsList: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  commentItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  commentText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  reply: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  replyInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  optionsSheet: {
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    gap: 8,
  },
  optionsHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  optionsTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 10,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
  },

  expandPill: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  expandPillText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },

  scrollTopContainer: {
    position: "absolute",
    bottom: 95,
    right: 20,
    zIndex: 99,
  },
  scrollTopButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  scrollTopText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },
});


