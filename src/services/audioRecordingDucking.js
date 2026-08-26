import { useEffect, useRef } from "react";
import { Dimensions } from "react-native";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";

const recordingListeners = new Set();
const scrollListeners = new Set();
let isRecordingActive = false;

/**
 * Define se a gravação de áudio de voz está ativa
 */
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

/**
 * Notifica os stickers visíveis quando a lista de mensagens sofre rolagem (Scroll)
 */
let lastScrollNotify = 0;
export function notifyChatScroll() {
  const now = Date.now();
  if (now - lastScrollNotify < 16) return; // ~60fps throttle
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

/**
 * Configuração global do modo de áudio permitindo gravação e reprodução simultâneas sem interrupção (MixWithOthers / DuckOthers)
 */
export async function setOptimizedAudioMode(forRecording = false) {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: Boolean(forRecording),
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
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
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    console.warn("Aviso ao configurar modo de áudio ao vivo:", e?.message);
  }
}

export async function initGlobalAudioMode() {
  return setOptimizedAudioMode(false);
}

/**
 * Hook de Áudio Espacial e Ducking Suave para Figurinhas de Vídeo
 * - Loop Contínuo: reprodução contínua e infinita (player.loop = true, player.play()).
 * - NUNCA PAUSA: ao gravar áudio, o vídeo e a fala continuam rodando sem travamento.
 * - Proximidade do Centro: volume máximo (1.0) no centro da tela, fade out suave nas bordas e 0 fora da tela.
 * - Ducking na Gravação: volume multiplicado por 0.18 quando gravando voz.
 * - Equação: volume = proximityFactor * (isRecording ? 0.18 : 1.0)
 */
export function useStickerSpatialAudio(player, containerRef) {
  const proximityRef = useRef(1.0);
  const isRecordingRef = useRef(isRecordingActive);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const updatePlayerVolume = () => {
    if (!player || !isMountedRef.current) return;
    const recordingFactor = isRecordingRef.current ? 0.18 : 1.0;
    const targetVolume = proximityRef.current * recordingFactor;

    try {
      if (player.loop !== true) player.loop = true;

      if (targetVolume <= 0.005) {
        player.volume = 0;
        player.muted = true;
      } else {
        player.muted = false;
        player.volume = Math.min(1.0, Math.max(0.01, targetVolume));
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
        const cardCenterY = y + height / 2;
        const distanceFromCenter = Math.abs(cardCenterY - screenCenterY);
        const maxDistance = screenHeight * 0.45;

        let proximityFactor = 0;
        // Se estiver dentro da área visível vertical da tela
        if (y + height > 0 && y < screenHeight) {
          proximityFactor = Math.max(0, 1 - distanceFromCenter / maxDistance);
          // Curva suave de aproximação
          proximityFactor = Math.pow(proximityFactor, 2);
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

    // 1. Garante reprodução contínua em loop infinito sem pausa
    try {
      player.loop = true;
      Promise.resolve(player.play()).catch(() => {});
    } catch (e) {}

    // 2. Medições iniciais
    measureAndApply();
    const t1 = setTimeout(measureAndApply, 100);
    const t2 = setTimeout(measureAndApply, 350);

    // 3. Ouvir rolagem do chat para recalcular áudio espacial
    const unsubscribeScroll = subscribeChatScroll(() => {
      measureAndApply();
    });

    // 4. Ouvir gravação de áudio para aplicar ducking gradual sem pausar o player
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
