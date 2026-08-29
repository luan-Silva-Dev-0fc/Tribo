import { chatStorage } from "./chatCache";

const inMemoryProfileFallback = new Map();

function readStorage(key) {
  if (chatStorage) {
    try {
      const val = chatStorage.getString(key);
      return val ? JSON.parse(val) : null;
    } catch (_) {
      return null;
    }
  }
  return inMemoryProfileFallback.get(key) || null;
}

function writeStorage(key, value) {
  if (chatStorage) {
    try {
      chatStorage.set(key, JSON.stringify(value));
      return;
    } catch (_) {}
  }
  inMemoryProfileFallback.set(key, value);
}

function removeStorage(key) {
  if (chatStorage) {
    try {
      chatStorage.delete(key);
      return;
    } catch (_) {}
  }
  inMemoryProfileFallback.delete(key);
}

export const ProfileCache = {
  getProfileSync(userId) {
    if (!userId) return null;
    const key = `user_profile:${userId}`;
    const data = readStorage(key);
    return data && typeof data === "object" ? data : null;
  },

  setProfileSync(userId, profileData) {
    if (!userId || !profileData || typeof profileData !== "object") return;
    const key = `user_profile:${userId}`;
    writeStorage(key, profileData);
  },

  getPostsSync(userId) {
    if (!userId) return [];
    const key = `user_posts:${userId}`;
    const data = readStorage(key);
    return Array.isArray(data) ? data : [];
  },

  setPostsSync(userId, posts) {
    if (!userId || !Array.isArray(posts)) return;
    const key = `user_posts:${userId}`;
    writeStorage(key, posts.slice(0, 50));
  },

  getFeedPostsSync() {
    const data = readStorage("feed_posts_cache");
    return Array.isArray(data) ? data : [];
  },

  setFeedPostsSync(posts) {
    if (!Array.isArray(posts)) return;
    writeStorage("feed_posts_cache", posts.slice(0, 40));
  },

  clear(userId) {
    if (userId) {
      removeStorage(`user_profile:${userId}`);
      removeStorage(`user_posts:${userId}`);
    }
  },

  clearAll() {
    inMemoryProfileFallback.clear();
  }
};
