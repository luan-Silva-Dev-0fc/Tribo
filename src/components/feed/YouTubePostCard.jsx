import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View } from
"react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const YouTubePostCard = React.memo(function YouTubePostCard({
  videoId,
  youtubeUrl,
  isCentered = false,
  volume = 1.0
}) {
  const { colors } = useTheme();
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [calculatedVolume, setCalculatedVolume] = useState(100);


  const cardWidth = Math.min(SCREEN_WIDTH - 28, 540);
  const calculatedHeight = Math.round(cardWidth * 9 / 16);


  const updateSpatialVolume = useCallback(() => {
    if (!isCentered || !containerRef.current) {
      if (playerRef.current && typeof playerRef.current.setVolume === "function") {
        try {
          playerRef.current.setVolume(0);
        } catch (e) {}
      }
      return;
    }

    try {
      containerRef.current.measureInWindow((x, y, width, height) => {
        if (typeof y !== "number" || isNaN(y)) return;
        const screenHeight = Dimensions.get("window").height;
        const screenCenterY = screenHeight / 2;
        const cardCenterY = y + height / 2;
        const distanceFromCenter = Math.abs(cardCenterY - screenCenterY);
        const maxDistance = screenHeight * 0.45;

        let proximity = 0;
        if (y + height > 0 && y < screenHeight) {
          proximity = Math.max(0, 1 - distanceFromCenter / maxDistance);
          proximity = Math.pow(proximity, 1.5);
        }

        const targetVol = Math.round(proximity * 100);
        setCalculatedVolume(targetVol);
        if (playerRef.current && typeof playerRef.current.setVolume === "function") {
          try {
            playerRef.current.setVolume(targetVol);
          } catch (e) {}
        }
      });
    } catch (e) {}
  }, [isCentered]);

  useEffect(() => {
    updateSpatialVolume();
    const interval = setInterval(updateSpatialVolume, 250);
    return () => clearInterval(interval);
  }, [updateSpatialVolume]);

  if (!videoId) return null;

  return (
    <View
      ref={containerRef}
      collapsable={false}
      style={[
      styles.container,
      {
        backgroundColor: "#000000",
        borderColor: colors.border || "rgba(255, 255, 255, 0.08)",
        height: calculatedHeight,
        width: "100%"
      }]
      }>
      
      <YoutubePlayer
        ref={playerRef}
        height={calculatedHeight}
        width={cardWidth}
        play={isCentered}
        videoId={videoId}
        volume={calculatedVolume}
        onReady={() => {
          if (isCentered && playerRef.current && typeof playerRef.current.setVolume === "function") {
            try {
              playerRef.current.setVolume(calculatedVolume);
            } catch (e) {}
          }
        }}
        webViewProps={{
          allowsFullscreenVideo: true,
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          androidLayerType: Platform.OS === "android" ? "hardware" : undefined
        }}
        initialPlayerParams={{
          controls: true,
          showClosedCaptions: false,
          modestbranding: true,
          preventFullScreen: false,
          rel: false
        }} />
      

      {}
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