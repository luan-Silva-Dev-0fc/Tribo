import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { api } from "../../api";
import { NativeOptimization } from "../../services/nativeOptimization";
import { ReelItem } from "../../components/reels/reel-item";
import { ReelsOnboardingModal } from "../../components/reels/reels-onboarding-modal";
import { ShareReelModal } from "../../components/reels/ShareReelModal";
import { SavedReelsModal } from "../../components/reels/SavedReelsModal";
import { ReelsSearchModal } from "../../components/reels/ReelsSearchModal";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function TelaReels({ user }) {
  const { colors } = useTheme();

  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");

  const [categories, setCategories] = useState([]);
  const [userPreferences, setUserPreferences] = useState({
    onboardingCompleted: true,
    selectedCategories: [],
    categoryScores: {}
  });

  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedShareReel, setSelectedShareReel] = useState(null);
  const [savedModalVisible, setSavedModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef(null);

  const displayedReels =
    activeCategoryFilter === "all"
      ? reels
      : reels.filter((r) => r.category === activeCategoryFilter);

  const activeCategoryObj = categories.find((c) => c.id === activeCategoryFilter);

  const showToast = useCallback(
    (msg, type = "info") => {
      setToastMessage({ text: msg, type });
      Animated.sequence([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.delay(2600),
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        })
      ]).start(() => setToastMessage(null));
    },
    [toastOpacity]
  );

  const loadPreferencesAndCategories = useCallback(async () => {
    try {
      const [catsRes, prefsRes] = await Promise.all([
        api.reels.categories().catch(() => ({ categories: [] })),
        api.reels.preferences().catch(() => null)
      ]);

      if (catsRes?.categories) {
        setCategories(catsRes.categories);
      }

      if (prefsRes) {
        setUserPreferences({
          onboardingCompleted: prefsRes.onboardingCompleted,
          selectedCategories: prefsRes.selectedCategories || [],
          categoryScores: prefsRes.categoryScores || {},
          customPrompt: prefsRes.customPrompt || "",
        });

        if (prefsRes.onboardingCompleted === false) {
          setOnboardingVisible(true);
        }
      }
    } catch (err) {
      console.warn("[TelaReels] Erro ao carregar preferências:", err.message);
    }
  }, []);

  const [loadingMore, setLoadingMore] = useState(false);

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await api.reels.feed({ limit: 25, reset: isRefresh });
      if (res?.reels && res.reels.length > 0) {
        setReels(res.reels);
        const initialVideoIds = res.reels.slice(0, 8).map((r) => r.videoId).filter(Boolean);
        NativeOptimization.prefetchReels(initialVideoIds);
      } else if (!isRefresh) {
        setReels([]);
      }
    } catch (err) {
      console.warn("[TelaReels] Erro ao carregar feed de reels:", err.message);
      showToast("Não foi possível carregar o feed de Reels.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || loading || reels.length === 0) return;
    setLoadingMore(true);
    try {
      const currentIds = reels.map((r) => r.videoId);
      const res = await api.reels.feed({ limit: 20, excludeIds: currentIds });
      if (res?.reels && res.reels.length > 0) {
        const existingSet = new Set(currentIds);
        const newReels = res.reels.filter((r) => !existingSet.has(r.videoId));
        if (newReels.length > 0) {
          setReels((prev) => [...prev, ...newReels]);
          const newVideoIds = newReels.slice(0, 8).map((r) => r.videoId).filter(Boolean);
          NativeOptimization.prefetchReels(newVideoIds);
        }
      }
    } catch (err) {
      console.warn("[TelaReels] Erro ao carregar mais reels:", err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, reels]);

  useEffect(() => {
    NativeOptimization.enableHighRefreshRate();
    loadPreferencesAndCategories();
    loadFeed();
  }, [loadPreferencesAndCategories, loadFeed]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed(true);
  }, [loadFeed]);

  const handleToggleLike = useCallback(
    async (videoId, category) => {
      try {
        const res = await api.reels.like(videoId, category);
        if (res?.isLiked) {
          showToast("Reel curtido! +3 pts no algoritmo.", "success");
        }

        setReels((prev) =>
          prev.map((r) =>
            r.videoId === videoId
              ? { ...r, isLiked: res?.isLiked, likesCount: res?.likesCount }
              : r
          )
        );
      } catch (err) {
        console.warn("[TelaReels] Falha no like:", err.message);
      }
    },
    [showToast]
  );

  const handleToggleSave = useCallback(
    (reel, isSaved) => {
      if (isSaved) {
        showToast("Reel salvo na sua coleção!", "success");
      } else {
        showToast("Reel removido dos salvos.", "info");
      }
    },
    [showToast]
  );

  const handleMoreLikeThis = useCallback(
    async (videoId, category) => {
      try {
        await api.reels.moreLikeThis(videoId, category);
        showToast(
          "Perfeito! O algoritmo te recomendará mais conteúdos deste tipo (+5 pts).",
          "success"
        );
      } catch (err) {
        console.warn("[TelaReels] Falha no more-like-this:", err.message);
      }
    },
    [showToast]
  );

  const handleNotInterested = useCallback(
    async (videoId, category) => {
      try {
        await api.reels.notInterested(videoId, category);
        showToast("Vídeo ocultado e pontuação reduzida (-5 pts).", "info");
        setReels((prev) => prev.filter((r) => r.videoId !== videoId));
      } catch (err) {
        console.warn("[TelaReels] Falha no not-interested:", err.message);
      }
    },
    [showToast]
  );

  const handlePreferencesSaved = useCallback(
    (savedPrompt) => {
      showToast("✨ Algoritmo calibrado com suas preferências!", "success");
      setUserPreferences((prev) => ({ ...prev, customPrompt: savedPrompt, onboardingCompleted: true }));
      loadFeed(true);
      loadPreferencesAndCategories();
    },
    [showToast, loadFeed, loadPreferencesAndCategories]
  );

  const handleOpenShare = useCallback((reel) => {
    setSelectedShareReel(reel);
    setShareModalVisible(true);
  }, []);

  const handleShareSuccess = useCallback(
    (target, reelData, targetType) => {
      const name = target.name || target.username || target.title || "amigo";
      if (targetType === "group") {
        showToast(`Reel compartilhado no grupo "${name}"!`, "success");
      } else {
        showToast(`Reel enviado no chat de @${name}!`, "success");
      }
    },
    [showToast]
  );

  const handleSelectFromSearch = useCallback(
    (item, index) => {
      const idx = displayedReels.findIndex(
        (r) => (r.videoId || r.video_id) === (item.videoId || item.video_id)
      );
      if (idx >= 0 && flatListRef.current) {
        flatListRef.current.scrollToIndex({ index: idx, animated: true });
      } else {
        setReels((prev) => [item, ...prev]);
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToIndex({ index: 0, animated: true });
          }
        }, 100);
      }
    },
    [displayedReels]
  );

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      const idx = viewableItems[0].index || 0;
      setActiveVideoIndex(idx);

      if (displayedReels && displayedReels.length > 0) {
        const upcoming = displayedReels
          .slice(idx + 1, idx + 4)
          .map((r) => r.videoId)
          .filter(Boolean);
        if (upcoming.length > 0) {
          NativeOptimization.prefetchReels(upcoming);
        }

        if (idx >= displayedReels.length - 4) {
          handleLoadMore();
        }
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70
  }).current;

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.brandBadge}>
            <Ionicons name="play-circle" size={18} color="#ffffff" style={{ marginRight: 5 }} />
            <Text style={styles.brandTitle}>Tribo Reels</Text>
          </View>

          {activeCategoryFilter !== "all" && activeCategoryObj && (
            <Pressable
              onPress={() => setActiveCategoryFilter("all")}
              style={styles.activeFilterPill}>
              <Text style={styles.activeFilterText}>{activeCategoryObj.label}</Text>
              <Feather name="x" size={12} color="#ffffff" style={{ marginLeft: 4 }} />
            </Pressable>
          )}
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setSearchModalVisible(true)}
            style={styles.headerIconButton}
            hitSlop={6}>
            <Ionicons name="search" size={18} color="#ffffff" />
          </Pressable>

          <Pressable
            onPress={() => setSavedModalVisible(true)}
            style={styles.headerIconButton}
            hitSlop={6}>
            <Ionicons name="bookmark-outline" size={18} color="#ffffff" />
          </Pressable>

          <Pressable
            onPress={() => setOnboardingVisible(true)}
            style={styles.headerIconButton}
            hitSlop={6}>
            <Ionicons
              name="sparkles"
              size={18}
              color="#f59e0b"
            />
          </Pressable>
        </View>
      </View>

      {toastMessage && (
        <Animated.View
          style={[
            styles.toast,
            toastMessage.type === "error"
              ? styles.toastError
              : toastMessage.type === "info"
              ? styles.toastInfo
              : styles.toastSuccess,
            { opacity: toastOpacity }
          ]}>
          <Text style={styles.toastText}>{toastMessage.text}</Text>
        </Animated.View>
      )}

      {loading && reels.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent || "#3b82f6"} />
          <Text style={styles.loadingText}>Carregando conteúdos...</Text>
        </View>
      ) : displayedReels.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="film-outline" size={48} color="#71717a" />
          <Text style={styles.emptyTitle}>Nenhum Reel encontrado</Text>
          <Text style={styles.emptySubtitle}>
            Escreva o que você gostaria de ver para o algoritmo calibrar seus Reels.
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Pressable
              onPress={() => loadFeed(true)}
              style={[styles.emptyButton, { backgroundColor: "#18181b", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.15)" }]}>
              <Text style={styles.emptyButtonText}>Recarregar</Text>
            </Pressable>
            <Pressable
              onPress={() => setOnboardingVisible(true)}
              style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Escrever Preferências</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={displayedReels}
          keyExtractor={(item, index) => item._id || item.id || `${item.videoId}-${index}`}
          renderItem={({ item, index }) => (
            <ReelItem
              item={item}
              isActive={index === activeVideoIndex}
              shouldPreload={false}
              onToggleLike={handleToggleLike}
              onToggleSave={handleToggleSave}
              onMoreLikeThis={handleMoreLikeThis}
              onNotInterested={handleNotInterested}
              onOpenPreferences={() => setOnboardingVisible(true)}
              onOpenShare={handleOpenShare}
              containerHeight={SCREEN_HEIGHT}
            />
          )}
          pagingEnabled
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#ffffff"
            />
          }
          getItemLayout={(data, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index
          })}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          removeClippedSubviews={true}
        />
      )}

      <ShareReelModal
        visible={shareModalVisible}
        reel={selectedShareReel}
        onClose={() => setShareModalVisible(false)}
        onSent={handleShareSuccess}
      />

      <SavedReelsModal
        visible={savedModalVisible}
        onClose={() => setSavedModalVisible(false)}
        onSelectReel={(item) => handleSelectFromSearch(item, 0)}
      />

      <ReelsSearchModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        allReels={reels}
        onSelectReel={handleSelectFromSearch}
      />

      <ReelsOnboardingModal
        visible={onboardingVisible}
        onClose={() => setOnboardingVisible(false)}
        onPreferencesSaved={handlePreferencesSaved}
        currentPrompt={userPreferences.customPrompt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  topHeader: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 32,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)"
  },
  brandTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 0.3
  },
  activeFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37, 99, 235, 0.8)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)"
  },
  activeFilterText: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold"
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center"
  },
  headerIconButtonActive: {
    borderColor: "rgba(245, 158, 11, 0.6)",
    backgroundColor: "rgba(245, 158, 11, 0.2)"
  },
  toast: {
    position: "absolute",
    top: 75,
    left: 20,
    right: 20,
    zIndex: 100,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8
  },
  toastSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.95)"
  },
  toastError: {
    backgroundColor: "rgba(239, 68, 68, 0.95)"
  },
  toastInfo: {
    backgroundColor: "rgba(37, 99, 235, 0.95)"
  },
  toastText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center"
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 12
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    marginTop: 8
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    marginTop: 8
  },
  emptySubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 19
  },
  emptyButton: {
    marginTop: 10,
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20
  },
  emptyButtonText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  }
});