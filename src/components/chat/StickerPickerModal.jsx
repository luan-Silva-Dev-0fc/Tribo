import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { api } from "../../api";
import { getSavedStickers } from "../../services/stickerInventory";

const StickerGridItem = React.memo(function StickerGridItem({
  item,
  onSelect,
  onLongPress,
}) {
  const videoUrl =
    item.video_url ||
    item.videoUrl ||
    item.media_url ||
    item.mediaUrl ||
    item.url;

  if (!videoUrl) return null;

  return (
    <Pressable
      onPress={() => onSelect(item)}
      onLongPress={() => onLongPress(item)}
      style={({ pressed }) => [
        styles.gridItem,
        {
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      <SafeGridVideo key={videoUrl} url={videoUrl} />
    </Pressable>
  );
});

function SafeGridVideo({ url }) {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const player = useVideoPlayer(url || "", (p) => {
    p.loop = true;
    p.muted = true;
    try { Promise.resolve(p.play()).catch(() => {}); } catch (e) {}
  });

  if (!url || !player || !isMountedRef.current) {
    return <View style={[styles.gridVideo, { backgroundColor: "#1e1e1e" }]} />;
  }

  return (
    <VideoView
      key={url}
      player={player}
      nativeControls={false}
      contentFit="cover"
      style={styles.gridVideo}
    />
  );
}

export function StickerPickerModal({
  visible,
  onClose,
  onSelectSticker,
  onOpenCreateModal,
  currentUser,
}) {
  const { colors } = useTheme();
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailModalItem, setDetailModalItem] = useState(null);

  const isUserGold = Boolean(
    currentUser?.badge_type === "GOLD" ||
    currentUser?.badgeType === "GOLD" ||
    currentUser?.badge === "GOLD" ||
    currentUser?.hasGoldBadge === true ||
    (typeof currentUser?.badge_type === "string" &&
      currentUser.badge_type.toUpperCase() === "GOLD"),
  );

  const loadInventory = async () => {
    try {
      setLoading(true);
      const list = await getSavedStickers();
      setStickers(list || []);
    } catch (e) {
      console.warn("Erro ao carregar inventário de figurinhas:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadInventory();
      setSelectedPack("Todos");
      setSearchQuery("");
    }
  }, [visible]);

  // Extrai lista única de pacotes/pastas
  const availablePacks = [
    "Todos",
    ...new Set([
      "Memes",
      "Reações",
      "Tribo",
      "Gerais",
      ...stickers.map((s) => s.pack_name || s.packName).filter(Boolean),
    ]),
  ];

  // Filtra figurinhas por pacote e busca
  const filteredStickers = stickers.filter((item) => {
    const itemPack = item.pack_name || item.packName || "Gerais";
    const matchesPack =
      selectedPack === "Todos" ||
      itemPack.toLowerCase() === selectedPack.toLowerCase();

    if (!matchesPack) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (
      item.sticker_name ||
      item.stickerName ||
      item.name ||
      ""
    ).toLowerCase();
    const author = (item.author_name || item.authorName || "").toLowerCase();
    const desc = (item.description || "").toLowerCase();
    return name.includes(q) || author.includes(q) || desc.includes(q);
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.card || "#ffffff",
              borderTopColor: colors.border || "#e2e8f0",
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Sheet Handle */}
          <View
            style={[
              styles.handle,
              { backgroundColor: colors.border || "#cbd5e1" },
            ]}
          />

          {/* Header */}
          <View style={styles.header}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Ionicons name="sparkles" size={20} color="#f59e0b" />
              <Text style={[styles.title, { color: colors.text }]}>
                Figurinhas da Tribo
              </Text>
            </View>

            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Feather name="x" size={20} color={colors.muted} />
            </Pressable>
          </View>

          {/* Botão de Criação de Figurinha (Selo Dourado VIP) */}
          <Pressable
            onPress={() => {
              onClose();
              onOpenCreateModal?.();
            }}
            style={({ pressed }) => [
              styles.createBanner,
              {
                backgroundColor: isUserGold
                  ? "rgba(245, 158, 11, 0.12)"
                  : colors.surfaceAlt || "#f8fafc",
                borderColor: isUserGold
                  ? "#f59e0b"
                  : colors.border || "#e2e8f0",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flex: 1,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isUserGold
                    ? "#f59e0b"
                    : "rgba(245, 158, 11, 0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons
                  name="crown"
                  size={20}
                  color={isUserGold ? "#000000" : "#f59e0b"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Text
                    style={{
                      fontFamily: "Poppins_600SemiBold",
                      fontSize: 13,
                      color: colors.text,
                    }}
                  >
                    + Criar Figurinha de Vídeo
                  </Text>
                  <View
                    style={{
                      backgroundColor: "#fef3c7",
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: "#d97706",
                        fontSize: 9,
                        fontFamily: "Poppins_700Bold",
                      }}
                    >
                      VIP
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontFamily: "Poppins_400Regular",
                    fontSize: 11,
                    color: colors.muted,
                  }}
                >
                  {isUserGold
                    ? "Recorte até 30s de vídeo com som"
                    : "Exclusivo para membros com Selo Dourado"}
                </Text>
              </View>
            </View>

            <Feather name="chevron-right" size={18} color={colors.muted} />
          </Pressable>

          {/* Abas de Pastas / Pacotes */}
          <View style={{ marginBottom: 12 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {availablePacks.map((pack) => {
                const isSelected = selectedPack === pack;
                return (
                  <Pressable
                    key={pack}
                    onPress={() => setSelectedPack(pack)}
                    style={[
                      styles.packTab,
                      {
                        backgroundColor: isSelected
                          ? colors.primary || "#0284c7"
                          : colors.surfaceAlt || "#f1f5f9",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.packTabText,
                        { color: isSelected ? "#ffffff" : colors.text },
                      ]}
                    >
                      {pack}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Grid de Figurinhas */}
          {loading ? (
            <ActivityIndicator
              style={{ marginVertical: 40 }}
              color={colors.primary}
            />
          ) : filteredStickers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons
                  name="sparkles-outline"
                  size={32}
                  color={colors.muted}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {selectedPack === "Todos"
                  ? "Nenhuma figurinha salva"
                  : `Nenhuma figurinha na pasta "${selectedPack}"`}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Toque e segure em qualquer figurinha no chat da Tribo para
                salvá-la no seu inventário pessoal.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredStickers}
              keyExtractor={(item, index) =>
                String(item.id || item.sticker_id || index)
              }
              numColumns={3}
              contentContainerStyle={{ paddingBottom: 24, paddingTop: 4 }}
              columnWrapperStyle={{ gap: 10, marginBottom: 10 }}
              renderItem={({ item }) => (
                <StickerGridItem
                  item={item}
                  onSelect={(stk) => {
                    onClose();
                    onSelectSticker?.(stk);
                  }}
                  onLongPress={(stk) => setDetailModalItem(stk)}
                />
              )}
            />
          )}
        </Pressable>
      </Pressable>

      {/* Modal de Detalhes da Figurinha ao segurar (Long-press) */}
      {detailModalItem && (
        <StickerDetailModal
          item={detailModalItem}
          visible={Boolean(detailModalItem)}
          onClose={() => setDetailModalItem(null)}
          onSend={(stk) => {
            setDetailModalItem(null);
            onClose();
            onSelectSticker?.(stk);
          }}
          colors={colors}
        />
      )}
    </Modal>
  );
}

function DetailModalVideo({ url, style }) {
  const player = useVideoPlayer(url || "", (p) => {
    p.loop = true;
    p.muted = false;
    try { Promise.resolve(p.play()).catch(() => {}); } catch (e) {}
  });

  if (!url) return null;

  return (
    <VideoView
      player={player}
      nativeControls={false}
      contentFit="cover"
      style={style}
    />
  );
}

function StickerDetailModal({ item, visible, onClose, onSend, colors }) {
  const videoUrl =
    item.video_url ||
    item.videoUrl ||
    item.media_url ||
    item.mediaUrl ||
    item.url;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.detailOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.detailCard,
            {
              backgroundColor: colors.card || "#ffffff",
              borderColor: colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.detailVideoFrame}>
            {visible && !!videoUrl && (
              <DetailModalVideo
                url={videoUrl}
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </View>

          <Text style={[styles.detailTitle, { color: colors.text }]}>
            {item.sticker_name ||
              item.stickerName ||
              item.name ||
              "Figurinha de Vídeo"}
          </Text>

          <View style={styles.detailMetaRow}>
            <View
              style={[
                styles.detailBadge,
                { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <Feather name="folder" size={11} color={colors.muted} />
              <Text style={[styles.detailBadgeText, { color: colors.text }]}>
                {item.pack_name || item.packName || "Gerais"}
              </Text>
            </View>
            {!!(item.author_name || item.authorName) && (
              <View
                style={[
                  styles.detailBadge,
                  { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <Feather name="user" size={11} color={colors.muted} />
                <Text style={[styles.detailBadgeText, { color: colors.text }]}>
                  {item.author_name || item.authorName}
                </Text>
              </View>
            )}
          </View>

          {/* Descrição / Significado (Metadado) */}
          {!!item.description && (
            <View
              style={[
                styles.detailDescBox,
                { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <Text style={[styles.detailDescLabel, { color: colors.muted }]}>
                Significado / Contexto:
              </Text>
              <Text style={[styles.detailDescText, { color: colors.text }]}>
                {item.description}
              </Text>
            </View>
          )}

          <View style={{ width: "100%", gap: 8, marginTop: 14 }}>
            <Pressable
              onPress={() => onSend(item)}
              style={[
                styles.detailSendBtn,
                { backgroundColor: colors.primary || "#0284c7" },
              ]}
            >
              <Feather name="send" size={16} color="#ffffff" />
              <Text
                style={{
                  color: "#ffffff",
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 14,
                }}
              >
                Enviar Figurinha
              </Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={[
                styles.detailCloseBtn,
                { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <Text
                style={{
                  color: colors.text,
                  fontFamily: "Poppins_500Medium",
                  fontSize: 13,
                }}
              >
                Fechar
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    maxHeight: "80%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  createBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  packTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  packTabText: {
    fontSize: 12.5,
    fontFamily: "Poppins_600SemiBold",
  },
  gridItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  gridVideo: {
    width: "100%",
    height: "100%",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12.5,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  detailCard: {
    width: "88%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  detailVideoFrame: {
    width: 150,
    height: 150,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    marginBottom: 6,
    textAlign: "center",
  },
  detailMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  detailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
  },
  detailDescBox: {
    width: "100%",
    borderRadius: 12,
    padding: 10,
    marginVertical: 4,
  },
  detailDescLabel: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 2,
  },
  detailDescText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    lineHeight: 16,
  },
  detailSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  detailCloseBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
  },
});
