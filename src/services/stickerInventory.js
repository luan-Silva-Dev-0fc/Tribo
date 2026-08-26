import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api";

const STORAGE_KEY = "tribo.user_stickers.v1";

/**
 * Retorna todas as figurinhas salvas no inventário (mesclando API e cache local)
 */
export async function getSavedStickers(packName = null) {
  let localList = [];
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) localList = JSON.parse(raw);
  } catch (e) {}

  try {
    const res = await api.stickers.listMyInventory(packName);
    const remoteList = Array.isArray(res)
      ? res
      : res?.stickers || res?.data?.stickers || res?.data || [];

    if (Array.isArray(remoteList) && remoteList.length > 0) {
      // Mescla sem duplicatas (por video_url ou id)
      const map = new Map();
      remoteList.forEach((s) => {
        const key = s.video_url || s.videoUrl || s.id;
        if (key) map.set(key, s);
      });
      localList.forEach((s) => {
        const key = s.video_url || s.videoUrl || s.id;
        if (key && !map.has(key)) map.set(key, s);
      });

      const merged = Array.from(map.values());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return filterByPack(merged, packName);
    }
  } catch (e) {
    // Se a API falhar ou estiver offline, usa o cache local
  }

  return filterByPack(localList, packName);
}

function filterByPack(list, packName) {
  if (!packName || packName === "Todos") return list;
  return list.filter(
    (s) => (s.pack_name || s.packName || "Gerais").toLowerCase() === packName.toLowerCase()
  );
}

/**
 * Salva uma figurinha no inventário pessoal
 */
export async function saveStickerToInventory(sticker) {
  if (!sticker) return false;
  const videoUrl = sticker.video_url || sticker.videoUrl || sticker.media_url || sticker.url;
  const stickerId = sticker.sticker_id || sticker.stickerId || sticker.id || `stk_${Date.now()}`;

  const cleanSticker = {
    id: stickerId,
    sticker_id: stickerId,
    video_url: videoUrl,
    media_url: videoUrl,
    sticker_name: sticker.sticker_name || sticker.stickerName || sticker.name || "Figurinha de Vídeo",
    pack_name: sticker.pack_name || sticker.packName || "Gerais",
    author_name: sticker.author_name || sticker.authorName || "Tribo",
    description: sticker.description || null,
    saved_at: new Date().toISOString(),
  };

  // 1. Salva no cache local imediatamente
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const exists = list.some(
      (s) => (s.id === stickerId || s.video_url === videoUrl)
    );
    if (!exists) {
      list.unshift(cleanSticker);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  } catch (e) {}

  // 2. Persiste no backend
  try {
    await api.stickers.favorite(stickerId, cleanSticker);
  } catch (e) {
    console.warn("Aviso: backend sticker favorite:", e?.message);
  }

  return true;
}

/**
 * Remove uma figurinha do inventário pessoal
 */
export async function removeStickerFromInventory(stickerId, videoUrl) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      const filtered = list.filter(
        (s) => s.id !== stickerId && s.sticker_id !== stickerId && s.video_url !== videoUrl
      );
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (e) {}

  if (stickerId) {
    try {
      await api.stickers.unfavorite(stickerId);
    } catch (e) {}
  }
  return true;
}

/**
 * Verifica se uma figurinha já está salva
 */
export async function isStickerInInventory(stickerId, videoUrl) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw);
    return list.some(
      (s) => (stickerId && (s.id === stickerId || s.sticker_id === stickerId)) ||
             (videoUrl && s.video_url === videoUrl)
    );
  } catch (e) {
    return false;
  }
}
