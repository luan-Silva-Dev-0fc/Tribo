import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View } from
"react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { api } from "../../api";
import { ReelItem } from "../../components/reels/reel-item";
import { ReelsOnboardingModal } from "../../components/reels/reels-onboarding-modal";

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
  const [toastMessage, setToastMessage] = useState(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const flatListRef = useRef(null);

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
      })]
      ).start(() => setToastMessage(null));
    },
    [toastOpacity]
  );

  const loadPreferencesAndCategories = useCallback(async () => {
    try {
      const [catsRes, prefsRes] = await Promise.all([
      api.reels.categories().catch(() => ({ categories: [] })),
      api.reels.preferences().catch(() => null)]
      );

      if (catsRes?.categories) {
        setCategories(catsRes.categories);
      }

      if (prefsRes) {
        setUserPreferences({
          onboardingCompleted: prefsRes.onboardingCompleted,
          selectedCategories: prefsRes.selectedCategories || [],
          categoryScores: prefsRes.categoryScores || {}
        });


        if (prefsRes.onboardingCompleted === false) {
          setOnboardingVisible(true);
        }
      }
    } catch (err) {
      console.warn("[TelaReels] Erro ao carregar preferências:", err.message);
    }
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.reels.feed({ limit: 25 });
      if (res?.reels) {
        setReels(res.reels);
      } else {
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

  useEffect(() => {
    loadPreferencesAndCategories();
    loadFeed();
  }, [loadPreferencesAndCategories, loadFeed]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed();
  }, [loadFeed]);

  const handleToggleLike = useCallback(async (videoId, category) => {
    try {
      const res = await api.reels.like(videoId, category);
      if (res?.isLiked) {
        showToast("Reel curtido! +3 pts no algoritmo.", "success");
      }

      setReels((prev) =>
      prev.map((r) =>
      r.videoId === videoId ?
      { ...r, isLiked: res?.isLiked, likesCount: res?.likesCount } :
      r
      )
      );
    } catch (err) {
      console.warn("[TelaReels] Falha no like:", err.message);
    }
  }, [showToast]);

  const handleMoreLikeThis = useCallback(async (videoId, category) => {
    try {
      await api.reels.moreLikeThis(videoId, category);
      showToast("Perfeito! O algoritmo te recomendará mais conteúdos deste tipo (+5 pts).", "success");
    } catch (err) {
      console.warn("[TelaReels] Falha no more-like-this:", err.message);
    }
  }, [showToast]);

  const handleNotInterested = useCallback(async (videoId, category) => {
    try {
      await api.reels.notInterested(videoId, category);
      showToast("Vídeo ocultado e pontuação reduzida (-5 pts).", "info");


      setReels((prev) => prev.filter((r) => r.videoId !== videoId));
    } catch (err) {
      console.warn("[TelaReels] Falha no not-interested:", err.message);
    }
  }, [showToast]);

  const handlePreferencesSaved = useCallback((selected) => {
    showToast("Preferências salvas! Recarregando feed...", "success");
    loadFeed();
    loadPreferencesAndCategories();
  }, [showToast, loadFeed, loadPreferencesAndCategories]);

  const handleShareSuccess = useCallback((targetUser, reelData) => {
    showToast(`Reel compartilhado com @${targetUser.username || targetUser.name || 'amigo'}!`, "success");
  }, [showToast]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveVideoIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70
  }).current;


  const displayedReels =
  activeCategoryFilter === "all" ?
  reels :
  reels.filter((r) => r.category === activeCategoryFilter);

  return (
    <View style={styles.container}>
      {}
      <View style={styles.topHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}>
          
          <Pressable
            onPress={() => setActiveCategoryFilter("all")}
            style={[
            styles.filterChip,
            activeCategoryFilter === "all" && styles.filterChipActive]
            }>
            
            <Ionicons name="sparkles" size={14} color={activeCategoryFilter === "all" ? "#000000" : "#f3f4f6"} />
            <Text
              style={[
              styles.filterChipText,
              activeCategoryFilter === "all" && styles.filterChipTextActive,
              { marginLeft: 6 }]
              }>
              
              Para Você
            </Text>
          </Pressable>

          {categories.map((cat) => {
            const isActive = activeCategoryFilter === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setActiveCategoryFilter(cat.id)}
                style={[
                styles.filterChip,
                isActive && styles.filterChipActive]
                }>
                
                <Image
                  source={{ uri: cat.iconUrl || `https://pub-08d4ac7de5354fadbfe07fcbc70237ba.r2.dev/${cat.id}.png` }}
                  style={{ width: 14, height: 14 }}
                  tintColor={isActive ? "#000000" : "#f3f4f6"}
                  resizeMode="contain" />
                
                <Text
                  style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                  { marginLeft: 6 }]
                  }>
                  
                  {cat.label.split(" ")[0]}
                </Text>
              </Pressable>);

          })}
        </ScrollView>

        <Pressable
          onPress={() => setOnboardingVisible(true)}
          style={styles.calibrateButton}>
          
          <Ionicons name="sparkles" size={16} color="#f59e0b" />
        </Pressable>
      </View>

      {}
      {toastMessage &&
      <Animated.View
        style={[
        styles.toast,
        toastMessage.type === "error" ?
        styles.toastError :
        toastMessage.type === "info" ?
        styles.toastInfo :
        styles.toastSuccess,
        { opacity: toastOpacity }]
        }>
        
          <Text style={styles.toastText}>{toastMessage.text}</Text>
        </Animated.View>
      }

      {}
      {loading && reels.length === 0 ?
      <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Carregando conteúdos...</Text>
        </View> :
      displayedReels.length === 0 ?
      <View style={styles.centerContainer}>
          <Ionicons name="film-outline" size={48} color="#71717a" />
          <Text style={styles.emptyTitle}>Nenhum Reel encontrado</Text>
          <Text style={styles.emptySubtitle}>
            Ajuste suas preferências para calibrar o algoritmo de recomendação.
          </Text>
          <Pressable
          onPress={() => setOnboardingVisible(true)}
          style={styles.emptyButton}>
          
            <Text style={styles.emptyButtonText}>Calibrar Tópicos</Text>
          </Pressable>
        </View> :

      <FlatList
        ref={flatListRef}
        data={displayedReels}
        keyExtractor={(item, index) => item._id || item.id || `${item.videoId}-${index}`}
        renderItem={({ item, index }) =>
        <ReelItem
          item={item}
          isActive={index === activeVideoIndex}
          shouldPreload={Math.abs(index - activeVideoIndex) <= 1}
          onToggleLike={handleToggleLike}
          onMoreLikeThis={handleMoreLikeThis}
          onNotInterested={handleNotInterested}
          onOpenPreferences={() => setOnboardingVisible(true)}
          onShareSuccess={handleShareSuccess}
          containerHeight={SCREEN_HEIGHT} />

        }
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
          tintColor="#ffffff" />

        }
        getItemLayout={(data, index) => ({
          length: SCREEN_HEIGHT,
          offset: SCREEN_HEIGHT * index,
          index
        })}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        removeClippedSubviews={true} />

      }

      {}
      <ReelsOnboardingModal
        visible={onboardingVisible}
        onClose={() => setOnboardingVisible(false)}
        onPreferencesSaved={handlePreferencesSaved}
        currentCategories={userPreferences.selectedCategories}
        currentScores={userPreferences.categoryScores} />
      
    </View>);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  topHeader: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16
  },
  filterScroll: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 16
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5
  },
  filterChipActive: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "#ffffff",
    shadowColor: "#ffffff",
    shadowOpacity: 0.3
  },
  filterChipText: {
    color: "#f3f4f6",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  filterChipTextActive: {
    color: "#000000",
    textShadowColor: "transparent"
  },
  calibrateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8
  },
  toast: {
    position: "absolute",
    top: 60,
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