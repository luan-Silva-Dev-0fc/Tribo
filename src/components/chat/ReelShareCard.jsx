import React from "react";
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View } from
"react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";

export const ReelShareCard = React.memo(function ReelShareCard({
  reelData,
  isMe,
  onPress
}) {
  const { colors } = useTheme();

  if (!reelData) return null;

  const title = reelData.title || "Reel da Tribo";
  const authorName = reelData.author_name || reelData.authorName || "Tribo";
  const videoId = reelData.video_id || reelData.videoId || reelData.youtube_video_id;
  const thumbnailUrl =
  reelData.thumbnail_url ||
  reelData.thumbnailUrl || (
  videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  const handleCardPress = () => {
    if (onPress) {
      onPress(reelData);
      return;
    }
    if (videoId) {
      const url = `https://www.youtube.com/shorts/${videoId}`;
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.open(url, "_blank");
      } else {
        Linking.openURL(url).catch(() => {});
      }
    }
  };

  return (
    <Pressable
      onPress={handleCardPress}
      style={({ pressed }) => [
      styles.cardContainer,
      {
        backgroundColor: isMe ?
        "rgba(0, 0, 0, 0.25)" :
        colors.surfaceAlt || "#27272a",
        borderColor: isMe ?
        "rgba(255, 255, 255, 0.15)" :
        colors.border || "rgba(255, 255, 255, 0.08)",
        opacity: pressed ? 0.9 : 1
      }]
      }>
      
      {}
      <View style={styles.thumbnailWrapper}>
        {thumbnailUrl ?
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover" /> :


        <View style={[styles.thumbnail, { backgroundColor: "#18181b", alignItems: "center", justifyContent: "center" }]}>
            <Feather name="film" size={24} color="#71717a" />
          </View>
        }

        {}
        <View style={styles.thumbOverlay} />

        {}
        <View style={styles.badge}>
          <Feather name="play" size={10} color="#ffffff" />
          <Text style={styles.badgeText}>Reel</Text>
        </View>

        {}
        <View style={styles.centerPlayIcon}>
          <Ionicons name="play" size={22} color="#ffffff" style={{ marginLeft: 2 }} />
        </View>
      </View>

      {}
      <View style={styles.detailsContainer}>
        <Text
          numberOfLines={2}
          style={[
          styles.titleText,
          { color: isMe ? "#ffffff" : colors.text }]
          }>
          
          {title}
        </Text>
        
        <View style={styles.authorRow}>
          <Text
            numberOfLines={1}
            style={[
            styles.authorText,
            { color: isMe ? "rgba(255, 255, 255, 0.75)" : colors.muted || "#a1a1aa" }]
            }>
            
            @{authorName}
          </Text>
        </View>
      </View>
    </Pressable>);

});

const styles = StyleSheet.create({
  cardContainer: {
    width: 230,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginVertical: 4
  },
  thumbnailWrapper: {
    width: "100%",
    height: 140,
    position: "relative",
    backgroundColor: "#000000"
  },
  thumbnail: {
    width: "100%",
    height: "100%"
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.25)"
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.2)"
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10.5,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.3
  },
  centerPlayIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -18,
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center"
  },
  detailsContainer: {
    padding: 10,
    gap: 3
  },
  titleText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    lineHeight: 18
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2
  },
  authorText: {
    fontSize: 11.5,
    fontFamily: "Poppins_400Regular"
  }
});