import { useEffect, useRef } from "react";
import { Dimensions } from "react-native";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";

const recordingListeners = new Set();
const scrollListeners = new Set();
let isRecordingActive = false;

export function setAudioRecordingActive(active) {
  const nextVal = Boolean(active);
  if (isRecordingActive === nextVal) return;
  isRecordingActive = nextVal;
  recordingListeners.forEach((listener) => {
    try {
      listener(isRecordingActive);
    } catch (e) {}
  });
}

export function getAudioRecordingActive() {
  return isRecordingActive;
}

export function subscribeAudioRecording(listener) {
  recordingListeners.add(listener);
  try {
    listener(isRecordingActive);
  } catch (e) {}
  return () => {
    recordingListeners.delete(listener);
  };
}

let lastScrollNotify = 0;
export function notifyChatScroll() {
  const now = Date.now();
  if (now - lastScrollNotify < 16) return;
  lastScrollNotify = now;
  scrollListeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {}
  });
}

export function subscribeChatScroll(listener) {
  scrollListeners.add(listener);
  return () => {
    scrollListeners.delete(listener);
  };
}

export async function setOptimizedAudioMode(forRecording = false) {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: Boolean(forRecording),
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false
    });
  } catch (e) {
    console.warn("Aviso ao configurar modo de áudio:", e?.message);
  }
}

export async function setLiveVoiceAudioMode(active = true) {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: Boolean(active),
      playsInSilentModeIOS: true,
      staysActiveInBackground: Boolean(active),
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false
    });
  } catch (e) {
    console.warn("Aviso ao configurar modo de áudio ao vivo:", e?.message);
  }
}

export async function initGlobalAudioMode() {
  return setOptimizedAudioMode(false);
}

export function useStickerSpatialAudio(player, containerRef) {
  const proximityRef = useRef(1.0);
  const isRecordingRef = useRef(isRecordingActive);
  const isMountedRef = useRef(true);
  const currentVolumeRef = useRef(1.0);
  const targetVolumeRef = useRef(1.0);
  const lerpAnimationRef = useRef(null);

  const applyVolumeWithSmoothing = (target) => {
    if (!player || !isMountedRef.current) return;

    if (player._triboMuted || player.muted === true) {
      try {
        player.volume = 0;
        player.muted = true;
      } catch (e) {}
      if (lerpAnimationRef.current) {
        cancelAnimationFrame(lerpAnimationRef.current);
        lerpAnimationRef.current = null;
      }
      return;
    }

    targetVolumeRef.current = target;

    if (lerpAnimationRef.current) return;

    const step = () => {
      if (!player || !isMountedRef.current) {
        lerpAnimationRef.current = null;
        return;
      }

      if (player._triboMuted || player.muted === true) {
        try {
          player.volume = 0;
          player.muted = true;
        } catch (e) {}
        lerpAnimationRef.current = null;
        return;
      }

      const diff = targetVolumeRef.current - currentVolumeRef.current;
      if (Math.abs(diff) < 0.008) {
        currentVolumeRef.current = targetVolumeRef.current;
        const v = currentVolumeRef.current;
        try {
          if (v <= 0.015) {
            player.volume = 0;
            player.muted = true;
          } else {
            player.muted = false;
            player.volume = Math.min(1.0, Math.max(0.01, v));
          }
        } catch (e) {}
        lerpAnimationRef.current = null;
        return;
      }

      currentVolumeRef.current += diff * 0.28;
      const v = currentVolumeRef.current;
      try {
        if (v <= 0.015) {
          player.volume = 0;
          player.muted = true;
        } else {
          player.muted = false;
          player.volume = Math.min(1.0, Math.max(0.01, v));
        }
      } catch (e) {}

      lerpAnimationRef.current = requestAnimationFrame(step);
    };

    lerpAnimationRef.current = requestAnimationFrame(step);
  };

  const updatePlayerVolume = () => {
    if (!player || !isMountedRef.current) return;

    if (player._triboMuted || player.muted === true) {
      try {
        player.volume = 0;
        player.muted = true;
      } catch (e) {}
      return;
    }

    const recordingFactor = isRecordingRef.current ? 0.18 : 1.0;
    const target = Math.max(0, Math.min(1.0, proximityRef.current * recordingFactor));
    applyVolumeWithSmoothing(target);
  };

  const measureAndApply = () => {
    if (!isMountedRef.current) return;
    if (!containerRef?.current) {
      proximityRef.current = 1.0;
      updatePlayerVolume();
      return;
    }

    try {
      containerRef.current.measureInWindow((x, y, width, height) => {
        if (!isMountedRef.current) return;
        if (typeof y !== "number" || isNaN(y)) {
          proximityRef.current = 1.0;
          updatePlayerVolume();
          return;
        }

        const screenHeight = Dimensions.get("window").height;
        const stickerHeight = height || 190;
        const cardCenterY = y + stickerHeight / 2;

        if (y + stickerHeight <= 0 || y >= screenHeight) {
          proximityRef.current = 0;
          updatePlayerVolume();
          return;
        }

        const screenCenterY = screenHeight / 2;
        const distanceFromCenter = Math.abs(cardCenterY - screenCenterY);

        const fullZone = screenHeight * 0.10;
        const maxZone = screenHeight * 0.56;

        let factor = 1.0;
        if (distanceFromCenter <= fullZone) {
          factor = 1.0;
        } else if (distanceFromCenter >= maxZone) {
          factor = 0.0;
        } else {
          const t = (distanceFromCenter - fullZone) / (maxZone - fullZone);
          factor = 0.5 * (1 + Math.cos(t * Math.PI));
        }

        proximityRef.current = Math.round(factor * 1000) / 1000;
        updatePlayerVolume();
      });
    } catch (e) {
      if (isMountedRef.current) {
        proximityRef.current = 1.0;
        updatePlayerVolume();
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (!player) return;

    try {
      Promise.resolve(player.play()).catch(() => {});
    } catch (e) {}

    measureAndApply();
    const t1 = setTimeout(measureAndApply, 100);
    const t2 = setTimeout(measureAndApply, 350);

    const unsubscribeScroll = subscribeChatScroll(() => {
      measureAndApply();
    });

    const unsubscribeRecording = subscribeAudioRecording((isRec) => {
      if (!isMountedRef.current) return;
      isRecordingRef.current = isRec;
      updatePlayerVolume();
    });

    return () => {
      isMountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
      if (lerpAnimationRef.current) {
        cancelAnimationFrame(lerpAnimationRef.current);
        lerpAnimationRef.current = null;
      }
      unsubscribeScroll();
      unsubscribeRecording();
    };
  }, [player, containerRef]);
}