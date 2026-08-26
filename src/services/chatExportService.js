import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform, Share } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api";




function getStorageKey(groupId) {
  return `@tribo_chat_cleared_${groupId}`;
}




export async function clearChatHistory(groupId) {
  try {
    const timestamp = Date.now();
    await AsyncStorage.setItem(getStorageKey(groupId), String(timestamp));


    try {
      if (api.groups?.clearChat) {
        await api.groups.clearChat(groupId);
      }
    } catch (e) {}

    return timestamp;
  } catch (err) {
    console.warn("Erro ao salvar limpeza de conversa:", err);
    return Date.now();
  }
}




export async function getClearedChatTimestamp(groupId) {
  try {
    const val = await AsyncStorage.getItem(getStorageKey(groupId));
    return val ? parseInt(val, 10) : 0;
  } catch (e) {
    return 0;
  }
}




export function filterClearedMessages(messages, clearedTimestamp) {
  if (!clearedTimestamp || !Array.isArray(messages)) return messages;
  return messages.filter((msg) => {
    const msgTime = new Date(msg.createdAt || msg.created_at).getTime();
    if (isNaN(msgTime)) return true;
    return msgTime > clearedTimestamp;
  });
}




function formatFullDate(date) {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch (e) {
    return "";
  }
}




function formatShortDate(date) {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "00/00/0000 00:00";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    return "00/00/0000 00:00";
  }
}




export async function exportChatHistory({
  groupName = "Grupo Tribo",
  messages = [],
  onAlert
}) {
  try {
    if (!messages || messages.length === 0) {
      if (onAlert) {
        onAlert({
          title: "Exportar Conversa",
          message: "Não há mensagens para exportar neste grupo.",
          type: "info"
        });
      }
      return;
    }


    const sorted = [...messages].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
      const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
      return timeA - timeB;
    });

    const nowStr = formatFullDate(new Date());
    let fileContent = `--- Histórico de Mensagens: ${groupName} ---\nExportado em: ${nowStr}\n\n`;

    sorted.forEach((item) => {
      const isDeleted = item.is_deleted || item.deleted_for_everyone;
      const dateStr = formatShortDate(
        item.createdAt || item.created_at || new Date()
      );
      const authorName =
      item.user?.name ||
      item.sender?.name ||
      item.author?.name ||
      item.user?.username ||
      item.sender?.username ||
      "Usuário";

      let body = "";
      if (isDeleted) {
        body = "[Mensagem apagada]";
      } else if (
      item.media_type === "STICKER" ||
      item.mediaType === "STICKER" ||
      item.type === "STICKER" ||
      item.sticker_id ||
      item.stickerId)
      {
        body = "[Figurinha]";
      } else if (item.audio_url || item.audioUrl) {
        body = "[Mensagem de voz]";
      } else if (
      item.media_type === "VIDEO" ||
      item.mediaType === "VIDEO" ||
      typeof item.media_url === "string" && (
      item.media_url.endsWith(".mp4") || item.media_url.includes("video")))
      {
        body = item.content ? `[Vídeo] ${item.content}` : "[Vídeo]";
      } else if (item.media_url || item.mediaUrl || item.imageUrl) {
        body = item.content ? `[Foto] ${item.content}` : "[Foto]";
      } else {
        body = item.content || item.text || item.message || "";
      }

      fileContent += `[${dateStr}] ${authorName}: ${body}\n`;
    });


    if (Platform.OS === "web") {
      try {
        const blob = new Blob([fileContent], {
          type: "text/plain;charset=utf-8"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const safeName = groupName.replace(/[^a-zA-Z0-9_-]/g, "_");
        a.download = `Historico_${safeName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      } catch (e) {}
    }


    const safeName = groupName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Historico_${safeName}_${Date.now()}.txt`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, fileContent, {
      encoding: FileSystem?.EncodingType?.UTF8 || "utf8"
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/plain",
        UTI: "public.plain-text",
        dialogTitle: `Exportar Histórico: ${groupName}`
      });
    } else {
      await Share.share({
        title: `Histórico de Mensagens - ${groupName}`,
        message: fileContent
      });
    }
  } catch (err) {
    console.error("Erro ao exportar conversa:", err);
    if (onAlert) {
      onAlert({
        title: "Erro na Exportação",
        message: "Não foi possível exportar a conversa. Tente novamente.",
        type: "error"
      });
    }
  }
}