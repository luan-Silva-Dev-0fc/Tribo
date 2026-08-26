import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { api } from "../../api";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const QUICK_IDEAS = [
  "Memes de 2026",
  "Tecnologia & IA",
  "Programação React",
  "Shitpost Engraçado",
  "Jogos & Gaming",
  "Carros & Drift",
  "Futebol & Gols",
  "Animes & Cenas",
  "Curiosidades Incríveis",
  "Trap & Funk Brasil",
];

export function ReelsOnboardingModal({
  visible,
  onClose,
  onPreferencesSaved,
  currentPrompt = "",
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [prompt, setPrompt] = useState(currentPrompt || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (visible) {
      setPrompt(currentPrompt || "");
      setError(null);
    }
  }, [visible, currentPrompt]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function handleAddTag(tag) {
    if (!prompt.trim()) {
      setPrompt(tag);
    } else if (!prompt.toLowerCase().includes(tag.toLowerCase())) {
      setPrompt((prev) => `${prev.trim()}, ${tag}`);
    }
  }

  async function handleSave() {
    if (!prompt.trim()) {
      setError("Escreva o que você gostaria de receber no seu feed.");
      return;
    }

    Keyboard.dismiss();
    setSaving(true);
    setError(null);
    try {
      await api.reels.savePreferences({ customPrompt: prompt.trim() });
      if (onPreferencesSaved) {
        onPreferencesSaved(prompt.trim());
      }
      onClose();
    } catch (err) {
      setError(err?.message || "Não foi possível calibrar o algoritmo.");
    } finally {
      setSaving(false);
    }
  }

  const bottomPadding = Math.max(insets.bottom, Platform.OS === "android" ? 28 : 20);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop clickable para fechar */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: "#18181b",
                borderColor: "rgba(255, 255, 255, 0.1)",
                paddingBottom: bottomPadding + (Platform.OS === "android" ? (keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0) : 0),
                maxHeight: SCREEN_HEIGHT * 0.88,
              },
            ]}
          >
            {/* Drag indicator */}
            <View style={styles.dragIndicator} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="sparkles" size={20} color="#f59e0b" />
                  </View>
                  <Text style={styles.title}>Treine seu Algoritmo</Text>
                </View>
                <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
                  <Feather name="x" size={20} color="#a1a1aa" />
                </Pressable>
              </View>

              {/* Subtitle */}
              <Text style={styles.subtitle}>
                Escreva com suas palavras o que você quer ver nos seus Reels. O algoritmo inteligente vai buscar e priorizar exatamente o que você descrever.
              </Text>

              {error && (
                <View style={styles.errorBanner}>
                  <Feather name="alert-circle" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Campo de Escrita / Prompt */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  value={prompt}
                  onChangeText={(text) => {
                    setPrompt(text);
                    if (error) setError(null);
                  }}
                  placeholder="Ex: Memes brasileiros engraçados de 2026, tecnologia e IA, programação em React, curiosidades sobre o universo, carros esportivos..."
                  placeholderTextColor="#71717a"
                  textAlignVertical="top"
                  maxLength={500}
                />
                {prompt.length > 0 && (
                  <Pressable
                    onPress={() => setPrompt("")}
                    style={styles.clearInputBtn}
                    hitSlop={8}
                  >
                    <Feather name="x-circle" size={16} color="#71717a" />
                  </Pressable>
                )}
              </View>

              {/* Sugestões Rápidas de Ideias */}
              <Text style={styles.ideasLabel}>Sugestões para adicionar:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tagsContainer}
              >
                {QUICK_IDEAS.map((tag, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleAddTag(tag)}
                    style={styles.tagChip}
                  >
                    <Feather name="plus" size={12} color="#a1a1aa" />
                    <Text style={styles.tagText}>{tag}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Botão de Ação */}
              <View style={styles.footer}>
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color="#ffffff" />
                      <Text style={styles.submitBtnText}>
                        Calibrar Algoritmo Agora
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  keyboardView: {
    width: "100%",
  },
  modalCard: {
    width: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#ffffff",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#a1a1aa",
    lineHeight: 19,
    marginBottom: 14,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    color: "#f87171",
    fontSize: 12.5,
    fontFamily: "Poppins_500Medium",
    flex: 1,
  },
  inputContainer: {
    position: "relative",
    marginBottom: 14,
  },
  textInput: {
    backgroundColor: "#27272a",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    padding: 14,
    paddingRight: 36,
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    minHeight: 100,
    lineHeight: 20,
  },
  clearInputBtn: {
    position: "absolute",
    top: 14,
    right: 12,
    padding: 4,
  },
  ideasLabel: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#a1a1aa",
    marginBottom: 8,
  },
  tagsContainer: {
    gap: 8,
    paddingBottom: 4,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  tagText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  footer: {
    marginTop: 18,
    marginBottom: 6,
  },
  submitBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
});
