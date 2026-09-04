import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
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

export function BiometricLockScreen({
  visible,
  user,
  onUnlock
}) {
  const [errorMsg, setErrorMsg] = useState(null);
  const [authenticating, setAuthenticating] = useState(false);

  // Concentric pulsing rings
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

    // Auto trigger biometric prompt
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
    outputRange: [1, 1.6]
  });
  const ring1Opacity = pulse1.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.7, 0.35, 0]
  });

  const ring2Scale = pulse2.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.95]
  });
  const ring2Opacity = pulse2.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.5, 0.25, 0]
  });

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={() => {}}
    >
      <StatusBar barStyle="light-content" backgroundColor="#050507" />
      <View style={styles.container}>
        {/* Glow Superior */}
        <View style={styles.ambientGlow} />

        {/* Topo / Header da Marca */}
        <View style={styles.header}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#10b981" />
            <Text style={styles.shieldText}>TRIBO SEGURA</Text>
            <View style={styles.activeDot} />
          </View>
        </View>

        {/* Conteudo Central */}
        <View style={styles.content}>
          {/* Avatar do Usuario com anel de seguranca */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarBorder}>
              <Avatar user={user} size={72} />
            </View>
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={13} color="#ffffff" />
            </View>
          </View>

          {/* Nome e Titulo */}
          <Text style={styles.greetingText}>Olá, {displayName}</Text>
          <Text style={styles.titleText}>Tribo Bloqueada</Text>
          <Text style={styles.subtitleText}>
            Confirme sua impressão digital ou Face ID para acessar sua conta
          </Text>

          {/* Sensor Biometrico com Aneis Pulsantes */}
          <Animated.View style={[styles.sensorContainer, { transform: [{ translateX: shakeAnim }] }]}>
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

            <Pressable
              onPress={handleTriggerAuth}
              disabled={authenticating}
              style={({ pressed }) => [
                styles.sensorButton,
                {
                  backgroundColor: errorMsg
                    ? "rgba(239, 68, 68, 0.14)"
                    : "rgba(16, 185, 129, 0.12)",
                  borderColor: errorMsg ? "#ef4444" : "#10b981",
                  transform: [{ scale: pressed ? 0.94 : 1 }]
                }
              ]}
            >
              <Ionicons
                name="finger-print"
                size={52}
                color={errorMsg ? "#ef4444" : "#10b981"}
              />
            </Pressable>
          </Animated.View>

          {/* Mensagem de Erro com Badge */}
          {Boolean(errorMsg) && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={15} color="#ef4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
        </View>

        {/* Rodapé / Botao de Acao */}
        <View style={styles.footer}>
          <Pressable
            onPress={handleTriggerAuth}
            disabled={authenticating}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: "#10b981",
                opacity: pressed || authenticating ? 0.85 : 1
              }
            ]}
          >
            <Ionicons name="finger-print-outline" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>
              {authenticating ? "Lendo Biometria..." : "Desbloquear com Biometria"}
            </Text>
          </Pressable>
          <Text style={styles.footerHint}>
            Toque no sensor do celular ou no botão acima
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090A",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40
  },
  ambientGlow: {
    position: "absolute",
    top: -120,
    alignSelf: "center",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(16, 185, 129, 0.07)"
  },
  header: {
    alignItems: "center",
    marginTop: 12
  },
  shieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20
  },
  shieldText: {
    color: "#10b981",
    fontSize: 12,
    fontFamily: "Poppins_700Bold",
    letterSpacing: 1.2
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981"
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 16
  },
  avatarBorder: {
    padding: 3,
    borderRadius: 42,
    borderWidth: 2,
    borderColor: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.1)"
  },
  lockBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#10b981",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#08090A"
  },
  greetingText: {
    color: "#94a3b8",
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    marginBottom: 4
  },
  titleText: {
    color: "#ffffff",
    fontSize: 26,
    fontFamily: "Poppins_700Bold",
    marginBottom: 6,
    letterSpacing: -0.3
  },
  subtitleText: {
    color: "#64748b",
    fontSize: 13.5,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: 28
  },
  sensorContainer: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
    position: "relative"
  },
  pulseRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5
  },
  sensorButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
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
  actionButton: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 15.5,
    fontFamily: "Poppins_600SemiBold"
  },
  footerHint: {
    color: "#475569",
    fontSize: 12,
    fontFamily: "Poppins_400Regular"
  }
});
