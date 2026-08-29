import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../theme";

export function ProfileDeletionBanner({
  deletionInfo,
  cancelingDeletion,
  onCancelDeletion
}) {
  const { colors } = useTheme();
  if (!deletionInfo?.isPendingDeletion) return null;

  return (
    <View
      style={[
        styles.deletionBanner,
        {
          backgroundColor: "rgba(239, 68, 68, 0.12)",
          borderColor: "rgba(239, 68, 68, 0.3)"
        }
      ]}
    >
      <View style={styles.deletionBannerHeader}>
        <Feather name="alert-triangle" size={18} color="#ef4444" />
        <Text style={styles.deletionBannerTitle}>
          Exclusão Agendada ({deletionInfo.daysRemaining ?? 15} dias restantes)
        </Text>
      </View>
      <Text style={[styles.deletionBannerText, { color: colors.text }]}>
        Sua conta está agendada para ser excluída permanentemente. Todos os seus dados serão apagados ao final do prazo.
      </Text>
      <Pressable
        style={styles.cancelDeletionBtn}
        onPress={onCancelDeletion}
        disabled={cancelingDeletion}
      >
        {cancelingDeletion ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.cancelDeletionBtnText}>Cancelar Exclusão da Conta</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  deletionBanner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8
  },
  deletionBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  deletionBannerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#ef4444"
  },
  deletionBannerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 18
  },
  cancelDeletionBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#ef4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4
  },
  cancelDeletionBtnText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12
  }
});
