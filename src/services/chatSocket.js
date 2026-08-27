import { io } from "socket.io-client";
import { Platform } from "react-native";
import { NativeOptimization } from "./nativeOptimization";

function resolveSocketUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
  return "https://tribo-api-production-2f6f.up.railway.app";
}

let socketInstance = null;

export function getChatSocket() {
  if (!socketInstance) {
    const url = resolveSocketUrl();
    try {
      NativeOptimization.prefetch([url]);
    } catch (_) {}

    socketInstance = io(url, {
      transports: ["websocket"],
      upgrade: false,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      timeout: 8000
    });
  }
  return socketInstance;
}