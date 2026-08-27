import { io } from "socket.io-client";
import { Platform } from "react-native";

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
    socketInstance = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: true
    });
  }
  return socketInstance;
}