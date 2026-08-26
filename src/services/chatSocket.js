import { io } from "socket.io-client";
import { Platform } from "react-native";

function resolveSocketUrl() {
  if (
  !process.env.EXPO_PUBLIC_API_URL && Platform.OS === "web" &&
  typeof window !== "undefined" &&
  window.location?.hostname)
  {
    return 'http://' + window.location.hostname + ':3000';
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
  return "http://192.168.18.19:3000";
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