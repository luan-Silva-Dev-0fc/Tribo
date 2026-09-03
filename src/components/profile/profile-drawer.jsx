import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView } from
"react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { Avatar } from "../ui/ui";
import { errorMessage, userName } from "../../lib/format";
import { api } from "../../api";
import { useUserContext } from "../../context/user-context";
import { SecuritySettingsModal } from "../modals/SecuritySettingsModal";

export function ProfileDrawer({
  visible,
  onClose,
  user,
  onOpenSettings,
  onOpenPrivacy,
  onOpenAppearance,
  onOpenSavedPosts,
  onLogout
}) {
  const { colors } = useTheme();

  if (!visible) return null;

  const handle = user?.username ? `@${user.username}` : "";
  const displayName = userName(user) || "Meu Perfil";

  const { updateUser } = useUserContext();
  const [verifyModalVisible, setVerifyModalVisible] = React.useState(false);
  const [verifyCode, setVerifyCode] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [resendingCode, setResendingCode] = React.useState(false);
  const [securityVisible, setSecurityVisible] = React.useState(false);

  const handleOpenVerify = async () => {
    try {
      setVerifying(true);
      await api.auth.resendCode(user?.email);
      setVerifyModalVisible(true);
      setVerifyCode("");
    } catch (err) {
      Alert.alert("Erro", errorMessage(err) || "Não foi possível enviar o código.");
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmVerify = async () => {
    if (!verifyCode || verifyCode.length < 6) {
      return Alert.alert("Aviso", "O código deve ter 6 dígitos.");
    }
    try {
      setVerifying(true);
      await api.auth.verifyEmail(user?.email, verifyCode);
      updateUser?.({ email_verified: true, badge_type: "BLUE" });
      setVerifyModalVisible(false);
      Alert.alert("Conta Verificada", "Você ganhou o Selo de Verificação no seu perfil!");
    } catch (err) {
      Alert.alert("Código Inválido", errorMessage(err));
    } finally {
      setVerifying(false);
    }
  };

  const handleResendVerify = async () => {
    try {
      setResendingCode(true);
      await api.auth.resendCode(user?.email);
      Alert.alert("Código Enviado", `Novo código enviado para ${user?.email}`);
    } catch (err) {
      Alert.alert("Erro", errorMessage(err));
    } finally {
      setResendingCode(false);
    }
  };

  const menuItems = [
  {
    id: "settings",
    label: "Configurações e Privacidade",
    icon: "settings",
    color: colors.text,
    onPress: () => {
      onClose();
      onOpenSettings?.();
    }
  },
  {
    id: "security",
    label: "Segurança & Biometria",
    icon: "shield",
    color: "#10b981",
    onPress: () => {
      onClose();
      setTimeout(() => setSecurityVisible(true), 150);
    }
  },
  {
    id: "privacy",
    label: "Privacidade da Conta",
    icon: "shield",
    color: colors.text,
    onPress: () => {
      onClose();
      onOpenPrivacy?.();
    }
  },
  {
    id: "saved_posts",
    label: "Posts Salvos",
    icon: "bookmark",
    color: colors.text,
    onPress: () => {
      onClose();
      onOpenSavedPosts?.();
    }
  },

  {
    id: "verify",
    label: "Receber o selo de verificação",
    icon: "check-circle",
    color: "#3b82f6",
    hidden: user?.email_verified,
    onPress: () => {
      onClose();
      handleOpenVerify();
    }
  }];


  return (
    <>
    <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}>
        
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
            style={[
            styles.drawerContent,
            {
              backgroundColor: colors.surface || colors.card,
              borderColor: colors.border
            }]
            }>
            
          {}
          <View style={[styles.header, { backgroundColor: colors.surfaceAlt || "rgba(255,255,255,0.03)" }]}>
            <View style={styles.userInfo}>
              <Avatar user={user} size={54} />
              <View style={styles.userMeta}>
                <View style={styles.brandRow}>
                  <Ionicons name="people" size={14} color={colors.accent || "#00c2cb"} />
                  <Text style={[styles.brandText, { color: colors.accent || "#00c2cb" }]}>
                    Tribo
                  </Text>
                </View>
                <Text
                    style={[styles.nameText, { color: colors.text }]}
                    numberOfLines={1}>
                    
                  {displayName}
                </Text>
                {!!handle &&
                  <Text
                    style={[styles.handleText, { color: colors.subtext || colors.muted }]}
                    numberOfLines={1}>
                    
                    {handle}
                  </Text>
                  }
              </View>
            </View>

            <Pressable
                style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: colors.surfaceAlt || colors.background,
                  opacity: pressed ? 0.7 : 1
                }]
                }
                onPress={onClose}
                accessibilityLabel="Fechar menu">
                
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          {}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={true}
            overScrollMode="always">
            {menuItems.filter((item) => !item.hidden).map((item) =>
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                styles.menuItem,
                {
                  backgroundColor: pressed ?
                  colors.surface || "rgba(255,255,255,0.1)" :
                  colors.surfaceAlt || "rgba(255, 255, 255, 0.05)",
                  borderColor: colors.border
                }]
                }
                onPress={item.onPress}>
                
                <View
                  style={[
                  styles.iconBox,
                  {
                    backgroundColor:
                    colors.surfaceAlt || "rgba(255, 255, 255, 0.08)"
                  }]
                  }>
                  
                  <Feather name={item.icon} size={19} color={item.id === "verify" ? item.color : colors.accent || colors.text} />
                </View>
                <Text style={[styles.menuItemText, { color: item.id === "verify" ? item.color : colors.text }]}>
                  {item.label}
                </Text>
                <View style={[styles.chevronBox, { backgroundColor: colors.surface || "rgba(255,255,255,0.08)" }]}>
                  <Feather name="chevron-right" size={16} color={colors.subtext || colors.muted} />
                </View>
              </Pressable>
              )}
          </ScrollView>

          {}
          <View style={styles.footer}>
            <Pressable
                style={({ pressed }) => [
                styles.logoutButton,
                {
                  backgroundColor: pressed ? "#dc2626" : "#ef4444",
                  shadowColor: "#ef4444"
                }]
                }
                onPress={() => {
                  onClose();
                  onLogout?.();
                }}>
                
              <Feather name="power" size={18} color="#ffffff" />
              <Text style={styles.logoutText}>Sair da Conta</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

    {}
    <Modal
        visible={verifyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVerifyModalVisible(false)}>
        
      <View style={styles.overlay}>
        <View style={[styles.drawerContent, { backgroundColor: colors.card || colors.surface, borderColor: colors.border, alignSelf: "center", width: "90%", padding: 24, paddingBottom: 32 }]}>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(59, 130, 246, 0.15)", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
              <Feather name="mail" size={26} color="#3b82f6" />
            </View>
            <Text style={{ fontSize: 20, fontFamily: "Poppins_600SemiBold", color: colors.text, marginBottom: 8, textAlign: "center" }}>
              Verifique seu E-mail
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center" }}>
              Enviamos um código para {user?.email}. Digite-o abaixo para confirmar sua conta.
            </Text>
          </View>
          <TextInput
              maxLength={6}
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 12,
                textAlign: "center", fontSize: 24, letterSpacing: 10,
                paddingVertical: 12, marginBottom: 16, color: colors.text, backgroundColor: colors.background || "transparent"
              }}
              value={verifyCode}
              onChangeText={setVerifyCode}
              keyboardType="number-pad"
              placeholder="000000"
              placeholderTextColor={colors.muted}
              autoFocus />
            
          <Pressable
              onPress={handleConfirmVerify}
              disabled={verifying}
              style={{ backgroundColor: colors.primary || colors.accent, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 12 }}>
              
            {verifying ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontFamily: "Poppins_600SemiBold", fontSize: 16 }}>Confirmar</Text>}
          </Pressable>
          <Pressable
              onPress={handleResendVerify}
              disabled={resendingCode}
              style={{ paddingVertical: 12, alignItems: "center", marginBottom: 4 }}>
              
            <Text style={{ color: colors.primary || colors.accent, fontWeight: "600", fontSize: 15 }}>
              {resendingCode ? "Reenviando..." : "Reenviar código"}
            </Text>
          </Pressable>
          <Pressable
              onPress={() => setVerifyModalVisible(false)}
              style={{ borderWidth: 1, borderColor: colors.border, paddingVertical: 12, borderRadius: 12, alignItems: "center" }}>
              
            <Text style={{ color: colors.text, fontFamily: "Poppins_600SemiBold", fontSize: 15 }}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>

    <SecuritySettingsModal
      visible={securityVisible}
      onClose={() => setSecurityVisible(false)}
    />
    </>);

}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  backdrop: {
    flex: 1
  },
  drawerContent: {
    width: "82%",
    maxWidth: 360,
    marginTop: 40,
    marginBottom: 40,
    marginRight: 10,
    borderRadius: 32,
    borderWidth: 1,
    display: "flex",
    flexDirection: "column",
    shadowColor: "#000",
    shadowOffset: { width: -8, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 30,
    overflow: "hidden"
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10
  },
  userMeta: {
    marginLeft: 12,
    flex: 1
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2
  },
  brandText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  nameText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15
  },
  handleText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    marginTop: -2
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  menuList: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 12
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  menuItemText: {
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14.5
  },
  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  logoutText: {
    color: "#ffffff",
    fontFamily: "Poppins_700Bold",
    fontSize: 15
  }
});