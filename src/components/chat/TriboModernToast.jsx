import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export function TriboModernToast({
  visible,
  message,
  type = "success", // 'success' | 'error' | 'info'
  onHide,
  duration = 3000,
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hide();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hide();
    }
  }, [visible]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  if (!visible && opacity._value === 0) return null;

  const isSuccess = type === "success";
  const isError = type === "error";

  const iconName = isSuccess
    ? "checkmark-circle"
    : isError
    ? "alert-circle"
    : "information-circle";

  const iconColor = isSuccess ? "#22c55e" : isError ? "#ef4444" : "#38bdf8";
  const borderColor = isSuccess
    ? "rgba(34, 197, 94, 0.3)"
    : isError
    ? "rgba(239, 68, 68, 0.3)"
    : "rgba(56, 189, 248, 0.3)";

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
          borderColor,
        },
      ]}
    >
      <Ionicons name={iconName} size={20} color={iconColor} style={{ marginRight: 8 }} />
      <Text style={styles.text} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  text: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
});
