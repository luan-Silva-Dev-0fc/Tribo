import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useTheme } from "../../theme";
import { ChatCache } from "../../services/chatCache";
import { duckGroupAudio } from "../../hooks/useGroupAudioSync";

function formatAudioTime(millis) {
  if (!millis || isNaN(millis) || millis < 0) return "0:00";
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

const speedListeners = new Set();
function notifySpeedChange(speed) {
  ChatCache.setAudioSpeedSync(speed);
  speedListeners.forEach((listener) => {
    try {
      listener(speed);
    } catch (_) {}
  });
}

export function AudioMessagePlayer({ audioUrl, isMe }) {
  const { colors } = useTheme();
  const soundRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(
    () => ChatCache.getAudioSpeedSync() || 1.0
  );

  const SPEEDS = [1.0, 1.5, 2.0, 3.0, 5.0];

  const handleToggleSpeed = async () => {
    const nextIdx = (SPEEDS.indexOf(playbackSpeed) + 1) % SPEEDS.length;
    const nextSpeed = SPEEDS[nextIdx];
    notifySpeedChange(nextSpeed);
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
    const onSpeedUpdate = (newSpeed) => {
      setPlaybackSpeed(newSpeed);
      if (soundRef.current) {
        soundRef.current.setRateAsync(newSpeed, true).catch(() => {});
      }
    };
    speedListeners.add(onSpeedUpdate);

    return () => {
      speedListeners.delete(onSpeedUpdate);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
        duckGroupAudio(false).catch(() => {});
      }
    };
  }, [audioUrl]);

  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) {
      if (status.error) {
        setIsLoading(false);
        setIsPlaying(false);
        duckGroupAudio(false).catch(() => {});
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
      duckGroupAudio(false).catch(() => {});
    }
  };

  const handlePlayPause = async () => {
    const targetUri = resolveAudioUrl(audioUrl);
    if (!targetUri) return;

    try {
      if (!soundRef.current) {
        setIsLoading(true);
        await duckGroupAudio(true);
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
            await duckGroupAudio(false);
          } else {
            await duckGroupAudio(true);
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
      await duckGroupAudio(false);
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

      <View style={styles.audioTrackWrapper}>
        <View style={styles.audioWaveform}>
          <View
            style={[
              styles.audioWaveProgress,
              {
                width: `${progress * 100}%`,
                backgroundColor: isMe ? "#ffffff" : colors.primary || "#0284c7"
              }
            ]}
          />
        </View>

        <View style={styles.audioMetaRow}>
          <Text
            style={[
              styles.audioTimeText,
              { color: isMe ? "rgba(255,255,255,0.7)" : colors.muted }
            ]}
          >
            {isPlaying
              ? formatAudioTime(positionMillis)
              : formatAudioTime(durationMillis)}
          </Text>

          <Pressable
            onPress={handleToggleSpeed}
            hitSlop={8}
            style={[
              styles.audioSpeedBadge,
              {
                backgroundColor: isMe
                  ? "rgba(255,255,255,0.2)"
                  : colors.surfaceAlt || "#e2e8f0"
              }
            ]}
          >
            <Text
              style={[
                styles.audioSpeedText,
                { color: isMe ? "#ffffff" : colors.text }
              ]}
            >
              {playbackSpeed}x
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  audioPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 220,
    paddingVertical: 4
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  audioTrackWrapper: {
    flex: 1,
    justifyContent: "center"
  },
  audioWaveform: {
    height: 4,
    backgroundColor: "rgba(150, 150, 150, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 6
  },
  audioWaveProgress: {
    height: "100%",
    borderRadius: 2
  },
  audioMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  audioTimeText: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular"
  },
  audioSpeedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8
  },
  audioSpeedText: {
    fontSize: 10,
    fontFamily: "Poppins_700Bold"
  }
});
