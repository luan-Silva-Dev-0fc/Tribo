import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, LayoutAnimation, Platform } from "react-native";
import { Audio } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { api, getUploadUrl } from "../api";
import { errorMessage, listFrom, userName } from "../lib/format";
import { getChatSocket } from "../services/chatSocket";
import { ChatCache } from "../services/chatCache";
import { NativeOptimization } from "../services/nativeOptimization";
import { saveMediaToGallery } from "../services/mediaDownloadService";
import { saveStickerToInventory } from "../services/stickerInventory";
import {
  setAudioRecordingActive,
  setOptimizedAudioMode
} from "../services/audioRecordingDucking";

export function useDirectChat(targetUser, currentUser) {
  const targetUserId = targetUser?.id || targetUser?.userId;

  const [messages, setMessages] = useState(() =>
    targetUserId ? ChatCache.getMessagesSync(targetUserId) : []
  );
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(
    () => !(targetUserId && ChatCache.getMessagesSync(targetUserId)?.length > 0)
  );
  const [mutualBlocked, setMutualBlocked] = useState(false);
  const [blockedReason, setBlockedReason] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [followingBack, setFollowingBack] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);

  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [createStickerVisible, setCreateStickerVisible] = useState(false);
  const [goldModalVisible, setGoldModalVisible] = useState(false);
  const [viewerMedia, setViewerMedia] = useState(null);

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    message: null
  });
  const [deleteModal, setDeleteModal] = useState({
    visible: false,
    message: null,
    forEveryone: false
  });
  const [toast, setToast] = useState({
    visible: false,
    text: "",
    type: "success"
  });

  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordingRef = useRef(null);
  const recordIntervalRef = useRef(null);

  useEffect(() => {
    setAudioRecordingActive(isRecording);
    return () => {
      setAudioRecordingActive(false);
    };
  }, [isRecording]);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [firstUnreadId, setFirstUnreadId] = useState(null);
  const initialScrollDoneRef = useRef(false);

  const flatListRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const showToast = (text, type = "success") => {
    setToast({ visible: true, text, type });
  };

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const loadMessages = useCallback(async () => {
    if (!targetUserId) return;
    try {
      NativeOptimization.enableHighRefreshRate().catch(() => {});
      const cached = ChatCache.getMessagesSync(targetUserId);
      if (cached && cached.length > 0) {
        setMessages(cached);
      } else {
        setLoading(true);
      }
      let msgs = [];
      try {
        const res = await api.messages.getHistory(targetUserId);
        msgs = Array.isArray(res) ? res : res?.messages || res?.data || [];
      } catch (err) {
        if (err?.status === 403) {
          setMutualBlocked(true);
          setBlockedReason(
            err.message ||
              "Vocês precisam se seguir mutuamente para trocar mensagens."
          );
          return;
        }
        const fallbackRes = await api.messages.conversation(
          String(targetUserId)
        );
        msgs = listFrom(fallbackRes, ["messages"]);
      }

      setMutualBlocked(false);

      const reversedMsgs = msgs.slice().reverse();
      setMessages(reversedMsgs);
      ChatCache.setMessagesSync(targetUserId, reversedMsgs);

      const unreadList = msgs.filter(
        (m) =>
          !m.read_at &&
          m.isRead !== true &&
          String(m.sender_id || m.userId) === String(targetUserId)
      );

      if (unreadList.length > 0) {
        const oldestUnread = unreadList[0];
        setFirstUnreadId(oldestUnread.id);
        const unreadIdx = reversedMsgs.findIndex(
          (m) => String(m.id) === String(oldestUnread.id)
        );

        if (!initialScrollDoneRef.current && unreadIdx > 0) {
          initialScrollDoneRef.current = true;
          setTimeout(() => {
            try {
              flatListRef.current?.scrollToIndex({
                index: unreadIdx,
                animated: true,
                viewPosition: 0.5
              });
            } catch (e) {
              flatListRef.current?.scrollToOffset({
                offset: unreadIdx * 75,
                animated: true
              });
            }
          }, 250);
        }
      }

      msgs.forEach((m) => {
        if (
          m.id &&
          !m.read_at &&
          m.isRead === false &&
          String(m.sender_id || m.userId) === String(targetUserId)
        ) {
          api.messages.markRead(m.id).catch(() => {});
        }
      });
    } catch (err) {
      if (err?.status === 403) {
        setMutualBlocked(true);
        setBlockedReason(
          err.message ||
            "Vocês precisam se seguir mutuamente para trocar mensagens."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    const socket = getChatSocket();
    if (!socket || !currentUser?.id) return;

    socket.emit("join-room", `user_${currentUser.id}`);
    socket.emit("join_room", `user_${currentUser.id}`);

    const handleNewMessage = (payload) => {
      if (!payload) return;
      const senderId = String(
        payload?.sender_id || payload?.senderId || payload?.user?.id || ""
      );
      const receiverId = String(
        payload?.receiver_id || payload?.receiverId || ""
      );
      const targetStr = String(targetUserId || "");

      if (senderId === targetStr || receiverId === targetStr) {
        const msgId = String(payload?.id || payload?._id || "");
        const tempId = payload?.tempId || payload?.temp_id;

        setMessages((prev) => {
          const existingIdx = prev.findIndex(
            (m) =>
              (msgId && String(m.id || m._id) === msgId) ||
              (tempId && (m.tempId === tempId || m.id === tempId))
          );

          let updated;
          if (existingIdx >= 0) {
            updated = [...prev];
            updated[existingIdx] = {
              ...updated[existingIdx],
              ...payload,
              sending: false
            };
          } else {
            updated = [payload, ...prev];
          }

          ChatCache.setMessagesSync(targetUserId, updated);
          return updated;
        });

        if (msgId && senderId === targetStr) {
          api.messages.markRead(msgId).catch(() => {});
        }
      }
    };

    const handleMessageDeleted = (payload) => {
      const deletedId = String(payload?.messageId || payload?.id || "");
      if (deletedId) {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            String(m.id || m._id) === deletedId
              ? {
                  ...m,
                  is_deleted: true,
                  deleted_for_everyone: true,
                  content: ""
                }
              : m
          );
          ChatCache.setMessagesSync(targetUserId, updated);
          return updated;
        });
      }
    };

    socket.on("receive-message", handleNewMessage);
    socket.on("receive_message", handleNewMessage);
    socket.on("new_message", handleNewMessage);
    socket.on("direct_message", handleNewMessage);
    socket.on(`direct_message_${currentUser.id}`, handleNewMessage);
    socket.on("message-deleted", handleMessageDeleted);

    return () => {
      socket.off("receive-message", handleNewMessage);
      socket.off("receive_message", handleNewMessage);
      socket.off("new_message", handleNewMessage);
      socket.off("direct_message", handleNewMessage);
      socket.off(`direct_message_${currentUser.id}`, handleNewMessage);
      socket.off("message-deleted", handleMessageDeleted);
    };
  }, [currentUser?.id, targetUserId]);

  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.85
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedMedia(result.assets[0]);
      }
    } catch (e) {
      console.warn("Erro ao selecionar mídia:", e);
    }
  };

  const handleSend = async () => {
    if ((!content.trim() && !selectedMedia) || sending || mutualBlocked) return;
    const msgText = content.trim();
    const mediaToSend = selectedMedia;
    const viewOnceToSend = isViewOnce;

    setContent("");
    setSelectedMedia(null);
    setIsViewOnce(false);

    if (editingMessage) {
      const editId = editingMessage.id;
      setEditingMessage(null);
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === editId
            ? {
                ...m,
                content: msgText,
                isEdited: true,
                is_edited: true,
                editedAt: new Date().toISOString()
              }
            : m
        );
        ChatCache.setMessagesSync(targetUserId, updated);
        return updated;
      });
      try {
        await api.messages.update(editId, msgText);
        showToast("Mensagem atualizada!");
      } catch (err) {
        showToast(errorMessage(err) || "Falha ao editar mensagem.", "error");
      }
      return;
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg = {
      id: tempId,
      tempId,
      content: msgText,
      sender_id: currentUser?.id,
      senderId: currentUser?.id,
      receiver_id: targetUserId,
      receiverId: targetUserId,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      media_url: mediaToSend ? mediaToSend.uri : null,
      media_type: mediaToSend
        ? mediaToSend.type === "video"
          ? "VIDEO"
          : "IMAGE"
        : "TEXT",
      is_view_once: viewOnceToSend,
      user: currentUser,
      sending: true
    };

    setMessages((prev) => {
      const updated = [optimisticMsg, ...prev];
      ChatCache.setMessagesSync(targetUserId, updated);
      return updated;
    });

    try {
      let media_url = null;
      let media_type = null;

      if (mediaToSend) {
        if (mediaToSend.type === "video") {
          const res = await api.uploads.video(mediaToSend.uri);
          media_url = getUploadUrl(res);
          media_type = "VIDEO";
        } else {
          const res = await api.uploads.photo(mediaToSend.uri);
          media_url = getUploadUrl(res);
          media_type = "IMAGE";
        }
      }

      const sendRes = await api.messages.send({
        receiver_id: targetUserId,
        content: msgText,
        media_url,
        media_type,
        is_view_once: viewOnceToSend
      });

      const serverMsg = sendRes?.message || sendRes?.data || sendRes;
      const realId = serverMsg?.id || serverMsg?._id;

      if (realId) {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === tempId
              ? { ...m, ...serverMsg, id: realId, sending: false }
              : m
          );
          ChatCache.setMessagesSync(targetUserId, updated);
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      showToast(errorMessage(err) || "Falha ao enviar mensagem.", "error");
    }
  };

  const handleSelectSticker = async (sticker) => {
    if (!sticker || sending || mutualBlocked) return;
    const media_url =
      sticker.video_url ||
      sticker.videoUrl ||
      sticker.media_url ||
      sticker.mediaUrl ||
      sticker.url;

    if (!media_url) {
      showToast("Figurinha inválida", "error");
      return;
    }

    const viewOnceToSend = isViewOnce;
    setStickerPickerVisible(false);
    setIsViewOnce(false);

    const tempId = `temp_stk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg = {
      id: tempId,
      tempId,
      content: "",
      media_url,
      media_type: "STICKER",
      sender_id: currentUser?.id,
      senderId: currentUser?.id,
      receiver_id: targetUserId,
      receiverId: targetUserId,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      is_view_once: viewOnceToSend,
      user: currentUser,
      sending: true
    };

    setMessages((prev) => {
      const updated = [optimisticMsg, ...prev];
      ChatCache.setMessagesSync(targetUserId, updated);
      return updated;
    });

    try {
      const sendRes = await api.messages.send({
        receiver_id: targetUserId,
        content: "",
        media_url,
        media_type: "STICKER",
        is_view_once: viewOnceToSend
      });

      const serverMsg = sendRes?.message || sendRes?.data || sendRes;
      const realId = serverMsg?.id || serverMsg?._id;

      if (realId) {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === tempId
              ? { ...m, ...serverMsg, id: realId, sending: false }
              : m
          );
          ChatCache.setMessagesSync(targetUserId, updated);
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      showToast(errorMessage(err) || "Falha ao enviar figurinha.", "error");
    }
  };

  const startRecording = async () => {
    if (sending || mutualBlocked) return;
    try {
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {}
        recordingRef.current = null;
      }
      if (recording) {
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {}
        setRecording(null);
      }

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        showToast(
          "Permissão de microfone necessária nas configurações.",
          "error"
        );
        return;
      }

      await setOptimizedAudioMode(true);

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = newRecording;
      setRecording(newRecording);
      setIsRecording(true);
      setRecordSeconds(0);

      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Erro ao iniciar gravação:", err);
      try {
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
          recordingRef.current = null;
        }
      } catch (e) {}
      setIsRecording(false);
      setRecording(null);
      showToast("Não foi possível iniciar a gravação.", "error");
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
      setRecording(null);
      setIsRecording(false);
      setRecordSeconds(0);
      await setOptimizedAudioMode(false);
      showToast("Gravação cancelada");
    } catch (err) {
      console.error("Erro ao cancelar gravação:", err);
    }
  };

  const stopAndSendRecording = async () => {
    try {
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }

      if (!recordingRef.current) return;
      const rec = recordingRef.current;
      recordingRef.current = null;
      setRecording(null);
      setIsRecording(false);

      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      await setOptimizedAudioMode(false);

      if (!uri || recordSeconds < 1) {
        setRecordSeconds(0);
        return;
      }

      const viewOnceToSend = isViewOnce;
      setIsViewOnce(false);
      setRecordSeconds(0);

      const tempId = `temp_audio_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const optimisticMsg = {
        id: tempId,
        tempId,
        content: "",
        audio_url: uri,
        media_type: "AUDIO",
        sender_id: currentUser?.id,
        senderId: currentUser?.id,
        receiver_id: targetUserId,
        receiverId: targetUserId,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        is_view_once: viewOnceToSend,
        user: currentUser,
        sending: true
      };

      setMessages((prev) => {
        const updated = [optimisticMsg, ...prev];
        ChatCache.setMessagesSync(targetUserId, updated);
        return updated;
      });

      (async () => {
        try {
          const uploadRes = await api.uploads.audio(
            uri,
            "audio.m4a",
            "audio/m4a"
          );
          const audioUrl = getUploadUrl(uploadRes);

          if (!audioUrl) {
            throw new Error("Não foi possível processar o áudio.");
          }

          const sendRes = await api.messages.send({
            receiver_id: targetUserId,
            audio_url: audioUrl,
            content: "",
            is_view_once: viewOnceToSend
          });

          const serverMsg = sendRes?.message || sendRes?.data || sendRes;
          const realId = serverMsg?.id || serverMsg?._id;

          if (realId) {
            setMessages((prev) => {
              const updated = prev.map((m) =>
                m.id === tempId
                  ? {
                      ...m,
                      ...serverMsg,
                      id: realId,
                      audio_url: audioUrl,
                      sending: false
                    }
                  : m
              );
              ChatCache.setMessagesSync(targetUserId, updated);
              return updated;
            });
          }
        } catch (err) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          showToast(errorMessage(err) || "Falha ao enviar áudio.", "error");
        }
      })();
    } catch (err) {
      showToast(errorMessage(err) || "Falha ao processar gravação.", "error");
    }
  };

  const handleFollowBack = async () => {
    if (!targetUserId || followingBack) return;
    try {
      setFollowingBack(true);
      const res = await api.users.follow(targetUserId);
      const status =
        res?.status ||
        res?.data?.status ||
        res?.follow_status ||
        res?.data?.follow_status;

      if (status === "PENDING") {
        showToast("Solicitação para seguir enviada!");
      } else {
        setMutualBlocked(false);
        showToast(
          `Você agora segue @${targetUser.username || userName(targetUser)}`
        );
        loadMessages();
      }
    } catch (err) {
      showToast(errorMessage(err) || "Erro ao seguir de volta", "error");
    } finally {
      setFollowingBack(false);
    }
  };

  const handleOpenContextMenu = (msg) => {
    if (msg.is_deleted || msg.deleted_for_everyone) return;
    setContextMenu({ visible: true, message: msg });
  };

  const handleSaveToGallery = async (msg) => {
    const url = msg?.media_url || msg?.mediaUrl || msg?.video_url || msg?.url;
    if (!url) return;
    try {
      const isVideo =
        msg?.media_type === "VIDEO" ||
        url.toLowerCase().endsWith(".mp4") ||
        url.toLowerCase().includes("/videos/");
      await saveMediaToGallery({ url, type: isVideo ? "video" : "image" });
      showToast(
        isVideo ? "Vídeo salvo na galeria!" : "Foto salva na galeria!"
      );
    } catch (e) {
      showToast(e.message || "Erro ao salvar na galeria", "error");
    }
  };

  const handleSaveSticker = async (msg) => {
    const url = msg?.media_url || msg?.mediaUrl || msg?.video_url || msg?.url;
    if (!url) return;
    try {
      await saveStickerToInventory({
        id: msg.id || `stk_${Date.now()}`,
        video_url: url,
        media_url: url,
        sticker_name: msg.sticker_name || "Figurinha da Tribo",
        pack_name: "Gerais",
        author_name: targetUser?.name || "Tribo"
      });
      showToast("Figurinha salva no seu inventário!");
    } catch (e) {
      showToast("Erro ao salvar figurinha", "error");
    }
  };

  const confirmDeleteMessage = async () => {
    const { message, forEveryone } = deleteModal;
    if (!message?.id) return;
    setDeleteModal({ visible: false, message: null, forEveryone: false });

    const msgId = message.id;
    try {
      if (forEveryone) {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === msgId || String(m.id) === String(msgId)
              ? {
                  ...m,
                  is_deleted: true,
                  deleted_for_everyone: true,
                  content: ""
                }
              : m
          );
          ChatCache.setMessagesSync(targetUserId, updated);
          return updated;
        });
        await api.messages.delete(msgId, { forEveryone: true });
        showToast("Mensagem apagada para todos!");
      } else {
        setMessages((prev) => {
          const updated = prev.filter(
            (m) => m.id !== msgId && String(m.id) !== String(msgId)
          );
          ChatCache.setMessagesSync(targetUserId, updated);
          return updated;
        });
        await api.messages.delete(msgId, { forEveryone: false });
        showToast("Mensagem apagada para você");
      }
    } catch (err) {
      showToast(errorMessage(err) || "Falha ao apagar mensagem", "error");
    }
  };

  return {
    targetUserId,
    messages,
    setMessages,
    content,
    setContent,
    sending,
    loading,
    mutualBlocked,
    blockedReason,
    selectedMedia,
    setSelectedMedia,
    isViewOnce,
    setIsViewOnce,
    followingBack,
    editingMessage,
    setEditingMessage,
    stickerPickerVisible,
    setStickerPickerVisible,
    createStickerVisible,
    setCreateStickerVisible,
    goldModalVisible,
    setGoldModalVisible,
    viewerMedia,
    setViewerMedia,
    contextMenu,
    setContextMenu,
    deleteModal,
    setDeleteModal,
    toast,
    setToast,
    isRecording,
    recordSeconds,
    settingsVisible,
    setSettingsVisible,
    showOnlineStatus,
    setShowOnlineStatus,
    readReceipts,
    setReadReceipts,
    firstUnreadId,
    flatListRef,
    keyboardHeight,
    showToast,
    loadMessages,
    pickMedia,
    handleSend,
    handleSelectSticker,
    startRecording,
    cancelRecording,
    stopAndSendRecording,
    handleFollowBack,
    handleOpenContextMenu,
    handleSaveToGallery,
    handleSaveSticker,
    confirmDeleteMessage
  };
}
