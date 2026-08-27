import { NativeModules, Platform } from "react-native";

const { TriboNativeModule } = NativeModules;

export const NativeOptimization = {
  isAvailable: Boolean(TriboNativeModule),

  async getPerformanceInfo() {
    if (!TriboNativeModule?.getPerformanceInfo) {
      return {
        totalRamMB: 0,
        availRamMB: 0,
        isLowRamDevice: false,
        cpuCores: 4,
        refreshRate: 60,
        deviceModel: Platform.OS,
        sdkVersion: 0
      };
    }
    try {
      return await TriboNativeModule.getPerformanceInfo();
    } catch (e) {
      return null;
    }
  },

  async enableHighRefreshRate() {
    if (!TriboNativeModule?.enableHighRefreshRate) return 60;
    try {
      return await TriboNativeModule.enableHighRefreshRate();
    } catch (e) {
      return 60;
    }
  },

  async clearNativeCache() {
    if (!TriboNativeModule?.clearNativeCache) {
      return { success: false, freedMB: 0 };
    }
    try {
      return await TriboNativeModule.clearNativeCache();
    } catch (e) {
      return { success: false, freedMB: 0 };
    }
  },

  async enableScreenSecurity() {
    if (!TriboNativeModule?.enableScreenSecurity || Platform.OS !== "android") return false;
    try {
      return await TriboNativeModule.enableScreenSecurity();
    } catch (e) {
      return false;
    }
  },

  async disableScreenSecurity() {
    if (!TriboNativeModule?.disableScreenSecurity || Platform.OS !== "android") return false;
    try {
      return await TriboNativeModule.disableScreenSecurity();
    } catch (e) {
      return false;
    }
  },

  async getVideoDuration(uri) {
    if (!uri) return null;
    if (TriboNativeModule?.getVideoDuration && Platform.OS === "android") {
      try {
        return await TriboNativeModule.getVideoDuration(uri);
      } catch (e) {}
    }
    return null;
  },

  async trimVideo(sourceUri, startSec, endSec) {
    if (!sourceUri) return null;
    if (TriboNativeModule?.trimVideo && Platform.OS === "android") {
      try {
        return await TriboNativeModule.trimVideo(sourceUri, Number(startSec) || 0, Number(endSec) || 60);
      } catch (e) {
        console.warn("[NativeOptimization] trimVideo fallback:", e?.message);
      }
    }
    return { uri: sourceUri, duration: Math.max(1, (endSec || 60) - (startSec || 0)) };
  },

  async fastFetch(url, method = "GET", headers = {}, body = null) {
    if (!TriboNativeModule?.fastFetch || Platform.OS !== "android") {
      return null;
    }
    try {
      const bodyStr = body ? (typeof body === "string" ? body : JSON.stringify(body)) : null;
      const res = await TriboNativeModule.fastFetch(url, method, headers, bodyStr);
      if (res && typeof res.status === "number") {
        let parsed = null;
        try {
          parsed = res.data ? JSON.parse(res.data) : null;
        } catch (_) {
          parsed = res.data;
        }
        return {
          status: res.status,
          ok: res.ok,
          data: parsed
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  async prefetch(urls = []) {
    if (!TriboNativeModule?.prefetchUrls || !Array.isArray(urls) || urls.length === 0) return;
    try {
      await TriboNativeModule.prefetchUrls(urls);
    } catch (_) {}
  },

  async prefetchReels(videoIds = []) {
    if (!TriboNativeModule?.prefetchReelsMedia || !Array.isArray(videoIds) || videoIds.length === 0) return;
    try {
      await TriboNativeModule.prefetchReelsMedia(videoIds);
    } catch (_) {}
  }
};
