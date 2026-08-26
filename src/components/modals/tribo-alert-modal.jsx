import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View } from
"react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";














export function TriboAlertModal({
  visible,
  type = "error",
  title,
  message,
  buttonText = "Entendido",
  onClose,
  secondaryButtonText,
  onSecondaryPress
}) {
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  const getIconConfig = () => {
    switch (type) {
      case "warning":
        return {
          name: "alert-triangle",
          color: "#D97706",
          bgLight: "#FEF3C7",
          bgDark: "rgba(217, 119, 6, 0.18)"
        };
      case "success":
        return {
          name: "check-circle",
          color: "#10B981",
          bgLight: "#D1FAE5",
          bgDark: "rgba(16, 185, 129, 0.18)"
        };
      case "info":
        return {
          name: "info",
          color: "#3B82F6",
          bgLight: "#DBEAFE",
          bgDark: "rgba(59, 130, 246, 0.18)"
        };
      case "error":
      default:
        return {
          name: "alert-circle",
          color: "#EF4444",
          bgLight: "#FEE2E2",
          bgDark: "rgba(239, 68, 68, 0.18)"
        };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
          styles.card,
          {
            backgroundColor: colors.card || (isDark ? "#181920" : "#FFFFFF"),
            borderColor: isDark ? colors.line : "rgba(0, 0, 0, 0.06)"
          }]
          }
          onPress={(e) => e.stopPropagation()}>
          
          {}
          <View
            style={[
            styles.triboBadge,
            {
              backgroundColor: isDark ?
              "rgba(255, 255, 255, 0.08)" :
              "#F0F0F0"
            }]
            }>
            
            <Ionicons name="people" size={13} color={colors.text} />
            <Text style={[styles.triboBadgeText, { color: colors.text }]}>
              Tribo
            </Text>
          </View>

          {}
          <View
            style={[
            styles.iconWrapper,
            {
              backgroundColor: isDark ?
              iconConfig.bgDark :
              iconConfig.bgLight
            }]
            }>
            
            <Feather
              name={iconConfig.name}
              size={28}
              color={iconConfig.color} />
            
          </View>

          {}
          {!!title &&
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          }

          {}
          {!!message &&
          <Text style={[styles.message, { color: colors.muted }]}>
              {message}
            </Text>
          }

          {}
          <View style={styles.buttonContainer}>
            <Pressable
              onPress={onClose}
              style={[
              styles.primaryButton,
              {
                backgroundColor:
                type === "error" ?
                colors.primary || "#111111" :
                colors.primary || "#111111"
              }]
              }>
              
              <Text style={styles.primaryButtonText}>{buttonText}</Text>
            </Pressable>

            {!!secondaryButtonText && !!onSecondaryPress &&
            <Pressable
              onPress={onSecondaryPress}
              style={[
              styles.secondaryButton,
              { borderColor: colors.line }]
              }>
              
                <Text
                style={[
                styles.secondaryButtonText,
                { color: colors.muted }]
                }>
                
                  {secondaryButtonText}
                </Text>
              </Pressable>
            }
          </View>
        </Pressable>
      </Pressable>
    </Modal>);

}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8
  },
  triboBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 16
  },
  triboBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 6
  },
  buttonContainer: {
    width: "100%",
    gap: 8
  },
  primaryButton: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryButton: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600"
  }
});

export default TriboAlertModal;