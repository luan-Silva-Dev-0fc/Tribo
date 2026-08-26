import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { api } from "../api";

const EXPIRED_STORAGE_KEY_PREFIX = "@tribo_view_once_expired_";

/**
 * Retorna o conjunto de IDs de mensagens expiradas do grupo
 */
export async function getExpiredMessageIds(groupId) {
  if (!groupId) return new Set();
  try {
    const raw = await AsyncStorage.getItem(`${EXPIRED_STORAGE_KEY_PREFIX}${groupId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    return new Set();
  }
}

/**
 * Marca uma mensagem como expirada no storage local, exclui cache de arquivo e notifica o backend
 */
export async function markMessageAsExpired(groupId, messageItem) {
  if (!messageItem) return;
  const messageId = String(messageItem.id || messageItem._id);
  if (!messageId || messageId.startsWith("temp_")) return;

  try {
    // 1. Persistência local no AsyncStorage
    const expiredSet = await getExpiredMessageIds(groupId);
    expiredSet.add(messageId);
    await AsyncStorage.setItem(
      `${EXPIRED_STORAGE_KEY_PREFIX}${groupId}`,
      JSON.stringify(Array.from(expiredSet))
    );

    // 2. Destruição do arquivo de mídia no cache local se for file://
    const mediaUrl =
      messageItem.media_url ||
      messageItem.mediaUrl ||
      messageItem.video_url ||
      messageItem.audio_url ||
      messageItem.url;

    if (typeof mediaUrl === "string" && mediaUrl.startsWith("file://")) {
      try {
        await FileSystem.deleteAsync(mediaUrl, { idempotent: true });
      } catch (e) {}
    }

    // 3. Notifica a API para invalidar e apagar a URL do banco
    if (groupId) {
      try {
        await api.groups.markMediaViewed(groupId, messageId);
      } catch (e) {}
      try {
        await api.groups.expireViewOnce?.(groupId, messageId);
      } catch (e) {}
    }
  } catch (err) {
    console.warn("Erro ao persistir expiração de mídia única:", err);
  }
}

/**
 * Sanitiza a lista de mensagens garantindo que mensagens expiradas não reapareçam com mídia
 */
export function sanitizeMessagesWithExpiration(messages, expiredSet) {
  if (!Array.isArray(messages)) return [];

  return messages.map((msg) => {
    const msgId = String(msg.id || msg._id || "");
    const isExplicitlyExpired =
      Boolean(msg.is_expired) ||
      Boolean(msg.isExpired) ||
      Boolean(msg.is_opened) ||
      Boolean(msg.isOpened) ||
      Boolean(msg.is_viewed) ||
      Boolean(msg.isViewed) ||
      (msg.plays_count >= (msg.max_plays || 2));

    const isStoredExpired = expiredSet && expiredSet.has(msgId);

    if (isExplicitlyExpired || isStoredExpired) {
      return {
        ...msg,
        is_view_once: true,
        isViewOnce: true,
        is_viewed: true,
        isViewed: true,
        is_opened: true,
        isOpened: true,
        is_expired: true,
        isExpired: true,
        media_url: null,
        mediaUrl: null,
        video_url: null,
        videoUrl: null,
        audio_url: null,
        audioUrl: null,
        file_url: null,
      };
    }

    return msg;
  });
}
