import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Animated,
  Easing
} from "react-native";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";

const BACKGROUND_MUSIC_URL =
  "https://pub-34192334d7d14328ace69168b62cc510.r2.dev/manuntecao/Donnie%20Disco%20-%20Jeremy%20Korpas.mp3";

export function PlatformSuspendedScreen({
  visible,
  status = "MAINTENANCE",
  message = "",
  reason = "",
  onRetry = null,
  onAdminLogin = null
}) {
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);

  const soundRef = useRef(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const ring3Anim = useRef(new Animated.Value(0)).current;

  const eqAnim1 = useRef(new Animated.Value(0.35)).current;
  const eqAnim2 = useRef(new Animated.Value(0.75)).current;
  const eqAnim3 = useRef(new Animated.Value(0.45)).current;
  const eqAnim4 = useRef(new Animated.Value(0.85)).current;

  const isLegalOrder = String(status).toUpperCase() === "LEGAL_ORDER";

  const alertColorList = isLegalOrder
    ? ["#ef4444", "#f43f5e", "#dc2626", "#e11d48"]
    : ["#f59e0b", "#fbbf24", "#ea580c", "#f97316"];

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % alertColorList.length);
    }, 2800);

    return () => clearInterval(interval);
  }, [visible, alertColorList.length]);

  useEffect(() => {
    if (!visible) return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(glowAnim, {
            toValue: 0.9,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(glowAnim, {
            toValue: 0.35,
            duration: 1600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true
          })
        ])
      ])
    );
    pulseLoop.start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );
    floatLoop.start();

    const createRingLoop = (anim, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true
          })
        ])
      );
    };

    const r1 = createRingLoop(ring1Anim, 0);
    const r2 = createRingLoop(ring2Anim, 850);
    const r3 = createRingLoop(ring3Anim, 1700);

    r1.start();
    r2.start();
    r3.start();

    const eqLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(eqAnim1, { toValue: 1.0, duration: 380, useNativeDriver: true }),
          Animated.timing(eqAnim2, { toValue: 0.35, duration: 420, useNativeDriver: true }),
          Animated.timing(eqAnim3, { toValue: 1.0, duration: 480, useNativeDriver: true }),
          Animated.timing(eqAnim4, { toValue: 0.45, duration: 360, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(eqAnim1, { toValue: 0.3, duration: 420, useNativeDriver: true }),
          Animated.timing(eqAnim2, { toValue: 1.0, duration: 380, useNativeDriver: true }),
          Animated.timing(eqAnim3, { toValue: 0.4, duration: 400, useNativeDriver: true }),
          Animated.timing(eqAnim4, { toValue: 0.95, duration: 460, useNativeDriver: true })
        ])
      ])
    );
    eqLoop.start();

    return () => {
      pulseLoop.stop();
      floatLoop.stop();
      r1.stop();
      r2.stop();
      r3.stop();
      eqLoop.stop();
    };
  }, [visible]);

  useEffect(() => {
    let isMounted = true;

    async function startMusic() {
      if (!visible) return;

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: BACKGROUND_MUSIC_URL },
          {
            shouldPlay: true,
            isLooping: true,
            volume: 0.75
          }
        );

        if (!isMounted) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
        setIsPlaying(true);
      } catch (err) {
        console.warn("[PlatformSuspended] Falha ao reproduzir áudio:", err.message);
      }
    }

    if (visible) {
      startMusic();
    } else {
      stopMusic();
    }

    return () => {
      isMounted = false;
      stopMusic();
    };
  }, [visible]);

  const stopMusic = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    } catch (e) {
    } finally {
      setIsPlaying(false);
    }
  };

  const handleToggleMute = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e) {}

    if (!soundRef.current) return;

    try {
      if (isMuted) {
        await soundRef.current.setIsMutedAsync(false);
        await soundRef.current.setVolumeAsync(0.75);
        setIsMuted(false);
      } else {
        await soundRef.current.setIsMutedAsync(true);
        setIsMuted(true);
      }
    } catch (e) {
      console.warn("Erro ao alternar mudo:", e);
    }
  };

  if (!visible) return null;

  const currentAccent = alertColorList[colorIndex % alertColorList.length];
  const glowColor = isLegalOrder ? "rgba(239, 68, 68, 0.35)" : "rgba(245, 158, 11, 0.35)";
  const bgSoftColor = isLegalOrder ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)";

  const title = isLegalOrder ? "Plataforma Suspensa" : "Plataforma em Manutenção";

  const subtitle = isLegalOrder
    ? "Acesso Bloqueado por Ordem Legal"
    : "Acesso Bloqueado para Manutenção";

  const displayMessage =
    reason && reason.trim()
      ? reason.trim()
      : message && message.trim()
      ? message.trim()
      : isLegalOrder
      ? "O acesso à plataforma Tribo foi temporariamente interrompido em cumprimento a determinação de ordem legal ou judicial."
      : "Estamos realizando manutenções e atualizações importantes em nossos servidores para aprimorar a sua experiência. Retornaremos em breve.";

  const handlePressRetry = async () => {
    if (checking) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } catch (e) {}

    setChecking(true);
    try {
      if (onRetry) {
        await onRetry();
      }
    } finally {
      setTimeout(() => {
        setChecking(false);
      }, 700);
    }
  };

  const ring1Scale = ring1Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const ring1Opacity = ring1Anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.7, 0.5, 0] });

  const ring2Scale = ring2Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const ring2Opacity = ring2Anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.7, 0.5, 0] });

  const ring3Scale = ring3Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const ring3Opacity = ring3Anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.7, 0.5, 0] });

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent={true}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom + 20, 28)
          }
        ]}>
        <Animated.View
          style={[
            styles.glowDecorator,
            {
              backgroundColor: glowColor,
              opacity: glowAnim
            }
          ]}
        />

        <View style={styles.topHeader}>
          <View style={styles.secureBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#22c55e" style={{ marginRight: 5 }} />
            <Text style={styles.secureBadgeText}>Sistema Protegido</Text>
          </View>

          <Pressable
            onPress={handleToggleMute}
            style={({ pressed }) => [
              styles.audioControlBtn,
              pressed && { opacity: 0.75 }
            ]}>
            {!isMuted && isPlaying ? (
              <View style={styles.eqContainer}>
                <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eqAnim1 }], backgroundColor: currentAccent }]} />
                <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eqAnim2 }], backgroundColor: currentAccent }]} />
                <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eqAnim3 }], backgroundColor: currentAccent }]} />
                <Animated.View style={[styles.eqBar, { transform: [{ scaleY: eqAnim4 }], backgroundColor: currentAccent }]} />
              </View>
            ) : null}
            <Feather
              name={isMuted ? "volume-x" : "volume-2"}
              size={16}
              color={isMuted ? "#71717a" : "#ffffff"}
            />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Animated.View
            style={[
              styles.lockWrapper,
              {
                transform: [
                  { translateY: floatAnim },
                  { scale: pulseAnim }
                ]
              }
            ]}>
            <Animated.View
              style={[
                styles.radarRing,
                {
                  borderColor: currentAccent,
                  transform: [{ scale: ring1Scale }],
                  opacity: ring1Opacity
                }
              ]}
            />
            <Animated.View
              style={[
                styles.radarRing,
                {
                  borderColor: currentAccent,
                  transform: [{ scale: ring2Scale }],
                  opacity: ring2Opacity
                }
              ]}
            />
            <Animated.View
              style={[
                styles.radarRing,
                {
                  borderColor: currentAccent,
                  transform: [{ scale: ring3Scale }],
                  opacity: ring3Opacity
                }
              ]}
            />

            <View
              style={[
                styles.lockContainer,
                {
                  borderColor: currentAccent
                }
              ]}>
              <View
                style={[
                  styles.lockInnerRing,
                  { backgroundColor: bgSoftColor }
                ]}>
                <MaterialCommunityIcons
                  name={isLegalOrder ? "lock-alert" : "lock"}
                  size={58}
                  color={currentAccent}
                />
              </View>
            </View>
          </Animated.View>

          <View
            style={[
              styles.statusPill,
              {
                borderColor: currentAccent,
                backgroundColor: bgSoftColor
              }
            ]}>
            <View
              style={[
                styles.livePulseDot,
                { backgroundColor: currentAccent }
              ]}
            />
            <Text style={[styles.statusPillText, { color: currentAccent }]}>
              {subtitle}
            </Text>
          </View>

          <Text style={styles.titleText}>{title}</Text>

          <View
            style={[
              styles.glassCard,
              {
                borderColor: bgSoftColor
              }
            ]}>
            <Text style={styles.messageText}>{displayMessage}</Text>
          </View>

          <View style={styles.subInfoRow}>
            <Feather name="shield" size={13} color="#a1a1aa" style={{ marginRight: 6 }} />
            <Text style={styles.subInfoText}>
              Seus dados, conversas e publicações continuam totalmente seguros.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={handlePressRetry}
            disabled={checking}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: "#ffffff",
                opacity: pressed || checking ? 0.85 : 1
              }
            ]}>
            {checking ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <Feather name="refresh-cw" size={16} color="#000000" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Verificar Novamente</Text>
              </>
            )}
          </Pressable>

          {Boolean(onAdminLogin) && (
            <Pressable
              onPress={onAdminLogin}
              style={({ pressed }) => [
                styles.adminAccessBtn,
                pressed && { opacity: 0.6 }
              ]}>
              <Feather name="shield" size={12} color="#71717a" style={{ marginRight: 5 }} />
              <Text style={styles.adminAccessText}>Acesso Administrativo</Text>
            </Pressable>
          )}

          <Text style={styles.brandFooter}>TRIBO NETWORK • 2026</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    paddingHorizontal: 22,
    justifyContent: "space-between",
    alignItems: "center"
  },
  glowDecorator: {
    position: "absolute",
    top: "14%",
    width: 340,
    height: 340,
    borderRadius: 170,
    pointerEvents: "none"
  },
  topHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20
  },
  secureBadgeText: {
    color: "#a1a1aa",
    fontSize: 11.5,
    fontFamily: "Poppins_500Medium"
  },
  audioControlBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 8
  },
  eqContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 16
  },
  eqBar: {
    width: 2.5,
    height: 16,
    borderRadius: 1.5
  },
  content: {
    width: "100%",
    maxWidth: 390,
    alignItems: "center",
    marginTop: "auto",
    marginBottom: "auto"
  },
  lockWrapper: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    position: "relative"
  },
  radarRing: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 1.5
  },
  lockContainer: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#09090b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12
  },
  lockInnerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 8
  },
  statusPillText: {
    fontSize: 12.5,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.2
  },
  titleText: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.3
  },
  glassCard: {
    backgroundColor: "rgba(18, 18, 20, 0.88)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 20,
    width: "100%",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6
  },
  messageText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#d4d4d8",
    textAlign: "center",
    lineHeight: 22
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginTop: 4
  },
  subInfoText: {
    color: "#71717a",
    fontSize: 11.5,
    fontFamily: "Poppins_400Regular",
    textAlign: "center"
  },
  footer: {
    width: "100%",
    maxWidth: 390,
    alignItems: "center",
    gap: 14
  },
  primaryButton: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3
  },
  primaryButtonText: {
    color: "#000000",
    fontSize: 14.5,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.2
  },
  brandFooter: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
    color: "#52525b",
    letterSpacing: 1.5
  },
  adminAccessBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)"
  },
  adminAccessText: {
    color: "#71717a",
    fontSize: 11.5,
    fontFamily: "Poppins_500Medium"
  }
});