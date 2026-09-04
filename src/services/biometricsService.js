import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const SECURITY_KEYS = {
  APP_LOCK: "tribo.security.app_lock",
  POST_LOCK: "tribo.security.post_lock",
  GROUP_LOCK: "tribo.security.group_lock"
};

export async function checkBiometricAvailability() {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
      available: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      hasFace: types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION),
      hasFingerprint: types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
    };
  } catch (e) {
    console.warn("Erro ao verificar biometria:", e);
    return {
      available: false,
      hasHardware: false,
      isEnrolled: false,
      hasFace: false,
      hasFingerprint: false
    };
  }
}

export async function getSecuritySettings() {
  try {
    const [appLock, postLock, groupLock] = await Promise.all([
      AsyncStorage.getItem(SECURITY_KEYS.APP_LOCK),
      AsyncStorage.getItem(SECURITY_KEYS.POST_LOCK),
      AsyncStorage.getItem(SECURITY_KEYS.GROUP_LOCK)
    ]);

    return {
      appLock: appLock === "true",
      postLock: postLock === "true",
      groupLock: groupLock === "true"
    };
  } catch (e) {
    console.warn("Erro ao carregar configurações de segurança:", e);
    return {
      appLock: false,
      postLock: false,
      groupLock: false
    };
  }
}

export async function setSecuritySetting(key, enabled) {
  try {
    await AsyncStorage.setItem(key, enabled ? "true" : "false");
    return true;
  } catch (e) {
    console.warn("Erro ao salvar configuração de segurança:", e);
    return false;
  }
}

export async function authenticateWithBiometrics(reason = "Confirme sua identidade para continuar") {
  try {
    const isAvail = await LocalAuthentication.hasHardwareAsync();
    if (!isAvail) {
      return { success: true, bypassed: true };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return {
        success: false,
        error: "Nenhuma biometria cadastrada no dispositivo. Cadastre sua digital nas configurações do celular."
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Cancelar",
      fallbackLabel: "Usar PIN / Senha",
      disableDeviceFallback: false
    });

    return {
      success: Boolean(result.success),
      error: result.error || (result.success ? null : "Autenticação cancelada ou não reconhecida")
    };
  } catch (e) {
    console.warn("Erro durante autenticação biométrica:", e);
    return {
      success: false,
      error: e?.message || "Falha na autenticação biométrica"
    };
  }
}
