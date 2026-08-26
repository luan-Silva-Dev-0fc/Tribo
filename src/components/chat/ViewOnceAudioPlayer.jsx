import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View } from
"react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";

export function ViewOnceAudioPlayer({
  item,
  isMe,
  onExpire
}) {
  const { colors } = useTheme();
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [playsCount, setPlaysCount] = useState(item?.plays_count || item?.playsCount || 0);
  const [isExpired, setIsExpired] = useState(
    Boolean(item?.is_expired || item?.isExpired || item?.plays_count >= 2)
  );

  const audioUrl = item.audio_url || item.audioUrl || item.media_url || item.url;
  const soundRef = useRef(null);

  const unloadSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (e) {}
    setSound(null);
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      unloadSound();
    };
  }, []);

  const togglePlay = async () => {
    if (isExpired || !audioUrl) return;

    if (soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
      return;
    }

    try {
      setLoading(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = newSound;
      setSound(newSound);
      setIsPlaying(true);
    } catch (e) {
      console.warn("Erro ao reproduzir áudio de visualização única:", e);
    } finally {
      setLoading(false);
    }
  };

  const onPlaybackStatusUpdate = async (status) => {
    if (!status.isLoaded) return;

    setPosition(status.positionMillis || 0);
    setDuration(status.durationMillis || 1);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      const nextCount = playsCount + 1;
      setPlaysCount(nextCount);
      await unloadSound();

      if (nextCount >= 2) {
        setIsExpired(true);

        if (typeof audioUrl === "string" && audioUrl.startsWith("file://")) {
          try {
            await FileSystem.deleteAsync(audioUrl, { idempotent: true });
          } catch (e) {}
        }
        onExpire?.(item);
      }
    }
  };

  const formatTime = (millis) => {
    const totalSec = Math.floor((millis || 0) / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const remainingPlays = Math.max(0, 2 - playsCount);

  return (
    <View style={[styles.container, isMe ? styles.alignRight : styles.alignLeft]}>
      {isExpired ?

      <View
        style={[
        styles.expiredBox,
        {
          backgroundColor: colors.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
          borderColor: colors.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)"
        }]
        }>
        
          <View style={[styles.expiredIcon, { backgroundColor: colors.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
            <MaterialCommunityIcons name="numeric-2-circle-outline" size={20} color={colors.muted} />
          </View>
          <View style={{ flex: 1, paddingHorizontal: 2 }}>
            <Text style={[styles.expiredTitle, { color: colors.text }]}>
              Áudio de visualização única
            </Text>
            <Text style={[styles.expiredSubtitle, { color: colors.muted }]}>
              Áudio reproduzido 2x • Expirado
            </Text>
          </View>
          <Feather name="check" size={15} color={colors.muted} style={{ opacity: 0.8 }} />
        </View> :


      <View
        style={[
        styles.activeCard,
        {
          backgroundColor: colors.mode === "dark" ? "#111827" : "#0f172a",
          borderColor: "#8b5cf6"
        }]
        }>
        
          {}
          <View style={styles.headerRow}>
            <View style={styles.viewOncePill}>
              <MaterialCommunityIcons name="numeric-2-circle" size={18} color="#a78bfa" />
              <Text style={styles.viewOncePillText}>Áudio Único (2x)</Text>
            </View>
            <View style={styles.counterPill}>
              <Text style={styles.counterText}>
                Reproduções restantes: {remainingPlays}/2
              </Text>
            </View>
          </View>

          {}
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={16} color="#f59e0b" style={{ marginTop: 1 }} />
            <Text style={styles.warningBannerText}>
              ⚠️ Atenção: Este áudio é de visualização única e será apagado automaticamente após ser ouvido 2 vezes.
            </Text>
          </View>

          {}
          <View style={styles.playerRow}>
            <Pressable
            onPress={togglePlay}
            disabled={loading}
            style={styles.playBtn}>
            
              {loading ?
            <ActivityIndicator size="small" color="#ffffff" /> :

            <Feather
              name={isPlaying ? "pause" : "play"}
              size={18}
              color="#ffffff"
              style={{ marginLeft: isPlaying ? 0 : 2 }} />

            }
            </Pressable>

            {}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View
                style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(100, Math.max(0, position / (duration || 1) * 100))}%`
                }]
                } />
              
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>
          </View>
        </View>
      }
    </View>);

}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    maxWidth: "88%"
  },
  alignRight: {
    alignSelf: "flex-end"
  },
  alignLeft: {
    alignSelf: "flex-start"
  },
  activeCard: {
    width: 280,
    borderRadius: 22,
    padding: 14,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  viewOncePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  viewOncePillText: {
    color: "#a78bfa",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold"
  },
  counterPill: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  counterText: {
    color: "#e2e8f0",
    fontSize: 10.5,
    fontFamily: "Poppins_600SemiBold"
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)"
  },
  warningBannerText: {
    flex: 1,
    color: "#fef3c7",
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    lineHeight: 15
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#8b5cf6",
    alignItems: "center",
    justifyContent: "center"
  },
  progressContainer: {
    flex: 1,
    gap: 4
  },
  progressBarBg: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#a78bfa",
    borderRadius: 2.5
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  timeText: {
    color: "#94a3b8",
    fontSize: 10,
    fontFamily: "Poppins_400Regular"
  },
  expiredBox: {
    flexDirection: "row",
    alignItems: "center",
    width: 245,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    gap: 10,
    opacity: 0.75
  },
  expiredIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center"
  },
  expiredTitle: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold"
  },
  expiredSubtitle: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular"
  }
});