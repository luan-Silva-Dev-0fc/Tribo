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
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const updatePlayerVolume = () => {
    if (!player || !isMountedRef.current) return;

    // Se o player estiver explicitamente mutado (após a 1ª reprodução ou clique do usuário), preserva o mudo
    if (player._triboMuted || player.muted === true) {
      try {
        player.volume = 0;
        player.muted = true;
      } catch (e) {}
      return;
    }

    const recordingFactor = isRecordingRef.current ? 0.18 : 1.0;
    const targetVolume = proximityRef.current * recordingFactor;

    try {
      if (player.loop !== true) player.loop = true;

      if (targetVolume <= 0.01) {
        player.volume = 0;
        player.muted = true;
        try {
          player.pause();
        } catch (e) {}
      } else {
        player.muted = false;
        player.volume = Math.min(1.0, Math.max(0.01, targetVolume));
        try {
          if (!player.playing) {
            Promise.resolve(player.play()).catch(() => {});
          }
        } catch (e) {}
      }
    } catch (e) {}
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
        if (typeof y !== "number" || isNaN(y)) return;

        const screenHeight = Dimensions.get("window").height;
        const screenCenterY = screenHeight / 2;
        const cardCenterY = y + (height || 0) / 2;
        const distanceFromCenter = Math.abs(cardCenterY - screenCenterY);
        const maxDistance = screenHeight * 0.42;

        let proximityFactor = 0;

        if (y + (height || 0) > 0 && y < screenHeight) {
          const rawProximity = Math.max(0, 1 - distanceFromCenter / maxDistance);
          proximityFactor = Math.pow(rawProximity, 1.8);
        }

        proximityRef.current = proximityFactor;
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
      player.loop = true;
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
      try {
        player.loop = true;
        Promise.resolve(player.play()).catch(() => {});
      } catch (e) {}
    });

    return () => {
      isMountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
      if (intervalRef.current) clearInterval(intervalRef.current);
      unsubscribeScroll();
      unsubscribeRecording();
    };
  }, [player, containerRef]);
}