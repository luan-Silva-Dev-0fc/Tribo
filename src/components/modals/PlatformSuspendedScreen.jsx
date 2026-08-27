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
  Easing } from
"react-native";
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

  const soundRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const eqAnim1 = useRef(new Animated.Value(4)).current;
  const eqAnim2 = useRef(new Animated.Value(10)).current;
  const eqAnim3 = useRef(new Animated.Value(6)).current;


  useEffect(() => {
    if (!visible) return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
      Animated.parallel([
      Animated.timing(pulseAnim, {
        toValue: 1.06,
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(glowAnim, {
        toValue: 0.85,
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })]
      ),
      Animated.parallel([
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(glowAnim, {
        toValue: 0.35,
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })]
      )]
      )
    );
    pulseLoop.start();


    const eqLoop = Animated.loop(
      Animated.sequence([
      Animated.parallel([
      Animated.timing(eqAnim1, { toValue: 14, duration: 400, useNativeDriver: false }),
      Animated.timing(eqAnim2, { toValue: 6, duration: 450, useNativeDriver: false }),
      Animated.timing(eqAnim3, { toValue: 16, duration: 500, useNativeDriver: false })]
      ),
      Animated.parallel([
      Animated.timing(eqAnim1, { toValue: 5, duration: 450, useNativeDriver: false }),
      Animated.timing(eqAnim2, { toValue: 16, duration: 400, useNativeDriver: false }),
      Animated.timing(eqAnim3, { toValue: 7, duration: 420, useNativeDriver: false })]
      )]
      )
    );
    eqLoop.start();

    return () => {
      pulseLoop.stop();
      eqLoop.stop();
    };
  }, [visible, pulseAnim, glowAnim, eqAnim1, eqAnim2, eqAnim3]);


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
        console.warn("[PlatformSuspended] Falha ao reproduzir áudio de fundo:", err.message);
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

  const isLegalOrder = String(status).toUpperCase() === "LEGAL_ORDER";
  const accentColor = isLegalOrder ? "#ef4444" : "#f59e0b";
  const glowColor = isLegalOrder ? "rgba(239, 68, 68, 0.28)" : "rgba(245, 158, 11, 0.28)";

  const title = isLegalOrder ?
  "Plataforma Suspensa" :
  "Plataforma em Manutenção";

  const subtitle = isLegalOrder ?
  "Acesso Bloqueado por Ordem Legal" :
  "Acesso Bloqueado para Manutenção";

  const displayMessage =
  reason && reason.trim() ?
  reason.trim() :
  message && message.trim() ?
  message.trim() :
  isLegalOrder ?
  "O acesso à plataforma Tribo foi temporariamente interrompido em cumprimento a determinação de ordem legal ou judicial." :
  "Estamos realizando manutenções e atualizações importantes em nossos servidores para aprimorar a sua experiência. Retornaremos em breve.";

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
        }]
        }>
        
        {}
        <Animated.View
          style={[
          styles.glowDecorator,
          {
            backgroundColor: glowColor,
            opacity: glowAnim
          }]
          } />
        

        {}
        <View style={styles.topHeader}>
          <View style={styles.secureBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#22c55e" style={{ marginRight: 5 }} />
            <Text style={styles.secureBadgeText}>Sistema Protegido</Text>
          </View>

          {}
          <Pressable
            onPress={handleToggleMute}
            style={({ pressed }) => [
            styles.audioControlBtn,
            pressed && { opacity: 0.75 }]
            }>
            
            {!isMuted && isPlaying ?
            <View style={styles.eqContainer}>
                <Animated.View style={[styles.eqBar, { height: eqAnim1, backgroundColor: accentColor }]} />
                <Animated.View style={[styles.eqBar, { height: eqAnim2, backgroundColor: accentColor }]} />
                <Animated.View style={[styles.eqBar, { height: eqAnim3, backgroundColor: accentColor }]} />
              </View> :
            null}
            <Feather
              name={isMuted ? "volume-x" : "volume-2"}
              size={16}
              color={isMuted ? "#71717a" : "#ffffff"} />
            
          </Pressable>
        </View>

        {}
        <View style={styles.content}>
          {}
          <Animated.View
            style={[
            styles.lockContainer,
            {
              transform: [{ scale: pulseAnim }],
              borderColor: accentColor,
              shadowColor: accentColor
            }]
            }>
            
            <View style={[styles.lockInnerRing, { backgroundColor: isLegalOrder ? "rgba(239, 68, 68, 0.14)" : "rgba(245, 158, 11, 0.14)" }]}>
              <MaterialCommunityIcons
                name={isLegalOrder ? "lock-alert" : "lock"}
                size={58}
                color={accentColor} />
              
            </View>
          </Animated.View>

          {}
          <View
            style={[
            styles.statusPill,
            {
              borderColor: isLegalOrder ? "rgba(239, 68, 68, 0.4)" : "rgba(245, 158, 11, 0.4)",
              backgroundColor: isLegalOrder ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)"
            }]
            }>
            
            <View
              style={[
              styles.livePulseDot,
              { backgroundColor: accentColor }]
              } />
            
            <Text style={[styles.statusPillText, { color: accentColor }]}>
              {subtitle}
            </Text>
          </View>

          {}
          <Text style={styles.titleText}>{title}</Text>

          {}
          <View style={styles.glassCard}>
            <Text style={styles.messageText}>{displayMessage}</Text>
          </View>

          {}
          <View style={styles.subInfoRow}>
            <Feather name="shield" size={13} color="#a1a1aa" style={{ marginRight: 6 }} />
            <Text style={styles.subInfoText}>
              Seus dados, conversas e publicações continuam totalmente salvos.
            </Text>
          </View>
        </View>

        {}
        <View style={styles.footer}>
          <Pressable
            onPress={handlePressRetry}
            disabled={checking}
            style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: "#ffffff",
              opacity: pressed || checking ? 0.85 : 1
            }]
            }>
            
            {checking ?
            <ActivityIndicator size="small" color="#000000" /> :

            <>
                <Feather name="refresh-cw" size={16} color="#000000" style={{ marginRight: 8 }} />
                <Text style={styles.primaryButtonText}>Verificar Novamente</Text>
              </>
            }
          </Pressable>

          {Boolean(onAdminLogin) &&
          <Pressable
            onPress={onAdminLogin}
            style={({ pressed }) => [
            styles.adminAccessBtn,
            pressed && { opacity: 0.6 }]
            }>
            
              <Feather name="shield" size={12} color="#71717a" style={{ marginRight: 5 }} />
              <Text style={styles.adminAccessText}>Acesso Administrativo</Text>
            </Pressable>
          }

          <Text style={styles.brandFooter}>TRIBO NETWORK • 2026</Text>
        </View>
      </View>
    </Modal>);

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
    top: "16%",
    width: 320,
    height: 320,
    borderRadius: 160,
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
    borderRadius: 1.5
  },
  content: {
    width: "100%",
    maxWidth: 390,
    alignItems: "center",
    marginTop: "auto",
    marginBottom: "auto"
  },
  lockContainer: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#09090b",
    marginBottom: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8
  },
  statusPillText: {
    fontSize: 12,
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
    borderColor: "rgba(255, 255, 255, 0.08)",
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