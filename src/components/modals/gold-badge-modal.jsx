import React, { useEffect, useState } from "react";
import { Modal, View, Text, StyleSheet, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUserContext } from "../../context/user-context";

export function GoldBadgeModal({ user: propUser }) {
  const { colors } = useTheme();
  const { user: contextUser } = useUserContext();
  const activeUser = propUser || contextUser;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkBadgeStatus = async () => {
      if (!activeUser?.id) return;
      const rawBadge = activeUser?.badge || activeUser?.badge_type || activeUser?.badgeType || "";
      const isGold = String(rawBadge).toUpperCase() === "GOLD";

      if (isGold) {
        const hasSeen = await AsyncStorage.getItem(`has_seen_gold_badge_${activeUser.id}`);
        if (!hasSeen) {
          setVisible(true);
          try {
            const Notifications = require("expo-notifications");
            Notifications.scheduleNotificationAsync({
              content: {
                title: "Parabéns! Selo Dourado Concedido ",
                body: "Você recebeu o Selo Dourado de verificação oficial da Tribo!",
                data: { type: "GOLD_BADGE" }
              },
              trigger: null
            }).catch(() => {});
          } catch (_) {}
        }
      }
    };

    if (activeUser) {
      checkBadgeStatus();
    }
  }, [activeUser]);

  const handleClose = async () => {
    setVisible(false);
    if (activeUser?.id) {
      await AsyncStorage.setItem(`has_seen_gold_badge_${activeUser.id}`, "true");
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card || "#18181b", borderColor: "#fbbf24" }]}>
          <View style={[styles.iconContainer, { backgroundColor: "rgba(251, 191, 36, 0.15)" }]}>
            <MaterialCommunityIcons name="check-decagram" size={60} color="#fbbf24" />
          </View>
          
          <Text style={[styles.title, { color: colors.text || "#ffffff" }]}>Parabéns! Selo Dourado Concedido 🎉</Text>
          <Text style={[styles.subtitle, { color: "#fbbf24" }]}>
            Você recebeu o Selo Dourado de verificação oficial da Tribo!
          </Text>
          
          <Text style={[styles.message, { color: colors.subtext || "#a1a1aa" }]}>
            Seu perfil agora conta com o Selo Dourado concedido oficialmente pela administração da Tribo.
            {"\n\n"}
            Com este selo, você possui destaque VIP, acesso a recursos exclusivos como Voz ao Vivo no Chat, novidades antecipadas e máxima visibilidade na comunidade.
          </Text>

          <Pressable
            style={[styles.button, { backgroundColor: "#fbbf24", marginTop: 18 }]}
            onPress={handleClose}>
            
            <Text style={[styles.buttonText, { color: "#000000", fontFamily: "Poppins_700Bold" }]}>Entendi, aproveitar!</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function GoldBadgeBenefitsModal({ visible, onClose, featureName = "Voz ao Vivo no Chat" }) {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card || "#18181b", borderColor: "#eab308" }]}>
          {}
          <View style={[styles.iconContainer, { backgroundColor: "rgba(234, 179, 8, 0.15)", borderColor: "rgba(234, 179, 8, 0.3)", borderWidth: 1 }]}>
            <MaterialCommunityIcons name="crown" size={42} color="#eab308" />
          </View>
          
          <Text style={[styles.title, { color: colors.text || "#fff" }]}>Recurso VIP Exclusivo</Text>
          <Text style={[styles.subtitle, { color: "#eab308" }]}>
            Selo Dourado Necessário
          </Text>
          
          <Text style={[styles.message, { color: colors.subtext || "#a1a1aa", marginBottom: 16 }]}>
            Apenas membros com o <Text style={{ color: "#eab308", fontFamily: "Poppins_600SemiBold" }}>Selo Dourado</Text> têm acesso ao <Text style={{ color: colors.text, fontFamily: "Poppins_600SemiBold" }}>{featureName}</Text>, novidades antecipadas e benefícios exclusivos da Tribo.
          </Text>

          {}
          <View style={styles.benefitsList}>
            <View style={[styles.benefitItem, { backgroundColor: colors.surfaceAlt || "rgba(255,255,255,0.05)" }]}>
              <View style={styles.benefitIconBox}>
                <MaterialCommunityIcons name="microphone" size={20} color="#eab308" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Voz ao Vivo em Tempo Real</Text>
                <Text style={[styles.benefitDesc, { color: colors.subtext }]}>Fale diretamente no chat da tribo para todos ouvirem na hora.</Text>
              </View>
            </View>

            <View style={[styles.benefitItem, { backgroundColor: colors.surfaceAlt || "rgba(255,255,255,0.05)" }]}>
              <View style={styles.benefitIconBox}>
                <MaterialCommunityIcons name="rocket-launch" size={20} color="#eab308" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Acesso a Novidades</Text>
                <Text style={[styles.benefitDesc, { color: colors.subtext }]}>Experimente novos recursos da plataforma antes de todo mundo.</Text>
              </View>
            </View>

            <View style={[styles.benefitItem, { backgroundColor: colors.surfaceAlt || "rgba(255,255,255,0.05)" }]}>
              <View style={styles.benefitIconBox}>
                <MaterialCommunityIcons name="star-check" size={20} color="#eab308" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.benefitTitle, { color: colors.text }]}>Destaque VIP Oficial</Text>
                <Text style={[styles.benefitDesc, { color: colors.subtext }]}>Selo dourado no seu perfil e máxima visibilidade na comunidade.</Text>
              </View>
            </View>
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: "#eab308", marginTop: 18 }]}
            onPress={onClose}>
            
            <Text style={[styles.buttonText, { color: "#000", fontFamily: "Poppins_700Bold" }]}>Entendi</Text>
          </Pressable>
        </View>
      </View>
    </Modal>);

}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    alignItems: "center",
    shadowColor: "#eab308",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 12
  },
  iconContainer: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center"
  },
  title: {
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    marginBottom: 4,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 12,
    textAlign: "center"
  },
  message: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 20
  },
  benefitsList: {
    width: "100%",
    gap: 8,
    marginTop: 4
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    gap: 12
  },
  benefitIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(234, 179, 8, 0.15)",
    justifyContent: "center",
    alignItems: "center"
  },
  benefitTitle: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold"
  },
  benefitDesc: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    lineHeight: 15,
    marginTop: 1
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#eab308",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  buttonText: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold"
  }
});