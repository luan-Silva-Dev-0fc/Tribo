import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  LayoutAnimation,
  Platform } from
"react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme";
import { IconButton, Avatar, VerificationBadge } from "../ui/ui";
import { useVideoPlayer, VideoView } from "expo-video";

function QuoteVideo({ url, styles }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={styles.quoteMedia}
      contentFit="cover"
      nativeControls={false} />
  );
}

export function RepostModal({ visible, post, currentUser, onClose, onRepost }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch (_) {}
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch (_) {}
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (!post) return null;

  const handleRepost = async () => {
    try {
      setSending(true);
      await onRepost(content.trim() || undefined);
      setContent("");
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const author = post.author || post.user || {};
  const authorName = author.name || author.username || "Usuário";
  const authorHandle = author.username || author.handle || "";
  const postSnippet =
  post.content && post.content.length > 140 ?
  post.content.substring(0, 140) + "..." :
  post.content;

  const rawAttachments = post.media_attachments || post.mediaAttachments || [];
  const legacyMediaUrl =
  post.mediaUrl ||
  post.media_url ||
  post.imageUrl ||
  post.image_url ||
  post.videoUrl ||
  post.video_url;
  const firstMediaUrl =
  rawAttachments.length > 0 ? rawAttachments[0].url : legacyMediaUrl;
  const isVideo =
  rawAttachments.length > 0 ?
  rawAttachments[0].type === "video" :
  post.videoUrl ||
  post.video_url ||
  typeof legacyMediaUrl === "string" &&
  legacyMediaUrl.match(/\.(mp4|webm)$/i);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View
          style={[
          styles.container,
          {
            backgroundColor: colors.surface || colors.card || "#0F1115",
            borderColor: colors.border,
            marginBottom: keyboardHeight > 0 ? keyboardHeight : 0,
            maxHeight: keyboardHeight > 0 ? "75%" : "85%"
          }]
          }>
          
          {}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border || "rgba(255,255,255,0.2)" }]} />
          </View>

          {}
          <View style={[styles.header, { borderBottomColor: colors.border || "rgba(255,255,255,0.08)" }]}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: colors.surfaceAlt || "rgba(255,255,255,0.06)", opacity: pressed ? 0.7 : 1 }]
              }>
              
              <Feather name="x" size={18} color={colors.text} />
            </Pressable>

            <View style={styles.headerTitleRow}>
              <Feather name="repeat" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.title, { color: colors.text }]}>Repostar com citação</Text>
            </View>

            <View style={{ width: 34 }} />
          </View>

          {}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            
            {}
            <View style={styles.composerRow}>
              <Avatar
                user={currentUser}
                fallbackUser={currentUser}
                size={40} />
              
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Adicione um comentário (opcional)..."
                  placeholderTextColor={colors.subtext || "#888"}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  autoFocus
                  maxLength={500} />
                
              </View>
            </View>

            {}
            <View
              style={[
              styles.quoteCard,
              {
                borderColor: colors.border || "rgba(255,255,255,0.1)",
                backgroundColor: colors.surfaceAlt || "rgba(255,255,255,0.03)"
              }]
              }>
              
              <View style={styles.quoteHeader}>
                <Avatar user={author} fallbackUser={author} size={28} />
                <View style={styles.quoteAuthorInfo}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text
                      style={[styles.quoteAuthor, { color: colors.text }]}
                      numberOfLines={1}>
                      
                      {authorName}
                    </Text>
                    <VerificationBadge user={author} size={13} />
                  </View>
                  {!!authorHandle &&
                  <Text
                    style={[styles.quoteHandle, { color: colors.subtext }]}
                    numberOfLines={1}>
                    
                      @{authorHandle}
                    </Text>
                  }
                </View>

                <View
                  style={[
                  styles.quoteBadge,
                  { backgroundColor: "rgba(59, 130, 246, 0.1)" }]
                  }>
                  
                  <Feather name="corner-down-right" size={12} color={colors.primary} />
                </View>
              </View>

              {postSnippet ?
              <Text style={[styles.quoteSnippet, { color: colors.text }]}>
                  {postSnippet}
                </Text> :
              null}

              {firstMediaUrl ?
              <View style={styles.quoteMediaWrapper}>
                  {isVideo ?
                <QuoteVideo url={firstMediaUrl} styles={styles} /> :

                <Image
                  source={{ uri: firstMediaUrl }}
                  style={styles.quoteMedia}
                  resizeMode="cover" />

                }
                </View> :
              null}
            </View>
          </ScrollView>

          {}
          <View
            style={[
            styles.footer,
            {
              borderTopColor: colors.border || "rgba(255,255,255,0.08)",
              backgroundColor: colors.surface || colors.card || colors.background || "#0F1115",
              paddingBottom: keyboardHeight > 0 ? 12 : Math.max(insets.bottom, 16) + 6
            }]
            }>
            
            <View style={styles.footerLeft}>
              <Text style={[styles.charCount, { color: colors.subtext }]}>
                {content.length > 0 ? `${content.length}/500` : "Público"}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.primary,
                opacity: sending ? 0.7 : pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }]
              }]
              }
              onPress={handleRepost}
              disabled={sending}>
              
              {sending ?
              <ActivityIndicator color="#fff" size="small" /> :

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Feather name="repeat" size={15} color="#fff" />
                  <Text style={styles.buttonText}>Repostar</Text>
                </View>
              }
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>);

}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end"
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    minHeight: 340,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center"
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  title: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold"
  },
  bodyScroll: {
    flex: 1
  },
  bodyContent: {
    padding: 18
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12
  },
  inputWrapper: {
    flex: 1,
    paddingTop: 2
  },
  input: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    minHeight: 60,
    maxHeight: 120,
    textAlignVertical: "top",
    padding: 0,
    lineHeight: 22
  },
  quoteCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginTop: 4,
    marginLeft: 52
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10
  },
  quoteAuthorInfo: {
    flex: 1
  },
  quoteAuthor: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  },
  quoteHandle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    marginTop: -2
  },
  quoteBadge: {
    padding: 6,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },
  quoteSnippet: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.9
  },
  quoteMediaWrapper: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    height: 140,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.05)"
  },
  quoteMedia: {
    width: "100%",
    height: "100%"
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  charCount: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular"
  },
  button: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14
  }
});