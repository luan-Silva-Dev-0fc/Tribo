import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PUSH_TOKEN_KEY = "@tribo_push_token";

// Configura o comportamento das notificações em primeiro plano (Expo SDK 54)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Cria canais de notificação no Android (obrigatório para Android 13+)
 */
export async function setupNotificationChannels() {
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Tribo Notificações",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF6B00",
        showBadge: true,
      });
    } catch (e) {
      console.warn("[PushNotifications] Erro ao criar canal Android:", e);
    }
  }
}

/**
 * Solicita permissões e registra o push token no servidor
 */
export async function registerForPushNotificationsAsync(apiClient) {
  if (Platform.OS === "web") return null;

  try {
    if (!Device.isDevice) {
      console.log("[PushNotifications] Notificações push requerem um dispositivo físico.");
      return null;
    }

    await setupNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[PushNotifications] Permissão de notificação não concedida.");
      return null;
    }

    let token = null;
    try {
      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData?.data;
    } catch (deviceTokenErr) {
      console.warn("[PushNotifications] getDevicePushTokenAsync falhou, tentando getExpoPushTokenAsync:", deviceTokenErr?.message);
      try {
        const expoTokenData = await Notifications.getExpoPushTokenAsync();
        token = expoTokenData?.data;
      } catch (expoTokenErr) {
        console.error("[PushNotifications] Erro ao obter token Expo:", expoTokenErr);
      }
    }

    if (!token) return null;

    const tokenStr = typeof token === "string" ? token : JSON.stringify(token);

    // Salva token localmente
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, tokenStr);

    // Envia para o Back-end
    if (apiClient?.users?.registerPushToken) {
      await apiClient.users.registerPushToken({
        token: tokenStr,
        deviceType: Platform.OS,
      });
    } else if (apiClient?.post) {
      await apiClient.post("/api/users/push-token", {
        token: tokenStr,
        deviceType: Platform.OS,
      });
    }

    return tokenStr;
  } catch (error) {
    console.error("[PushNotifications] Erro ao registrar push notifications:", error);
    return null;
  }
}

/**
 * Remove o push token do servidor no logout
 */
export async function unregisterPushNotificationsAsync(apiClient) {
  try {
    const currentToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (currentToken) {
      if (apiClient?.users?.removePushToken) {
        await apiClient.users.removePushToken({ token: currentToken }).catch(() => {});
      } else if (apiClient?.delete) {
        await apiClient.delete("/api/users/push-token", {
          data: { token: currentToken },
        }).catch(() => {});
      }
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch (error) {
    console.warn("[PushNotifications] Erro ao remover token:", error);
  }
}

/**
 * Obtém o push token atual em cache local
 */
export async function getCurrentPushToken() {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}
