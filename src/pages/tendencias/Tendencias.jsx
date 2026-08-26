
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View } from
"react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { api } from "../../api";
import { listFrom } from "../../lib/format";
import { useTheme } from "../../theme";
import { AppLayout } from "../../components/layout/AppLayout";

export function TrendsScreen() {
  const { colors } = useTheme();
  const [trends, setTrends] = useState([]);
  const [youtubeVideos, setYoutubeVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTrends = useCallback(async () => {
    try {
      setLoading(true);
      const [trendsData, youtubeData] = await Promise.all([
      api.trends.getTrends(),
      api.trends.getYoutubeNews().catch(() => null)]
      );

      const trendsList = listFrom(trendsData, ["trends", "data"]) || [];
      setTrends(trendsList);

      const videosList =
      youtubeData?.news ||
      youtubeData?.videos || (
      Array.isArray(youtubeData) ? youtubeData : []);
      setYoutubeVideos(videosList);
    } catch (error) {
      console.warn("Erro ao buscar trends:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  const openLink = async (url) => {
    if (url) {
      try {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.OVER_FULL_SCREEN,
          toolbarColor: "#000000",
          controlsColor: colors.accent
        });
      } catch (err) {
        console.error("Não foi possível abrir o link:", err);
      }
    }
  };

  const handleOpenVideo = (url) => {
    if (url) {
      openLink(url);
    }
  };

  return (
    <AppLayout
      tagText="Em Alta"
      title="Veja o que está acontecendo no Brasil e no mundo"
      description="Acompanhe as últimas notícias e assuntos mais comentados em tempo real.">
      
      {loading && trends.length === 0 && youtubeVideos.length === 0 ?
      <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View> :

      <FlatList
        data={trends}
        keyExtractor={(item, index) => String(item.id || item.link || index)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadTrends}
        ListHeaderComponent={() => {
          return (
            <View style={styles.headerBlock}>
                {}
                {youtubeVideos && youtubeVideos.length > 0 &&
              <View style={styles.videosSection}>
                    <View style={styles.sectionHeaderRow}>
                      <View
                    style={[
                    styles.sectionIconPill,
                    { backgroundColor: colors.accentSoft || "rgba(29, 155, 240, 0.12)" }]
                    }>
                    
                        <Feather name="youtube" size={16} color={colors.danger} />
                      </View>
                      <Text style={[styles.sectionTitleText, { color: colors.text }]}>
                        Destaques em Vídeo
                      </Text>
                    </View>

                    <FlatList
                  horizontal
                  data={youtubeVideos}
                  keyExtractor={(item, idx) =>
                  String(item.id || item.videoId || item.link || idx)
                  }
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.videoCarouselContent}
                  renderItem={({ item }) =>
                  <Pressable
                    style={({ pressed }) => [
                    styles.videoCard,
                    {
                      backgroundColor: colors.surfaceAlt || colors.card,
                      borderColor: colors.border,
                      opacity: pressed ? 0.88 : 1
                    }]
                    }
                    onPress={() =>
                    handleOpenVideo(
                      item.link || (
                      item.videoId ?
                      `https://www.youtube.com/watch?v=${item.videoId}` :
                      null)
                    )
                    }>
                    
                          {}
                          <View style={[styles.videoThumbnailContainer, { backgroundColor: colors.border }]}>
                            {!!(item.thumbnail || item.image || item.thumb) &&
                      <Image
                        source={{ uri: item.thumbnail || item.image || item.thumb }}
                        style={styles.videoThumbnail}
                        resizeMode="cover" />

                      }
                            <View style={styles.playOverlay}>
                              <View style={styles.playButtonCircle}>
                                <Feather
                            name="play"
                            size={15}
                            color="#FFFFFF"
                            style={{ marginLeft: 2 }} />
                          
                              </View>
                            </View>
                          </View>

                          {}
                          <View style={styles.videoInfo}>
                            <Text
                        style={[styles.videoChannel, { color: colors.accent }]}
                        numberOfLines={1}>
                        
                              {item.channel || item.source || "YouTube"}
                            </Text>
                            <Text
                        style={[styles.videoTitle, { color: colors.text }]}
                        numberOfLines={2}>
                        
                              {item.title}
                            </Text>
                          </View>
                        </Pressable>
                  } />
                
                  </View>
              }

                {}
                <View style={[styles.sectionHeaderRow, styles.newsHeaderSpacing]}>
                  <View
                  style={[
                  styles.sectionIconPill,
                  { backgroundColor: colors.accentSoft || "rgba(29, 155, 240, 0.12)" }]
                  }>
                  
                    <Ionicons name="flame" size={16} color={colors.danger} />
                  </View>
                  <Text style={[styles.sectionTitleText, { color: colors.text }]}>
                    Notícias e Assuntos em Alta
                  </Text>
                </View>
              </View>);

        }}
        renderItem={({ item, index }) => {
          return (
            <Pressable
              style={({ pressed }) => [
              styles.newsItem,
              {
                borderBottomColor: colors.border,
                backgroundColor: pressed ?
                colors.surfaceAlt || colors.border :
                "transparent"
              }]
              }
              onPress={() => openLink(item.link)}>
              
                {}
                <View style={styles.newsMetaRow}>
                  <View
                  style={[
                  styles.rankBadge,
                  { backgroundColor: colors.accentSoft || "rgba(29, 155, 240, 0.12)" }]
                  }>
                  
                    <Ionicons
                    name="flame"
                    size={12}
                    color={colors.accent}
                    style={{ marginRight: 3 }} />
                  
                    <Text style={[styles.rankBadgeText, { color: colors.accent }]}>
                      #{index + 1} Em Alta
                    </Text>
                  </View>

                  <Text
                  style={[styles.newsSourceText, { color: colors.subtext }]}
                  numberOfLines={1}>
                  
                    {item.source || "Tribo Notícias"}
                  </Text>

                  {!!item.time &&
                <>
                      <Text style={[styles.metaDot, { color: colors.subtext }]}>•</Text>
                      <Text style={[styles.newsTimeText, { color: colors.subtext }]}>
                        {item.time}
                      </Text>
                    </>
                }
                </View>

                {}
                <Text style={[styles.newsTitleText, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>

                {}
                {!!item.description &&
              <Text
                style={[styles.newsDescriptionText, { color: colors.subtext }]}
                numberOfLines={2}>
                
                    {item.description}
                  </Text>
              }

                {}
                <View style={styles.newsFooterRow}>
                  <View style={styles.engagementContainer}>
                    <Feather
                    name="trending-up"
                    size={12}
                    color={colors.subtext}
                    style={{ marginRight: 4 }} />
                  
                    <Text style={[styles.engagementText, { color: colors.subtext }]}>
                      {item.engagement ||
                    item.postsCount ||
                    item.category ||
                    "Em debate na Tribo"}
                    </Text>
                  </View>

                  <Feather name="external-link" size={13} color={colors.subtext} />
                </View>
              </Pressable>);

        }}
        ListEmptyComponent={() =>
        !loading &&
        <View style={styles.emptyState}>
                <Ionicons name="flame-outline" size={36} color={colors.subtext} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                  Nenhuma notícia em alta no momento
                </Text>
                <Text style={[styles.emptyStateSub, { color: colors.subtext }]}>
                  Puxe para baixo para atualizar o feed de trends.
                </Text>
              </View>

        } />

      }
    </AppLayout>);

}

export default TrendsScreen;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40
  },
  listContent: {
    paddingBottom: 110,
    flexGrow: 1
  },
  headerBlock: {
    paddingBottom: 4
  },
  videosSection: {
    marginBottom: 16
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  newsHeaderSpacing: {
    marginTop: 8,
    marginBottom: 4
  },
  sectionIconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  sectionTitleText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    letterSpacing: -0.2
  },
  videoCarouselContent: {
    paddingVertical: 4,
    gap: 12
  },
  videoCard: {
    width: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden"
  },
  videoThumbnailContainer: {
    width: "100%",
    height: 120,
    position: "relative",
    overflow: "hidden"
  },
  videoThumbnail: {
    width: "100%",
    height: "100%"
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center"
  },
  playButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)"
  },
  videoInfo: {
    padding: 10
  },
  videoChannel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.2
  },
  videoTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    lineHeight: 18
  },
  newsItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1
  },
  newsMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8
  },
  rankBadgeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11
  },
  newsSourceText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    maxWidth: 120
  },
  metaDot: {
    marginHorizontal: 6,
    fontSize: 11
  },
  newsTimeText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11
  },
  newsTitleText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.2,
    marginBottom: 4
  },
  newsDescriptionText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8
  },
  newsFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  engagementContainer: {
    flexDirection: "row",
    alignItems: "center"
  },
  engagementText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyStateTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    marginTop: 12,
    marginBottom: 4
  },
  emptyStateSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    textAlign: "center"
  }
});