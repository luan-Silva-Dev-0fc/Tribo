import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const YouTubePostCard = React.memo(function YouTubePostCard({
  videoId,
  youtubeUrl,
  isCentered = false
}) {
  const { colors } = useTheme();
  const cardWidth = Math.min(SCREEN_WIDTH - 28, 540);
  const calculatedHeight = Math.round(cardWidth * 9 / 16);

  if (!videoId) return null;

  return (
    <View
      style={[
      styles.container,
      {
        backgroundColor: "#000000",
        borderColor: colors.border || "rgba(255, 255, 255, 0.08)",
        height: calculatedHeight,
        width: "100%"
      }]
      }>
      
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=${isCentered ? 1 : 0}&rel=0&modestbranding=1`}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: 16
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen />
      

      <View pointerEvents="none" style={styles.floatingBadge}>
        <View style={styles.badgePill}>
          <MaterialCommunityIcons name="youtube" size={14} color="#ef4444" />
          <Text style={styles.badgeText}>YouTube</Text>
        </View>
      </View>
    </View>);

});

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 8,
    borderWidth: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center"
  },
  floatingBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)"
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 10.5,
    fontFamily: "Poppins_600SemiBold"
  }
});