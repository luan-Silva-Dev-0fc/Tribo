import { Platform } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";




class LiveVoiceStreamer {
  constructor() {
    this.isStreaming = false;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.nativeRecordingLoop = null;
  }




  async startStreaming({ groupId, user, socket, onChunkSent, onError }) {
    if (this.isStreaming) return;
    this.isStreaming = true;

    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.mediaDevices) {

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        this.mediaStream = stream;

        let options = { mimeType: "audio/webm;codecs=opus" };
        if (typeof window !== "undefined" && !window.MediaRecorder?.isTypeSupported?.(options.mimeType)) {
          options = { mimeType: "audio/webm" };
          if (!window.MediaRecorder?.isTypeSupported?.(options.mimeType)) {
            options = {};
          }
        }

        const recorder = new MediaRecorder(stream, options);
        this.mediaRecorder = recorder;

        recorder.ondataavailable = async (event) => {
          if (!this.isStreaming) return;
          if (event.data && event.data.size > 0) {
            try {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64Data = reader.result;
                if (socket && this.isStreaming) {
                  socket.emit("group-live-voice-chunk", {
                    room: groupId,
                    user,
                    audioBase64: base64Data,
                    mimeType: event.data.type || "audio/webm",
                    timestamp: Date.now()
                  });
                  onChunkSent?.();
                }
              };
              reader.readAsDataURL(event.data);
            } catch (readErr) {
              console.warn("[LIVE VOICE STREAMER] Erro ao converter chunk:", readErr);
            }
          }
        };


        recorder.start(600);
        console.log("[LIVE VOICE STREAMER] Transmissão Web iniciada com chunks a cada 600ms.");
      } else {

        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true
        });

        const recordChunkLoop = async () => {
          if (!this.isStreaming) return;
          try {
            const recording = new Audio.Recording();
            await recording.prepareToRecordAsync({
              android: {
                extension: ".m4a",
                outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                audioEncoder: Audio.AndroidAudioEncoder.AAC,
                sampleRate: 22050,
                numberOfChannels: 1,
                bitRate: 32000
              },
              ios: {
                extension: ".m4a",
                audioQuality: Audio.IOSAudioQuality.LOW,
                sampleRate: 22050,
                numberOfChannels: 1,
                bitRate: 32000,
                linearPCMBitDepth: 16,
                linearPCMIsBigEndian: false,
                linearPCMIsFloat: false
              },
              web: {}
            });

            await recording.startAsync();
            await new Promise((res) => setTimeout(res, 800));

            if (!this.isStreaming) {
              await recording.stopAndUnloadAsync().catch(() => {});
              return;
            }

            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            if (uri && this.isStreaming) {
              const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64
              });
              if (socket && base64) {
                socket.emit("group-live-voice-chunk", {
                  room: groupId,
                  user,
                  audioBase64: "data:audio/m4a;base64," + base64,
                  mimeType: "audio/m4a",
                  timestamp: Date.now()
                });
                onChunkSent?.();
              }
              FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
            }
          } catch (loopErr) {
            console.warn("[LIVE VOICE STREAMER MOBILE] Erro no chunk nativo:", loopErr?.message);
          }

          if (this.isStreaming) {
            this.nativeRecordingLoop = setTimeout(recordChunkLoop, 100);
          }
        };

        recordChunkLoop();
      }
    } catch (err) {
      console.error("[LIVE VOICE STREAMER] Erro ao iniciar microfone:", err);
      this.stopStreaming();
      onError?.(err);
    }
  }




  stopStreaming() {
    this.isStreaming = false;

    if (this.nativeRecordingLoop) {
      clearTimeout(this.nativeRecordingLoop);
      this.nativeRecordingLoop = null;
    }

    if (this.mediaRecorder) {
      try {
        if (this.mediaRecorder.state !== "inactive") {
          this.mediaRecorder.stop();
        }
      } catch (e) {}
      this.mediaRecorder = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.mediaStream = null;
    }

    console.log("[LIVE VOICE STREAMER] Transmissão de microfone encerrada.");
  }




  async playChunk(payload, currentUserId) {
    if (!payload?.audioBase64) return;

    if (currentUserId && String(payload.user?.id) === String(currentUserId)) {
      return;
    }

    try {
      const soundUri = payload.audioBase64.startsWith("data:") ?
      payload.audioBase64 :
      "data:" + (payload.mimeType || "audio/webm") + ";base64," + payload.audioBase64;

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const audioEl = new window.Audio(soundUri);
        audioEl.volume = 1.0;
        audioEl.play().catch(() => {});
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: soundUri },
          { shouldPlay: true, volume: 1.0 }
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
          }
        });
      }
    } catch (e) {

    }
  }
}

export const liveVoiceStreamer = new LiveVoiceStreamer();