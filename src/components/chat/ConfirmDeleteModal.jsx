import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export function ConfirmDeleteModal({
  visible,
  mode = "me", // 'me' | 'everyone'
  onConfirm,
  onCancel,
}) {
  const isEveryone = mode === "everyone";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Ícone de Lixeira com Brilho Vermelho */}
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <MaterialCommunityIcons
                name={isEveryone ? "trash-can" : "trash-can-outline"}
                size={28}
                color="#ef4444"
              />
            </View>
          </View>

          <Text style={styles.title}>
            {isEveryone ? "Apagar para todos?" : "Apagar para mim?"}
          </Text>

          <Text style={styles.message}>
            {isEveryone
              ? "Esta mensagem será apagada para todos os membros da tribo. Esta ação não poderá ser desfeita."
              : "Esta mensagem será removida apenas do seu dispositivo. Os outros membros continuarão vendo normalmente."}
          </Text>

          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.btnCancel,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={onCancel}
            >
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.btnDelete,
                { opacity: pressed ? 0.88 : 1 },
              ]}
              onPress={onConfirm}
            >
              <Ionicons name="trash" size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.btnDeleteText}>Apagar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#1e1e22",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  iconOuter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(239, 68, 68, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#a1a1aa",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 22,
    paddingHorizontal: 6,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#2a2a2e",
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    color: "#e4e4e7",
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
  },
  btnDelete: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#e53935",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#e53935",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  btnDeleteText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
  },
});
