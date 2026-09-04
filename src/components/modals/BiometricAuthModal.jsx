import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { authenticateWithBiometrics } from "../../services/biometricsService";

export function BiometricAuthModal({
  visible,
  title = "Autenticação da Tribo",
  reason = "Confirme sua digital para continuar",
  onSuccess,
  onCancel,
  cancellable = true,
  autoPrompt = true
}) {
  const { colors } = useTheme();
  const [errorMsg, setErrorMsg] = useState(null);
  const [authenticating, setAuthenticating] = useState(false);

  // Animação de pulso do ícone biométrico
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;

    setErrorMsg(null);

    // Inicia a animação pulsante
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true
        })
      ])
    );
    loop.start();

    if (autoPrompt) {
      const timer = setTimeout(() => {
        handleTriggerAuth();
      }, 350);
      return () => {
        clearTimeout(timer);
        loop.stop();
      };
    }

    return () => loop.stop();
  }, [visible, autoPrompt]);

  const handleTriggerAuth = async () => {
    if (authenticating) return;
    setAuthenticating(true);
    setErrorMsg(null);

    const result = await authenticateWithBiometrics(reason);
    setAuthenticating(false);

    if (result.success) {
      onSuccess?.();
    } else {
      setErrorMsg(result.error || "Não foi possível reconhecer a biometria.");
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (cancellable) onCancel?.();
      }}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: "#000000",
              borderColor: "rgba(255, 255, 255, 0.12)"
            }
          ]}
        >
          {/* Ícone de Escudo / Digital com Pulso */}
          <View style={styles.iconContainer}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseAnim }],
                  borderColor: errorMsg ? "#ef4444" : "#10b981"
                }
              ]}
            />
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: errorMsg
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(16, 185, 129, 0.15)"
                }
              ]}
            >
              <Ionicons
                name={errorMsg ? "finger-print" : "finger-print"}
                size={44}
                color={errorMsg ? "#ef4444" : "#10b981"}
              />
            </View>
          </View>

          {/* Título & Mensagem */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.reason, { color: colors.muted }]}>{reason}</Text>

          {/* Mensagem de Erro se houver */}
          {Boolean(errorMsg) && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color="#ef4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Botão de Tentar Novamente / Autenticar */}
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
            <Ionicons name="finger-print" size={18} color="#ffffff" />
            <Text style={styles.authBtnText}>
              {authenticating ? "Aguardando digital..." : "Tocar para Autenticar"}
            </Text>
          </Pressable>

          {/* Botão de Cancelar (se permitido) */}
          {cancellable && (
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelBtn,
                { opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Text style={[styles.cancelBtnText, { color: colors.muted }]}>
                Cancelar
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20
  },
  iconContainer: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    position: "relative"
  },
  pulseRing: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    opacity: 0.6
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    marginBottom: 6
  },
  reason: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 8
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    width: "100%"
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    flex: 1
  },
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: 48,
    borderRadius: 14,
    marginBottom: 8
  },
  authBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold"
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium"
  }
});
