import { Platform } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

const RECORDING_OPTIONS_HQ = {
  android: {
    extension: ".m4a",
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000
  },
  ios: {
    extension: ".m4a",
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false
  },
  web: {}
};

class LiveVoiceStreamer {
  constructor() {
    this.isStreaming = false;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.nativeRecordingTimer = null;
    this.activeRecorder = null;
    this.nextRecorder = null;
    this.sequence = 0;

    // Playback Queue (Jitter Buffer)
    this.playbackQueue = [];
    this.isPlayingQueue = false;
    this.currentSound = null;
  }

  async startStreaming({ groupId, user, socket, onChunkSent, onError }) {
    if (this.isStreaming) return;
    this.isStreaming = true;
    this.sequence = 0;

    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          }
        });
        this.mediaStream = stream;

        let options = { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 64000 };
        if (typeof window !== "undefined" && !window.MediaRecorder?.isTypeSupported?.(options.mimeType)) {
          options = { mimeType: "audio/webm", audioBitsPerSecond: 64000 };
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
                if (socket && this.isStreaming && base64Data) {
                  socket.emit("group-live-voice-chunk", {
                    room: groupId,
                    groupId,
                    user,
                    audioBase64: base64Data,
                    mimeType: event.data.type || "audio/webm",
                    sequence: this.sequence++,
                    timestamp: Date.now()
                  });
                  onChunkSent?.();
                }
              };
              reader.readAsDataURL(event.data);
            } catch (readErr) {
              console.warn("[LIVE VOICE STREAMER] Erro ao converter chunk web:", readErr);
            }
          }
        };

        recorder.start(750);
        console.log("[LIVE VOICE STREAMER] Transmissão Web HQ iniciada.");
      } else {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false
        });

        // Ping-pong recording to eliminate any gap between chunks
        const createAndPrepare = async () => {
          const rec = new Audio.Recording();
          await rec.prepareToRecordAsync(RECORDING_OPTIONS_HQ);
          return rec;
        };

        // Start first recorder
        this.activeRecorder = await createAndPrepare();
        await this.activeRecorder.startAsync();

        // Pre-prepare next recorder in background
        createAndPrepare()
          .then((next) => {
            if (this.isStreaming) {
              this.nextRecorder = next;
            } else {
              next.stopAndUnloadAsync().catch(() => {});
            }
          })
          .catch(() => {});

        const pingPongLoop = async () => {
          if (!this.isStreaming) return;

          try {
            // 1. Ensure next recorder is ready before switching
            let next = this.nextRecorder;
            if (!next) {
              next = await createAndPrepare();
            }

            // 2. Start next recorder IMMEDIATELY (0ms gap!)
            await next.startAsync();
            const prevRecorder = this.activeRecorder;
            this.activeRecorder = next;
            this.nextRecorder = null;

            // 3. Immediately prepare the next recorder in background for the next cycle
            createAndPrepare()
              .then((readyRec) => {
                if (this.isStreaming) {
                  this.nextRecorder = readyRec;
                } else {
                  readyRec.stopAndUnloadAsync().catch(() => {});
                }
              })
              .catch(() => {});

            // 4. Stop and extract audio from the finished recorder
            if (prevRecorder) {
              (async () => {
                try {
                  await prevRecorder.stopAndUnloadAsync();
                  const uri = prevRecorder.getURI();
                  if (uri && this.isStreaming) {
                    const base64 = await FileSystem.readAsStringAsync(uri, {
                      encoding: FileSystem.EncodingType.Base64
                    });
                    if (socket && base64 && this.isStreaming) {
                      socket.emit("group-live-voice-chunk", {
                        room: groupId,
                        groupId,
                        user,
                        audioBase64: "data:audio/m4a;base64," + base64,
                        mimeType: "audio/m4a",
                        sequence: this.sequence++,
                        timestamp: Date.now()
                      });
                      onChunkSent?.();
                    }
                    FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
                  }
                } catch (recErr) {
                  console.warn("[LIVE VOICE STREAMER] Erro ao extrair chunk:", recErr?.message);
                }
              })();
            }
          } catch (loopErr) {
            console.warn("[LIVE VOICE STREAMER MOBILE] Erro no ciclo ping-pong:", loopErr?.message);
          }

          if (this.isStreaming) {
            this.nativeRecordingTimer = setTimeout(pingPongLoop, 1000);
          }
        };

        this.nativeRecordingTimer = setTimeout(pingPongLoop, 1000);
      }
    } catch (err) {
      console.error("[LIVE VOICE STREAMER] Erro ao iniciar microfone:", err);
      this.stopStreaming();
      onError?.(err);
    }
  }

  stopStreaming() {
    this.isStreaming = false;

    if (this.nativeRecordingTimer) {
      clearTimeout(this.nativeRecordingTimer);
      this.nativeRecordingTimer = null;
    }

    if (this.activeRecorder) {
      this.activeRecorder.stopAndUnloadAsync().catch(() => {});
      this.activeRecorder = null;
    }

    if (this.nextRecorder) {
      this.nextRecorder.stopAndUnloadAsync().catch(() => {});
      this.nextRecorder = null;
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

    console.log("[LIVE VOICE STREAMER] Transmissão de microfone encerrada com sucesso.");
  }

  // Jitter-Buffered Sequential Playback Queue
  async playChunk(payload, currentUserId) {
    if (!payload?.audioBase64) return;

    if (currentUserId && String(payload.user?.id) === String(currentUserId)) {
      return;
    }

    const soundUri = payload.audioBase64.startsWith("data:")
      ? payload.audioBase64
      : "data:" + (payload.mimeType || "audio/m4a") + ";base64," + payload.audioBase64;

    // Add to queue
    this.playbackQueue.push({
      uri: soundUri,
      mimeType: payload.mimeType,
      sequence: payload.sequence,
      timestamp: payload.timestamp || Date.now()
    });

    // If queue gets too long (> 4 chunks backlog), drop older chunks to stay real-time
    if (this.playbackQueue.length > 4) {
      this.playbackQueue = this.playbackQueue.slice(-3);
    }

    if (!this.isPlayingQueue) {
      this.processPlaybackQueue();
    }
  }

  async processPlaybackQueue() {
    if (this.isPlayingQueue) return;
    this.isPlayingQueue = true;

    while (this.playbackQueue.length > 0) {
      const item = this.playbackQueue.shift();
      if (!item?.uri) continue;

      try {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          await new Promise((resolve) => {
            const audioEl = new window.Audio(item.uri);
            audioEl.volume = 1.0;
            audioEl.onended = resolve;
            audioEl.onerror = resolve;
            audioEl.play().catch(resolve);
            setTimeout(resolve, 3000); // Safety fallback
          });
        } else {
          // Write chunk to unique temp file to ensure fast native hardware decoding
          const tempPath = `${FileSystem.cacheDirectory}live_voice_${Date.now()}_${Math.random().toString(36).substring(7)}.m4a`;
          let playUri = item.uri;

          if (item.uri.startsWith("data:")) {
            const base64Content = item.uri.split(",")[1];
            if (base64Content) {
              await FileSystem.writeAsStringAsync(tempPath, base64Content, {
                encoding: FileSystem.EncodingType.Base64
              });
              playUri = tempPath;
            }
          }

          await new Promise((resolve) => {
            Audio.Sound.createAsync(
              { uri: playUri },
              { shouldPlay: true, volume: 1.0 },
              (status) => {
                if (status.didJustFinish || status.error) {
                  resolve();
                }
              }
            )
              .then(({ sound }) => {
                this.currentSound = sound;
              })
              .catch(resolve);

            // Safety timeout: max 2.5s per chunk
            setTimeout(resolve, 2500);
          });

          if (this.currentSound) {
            await this.currentSound.unloadAsync().catch(() => {});
            this.currentSound = null;
          }

          if (playUri.startsWith(FileSystem.cacheDirectory)) {
            FileSystem.deleteAsync(playUri, { idempotent: true }).catch(() => {});
          }
        }
      } catch (chunkPlayErr) {
        console.warn("[LIVE VOICE STREAMER] Erro ao reproduzir chunk:", chunkPlayErr?.message);
      }
    }

    this.isPlayingQueue = false;
  }

  stopPlayback() {
    this.playbackQueue = [];
    this.isPlayingQueue = false;
    if (this.currentSound) {
      this.currentSound.unloadAsync().catch(() => {});
      this.currentSound = null;
    }
  }
}

export const liveVoiceStreamer = new LiveVoiceStreamer();