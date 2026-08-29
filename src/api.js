import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { NativeOptimization } from "./services/nativeOptimization";

const TOKEN_KEY = "tribo.auth.token";

function resolveApiBase() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    const raw = process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "").replace(
      /\/api\/?$/,
      ""
    );
    return `${raw}/api`;
  }
  return "https://tribo-api-production-2f6f.up.railway.app/api";
}

export const BASE_URL = resolveApiBase();
console.log("[API CONFIG] Conectado na Base URL:", BASE_URL);

try {
  NativeOptimization.prefetch([
    BASE_URL,
    "https://tribo-api-production-2f6f.up.railway.app",
    "https://pub-08d4ac7de5354fadbfe07fcbc70237ba.r2.dev",
    "https://pub-34192334d7d14328ace69168b62cc510.r2.dev"
  ]);
} catch (_) {}

export class ApiError extends Error {
  constructor(message, status = 0, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

let token = null;

function webStorage() {
  if (Platform.OS !== "web") return null;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

async function readStoredToken() {
  if (Platform.OS === "web") return webStorage()?.getItem(TOKEN_KEY) ?? null;
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function persistToken(value) {
  if (Platform.OS === "web") {
    webStorage()?.setItem(TOKEN_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, value);
}

async function removeStoredToken() {
  if (Platform.OS === "web") {
    webStorage()?.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export const session = {
  async restore() {
    token = await readStoredToken();
    return token;
  },
  async save(nextToken) {
    token = nextToken;
    await persistToken(nextToken);
  },
  async clear() {
    token = null;
    await removeStoredToken();
  },
  get token() {
    return token;
  }
};

function queryString(params = {}) {
  const query = Object.entries(params).
  filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  ).
  map(
    ([key, value]) =>
    `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  ).
  join("&");
  return query ? `?${query}` : "";
}

const banListeners = new Set();

export function onAccountBanned(listener) {
  banListeners.add(listener);
  return () => banListeners.delete(listener);
}

function notifyAccountBanned(message) {
  for (const listener of banListeners) {
    try {
      listener(message);
    } catch (e) {
      console.error("Error in ban listener:", e);
    }
  }
}

const platformSuspensionListeners = new Set();

export function onPlatformSuspended(listener) {
  platformSuspensionListeners.add(listener);
  return () => platformSuspensionListeners.delete(listener);
}

export function notifyPlatformSuspended(data) {
  for (const listener of platformSuspensionListeners) {
    try {
      listener(data);
    } catch (e) {
      console.error("Error in platform suspension listener:", e);
    }
  }
}

async function request(
  path,
  { method = "GET", body, headers = {}, signal } = {}
) {
  const isFormData =
    body && (
      (typeof FormData !== "undefined" && body instanceof FormData) ||
      body.constructor?.name === "FormData" ||
      body._parts
    );
  const authToken = token || (await readStoredToken());

  const requestHeaders = {
    Accept: "application/json",
    "User-Agent": "TriboApp/1.0 (React Native)",
    ...(body && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...headers
  };

  let status = 0;
  let ok = false;
  let payload = null;

  if (!isFormData && !signal && Platform.OS === "android") {
    try {
      const nativeRes = await NativeOptimization.fastFetch(
        `${BASE_URL}${path}`,
        method,
        requestHeaders,
        body
      );
      if (nativeRes && typeof nativeRes.status === "number") {
        status = nativeRes.status;
        ok = nativeRes.ok;
        payload = nativeRes.data;
      }
    } catch (_) {}
  }

  if (status === 0) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        ...requestHeaders
      },
      body:
        body === undefined ? undefined : isFormData ? body : JSON.stringify(body)
    }).catch((error) => {
      if (error?.name === "AbortError") throw error;
      throw new ApiError(
        "Não foi possível conectar à API. Confira EXPO_PUBLIC_API_URL e a rede.",
        0
      );
    });

    status = response.status;
    ok = response.ok;
    if (status === 204) return null;
    payload = await response.json().catch(() => null);
  }

  if (status === 204) return null;

  if (!ok) {
    const errorMsg =
      payload?.message || payload?.error || `Erro HTTP ${status}`;

    if (
      status === 503 ||
      status === 423 ||
      payload?.error === "PLATFORM_SUSPENDED" ||
      payload?.code === "PLATFORM_SUSPENDED"
    ) {
      notifyPlatformSuspended(payload || { error: "PLATFORM_SUSPENDED", message: errorMsg });
    }

    if (status === 403) {
      const isAccountBan =
        payload?.code === "ACCOUNT_BANNED" ||
        payload?.banned === true ||
        errorMsg.toLowerCase().includes("ban") ||
        errorMsg.toLowerCase().includes("bloqueada") ||
        errorMsg.toLowerCase().includes("suspensa") ||
        errorMsg.toLowerCase().includes("desativada");

      if (isAccountBan) {
        session.clear();
        notifyAccountBanned(
          errorMsg.toLowerCase().includes("ban")
            ? errorMsg
            : "Sua conta foi banida por violação das diretrizes."
        );
      }
    }

    throw new ApiError(errorMsg, status, payload);
  }

  return payload;
}

async function imageForm(uri, name, type) {
  const form = new FormData();
  const isAudio =
  type && type.includes("audio") ||
  name && /\.(m4a|mp3|aac|ogg|wav|webm)$/i.test(name) ||
  typeof uri === "string" && /\.(m4a|mp3|aac|ogg|wav|webm)$/i.test(uri);

  const isVideo =
  type && type.includes("video") ||
  name && /\.(mp4|mov|webm)$/i.test(name) ||
  typeof uri === "string" && /\.(mp4|mov)$/i.test(uri);

  const defaultName = isAudio ?
  `audio_${Date.now()}.m4a` :
  isVideo ?
  `video_${Date.now()}.mp4` :
  `upload_${Date.now()}.jpg`;
  const defaultType = isAudio ?
  "audio/m4a" :
  isVideo ?
  "video/mp4" :
  "image/jpeg";

  const filename = name || defaultName;
  const mimeType = type || defaultType;

  if (Platform.OS === "web") {
    try {
      const res = await globalThis.fetch(uri);
      const blob = await res.blob();
      form.append(
        "file",
        new File([blob], filename, { type: blob.type || mimeType })
      );
    } catch (e) {
      form.append("file", { uri, name: filename, type: mimeType });
    }
  } else {
    const cleanUri =
    Platform.OS === "ios" &&
    typeof uri === "string" &&
    uri.startsWith("file://") ?
    uri.replace("file://", "") :
    uri;

    form.append("file", {
      uri: cleanUri,
      name: filename,
      type: mimeType
    });
  }
  return form;
}


export const api = {
  health: () =>
  fetch(`${BASE_URL.replace(/\/api$/, "")}/health`).then((response) =>
  response.json()
  ),
  register: (formData) =>
  request("/register", { method: "POST", body: formData }),
  login: (email, password) =>
  request("/login", { method: "POST", body: { email, password } }),
  loginGoogle: (payload) =>
    request("/auth/google", {
      method: "POST",
      body:
        typeof payload === "object"
          ? payload
          : { idToken: payload, token: payload }
    }),
  me: () => request("/me"),

  auth: {
    verifyEmail: (email, code) =>
    request("/auth/verify-email", {
      method: "POST",
      body: { email, code }
    }),
    resendCode: (email) =>
    request("/auth/resend-code", {
      method: "POST",
      body: { email }
    }),
    google: (payload) =>
      request("/auth/google", {
        method: "POST",
        body:
          typeof payload === "object"
            ? payload
            : { idToken: payload, token: payload }
      })
  },

  users: {
    list: () => request("/users"),
    getUnverified: () => request("/users/unverified"),
    suggestions: () => request("/users/suggestions"),
    usernameAvailability: (username) =>
    request(`/users/username/${encodeURIComponent(username)}/availability`),
    getById: (id) => request(`/users/${id}?t=${Date.now()}`),
    get: (id) => request(`/users/${id}?t=${Date.now()}`),
    update: (id, values) =>
    request(`/users/${id}`, { method: "PUT", body: values }),
    remove: (id) => request(`/users/${id}`, { method: "DELETE" }),
    status: (id, status, reason) =>
    request(`/users/${id}/status`, {
      method: "PUT",
      body: { status, ...(reason ? { reason } : {}) }
    }),
    ban: (id, reason) =>
    request(`/users/${id}/ban`, {
      method: "POST",
      body: reason ? { reason } : {}
    }),
    unban: (id) => request(`/users/${id}/ban`, { method: "DELETE" }),
    blocks: () => request("/users/blocks"),
    block: (id) => request(`/users/${id}/block`, { method: "POST" }),
    unblock: (id) => request(`/users/${id}/block`, { method: "DELETE" }),
    privacy: (is_private) =>
    request("/users/privacy", {
      method: "PATCH",
      body: { is_private }
    }),
    settings: () => request("/users/settings"),
    updateSettings: (values) =>
    request("/users/settings", {
      method: "PATCH",
      body: values
    }),
    follow: (id) => request(`/users/${id}/follow`, { method: "POST" }),
    unfollow: (id) => request(`/users/${id}/follow`, { method: "DELETE" }),
    followRequests: () => request(`/users/follow-requests?t=${Date.now()}`),
    acceptRequest: (id) =>
    request(`/users/requests/${id}/accept`, { method: "POST" }),
    rejectRequest: (id) =>
    request(`/users/requests/${id}/reject`, { method: "POST" }),
    followers: (id) => request(`/users/${id}/followers?t=${Date.now()}`),
    following: (id) => request(`/users/${id}/following?t=${Date.now()}`),
    posts: (id) => request(`/users/${id}/posts?t=${Date.now()}`),
    registerPushToken: ({ token, deviceType } = {}) =>
    request("/users/push-token", {
      method: "POST",
      body: { token, deviceType: deviceType || Platform.OS }
    }),
    removePushToken: ({ token } = {}) =>
    request("/users/push-token", {
      method: "DELETE",
      body: { token }
    }),
    exportData: () => request("/users/export-data"),
    deletionStatus: () => request(`/users/deletion-status?t=${Date.now()}`),
    requestDeletion: (data) =>
      request("/users/me", {
        method: "DELETE",
        body: typeof data === "object" ? data : data ? { password: String(data) } : undefined
      }),
    cancelDeletion: () => request("/users/cancel-deletion", { method: "POST" })
  },
  exportData: () => request("/users/export-data"),
  deletionStatus: () => request(`/users/deletion-status?t=${Date.now()}`),
  requestDeletion: (data) =>
    request("/users/me", {
      method: "DELETE",
      body: typeof data === "object" ? data : data ? { password: String(data) } : undefined
    }),
  cancelDeletion: () => request("/users/cancel-deletion", { method: "POST" }),

  follows: {
    list: (filters) => request(`/follows${queryString(filters)}`),
    get: (id) => request(`/follows/${id}`),
    block: (id) => request(`/users/${id}/block`, { method: "POST" }),
    unblock: (id) => request(`/users/${id}/unblock`, { method: "POST" }),
    blocked: () => request("/users/blocked"),
    remove: (id) => request(`/users/${id}`, { method: "DELETE" })
  },

  posts: {
    list: (filters) => request(`/posts${queryString(filters)}`),
    get: (id) => request(`/posts/${id}`),
    create: (values) => request("/posts", { method: "POST", body: values }),
    update: (id, values) =>
    request(`/posts/${id}`, { method: "PUT", body: values }),
    remove: (id) => request(`/posts/${id}`, { method: "DELETE" }),
    feed: (page = 1) => request(`/posts/feed?page=${page}`),
    repost: (id) => request(`/posts/${id}/reposts`, { method: "POST" }),
    undoRepost: (id) => request(`/posts/${id}/reposts`, { method: "DELETE" }),
    removeRepost: (id) => request(`/posts/${id}/reposts`, { method: "DELETE" }),
    reposts: (id) => request(`/posts/${id}/reposts?t=${Date.now()}`),
    save: (id) => request(`/posts/${id}/save`, { method: "POST" }),
    unsave: (id) => request(`/posts/${id}/save`, { method: "DELETE" }),
    saved: () => request(`/posts/saved?t=${Date.now()}`),
    archived: () => request(`/posts/archived?t=${Date.now()}`),
    restore: (id) => request(`/posts/${id}/restore`, { method: "POST" }),
    download: (id) => request(`/posts/${id}/download`, { method: "POST" })
  },

  groups: {
    create: (data) => request("/groups", { method: "POST", body: data }),
    list: () => request(`/groups?t=${Date.now()}`),
    get: (id) => request(`/groups/${id}?t=${Date.now()}`),
    members: (id) => request(`/groups/${id}/members?t=${Date.now()}`),
    update: (id, data) =>
    request(`/groups/${id}`, { method: "PUT", body: data }),
    remove: (id) => request(`/groups/${id}`, { method: "DELETE" }),
    addMember: (id, targetUserId) =>
    request(`/groups/${id}/add-member`, {
      method: "POST",
      body: { targetUserId, userId: targetUserId }
    }),
    kickMember: (id, userId) =>
    request(`/groups/${id}/members/${userId}`, { method: "DELETE" }),
    leave: (id, newAdminId) =>
    request(`/groups/${id}/leave`, {
      method: "POST",
      body: newAdminId ? { newAdminId } : {}
    }),
    report: (id, reason) =>
    request(`/groups/${id}/report`, { method: "POST", body: { reason } }),
    getFeed: (id) => request(`/groups/${id}/feed?limit=20&t=${Date.now()}`),
    createPost: (id, data) =>
    request(`/groups/${id}/feed`, { method: "POST", body: data }),
    deleteFeedPost: (groupId, postId) =>
    request(`/groups/${groupId}/feed/${postId}`, { method: "DELETE" }),
    likePost: (groupId, postId) =>
    request(`/groups/${groupId}/feed/${postId}/like`, { method: "POST" }),
    unlikePost: (groupId, postId) =>
    request(`/groups/${groupId}/feed/${postId}/like`, { method: "DELETE" }),
    savePost: (groupId, postId) =>
    request(`/groups/${groupId}/feed/${postId}/save`, { method: "POST" }),
    unsavePost: (groupId, postId) =>
    request(`/groups/${groupId}/feed/${postId}/save`, { method: "DELETE" }),
    downloadPostMedia: (groupId, postId) =>
    request(`/groups/${groupId}/feed/${postId}/download`, { method: "POST" }),
    getComments: (groupId, postId) =>
    request(
      `/groups/${groupId}/feed/${postId}/comments?limit=50&t=${Date.now()}`
    ),
    addComment: (groupId, postId, content, audio_url) =>
    request(`/groups/${groupId}/feed/${postId}/comments`, {
      method: "POST",
      body: { content, audio_url }
    }),
    deleteComment: (groupId, postId, commentId) =>
    request(`/groups/${groupId}/feed/${postId}/comments/${commentId}`, {
      method: "DELETE"
    }),
    messages: (groupId, params = {}) =>
    request(`/groups/${groupId}/chat?limit=50&t=${Date.now()}`),
    getMessages: (groupId, params = {}) =>
    request(`/groups/${groupId}/chat?limit=50&t=${Date.now()}`),
    sendMessage: (groupId, data) =>
    request(`/groups/${groupId}/chat`, {
      method: "POST",
      body: typeof data === "object" ? data : { content: data }
    }),
    getChat: (id) => request(`/groups/${id}/chat?limit=50&t=${Date.now()}`),
    sendChatMessage: (
    id,
    content,
    mediaUrl,
    audioUrl,
    storyId,
    mediaType,
    isViewOnce,
    replyToId,
    replyContext) =>

    request(`/groups/${id}/chat`, {
      method: "POST",
      body: {
        content,
        mediaUrl,
        audioUrl,
        storyId,
        mediaType,
        isViewOnce,
        replyToId,
        reply_to_id: replyToId,
        replyContext,
        reply_context: replyContext,
        reply_sender_name: replyContext?.sender_name,
        reply_text: replyContext?.text_content,
        reply_media_type: replyContext?.media_type,
        reply_preview_url: replyContext?.preview_url
      }
    }),
    deleteChatMessage: (groupId, messageId, options = { forEveryone: true }) =>
    request(
      `/groups/${groupId}/chat/${messageId}?forEveryone=${options.forEveryone === true}&type=${options.forEveryone === true ? "everyone" : "me"}`,
      { method: "DELETE", body: options }
    ),
    clearChat: (groupId) =>
    request(`/groups/${groupId}/chat/clear`, { method: "POST" }),
    markMediaViewed: (groupId, messageId) =>
    request(`/groups/${groupId}/chat/${messageId}/view`, { method: "PUT" }),
    expireViewOnce: (groupId, messageId) =>
    request(`/groups/${groupId}/chat/${messageId}/expire`, {
      method: "PUT",
      body: { is_expired: true, is_opened: true }
    }),
    getTrends: (id, forceRefresh = false) =>
    request(
      `/groups/${id}/trends${forceRefresh ? "?forceRefresh=true" : ""}`
    ),
    banMember: (groupId, userId, reason) =>
    request(`/groups/${groupId}/ban/${userId}`, {
      method: "POST",
      body: { reason }
    }),
    unbanMember: (groupId, userId) =>
    request(`/groups/${groupId}/unban/${userId}`, { method: "POST" }),
    listBanned: (groupId) =>
    request(`/groups/${groupId}/banned?t=${Date.now()}`),
    getBannedMembers: (groupId) =>
    request(`/groups/${groupId}/banned?t=${Date.now()}`),
    toggleMute: (groupId, muted) =>
    request(`/groups/${groupId}/mute`, { method: "POST", body: { muted } }),
    getNotificationSettings: (groupId) =>
    request(`/groups/${groupId}/notification-settings?t=${Date.now()}`)
  },

  trends: {
    getTrends: () => request("/trends?t=" + Date.now()),
    getYoutubeNews: () =>
    request("/youtube-news?t=" + Date.now(), { method: "GET" })
  },

  stories: {
    create: (formData) =>
    request("/stories", { method: "POST", body: formData }),
    list: () => request("/stories"),
    getByUser: (userId) => request(`/stories/user/${userId}`),
    updateCaption: (id, caption) =>
    request(`/stories/${id}`, { method: "PATCH", body: { caption } }),
    delete: (id) => request(`/stories/${id}`, { method: "DELETE" }),
    like: (id) => request(`/stories/${id}/like`, { method: "POST" }),
    unlike: (id) => request(`/stories/${id}/like`, { method: "DELETE" }),
    view: (id) => request(`/stories/${id}/view`, { method: "POST" }),
    send: (id, receiverId) =>
    request("/messages", {
      method: "POST",
      body: {
        receiver_id: receiverId,
        story_id: id
      }
    })
  },

  comments: {
    list: (filters) => {
      const params =
      typeof filters === "string" ? { postId: filters } : filters || {};
      return request(`/comments${queryString(params)}`);
    },
    get: (id) => request(`/comments/${id}`),
    create: (values) => request("/comments", { method: "POST", body: values }),
    update: (id, values) =>
    request(`/comments/${id}`, { method: "PUT", body: values }),
    remove: (id) => request(`/comments/${id}`, { method: "DELETE" }),
    delete: (id) => request(`/comments/${id}`, { method: "DELETE" })
  },

  likes: {
    list: (filters) => request(`/likes${queryString(filters)}`),
    get: (id) => request(`/likes/${id}`),
    create: (values) => request("/likes", { method: "POST", body: values }),
    update: (id, values) =>
    request(`/likes/${id}`, { method: "PUT", body: values }),
    remove: (id) => request(`/likes/${id}`, { method: "DELETE" })
  },

  messages: {
    send: ({
      receiver_id,
      receiverId,
      content,
      media_url,
      mediaUrl,
      audio_url,
      audioUrl,
      story_id,
      storyId,
      conversation,
      media_type,
      mediaType,
      is_view_once,
      isViewOnce
    } = {}) => {
      const targetReceiverId = receiver_id || receiverId;
      const targetStoryId = story_id || storyId;
      const targetAudioUrl = audio_url || audioUrl;
      const targetMediaUrl = media_url || mediaUrl;
      const targetMediaType = media_type || mediaType;
      const targetIsViewOnce = Boolean(is_view_once || isViewOnce);

      const body = {
        receiver_id: targetReceiverId
      };

      if (
      content !== undefined &&
      content !== null &&
      String(content).trim() !== "")
      {
        body.content = String(content).trim();
      } else if (
      !targetStoryId &&
      !targetAudioUrl &&
      !targetMediaUrl &&
      content !== undefined)
      {
        body.content = String(content);
      }

      if (targetStoryId) {
        body.story_id = targetStoryId;
      }
      if (targetAudioUrl) {
        body.audio_url = targetAudioUrl;
      }
      if (targetMediaUrl) {
        body.media_url = targetMediaUrl;
      }
      if (targetMediaType) {
        body.media_type = targetMediaType;
      }
      if (targetIsViewOnce) {
        body.is_view_once = true;
      }
      if (conversation) {
        body.conversation = conversation;
      }

      return request("/messages", {
        method: "POST",
        body
      });
    },
    conversations: () => request("/messages/conversations"),
    getHistory: (userId) => request(`/messages/${userId}`),
    markRead: (id) => request(`/messages/${id}/read`, { method: "PATCH" }),
    markConversationRead: (senderId) =>
      request("/messages/read", { method: "PATCH", body: { senderId } }),
    markViewed: (id) => request(`/messages/${id}/view`, { method: "PUT" }),
    delete: (id, options = { forEveryone: true }) =>
      request(`/messages/${id}`, { method: "DELETE", body: options }),

    list: () => request("/messages"),
    conversation: (conversation) =>
    request(`/messages/conversation/${encodeURIComponent(conversation)}`),
    get: (id) => request(`/messages/${id}`),
    create: (conversationOrData, content) =>
    typeof conversationOrData === "object" ?
    request("/messages", { method: "POST", body: conversationOrData }) :
    request("/messages", {
      method: "POST",
      body: { conversation: conversationOrData, content }
    }),
    update: (id, content) =>
    request(`/messages/${id}`, { method: "PUT", body: { content } }),
    remove: (id, options = { forEveryone: true }) =>
    request(`/messages/${id}`, { method: "DELETE", body: options })
  },

  notifications: {
    list: () => request("/notifications"),
    get: (id) => request(`/notifications/${id}`),
    create: (message) =>
    request("/notifications", { method: "POST", body: { message } }),
    update: (id, isRead) =>
    request(`/notifications/${id}`, { method: "PUT", body: { isRead } }),
    remove: (id) => request(`/notifications/${id}`, { method: "DELETE" })
  },

  uploads: {
    photo: async (uri, name, type) =>
    request("/uploads/photos", {
      method: "POST",
      body: await imageForm(uri, name, type)
    }),
    video: async (uri, name = "upload.mp4", type = "video/mp4") =>
    request("/uploads/videos", {
      method: "POST",
      body: await imageForm(uri, name, type)
    }),
    audio: async (uri, name = "audio.m4a", type = "audio/m4a") =>
    request("/uploads/audios", {
      method: "POST",
      body: await imageForm(uri, name, type)
    }),
    file: async (uri, name, type) =>
    request("/uploads/photos", {
      method: "POST",
      body: await imageForm(uri, name, type)
    }),
    media: async (uri, type = "photo") => {
      if (
      type === "audio" ||
      typeof uri === "string" && (
      uri.endsWith(".m4a") ||
      uri.endsWith(".mp3") ||
      uri.endsWith(".aac")))
      {
        return request("/uploads/audios", {
          method: "POST",
          body: await imageForm(uri, "audio.m4a", "audio/m4a")
        });
      }
      if (
      type === "video" ||
      typeof uri === "string" && (
      uri.endsWith(".mp4") || uri.endsWith(".mov")))
      {
        return request("/uploads/videos", {
          method: "POST",
          body: await imageForm(uri, "video.mp4", "video/mp4")
        });
      }
      return request("/uploads/photos", {
        method: "POST",
        body: await imageForm(uri, "photo.jpg", "image/jpeg")
      });
    }
  },

  calls: {
    list: () => request("/calls"),
    get: (id) => request(`/calls/${id}`),
    create: (roomId) => request("/calls", { method: "POST", body: { roomId } }),
    update: (id, roomId) =>
    request(`/calls/${id}`, { method: "PUT", body: { roomId } }),
    end: (id) => request(`/calls/${id}/end`, { method: "PUT" }),
    remove: (id) => request(`/calls/${id}`, { method: "DELETE" })
  },

  reports: {
    list: () => request("/reports"),
    get: (id) => request(`/reports/${id}`),
    create: (reason, targetType, targetId) =>
    request("/reports", {
      method: "POST",
      body: { reason, targetType, targetId }
    }),
    resolve: (id) =>
    request(`/reports/${id}`, {
      method: "PUT",
      body: { status: "resolved" }
    }),
    update: (id, values) =>
    request(`/reports/${id}`, {
      method: "PUT",
      body: typeof values === "string" ? { reason: values } : values
    }),
    remove: (id) => request(`/reports/${id}`, { method: "DELETE" })
  },

  app: {
    version: () => request("/app/version"),
    settings: () => request("/app/settings")
  },

  feedback: {
    send: (values) =>
    request("/feedback", {
      method: "POST",
      body: typeof values === "string" ? { message: values } : values
    })
  },

  reels: {
    categories: () => request("/reels/categories"),
    preferences: () => request("/reels/preferences"),
    savePreferences: (payload) => {
      const body = typeof payload === "string" 
        ? { customPrompt: payload } 
        : Array.isArray(payload) 
        ? { selectedCategories: payload } 
        : payload;
      return request("/reels/preferences", {
        method: "POST",
        body
      });
    },
    feed: (params = {}) => {
      const query = new URLSearchParams();
      if (params.limit) query.set("limit", params.limit);
      if (params.excludeIds) {
        query.set("excludeIds", Array.isArray(params.excludeIds) ? params.excludeIds.join(",") : params.excludeIds);
      }
      if (params.reset) query.set("reset", "true");
      const qs = query.toString();
      return request(`/reels/feed${qs ? `?${qs}` : ""}`);
    },
    like: (videoId, category) =>
    request(`/reels/${videoId}/like`, {
      method: "POST",
      body: { category }
    }),
    moreLikeThis: (videoId, category) =>
    request(`/reels/${videoId}/more-like-this`, {
      method: "POST",
      body: { category }
    }),
    notInterested: (videoId, category) =>
    request(`/reels/${videoId}/not-interested`, {
      method: "POST",
      body: { category }
    })
  },

  upload: {
    photo: async (uri, name, type) =>
    request("/uploads/photos", {
      method: "POST",
      body: await imageForm(uri, name, type)
    }),
    video: async (uri, name = "upload.mp4", type = "video/mp4") =>
    request("/uploads/videos", {
      method: "POST",
      body: await imageForm(uri, name, type)
    }),
    audio: async (uri, name = "audio.m4a", type = "audio/m4a") =>
    request("/uploads/audios", {
      method: "POST",
      body: await imageForm(uri, name, type)
    }),
    media: async (uri, type = "photo") =>
    type === "audio" ||
    typeof uri === "string" && (
    uri.endsWith(".m4a") || uri.endsWith(".mp3")) ?
    request("/uploads/audios", {
      method: "POST",
      body: await imageForm(uri, "audio.m4a", "audio/m4a")
    }) :
    request("/uploads/photos", {
      method: "POST",
      body: await imageForm(uri, "photo.jpg", "image/jpeg")
    })
  },
  stickers: {
    create: (formData) =>
    request("/stickers/video", { method: "POST", body: formData }),
    listMyInventory: (pack) =>
    request(
      `/stickers/my-inventory${pack ? `?pack=${encodeURIComponent(pack)}&` : "?"}t=${Date.now()}`
    ),
    favorite: (stickerId) =>
    request(`/stickers/${stickerId}/favorite`, { method: "POST" }),
    unfavorite: (stickerId) =>
    request(`/stickers/${stickerId}/favorite`, { method: "DELETE" }),
    get: (id) => request(`/stickers/${id}`)
  },

  tracks: {
    list: (query = "") =>
      request(`/users/me/tracks${query ? `?query=${encodeURIComponent(query)}` : ""}`),
    upload: async ({ uri, name, type, title, artist, duration }) => {
      const form = new FormData();
      const cleanUri =
        Platform.OS === "ios" && typeof uri === "string" && uri.startsWith("file://")
          ? uri.replace("file://", "")
          : uri;

      form.append("file", {
        uri: cleanUri,
        name: name || "audio.mp3",
        type: type || "audio/mpeg"
      });
      if (title) form.append("title", title);
      if (artist) form.append("artist", artist);
      if (duration) form.append("duration", String(duration));

      return request("/users/me/tracks", {
        method: "POST",
        body: form
      });
    },
    remove: (id) => request(`/users/me/tracks/${id}`, { method: "DELETE" }),
    getGroupQueue: (groupId) => request(`/groups/${groupId}/queue`)
  },

  onBan: onAccountBanned,
  onPlatformSuspended: onPlatformSuspended
};

export function asList(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys)
  if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}

export function getUploadUrl(payload) {
  const url = (
    payload?.url ||
    payload?.audio_url ||
    payload?.audioUrl ||
    payload?.avatar_url ||
    payload?.avatarUrl ||
    payload?.fileUrl ||
    payload?.file_url ||
    payload?.imageUrl ||
    payload?.image_url ||
    payload?.videoUrl ||
    payload?.video_url ||
    payload?.user?.avatar_url ||
    payload?.user?.avatarUrl ||
    payload?.user?.avatar ||
    payload?.data?.url ||
    payload?.data?.audio_url ||
    payload?.data?.audioUrl ||
    payload?.data?.avatar_url ||
    payload?.data?.avatarUrl
  );

  if (!url || typeof url !== "string") return url;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("file://")
  ) {
    return url;
  }

  const root = BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  return `${root}${url.startsWith("/") ? "" : "/"}${url}`;
}
export { request };

