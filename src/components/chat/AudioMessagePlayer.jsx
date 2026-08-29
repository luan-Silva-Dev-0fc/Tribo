import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useTheme } from "../../theme";

function formatAudioTime(millis) {
  if (!millis || isNaN(millis) || millis < 0) return "0:00";
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export function AudioMessagePlayer({ audioUrl, isMe }) {
  const { colors } = useTheme();
  const soundRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const SPEEDS = [1.0, 1.5, 2.0, 3.0, 5.0];

  const handleToggleSpeed = async () => {
    const nextIdx = (SPEEDS.indexOf(playbackSpeed) + 1) % SPEEDS.length;
    const nextSpeed = SPEEDS[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (soundRef.current) {
      try {
        await soundRef.current.setRateAsync(nextSpeed, true);
      } catch (e) {
        console.warn("[AudioPlayer] Erro ao alterar velocidade:", e);
      }
    }
  };

  const resolveAudioUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("file://")
    ) {
      return trimmed;
    }
    const baseUrl = (
      process.env.EXPO_PUBLIC_API_URL || "https://tribo-api-production-2f6f.up.railway.app"
    )
      .replace(/\/api\/?$/, "")
      .replace(/\/$/, "");
    return `${baseUrl}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [audioUrl]);

  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) {
      if (status.error) {
        setIsLoading(false);
        setIsPlaying(false);
      }
      return;
    }
    setPositionMillis(status.positionMillis || 0);
    setDurationMillis(status.durationMillis || 1);
    setIsPlaying(status.isPlaying);
    setIsLoading(false);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMillis(0);
    }
  };

  const handlePlayPause = async () => {
    const targetUri = resolveAudioUrl(audioUrl);
    if (!targetUri) return;

    try {
      if (!soundRef.current) {
        setIsLoading(true);
        const { sound } = await Audio.Sound.createAsync(
          { uri: targetUri },
          { shouldPlay: true, rate: playbackSpeed, shouldCorrectPitch: true },
          onPlaybackStatusUpdate
        );
        try {
          await sound.setRateAsync(playbackSpeed, true);
        } catch (e) {}
        soundRef.current = sound;
      } else {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
          } else {
            try {
              await soundRef.current.setRateAsync(playbackSpeed, true);
            } catch (e) {}
            if (status.positionMillis >= (status.durationMillis || 0) - 100) {
              await soundRef.current.replayAsync();
            } else {
              await soundRef.current.playAsync();
            }
          }
        }
      }
    } catch (err) {
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const progress =
    durationMillis > 0
      ? Math.min(Math.max(positionMillis / durationMillis, 0), 1)
      : 0;

  return (
    <View style={styles.audioPlayerContainer}>
      <Pressable
        onPress={handlePlayPause}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.audioPlayBtn,
          {
            backgroundColor: isMe ? "#ffffff" : colors.primary || "#0284c7",
            opacity: pressed ? 0.85 : 1
          }
        ]}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={isMe ? colors.primary || "#0284c7" : "#ffffff"}
          />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={18}
            color={isMe ? colors.primary || "#0284c7" : "#ffffff"}
            style={{ marginLeft: isPlaying ? 0 : 2 }}
          />
        )}
      </Pressable>

      <View style={styles.audioProgressWrapper}>
        <View
          style={[
            styles.audioTrack,
            {
              backgroundColor: isMe
                ? "rgba(255, 255, 255, 0.25)"
                : "rgba(255, 255, 255, 0.12)"
            }
          ]}
        >
          <View
            style={[
              styles.audioFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: isMe ? "#ffffff" : colors.primary || "#0284c7"
              }
            ]}
          />
        </View>
        <View style={styles.audioTimeRow}>
          <Text
            style={[
              styles.audioTimeText,
              {
                color: isMe
                  ? "rgba(255, 255, 255, 0.85)"
                  : colors.muted || "#a1a1aa"
              }
            ]}
          >
            {formatAudioTime(isPlaying ? positionMillis : durationMillis || 0)}
          </Text>
          <Feather
            name="mic"
            size={12}
            color={
              isMe ? "rgba(255, 255, 255, 0.7)" : colors.muted || "#a1a1aa"
            }
          />
        </View>
      </View>

      <Pressable
        onPress={handleToggleSpeed}
        hitSlop={6}
        style={({ pressed }) => [
          styles.audioSpeedPill,
          {
            backgroundColor: isMe
              ? playbackSpeed > 1.0
                ? "rgba(255, 255, 255, 0.3)"
                : "rgba(255, 255, 255, 0.15)"
              : playbackSpeed > 1.0
              ? "rgba(2, 132, 199, 0.3)"
              : "rgba(255, 255, 255, 0.08)",
            borderColor: isMe
              ? playbackSpeed > 1.0
                ? "#ffffff"
                : "rgba(255, 255, 255, 0.2)"
              : playbackSpeed > 1.0
              ? colors.primary || "#0284c7"
              : "rgba(255, 255, 255, 0.1)",
            opacity: pressed ? 0.75 : 1
          }
        ]}
      >
        <Text
          style={[
            styles.audioSpeedText,
            {
              color: isMe
                ? "#ffffff"
                : playbackSpeed > 1.0
                ? colors.primary || "#0284c7"
                : colors.muted || "#a1a1aa",
              fontFamily:
                playbackSpeed > 1.0
                  ? "Poppins_700Bold"
                  : "Poppins_600SemiBold"
            }
          ]}
        >
          {playbackSpeed === 1.0 ? "1x" : `${playbackSpeed}x`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  audioPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 210,
    maxWidth: 270,
    gap: 8
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  audioProgressWrapper: {
    flex: 1,
    justifyContent: "center"
  },
  audioTrack: {
    height: 4,
    borderRadius: 2,
    width: "100%",
    position: "relative",
    justifyContent: "center",
    marginBottom: 4
  },
  audioFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2
  },
  audioTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  audioTimeText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5
  },
  audioSpeedPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32
  },
  audioSpeedText: {
    fontSize: 10.5
  }
});
