import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View } from
"react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";


















export function CustomModal({
  visible,
  type = "info",
  icon,
  title,
  message,
  primaryText,
  onPrimaryPress,
  secondaryText,
  onSecondaryPress,
  onClose,
  loading = false,
  primaryVariant
}) {
  const { colors, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 70,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true
      })]
      ).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const isDestructiveType =
  type === "destructive" ||
  type === "delete" ||
  type === "error" ||
  primaryVariant === "destructive";

  const getStatusConfig = () => {
    switch (type) {
      case "destructive":
      case "delete":
        return {
          icon: icon || "trash-2",
          color: "#ef4444",
          bg: isDark ? "rgba(239, 68, 68, 0.16)" : "#fee2e2",
          border: isDark ? "rgba(239, 68, 68, 0.3)" : "#fca5a5",
          btnBg: "#ef4444"
        };
      case "error":
        return {
          icon: icon || "alert-circle",
          color: "#ef4444",
          bg: isDark ? "rgba(239, 68, 68, 0.16)" : "#fee2e2",
          border: isDark ? "rgba(239, 68, 68, 0.3)" : "#fca5a5",
          btnBg: "#ef4444"
        };
      case "warning":
        return {
          icon: icon || "alert-triangle",
          color: "#f59e0b",
          bg: isDark ? "rgba(245, 158, 11, 0.16)" : "#fef3c7",
          border: isDark ? "rgba(245, 158, 11, 0.3)" : "#fde68a",
          btnBg: "#f59e0b"
        };
      case "success":
        return {
          icon: icon || "check-circle",
          color: "#10b981",
          bg: isDark ? "rgba(16, 185, 129, 0.16)" : "#d1fae5",
          border: isDark ? "rgba(16, 185, 129, 0.3)" : "#a7f3d0",
          btnBg: "#10b981"
        };
      case "info":
      default:
        return {
          icon: icon || "info",
          color: "#0284c7",
          bg: isDark ? "rgba(2, 132, 199, 0.16)" : "#e0f2fe",
          border: isDark ? "rgba(2, 132, 199, 0.3)" : "#bae6fd",
          btnBg: colors.primary || "#0284c7"
        };
    }
  };

  const statusConfig = getStatusConfig();
  const hasSecondary = Boolean(secondaryText);
  const defaultPrimaryText = hasSecondary ? "Confirmar" : "Entendido";
  const finalPrimaryText = primaryText || defaultPrimaryText;

  const handlePrimary = () => {
    if (onPrimaryPress) {
      onPrimaryPress();
    } else if (onClose) {
      onClose();
    }
  };

  const handleSecondary = () => {
    if (onSecondaryPress) {
      onSecondaryPress();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
          styles.card,
          {
            backgroundColor: isDark ? "#18181b" : "#ffffff",
            borderColor: isDark ?
            "rgba(255, 255, 255, 0.08)" :
            "rgba(0, 0, 0, 0.08)",
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim
          }]
          }>
          
          <Pressable style={styles.cardInner} onPress={(e) => e.stopPropagation()}>
            {}
            <View
              style={[
              styles.iconCircle,
              {
                backgroundColor: statusConfig.bg,
                borderColor: statusConfig.border
              }]
              }>
              
              <Feather
                name={statusConfig.icon}
                size={26}
                color={statusConfig.color} />
              
            </View>

            {}
            {Boolean(title) &&
            <Text
              style={[
              styles.title,
              { color: isDark ? "#f4f4f5" : "#09090b" }]
              }>
              
                {title}
              </Text>
            }

            {}
            {Boolean(message) &&
            <Text
              style={[
              styles.message,
              { color: isDark ? "#a1a1aa" : "#64748b" }]
              }>
              
                {message}
              </Text>
            }

            {}
            <View
              style={[
              styles.buttonRow,
              hasSecondary ? styles.buttonRowTwo : styles.buttonRowSingle]
              }>
              
              {hasSecondary &&
              <Pressable
                onPress={handleSecondary}
                disabled={loading}
                style={({ pressed }) => [
                styles.secondaryButton,
                {
                  backgroundColor: isDark ?
                  "rgba(255, 255, 255, 0.06)" :
                  "#f1f5f9",
                  borderColor: isDark ?
                  "rgba(255, 255, 255, 0.1)" :
                  "#e2e8f0",
                  opacity: pressed ? 0.75 : 1
                }]
                }>
                
                  <Text
                  style={[
                  styles.secondaryButtonText,
                  { color: isDark ? "#e4e4e7" : "#334155" }]
                  }>
                  
                    {secondaryText}
                  </Text>
                </Pressable>
              }

              <Pressable
                onPress={handlePrimary}
                disabled={loading}
                style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: isDestructiveType ?
                  "#ef4444" :
                  statusConfig.btnBg,
                  flex: hasSecondary ? 1 : undefined,
                  width: hasSecondary ? undefined : "100%",
                  opacity: pressed || loading ? 0.8 : 1
                }]
                }>
                
                {loading ?
                <ActivityIndicator size="small" color="#ffffff" /> :

                <Text style={styles.primaryButtonText}>
                    {finalPrimaryText}
                  </Text>
                }
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>);

}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
    overflow: "hidden"
  },
  cardInner: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: "center",
    width: "100%"
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    marginBottom: 8
  },
  message: {
    fontSize: 13.5,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 6
  },
  buttonRow: {
    width: "100%",
    gap: 12
  },
  buttonRowTwo: {
    flexDirection: "row",
    alignItems: "center"
  },
  buttonRowSingle: {
    flexDirection: "column",
    alignItems: "center"
  },
  primaryButton: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3
  },
  primaryButtonText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14
  }
});