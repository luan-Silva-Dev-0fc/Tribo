import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import {
  checkBiometricAvailability,
  getSecuritySettings,
  setSecuritySetting,
  authenticateWithBiometrics,
  SECURITY_KEYS
} from "../../services/biometricsService";

export function SecuritySettingsModal({ visible, onClose }) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [bioAvail, setBioAvail] = useState(null);
  const [appLock, setAppLock] = useState(false);
  const [postLock, setPostLock] = useState(false);
  const [groupLock, setGroupLock] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null);

  useEffect(() => {
    if (!visible) return;

    async function load() {
      setLoading(true);
      const avail = await checkBiometricAvailability();
      const settings = await getSecuritySettings();

      setBioAvail(avail);
      setAppLock(settings.appLock);
      setPostLock(settings.postLock);
      setGroupLock(settings.groupLock);
      setLoading(false);
    }

    load();
  }, [visible]);

  const handleToggle = async (key, currentValue, setter) => {
    if (togglingKey) return;
    setTogglingKey(key);

    const newValue = !currentValue;
    const actionLabel = newValue ? "ativar" : "desativar";

    const auth = await authenticateWithBiometrics(
      `Confirme sua digital para ${actionLabel} esta proteção`
    );

    if (auth.success) {
      setter(newValue);
      await setSecuritySetting(key, newValue);
    } else if (auth.error && !auth.bypassed) {
      Alert.alert(
        "Autenticação Necessária",
        "Você precisa confirmar sua biometria para alterar esta opção."
      );
    }

    setTogglingKey(null);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.card || "#18181b",
              borderTopColor: colors.border || "#27272a"
            }
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: colors.border || "#3f3f46" }
            ]}
          />

          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={[
                  styles.headerIconCircle,
                  { backgroundColor: "rgba(16, 185, 129, 0.15)" }
                ]}
              >
                <Ionicons name="shield-checkmark" size={20} color="#10b981" />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Segurança & Biometria
              </Text>
            </View>

            <Pressable onPress={onClose} style={{ padding: 6 }}>
              <Feather name="x" size={20} color={colors.muted} />
            </Pressable>
          </View>

          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#10b981" />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ paddingBottom: 30, gap: 14 }}
              showsVerticalScrollIndicator={false}
            >
              {bioAvail && !bioAvail.isEnrolled && (
                <View style={styles.warningBox}>
                  <Feather name="alert-triangle" size={18} color="#f59e0b" />
                  <Text style={styles.warningText}>
                    Cadastre uma digital ou Face ID nas configurações do seu celular para ativar todas as proteções.
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.settingCard,
                  {
                    backgroundColor: colors.surface || "#27272a",
                    borderColor: colors.border || "#3f3f46"
                  }
                ]}
              >
                <View style={styles.settingInfo}>
                  <View style={styles.settingIconBg}>
                    <Ionicons name="lock-closed" size={18} color="#10b981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingName, { color: colors.text }]}>
                      Entrar no App com Biometria
                    </Text>
                    <Text style={[styles.settingDesc, { color: colors.muted }]}>
                      Exigir digital ou reconhecimento facial sempre que abrir a Tribo.
                    </Text>
                  </View>
                </View>
                <Switch
                  value={appLock}
                  onValueChange={() =>
                    handleToggle(SECURITY_KEYS.APP_LOCK, appLock, setAppLock)
                  }
                  disabled={togglingKey === SECURITY_KEYS.APP_LOCK}
                  thumbColor={appLock ? "#10b981" : "#71717a"}
                  trackColor={{ false: "#3f3f46", true: "rgba(16, 185, 129, 0.4)" }}
                />
              </View>

              <View
                style={[
                  styles.settingCard,
                  {
                    backgroundColor: colors.surface || "#27272a",
                    borderColor: colors.border || "#3f3f46"
                  }
                ]}
              >
                <View style={styles.settingInfo}>
                  <View style={styles.settingIconBg}>
                    <Ionicons name="finger-print" size={18} color="#10b981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingName, { color: colors.text }]}>
                      Biometria nas Publicações
                    </Text>
                    <Text style={[styles.settingDesc, { color: colors.muted }]}>
                      Ninguém poderá publicar posts ou stories no seu perfil sem a sua digital.
                    </Text>
                  </View>
                </View>
                <Switch
                  value={postLock}
                  onValueChange={() =>
                    handleToggle(SECURITY_KEYS.POST_LOCK, postLock, setPostLock)
                  }
                  disabled={togglingKey === SECURITY_KEYS.POST_LOCK}
                  thumbColor={postLock ? "#10b981" : "#71717a"}
                  trackColor={{ false: "#3f3f46", true: "rgba(16, 185, 129, 0.4)" }}
                />
              </View>

              <View
                style={[
                  styles.settingCard,
                  {
                    backgroundColor: colors.surface || "#27272a",
                    borderColor: colors.border || "#3f3f46"
                  }
                ]}
              >
                <View style={styles.settingInfo}>
                  <View style={styles.settingIconBg}>
                    <Ionicons name="people" size={18} color="#10b981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.settingName, { color: colors.text }]}>
                      Proteger Grupos com Biometria
                    </Text>
                    <Text style={[styles.settingDesc, { color: colors.muted }]}>
                      Exigir digital para abrir e visualizar conversas em grupos e tribos.
                    </Text>
                  </View>
                </View>
                <Switch
                  value={groupLock}
                  onValueChange={() =>
                    handleToggle(SECURITY_KEYS.GROUP_LOCK, groupLock, setGroupLock)
                  }
                  disabled={togglingKey === SECURITY_KEYS.GROUP_LOCK}
                  thumbColor={groupLock ? "#10b981" : "#71717a"}
                  trackColor={{ false: "#3f3f46", true: "rgba(16, 185, 129, 0.4)" }}
                />
              </View>

              <Text style={[styles.footerNotice, { color: colors.muted }]}>
                As configurações de biometria ficam salvas no seu aparelho com criptografia segura.
              </Text>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end"
  },
  sheetContainer: {
    maxHeight: "85%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 20
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Poppins_700Bold"
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)"
  },
  warningText: {
    color: "#f59e0b",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    flex: 1,
    lineHeight: 17
  },
  settingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
    marginRight: 10
  },
  settingIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  settingName: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 2
  },
  settingDesc: {
    fontSize: 11.5,
    fontFamily: "Poppins_400Regular",
    lineHeight: 16
  },
  footerNotice: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 16
  }
});
