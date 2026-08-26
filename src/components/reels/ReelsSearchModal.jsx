import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";

const POPULAR_TAGS = ["#shitpost", "#memes", "#games", "#tech", "#musica", "#podcast", "#anime", "#cinema"];

export function ReelsSearchModal({
  visible,
  onClose,
  allReels = [],
  onSelectReel
}) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (visible) {
      setQuery("");
    }
  }, [visible]);

  const filteredReels = allReels.filter((item) => {
    if (!query.trim()) return false;
    const q = query.toLowerCase().trim();
    const title = (item.title || "").toLowerCase();
    const channel = (item.channel || item.channelTitle || "").toLowerCase();
    const cat = (item.categoryLabel || item.category || "").toLowerCase();
    return title.includes(q) || channel.includes(q) || cat.includes(q);
  });

  const handleSelect = (item, index) => {
    if (onSelectReel) {
      onSelectReel(item, index);
    }
    onClose();
  };

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
              <Ionicons name="search" size={20} color={colors.primary || "#3b82f6"} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Pesquisar Reels
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
              placeholder="Buscar por título, canal, assunto..."
              placeholderTextColor={colors.muted || "#71717a"}
              value={query}
              onChangeText={setQuery}
              autoFocus={true}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {!!query && (
              <Pressable onPress={() => setQuery("")} style={{ padding: 4 }}>
                <Feather name="x" size={14} color={colors.muted || "#a1a1aa"} />
              </Pressable>
            )}
          </View>

          <View style={{ marginBottom: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {POPULAR_TAGS.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setQuery(tag.replace("#", ""))}
                  style={[
                    styles.tagChip,
                    {
                      backgroundColor: colors.surfaceAlt || "#27272a",
                      borderColor: colors.border || "rgba(255,255,255,0.08)"
                    }
                  ]}>
                  <Text style={[styles.tagText, { color: colors.muted || "#a1a1aa" }]}>{tag}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {!query.trim() ? (
            <View style={styles.centerContainer}>
              <Ionicons name="sparkles-outline" size={40} color={colors.muted || "#71717a"} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Descubra Reels
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted || "#a1a1aa" }]}>
                Digite termos para encontrar memes, gameplay, tecnologia, podcasts e muito mais.
              </Text>
            </View>
          ) : filteredReels.length === 0 ? (
            <View style={styles.centerContainer}>
              <Feather name="search" size={40} color={colors.muted || "#71717a"} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Nenhum resultado
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted || "#a1a1aa" }]}>
                Não encontramos reels correspondentes a "{query}".
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredReels}
              keyExtractor={(item, idx) => item.videoId || item.id || String(idx)}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
              contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
              renderItem={({ item, index }) => {
                const vId = item.videoId || item.video_id;
                const thumb = item.thumbnailUrl || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`;

                return (
                  <Pressable
                    onPress={() => handleSelect(item, index)}
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.surfaceAlt || "#27272a",
                        borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
                      }
                    ]}>
                    <View style={styles.cardImageContainer}>
                      <Image source={{ uri: thumb }} style={styles.cardImage} resizeMode="cover" />
                      <View style={styles.playOverlay}>
                        <Ionicons name="play" size={24} color="#ffffff" />
                      </View>
                      {item.categoryLabel && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{item.categoryLabel}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.cardDetails}>
                      <Text numberOfLines={2} style={[styles.cardTitle, { color: colors.text }]}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={1} style={[styles.cardChannel, { color: colors.muted || "#a1a1aa" }]}>
                        @{item.channel || item.channelTitle}
                      </Text>
                    </View>
                  </Pressable>
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
    height: "80%",
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
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: "Poppins_400Regular",
    padding: 0
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1
  },
  tagText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium"
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
  categoryBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  categoryBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold"
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
