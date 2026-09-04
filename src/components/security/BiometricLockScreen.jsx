import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { authenticateWithBiometrics } from "../../services/biometricsService";
import { Avatar } from "../ui/ui";
import { userName } from "../../lib/format";

const triboLogo = require("../../../assets/icon.png");

export function BiometricLockScreen({
  visible,
  user,
  onUnlock
}) {
  const [errorMsg, setErrorMsg] = useState(null);
  const [authenticating, setAuthenticating] = useState(false);

  // Animacoes de pulso concentrico
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    setErrorMsg(null);

    const anim = Animated.loop(
      Animated.parallel([
        Animated.timing(pulse1, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true
        }),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(pulse2, {
            toValue: 1,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true
          })
        ])
      ])
    );
    anim.start();

    // Disparo automatico rapido do prompt biometrico nativo
    const timer = setTimeout(() => {
      handleTriggerAuth();
    }, 250);

    return () => {
      clearTimeout(timer);
      anim.stop();
      pulse1.setValue(0);
      pulse2.setValue(0);
    };
  }, [visible]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true })
    ]).start();
  };

  const handleTriggerAuth = async () => {
    if (authenticating) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    setAuthenticating(true);
    setErrorMsg(null);

    const result = await authenticateWithBiometrics(
      "Confirme sua digital ou Face ID para entrar na Tribo"
    );
    setAuthenticating(false);

    if (result.success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
      onUnlock?.();
    } else {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch (_) {}
      triggerShake();
      setErrorMsg(
        result.error || "Biometria não reconhecida. Toque no sensor para tentar novamente."
      );
    }
  };

  if (!visible) return null;

  const displayName = userName(user) || "Usuário";

  const ring1Scale = pulse1.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.65]
  });
  const ring1Opacity = pulse1.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.65, 0.3, 0]
  });

  const ring2Scale = pulse2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.0]
  });
  const ring2Opacity = pulse2.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.45, 0.2, 0]
  });

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={() => {}}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        
        {/* Glow Superior Suave Verde */}
        <View style={styles.ambientGlow} />

        {/* Topo: Logo Oficial e Nome Tribo */}
        <View style={styles.header}>
          <View style={styles.logoBorder}>
            <Image
              source={triboLogo}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.brandTitle}>Tribo</Text>
          <View style={styles.securityBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.securityText}>App Protegido por Biometria</Text>
          </View>
        </View>

        {/* Centro: Usuario e Sensor */}
        <View style={styles.centerSection}>
          {/* Card do Usuario */}
          {user && (
            <View style={styles.userCard}>
              <Avatar user={user} size={38} />
              <View style={styles.userTextContainer}>
                <Text style={styles.userGreeting}>Olá, {displayName}</Text>
                <Text style={styles.userStatus}>Toque para entrar</Text>
              </View>
              <Ionicons name="lock-closed" size={16} color="#10b981" />
            </View>
          )}

          {/* Sensor Biometrico Pulsante */}
          <Animated.View style={[styles.sensorWrapper, { transform: [{ translateX: shakeAnim }] }]}>
            {/* Anéis Pulsantes */}
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  borderColor: errorMsg ? "#ef4444" : "#10b981",
                  transform: [{ scale: ring1Scale }],
                  opacity: ring1Opacity
                }
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  borderColor: errorMsg ? "#ef4444" : "#10b981",
                  transform: [{ scale: ring2Scale }],
                  opacity: ring2Opacity
                }
              ]}
            />

            {/* Botao Central Redondo */}
            <Pressable
              onPress={handleTriggerAuth}
              disabled={authenticating}
              style={({ pressed }) => [
                styles.sensorButton,
                {
                  backgroundColor: errorMsg
                    ? "rgba(239, 68, 68, 0.12)"
                    : "#0a0a0c",
                  borderColor: errorMsg ? "#ef4444" : "#10b981",
                  transform: [{ scale: pressed ? 0.94 : 1 }]
                }
              ]}
            >
              <Ionicons
                name="finger-print"
                size={54}
                color={errorMsg ? "#ef4444" : "#10b981"}
              />
            </Pressable>
          </Animated.View>

          {/* Mensagem de Erro se houver */}
          {Boolean(errorMsg) && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={15} color="#ef4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
        </View>

        {/* Rodapé: Botao de Acao */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleTriggerAuth}
            disabled={authenticating}
            style={({ pressed }) => [
              styles.authBtn,
              {
                backgroundColor: "#10b981",
                opacity: pressed || authenticating ? 0.85 : 1
              }
            ]}
          >
            <Ionicons name="finger-print" size={20} color="#ffffff" />
            <Text style={styles.authBtnText}>
              {authenticating ? "Aguardando Leitura..." : "Desbloquear com Biometria"}
            </Text>
          </Pressable>
          <Text style={styles.hintText}>
            Use a digital cadastrada no seu aparelho
          </Text>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 44
  },
  ambientGlow: {
    position: "absolute",
    top: -100,
    alignSelf: "center",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(16, 185, 129, 0.08)"
  },
  header: {
    alignItems: "center",
    marginTop: 8
  },
  logoBorder: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.15)",
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "#000000",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8
  },
  logoImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22
  },
  brandTitle: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    color: "#ffffff",
    letterSpacing: 1.5,
    marginBottom: 6
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981"
  },
  securityText: {
    color: "#94a3b8",
    fontSize: 12,
    fontFamily: "Poppins_500Medium"
  },
  centerSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0d0d10",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
    width: "100%",
    maxWidth: 320
  },
  userTextContainer: {
    flex: 1
  },
  userGreeting: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold"
  },
  userStatus: {
    color: "#64748b",
    fontSize: 11.5,
    fontFamily: "Poppins_400Regular"
  },
  sensorWrapper: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    position: "relative"
  },
  pulseRing: {
    position: "absolute",
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 1.5
  },
  sensorButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 18,
    maxWidth: 320
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12.5,
    fontFamily: "Poppins_500Medium",
    flex: 1,
    textAlign: "center"
  },
  footer: {
    width: "100%",
    alignItems: "center",
    gap: 12
  },
  authBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4
  },
  authBtnText: {
    color: "#ffffff",
    fontSize: 15.5,
    fontFamily: "Poppins_600SemiBold"
  },
  hintText: {
    color: "#64748b",
    fontSize: 12,
    fontFamily: "Poppins_400Regular"
  }
});
