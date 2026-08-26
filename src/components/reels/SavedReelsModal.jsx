import React, { useState, useEffect } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../theme";

const SAVED_REELS_STORAGE_KEY = "@tribo_saved_reels";

export async function getSavedReels() {
  try {
    const raw = await AsyncStorage.getItem(SAVED_REELS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Erro ao ler reels salvos:", err);
    return [];
  }
}

export async function toggleSaveReel(reel) {
  try {
    if (!reel) return false;
    const vId = reel.videoId || reel.video_id || reel.youtube_video_id || reel.id;
    const current = await getSavedReels();
    const exists = current.some((r) => (r.videoId || r.video_id || r.id) === vId);

    let updated;
    if (exists) {
      updated = current.filter((r) => (r.videoId || r.video_id || r.id) !== vId);
    } else {
      const itemToSave = {
        id: reel.id || vId,
        videoId: vId,
        title: reel.title || "Reel Tribo",
        channel: reel.channel || reel.channelTitle || reel.author_name || "Tribo",
        category: reel.category || "geral",
        categoryLabel: reel.categoryLabel || reel.category || "Geral",
        thumbnailUrl: reel.thumbnailUrl || reel.thumbnail_url || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
        savedAt: Date.now()
      };
      updated = [itemToSave, ...current];
    }

    await AsyncStorage.setItem(SAVED_REELS_STORAGE_KEY, JSON.stringify(updated));
    return !exists;
  } catch (err) {
    console.warn("Erro ao alternar salvar reel:", err);
    return false;
  }
}

export async function isReelSaved(videoId) {
  try {
    if (!videoId) return false;
    const current = await getSavedReels();
    return current.some((r) => (r.videoId || r.video_id || r.id) === videoId);
  } catch {
    return false;
  }
}

export function SavedReelsModal({
  visible,
  onClose,
  onSelectReel
}) {
  const { colors } = useTheme();
  const [savedList, setSavedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (visible) {
      loadList();
      setSearchQuery("");
    }
  }, [visible]);

  const loadList = async () => {
    setLoading(true);
    const list = await getSavedReels();
    setSavedList(list);
    setLoading(false);
  };

  const handleRemove = async (vId) => {
    const updated = savedList.filter((r) => (r.videoId || r.video_id || r.id) !== vId);
    setSavedList(updated);
    await AsyncStorage.setItem(SAVED_REELS_STORAGE_KEY, JSON.stringify(updated));
  };

  const handlePressReel = (item) => {
    if (onSelectReel) {
      onSelectReel(item);
      onClose();
    } else {
      const vId = item.videoId || item.video_id;
      if (vId) {
        Linking.openURL(`https://www.youtube.com/shorts/${vId}`).catch(() => {});
      }
    }
  };

  const filtered = savedList.filter((item) => {
    const q = searchQuery.toLowerCase();
    const title = (item.title || "").toLowerCase();
    const channel = (item.channel || "").toLowerCase();
    const cat = (item.categoryLabel || item.category || "").toLowerCase();
    return title.includes(q) || channel.includes(q) || cat.includes(q);
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface || "#18181b",
              borderColor: colors.border || "rgba(255, 255, 255, 0.1)"
            }
          ]}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="bookmark" size={20} color="#f59e0b" />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Reels Salvos ({savedList.length})
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.muted || "#a1a1aa"} />
            </Pressable>
          </View>

          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.surfaceAlt || "#27272a",
                borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
              }
            ]}>
            <Feather name="search" size={16} color={colors.muted || "#a1a1aa"} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Buscar nos seus Reels salvos..."
              placeholderTextColor={colors.muted || "#71717a"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {!!searchQuery && (
              <Pressable onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                <Feather name="x" size={14} color={colors.muted || "#a1a1aa"} />
              </Pressable>
            )}
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color="#f59e0b" />
              <Text style={[styles.emptyText, { color: colors.muted || "#a1a1aa" }]}>
                Carregando salvos...
              </Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="bookmark-outline" size={40} color={colors.muted || "#71717a"} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery ? "Nenhum Reel encontrado" : "Nenhum Reel salvo ainda"}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted || "#a1a1aa" }]}>
                {searchQuery
                  ? "Tente buscar por outro termo ou categoria."
                  : "Toque no ícone de salvar em qualquer Reel para guardar seus favoritos aqui."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item, idx) => item.videoId || item.id || String(idx)}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
              renderItem={({ item }) => {
                const vId = item.videoId || item.video_id;
                const thumb = item.thumbnailUrl || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`;

                return (
                  <View
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.surfaceAlt || "#27272a",
                        borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
                      }
                    ]}>
                    <Pressable onPress={() => handlePressReel(item)} style={styles.cardImageContainer}>
                      <Image source={{ uri: thumb }} style={styles.cardImage} resizeMode="cover" />
                      <View style={styles.playOverlay}>
                        <Ionicons name="play" size={24} color="#ffffff" />
                      </View>
                      <Pressable
                        onPress={() => handleRemove(vId)}
                        style={styles.removeBtn}
                        hitSlop={8}>
                        <Ionicons name="bookmark" size={16} color="#f59e0b" />
                      </Pressable>
                    </Pressable>

                    <View style={styles.cardDetails}>
                      <Text numberOfLines={2} style={[styles.cardTitle, { color: colors.text }]}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={1} style={[styles.cardChannel, { color: colors.muted || "#a1a1aa" }]}>
                        @{item.channel}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end"
  },
  sheetContainer: {
    height: "75%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 12
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold"
  },
  closeBtn: {
    padding: 6
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: "Poppins_400Regular",
    padding: 0
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    marginTop: 8
  },
  emptySubtitle: {
    fontSize: 12.5,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular"
  },
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden"
  },
  cardImageContainer: {
    width: "100%",
    height: 180,
    backgroundColor: "#000000",
    position: "relative"
  },
  cardImage: {
    width: "100%",
    height: "100%"
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center"
  },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center"
  },
  cardDetails: {
    padding: 8,
    gap: 2
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 16
  },
  cardChannel: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular"
  }
});
