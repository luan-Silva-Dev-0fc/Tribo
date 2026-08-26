import React from "react";
import { Modal, View, Text, Pressable, StyleSheet, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../theme";

export function SuspendedModal({ visible, message, onClose }) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background, shadowColor: colors.danger }]}>
          <View style={[styles.iconWrapper, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
            <Feather name="shield-off" size={48} color={colors.danger} />
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>Conta Suspensa</Text>
          
          <Text style={[styles.message, { color: colors.muted }]}>
            {message || "Sua conta foi suspensa por violação das diretrizes da comunidade. A Tribo valoriza um ambiente seguro para todos."}
          </Text>

          <View style={[styles.warningBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Feather name="info" size={16} color={colors.text} style={{ marginTop: 2 }} />
            <Text style={[styles.warningText, { color: colors.secondary }]}>
              Se você acredita que isso foi um engano, entre em contato com o suporte para reavaliação.
            </Text>
          </View>

          <Pressable 
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.danger, opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Entendido</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    elevation: 15,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },
  warningBox: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
