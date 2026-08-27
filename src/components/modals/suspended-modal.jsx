import React, { useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import * as Haptics from "expo-haptics";

export function SuspendedModal({ visible, message, onClose }) {
  const { colors } = useTheme();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true
      })
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [visible]);

  const handleClose = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (_) {}
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.background,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim
            }
          ]}>
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                transform: [{ scale: pulseAnim }]
              }
            ]}>
            <MaterialCommunityIcons name="shield-alert-outline" size={46} color="#ef4444" />
          </Animated.View>

          <Text style={[styles.title, { color: colors.text }]}>Conta Suspensa</Text>

          <Text style={[styles.message, { color: colors.muted }]}>
            {message ||
              "Sua conta foi temporariamente suspensa por violação das diretrizes da comunidade. A Tribo valoriza um ambiente seguro para todos."}
          </Text>

          <View
            style={[
              styles.warningBox,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border }
            ]}>
            <Feather name="info" size={16} color={colors.text} style={{ marginTop: 2 }} />
            <Text style={[styles.warningText, { color: colors.secondary }]}>
              Se você acredita que isso foi um engano ou gostaria de recorrer, entre em contato com o suporte para reavaliação.
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: "#ef4444", opacity: pressed ? 0.85 : 1 }
            ]}
            onPress={handleClose}>
            <Text style={styles.buttonText}>Entendido</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalContainer: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 15
  },
  iconWrapper: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20
  },
  title: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    marginBottom: 10,
    textAlign: "center"
  },
  message: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 20
  },
  warningBox: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    gap: 10
  },
  warningText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: "Poppins_400Regular",
    lineHeight: 18
  },
  button: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold"
  }
});