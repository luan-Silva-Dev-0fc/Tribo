import { MMKV } from "react-native-mmkv";

let storageInstance = null;
try {
  storageInstance = new MMKV({
    id: "tribo-chat-cache-v2",
    encryptionKey: "tribo_secure_cpp_key"
  });
} catch (_) {
  try {
    storageInstance = new MMKV({
      id: "tribo-chat-cache-fallback"
    });
  } catch (_) {
    storageInstance = null;
  }
}

export const chatStorage = storageInstance;

const inMemoryFallback = new Map();
const MAX_CACHE_MESSAGES = 60;

function readStorage(key) {
  if (chatStorage) {
    try {
      const val = chatStorage.getString(key);
      return val ? JSON.parse(val) : null;
    } catch (_) {
      return null;
    }
  }
  return inMemoryFallback.get(key) || null;
}

function writeStorage(key, value) {
  if (chatStorage) {
    try {
      chatStorage.set(key, JSON.stringify(value));
      return;
    } catch (_) {}
  }
  inMemoryFallback.set(key, value);
}

function removeStorage(key) {
  if (chatStorage) {
    try {
      chatStorage.delete(key);
      return;
    } catch (_) {}
  }
  inMemoryFallback.delete(key);
}

export const ChatCache = {
  getMessagesSync(chatId) {
    if (!chatId) return [];
    const key = `messages:${chatId}`;
    const data = readStorage(key);
    return Array.isArray(data) ? data : [];
  },

  setMessagesSync(chatId, messages) {
    if (!chatId || !Array.isArray(messages)) return;
    const key = `messages:${chatId}`;
    const trimmed = messages.slice(-MAX_CACHE_MESSAGES);
    writeStorage(key, trimmed);
  },

  loadMessagesAsync(chatId) {
    return Promise.resolve(this.getMessagesSync(chatId));
  },

  appendMessageSync(chatId, newMessage) {
    if (!chatId || !newMessage) return;
    const current = this.getMessagesSync(chatId);
    const exists = current.some(
      (m) => String(m.id || m._id) === String(newMessage.id || newMessage._id)
    );
    if (exists) return current;
    const updated = [...current, newMessage].slice(-MAX_CACHE_MESSAGES);
    this.setMessagesSync(chatId, updated);
    return updated;
  },

  getConversationsSync() {
    const data = readStorage("conversations");
    return Array.isArray(data) ? data : [];
  },

  setConversationsSync(conversations) {
    if (!Array.isArray(conversations)) return;
    writeStorage("conversations", conversations);
  },

  loadConversationsAsync() {
    return Promise.resolve(this.getConversationsSync());
  },

  setDraftSync(chatId, draftText) {
    if (!chatId) return;
    const key = `draft:${chatId}`;
    if (!draftText) {
      removeStorage(key);
    } else {
      writeStorage(key, draftText);
    }
  },

  getDraftSync(chatId) {
    if (!chatId) return "";
    const key = `draft:${chatId}`;
    const data = readStorage(key);
    return typeof data === "string" ? data : "";
  },

  clearChat(chatId) {
    if (!chatId) return;
    removeStorage(`messages:${chatId}`);
  },

  getGroupSync(groupId) {
    if (!groupId) return null;
    return readStorage(`group:${groupId}`);
  },

  setGroupSync(groupId, groupData) {
    if (!groupId || !groupData) return;
    writeStorage(`group:${groupId}`, groupData);
  },

  getTribosSync() {
    const data = readStorage("tribos_list");
    return Array.isArray(data) ? data : [];
  },

  setTribosSync(tribos) {
    if (!Array.isArray(tribos)) return;
    writeStorage("tribos_list", tribos);
    for (const t of tribos) {
      if (t?.id) {
        writeStorage(`group:${t.id}`, t);
      }
    }
  }
};
