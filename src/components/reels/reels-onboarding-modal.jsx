import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { api } from "../../api";

export function ReelsOnboardingModal({
  visible,
  onClose,
  onPreferencesSaved,
  currentCategories = [],
  currentScores = {},
}) {
  const { colors } = useTheme();
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(new Set(currentCategories));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      setSelected(new Set(currentCategories));
      loadCategories();
    }
  }, [visible, currentCategories]);

  async function loadCategories() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.reels.categories();
      if (res?.categories) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.warn("[ReelsModal] Erro ao carregar categorias:", err.message);
      // Fallback para lista local caso offline
      const CDN_URL = "https://pub-08d4ac7de5354fadbfe07fcbc70237ba.r2.dev/";
      setCategories([
        { id: "tecnologia", label: "Tecnologia & Programação", iconUrl: `${CDN_URL}tecnologia.png` },
        { id: "shitpost", label: "Shitposts & Memes", iconUrl: `${CDN_URL}shitpost.png` },
        { id: "musica", label: "Música & Clips", iconUrl: `${CDN_URL}musica.png` },
        { id: "jogos", label: "Jogos & Gaming", iconUrl: `${CDN_URL}jogos.png` },
        { id: "carros", label: "Carros & Automóveis", iconUrl: `${CDN_URL}carros.png` },
        { id: "esportes", label: "Futebol & Esportes", iconUrl: `${CDN_URL}esportes.png` },
        { id: "filmes_animes", label: 'Filmes & Animes', iconUrl: `${CDN_URL}filmes_animes.png` },
        { id: "curiosidades", label: "Curiosidades & Fatos", iconUrl: `${CDN_URL}curiosidades.png` },
        { id: "lutas", label: "Lutas & Artes Marciais", iconUrl: `${CDN_URL}lutas.png` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(catId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  }

  async function handleSave() {
    if (selected.size === 0) {
      setError("Selecione ao menos 1 interesse para calibrar o algoritmo.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const selectedArray = Array.from(selected);
      await api.reels.savePreferences(selectedArray);
      if (onPreferencesSaved) {
        onPreferencesSaved(selectedArray);
      }
      onClose();
    } catch (err) {
      setError(err?.message || "Não foi possível salvar as preferências.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="sparkles" size={22} color="#f59e0b" />
              <Text style={[styles.title, { color: colors.text }]}>
                Treine seu Algoritmo
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.muted} />
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Escolha os tópicos que você mais gosta. O algoritmo aprenderá com suas curtidas e interações em tempo real.
          </Text>

          {error && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.gridContainer}
              showsVerticalScrollIndicator={false}
            >
              {categories.map((cat) => {
                const isSelected = selected.has(cat.id);
                const score = currentScores[cat.id];

                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => toggleCategory(cat.id)}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: isSelected ? "#2563eb18" : colors.surfaceAlt,
                        borderColor: isSelected ? "#2563eb" : colors.border,
                      },
                    ]}
                  >
                    <Image 
                      source={{ uri: cat.iconUrl || `https://pub-08d4ac7de5354fadbfe07fcbc70237ba.r2.dev/${cat.id}.png` }} 
                      style={styles.categoryIcon} 
                      resizeMode="contain"
                    />
                    <View style={styles.categoryInfo}>
                      <Text
                        style={[
                          styles.categoryLabel,
                          {
                            color: isSelected ? "#60a5fa" : colors.text,
                            fontFamily: isSelected
                              ? "Poppins_600SemiBold"
                              : "Poppins_500Medium",
                          },
                        ]}
                      >
                        {cat.label}
                      </Text>
                      {score !== undefined && score > 0 && (
                        <Text style={[styles.scoreBadge, { color: colors.muted }]}>
                          Score: {score} pts
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.checkCircle,
                        {
                          backgroundColor: isSelected ? "#2563eb" : "transparent",
                          borderColor: isSelected ? "#2563eb" : colors.muted,
                        },
                      ]}
                    >
                      {isSelected && <Feather name="check" size={13} color="#ffffff" />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Text style={[styles.countText, { color: colors.muted }]}>
              {selected.size} tópico{selected.size === 1 ? "" : "s"} selecionado{selected.size === 1 ? "" : "s"}
            </Text>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[
                styles.saveButton,
                { opacity: saving ? 0.7 : 1 },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="rocket-outline" size={18} color="#ffffff" />
                  <Text style={styles.saveButtonText}>Calibrar Feed de Reels</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    lineHeight: 19,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    flex: 1,
  },
  loadingContainer: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    maxHeight: 380,
  },
  gridContainer: {
    gap: 10,
    paddingBottom: 10,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  categoryIcon: {
    width: 28,
    height: 28,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 14,
  },
  scoreBadge: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
  },
  saveButtonText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
});
