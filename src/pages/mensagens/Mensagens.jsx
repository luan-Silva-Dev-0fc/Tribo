import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Modal,
  Linking } from
"react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import { api, getUploadUrl } from "../../api";
import {
  Avatar,
  EmptyState,
  IconButton,
  VerificationBadge } from
"../../components/ui/ui";
import { AppHeader } from "../../components/ui/ui";
import {
  errorMessage,
  formatRelativeTime,
  listFrom,
  userName } from
"../../lib/format";
import { useTheme } from "../../theme";


import { StickerPickerModal } from "../../components/chat/StickerPickerModal";
import { CreateVideoStickerModal } from "../../components/chat/CreateVideoStickerModal";
import { VideoStickerEditorModal } from "../../components/modals/VideoStickerEditorModal";
import { VideoStickerMessage } from "../../components/chat/VideoStickerMessage";
import { ReelShareCard } from "../../components/chat/ReelShareCard";
import { MediaContextMenuSheet } from "../../components/chat/MediaContextMenuSheet";
import { ConfirmDeleteModal } from "../../components/chat/ConfirmDeleteModal";
import { TriboModernToast } from "../../components/chat/TriboModernToast";
import { MediaViewerModal } from "../../components/modals/media-viewer-modal";
import { GoldBadgeModal } from "../../components/modals/gold-badge-modal";
import { getChatSocket } from "../../services/chatSocket";
import { saveMediaToGallery } from "../../services/mediaDownloadService";
import { saveStickerToInventory } from "../../services/stickerInventory";
import { NativeOptimization } from "../../services/nativeOptimization";
import { ChatCache } from "../../services/chatCache";
import {
  setOptimizedAudioMode,
  setAudioRecordingActive,
  notifyChatScroll } from
"../../services/audioRecordingDucking";




function formatAudioTime(millis) {
  if (!millis || isNaN(millis) || millis < 0) return "0:00";
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}




export function AudioMessagePlayer({ audioUrl, isMe }) {
  const { colors } = useTheme();
  const soundRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const SPEEDS = [1.0, 1.5, 2.0, 3.0, 5.0];

  const handleToggleSpeed = async () => {
    const nextIdx = (SPEEDS.indexOf(playbackSpeed) + 1) % SPEEDS.length;
    const nextSpeed = SPEEDS[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (soundRef.current) {
      try {
        await soundRef.current.setRateAsync(nextSpeed, true);
      } catch (e) {
        console.warn("[AudioPlayer] Erro ao alterar velocidade:", e);
      }
    }
  };

  const resolveAudioUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();
    if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("file://"))
    {
      return trimmed;
    }
    const baseUrl = (
    process.env.EXPO_PUBLIC_API_URL || "https://tribo-api-production-2f6f.up.railway.app").

    replace(/\/api\/?$/, "").
    replace(/\/$/, "");
    return `${baseUrl}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [audioUrl]);

  const onPlaybackStatusUpdate = (status) => {
    if (!status.isLoaded) {
      if (status.error) {
        setIsLoading(false);
        setIsPlaying(false);
      }
      return;
    }
    setPositionMillis(status.positionMillis || 0);
    setDurationMillis(status.durationMillis || 1);
    setIsPlaying(status.isPlaying);
    setIsLoading(false);

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMillis(0);
    }
  };

  const handlePlayPause = async () => {
    const targetUri = resolveAudioUrl(audioUrl);
    if (!targetUri) return;

    try {
      if (!soundRef.current) {
        setIsLoading(true);
        const { sound } = await Audio.Sound.createAsync(
          { uri: targetUri },
          { shouldPlay: true, rate: playbackSpeed, shouldCorrectPitch: true },
          onPlaybackStatusUpdate
        );
        try {
          await sound.setRateAsync(playbackSpeed, true);
        } catch (e) {}
        soundRef.current = sound;
      } else {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
          } else {
            try {
              await soundRef.current.setRateAsync(playbackSpeed, true);
            } catch (e) {}
            if (status.positionMillis >= (status.durationMillis || 0) - 100) {
              await soundRef.current.replayAsync();
            } else {
              await soundRef.current.playAsync();
            }
          }
        }
      }
    } catch (err) {
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const progress =
  durationMillis > 0 ?
  Math.min(Math.max(positionMillis / durationMillis, 0), 1) :
  0;

  return (
    <View style={styles.audioPlayerContainer}>
      <Pressable
        onPress={handlePlayPause}
        disabled={isLoading}
        style={({ pressed }) => [
        styles.audioPlayBtn,
        {
          backgroundColor: isMe ? "#ffffff" : colors.primary || "#0284c7",
          opacity: pressed ? 0.85 : 1
        }]
        }>
        
        {isLoading ?
        <ActivityIndicator
          size="small"
          color={isMe ? colors.primary || "#0284c7" : "#ffffff"} /> :


        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={18}
          color={isMe ? colors.primary || "#0284c7" : "#ffffff"}
          style={{ marginLeft: isPlaying ? 0 : 2 }} />

        }
      </Pressable>

      <View style={styles.audioProgressWrapper}>
        <View
          style={[
          styles.audioTrack,
          {
            backgroundColor: isMe ?
            "rgba(255, 255, 255, 0.25)" :
            "rgba(255, 255, 255, 0.12)"
          }]
          }>
          
          <View
            style={[
            styles.audioFill,
            {
              width: `${progress * 100}%`,
              backgroundColor: isMe ? "#ffffff" : colors.primary || "#0284c7"
            }]
            } />
          
        </View>
        <View style={styles.audioTimeRow}>
          <Text
            style={[
            styles.audioTimeText,
            {
              color: isMe ?
              "rgba(255, 255, 255, 0.85)" :
              colors.muted || "#a1a1aa"
            }]
            }>
            
            {formatAudioTime(isPlaying ? positionMillis : durationMillis || 0)}
          </Text>
          <Feather
            name="mic"
            size={12}
            color={
            isMe ? "rgba(255, 255, 255, 0.7)" : colors.muted || "#a1a1aa"
            } />
          
        </View>
      </View>

      {}
      <Pressable
        onPress={handleToggleSpeed}
        hitSlop={6}
        style={({ pressed }) => [
        styles.audioSpeedPill,
        {
          backgroundColor: isMe ?
          playbackSpeed > 1.0 ?
          "rgba(255, 255, 255, 0.3)" :
          "rgba(255, 255, 255, 0.15)" :
          playbackSpeed > 1.0 ?
          "rgba(2, 132, 199, 0.3)" :
          "rgba(255, 255, 255, 0.08)",
          borderColor: isMe ?
          playbackSpeed > 1.0 ?
          "#ffffff" :
          "rgba(255, 255, 255, 0.2)" :
          playbackSpeed > 1.0 ?
          colors.primary || "#0284c7" :
          "rgba(255, 255, 255, 0.1)",
          opacity: pressed ? 0.75 : 1
        }]
        }>
        
        <Text
          style={[
          styles.audioSpeedText,
          {
            color: isMe ?
            "#ffffff" :
            playbackSpeed > 1.0 ?
            colors.primary || "#0284c7" :
            colors.muted || "#a1a1aa",
            fontFamily:
            playbackSpeed > 1.0 ?
            "Poppins_700Bold" :
            "Poppins_600SemiBold"
          }]
          }>
          
          {playbackSpeed === 1.0 ? "1x" : `${playbackSpeed}x`}
        </Text>
      </Pressable>
    </View>);

}




const ChatVideoThumbnail = React.memo(function ChatVideoThumbnail({
  url,
  onPress,
  onLongPress
}) {
  if (!url || typeof url !== "string" || !url.trim()) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={200}
        style={styles.chatVideoBox} />);


  }
  return (
    <ActiveChatVideoThumbnailInner
      url={url}
      onPress={onPress}
      onLongPress={onLongPress} />);


});

function ActiveChatVideoThumbnailInner({ url, onPress, onLongPress }) {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    try {
      Promise.resolve(p.play()).catch(() => {});
    } catch (e) {}
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={200}
      style={styles.chatVideoBox}>
      
      {isMountedRef.current && player ?
      <VideoView
        key={url}
        player={player}
        nativeControls={false}
        contentFit="cover"
        style={{ width: "100%", height: "100%" }} /> :


      <View style={{ width: "100%", height: "100%", backgroundColor: "#18181b" }} />
      }
      <View pointerEvents="none" style={styles.chatVideoOverlay}>
        <View style={styles.chatVideoPlayBadge}>
          <Ionicons name="play" size={24} color="#ffffff" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </Pressable>);

}




export function ConversationsListScreen({
  user,
  onBack,
  onOpenChat,
  onOpenProfile
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");

  const topInset = Math.max(
    insets?.top || 0,
    Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0
  );

  const loadConversations = useCallback(async () => {
    try {
      NativeOptimization.enableHighRefreshRate().catch(() => {});
      const cached = ChatCache.getConversationsSync();
      if (cached && cached.length > 0) {
        setConversations(cached);
      }
      const res = await api.messages.conversations();
      const list = Array.isArray(res) ?
      res :
      res?.conversations || res?.data || [];
      setConversations(list);
      ChatCache.setConversationsSync(list);
    } catch (err) {
      try {
        const msgs = listFrom(await api.messages.list(), ["messages"]);
        const groups = new Map();
        msgs.forEach((msg) => {
          const target = msg.user?.id === user?.id ? msg.receiver : msg.user;
          const targetId = String(target?.id || msg.conversation || "unknown");
          if (
          !groups.has(targetId) ||
          new Date(groups.get(targetId).createdAt) < new Date(msg.createdAt))
          {
            groups.set(targetId, {
              id: targetId,
              user: target,
              last_message: msg,
              content: msg.content,
              createdAt: msg.createdAt,
              unread_count:
              msg.isRead === false && msg.user?.id !== user?.id ? 1 : 0
            });
          }
        });
        const convs = Array.from(groups.values());
        setConversations(convs);
        ChatCache.setConversationsSync(convs);
      } catch (fallbackErr) {
        console.warn("Conversas indisponíveis:", fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 8000);
    return () => clearInterval(interval);
  }, [loadConversations]);


  useEffect(() => {
    const socket = getChatSocket();
    if (!socket || !user?.id) return;

    const handleNewMessage = () => {
      loadConversations();
    };

    socket.on("receive-message", handleNewMessage);
    socket.on("new_message", handleNewMessage);
    socket.on(`direct_message_${user.id}`, handleNewMessage);

    return () => {
      socket.off("receive-message", handleNewMessage);
      socket.off("new_message", handleNewMessage);
      socket.off(`direct_message_${user.id}`, handleNewMessage);
    };
  }, [loadConversations, user?.id]);

  const handleOpenUserChat = (otherUser) => {
    if (otherUser?.id) {
      setConversations((prev) =>
      prev.map((c) => {
        const cUser = c.contact || c.user || c.participant;
        if (String(cUser?.id) === String(otherUser.id)) {
          return { ...c, unread_count: 0, unreadCount: 0 };
        }
        return c;
      })
      );
      api.messages.markConversationRead(otherUser.id).catch(() => {});
    }
    onOpenChat(otherUser);
  };

  const filteredConversations = conversations.filter((item) => {
    const otherUser = item.contact || item.user || item.participant || {};
    const name = userName(otherUser).toLowerCase();
    const handle = (otherUser.username || "").toLowerCase();
    const query = filterText.toLowerCase();
    return name.includes(query) || handle.includes(query);
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {}
      <View
        style={[
        styles.headerModern,
        {
          paddingTop: topInset + 8,
          backgroundColor: colors.background,
          borderBottomColor: colors.border || "rgba(255, 255, 255, 0.08)"
        }]
        }>
        
        <IconButton name="arrow-left" onPress={onBack} label="Voltar" />
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Mensagens
          </Text>
          <Text style={{ fontSize: 11.5, color: colors.muted, fontFamily: "Poppins_400Regular" }}>
            Conversas Privadas
          </Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      {}
      <View
        style={[
        styles.searchBarContainer,
        {
          backgroundColor: colors.surfaceAlt || "#18181b",
          borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
        }]
        }>
        
        <Feather
          name="search"
          size={18}
          color={colors.muted || "#a1a1aa"}
          style={{ marginRight: 8 }} />
        
        <TextInput
          placeholder="Buscar conversas..."
          placeholderTextColor={colors.muted || "#71717a"}
          value={filterText}
          onChangeText={setFilterText}
          style={[styles.searchInput, { color: colors.text }]} />
        
        {!!filterText &&
        <Pressable onPress={() => setFilterText("")} style={{ padding: 4 }}>
            <Feather name="x" size={16} color={colors.muted} />
          </Pressable>
        }
      </View>

      {}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item, index) =>
        String(item.id || item.user?.id || index)
        }
        refreshing={loading}
        onRefresh={loadConversations}
        contentContainerStyle={[
        styles.listContent,
        { paddingBottom: Math.max(insets.bottom + 24, 40) }]
        }
        renderItem={({ item }) => {
          const otherUser = item.contact || item.user || item.participant || {};
          const lastMsg = item.last_message || item;
          const unreadCount = item.unread_count || item.unreadCount || 0;
          const isUnread = unreadCount > 0;
          const isOnline = Boolean(otherUser.is_online || otherUser.isOnline);

          let previewText = "Conversa iniciada";
          if (lastMsg.is_deleted || lastMsg.deleted_for_everyone) {
            previewText = "Mensagem apagada";
          } else if (lastMsg.media_type === "STICKER") {
            previewText = "🎭 Figurinha";
          } else if (lastMsg.media_type === "REEL_SHARE" || lastMsg.media_type === "reel_share" || lastMsg.type === "reel_share") {
            previewText = "🎬 Reel compartilhado";
          } else if (lastMsg.media_type === "VIDEO") {
            previewText = "🎥 Vídeo";
          } else if (lastMsg.media_type === "IMAGE") {
            previewText = "📷 Foto";
          } else if (lastMsg.audio_url || lastMsg.audioUrl) {
            previewText = "🎤 Mensagem de voz";
          } else if (lastMsg.story_id) {
            previewText = "Respondeu ao seu story";
          } else if (lastMsg.content) {
            previewText = lastMsg.content;
          }

          return (
            <Pressable
              style={({ pressed }) => [
              styles.convRow,
              {
                backgroundColor: colors.card || "#18181b",
                borderColor: colors.border || "rgba(255, 255, 255, 0.05)"
              },
              pressed && {
                opacity: 0.85,
                backgroundColor: colors.surfaceAlt || "#27272a"
              }]
              }
              onPress={() => handleOpenUserChat(otherUser)}>
              
              <View style={{ position: "relative" }}>
                <Avatar user={otherUser} size={50} />
                {isOnline &&
                <View
                  style={[
                  styles.onlineDot,
                  { borderColor: colors.card || "#18181b" }]
                  } />

                }
              </View>

              <View style={styles.convDetails}>
                <View style={styles.convTopRow}>
                  <View style={styles.nameBadgeRow}>
                    <Text
                      numberOfLines={1}
                      style={[styles.convName, { color: colors.text }]}>
                      
                      {userName(otherUser)}
                    </Text>
                    <VerificationBadge user={otherUser} size={14} />
                  </View>
                  <Text style={[styles.convTime, { color: colors.muted }]}>
                    {formatRelativeTime(
                      lastMsg.createdAt || lastMsg.created_at
                    )}
                  </Text>
                </View>

                <View style={styles.convBottomRow}>
                  <Text
                    numberOfLines={1}
                    style={[
                    styles.convPreview,
                    { color: isUnread ? colors.text : colors.muted },
                    isUnread && styles.convPreviewBold]
                    }>
                    
                    {previewText}
                  </Text>

                  {isUnread &&
                  <View
                    style={[
                    styles.unreadBadge,
                    { backgroundColor: colors.primary || "#0284c7" }]
                    }>
                    
                      <Text style={styles.unreadCountText}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Text>
                    </View>
                  }
                </View>
              </View>
            </Pressable>);

        }}
        ListEmptyComponent={
        !loading &&
        <EmptyState icon="message-square">
              Nenhuma conversa encontrada.
            </EmptyState>

        } />
      
    </View>);

}




export function DirectChatScreen({
  targetUser,
  currentUser,
  onBack,
  onOpenProfile
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const targetUserId = targetUser?.id || targetUser?.userId;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const topInset = Math.max(
    insets?.top || 0,
    Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0
  );

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
        const unreadIdx = reversedMsgs.findIndex((m) => String(m.id) === String(oldestUnread.id));

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
        String(m.sender_id || m.userId) === String(targetUserId))
        {
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

    const handleNewMessage = (payload) => {
      const senderId = payload?.sender_id || payload?.senderId || payload?.user?.id;
      const receiverId = payload?.receiver_id || payload?.receiverId;
      if (
      String(senderId) === String(targetUserId) ||
      String(receiverId) === String(targetUserId))
      {
        loadMessages();
      }
    };

    const handleMessageDeleted = (payload) => {
      const deletedId = payload?.messageId || payload?.id;
      if (deletedId) {
        setMessages((prev) =>
        prev.map((m) =>
        m.id === deletedId || String(m.id) === String(deletedId) ?
        { ...m, is_deleted: true, deleted_for_everyone: true, content: "" } :
        m
        )
        );
      }
    };

    socket.on("receive-message", handleNewMessage);
    socket.on("new_message", handleNewMessage);
    socket.on(`direct_message_${currentUser.id}`, handleNewMessage);
    socket.on("message-deleted", handleMessageDeleted);

    return () => {
      socket.off("receive-message", handleNewMessage);
      socket.off("new_message", handleNewMessage);
      socket.off(`direct_message_${currentUser.id}`, handleNewMessage);
      socket.off("message-deleted", handleMessageDeleted);
    };
  }, [currentUser?.id, targetUserId, loadMessages]);

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
    if (!content.trim() && !selectedMedia || sending || mutualBlocked) return;
    const msgText = content.trim();

    try {
      setSending(true);

      let media_url = null;
      let media_type = null;

      if (selectedMedia) {
        if (selectedMedia.type === "video") {
          const res = await api.uploads.video(selectedMedia.uri);
          media_url = getUploadUrl(res);
          media_type = "VIDEO";
        } else {
          const res = await api.uploads.photo(selectedMedia.uri);
          media_url = getUploadUrl(res);
          media_type = "IMAGE";
        }
      }

      if (editingMessage) {
        await api.messages.update(editingMessage.id, msgText);
        setMessages((prev) =>
        prev.map((m) =>
        m.id === editingMessage.id ?
        {
          ...m,
          content: msgText,
          isEdited: true,
          is_edited: true,
          editedAt: new Date().toISOString()
        } :
        m
        )
        );
        setEditingMessage(null);
        setContent("");
        showToast("Mensagem atualizada!");
      } else {
        setContent("");
        setSelectedMedia(null);
        await api.messages.send({
          receiver_id: targetUserId,
          content: msgText,
          media_url,
          media_type,
          is_view_once: isViewOnce
        });
        setIsViewOnce(false);
        loadMessages();
      }
    } catch (err) {
      showToast(errorMessage(err) || "Falha ao enviar mensagem.", "error");
    } finally {
      setSending(false);
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

    try {
      setSending(true);
      setStickerPickerVisible(false);

      await api.messages.send({
        receiver_id: targetUserId,
        content: "",
        media_url: media_url,
        media_type: "STICKER",
        is_view_once: isViewOnce
      });

      setIsViewOnce(false);
      loadMessages();
      showToast("Figurinha enviada!");
    } catch (err) {
      showToast(errorMessage(err) || "Falha ao enviar figurinha.", "error");
    } finally {
      setSending(false);
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
        showToast("Permissão de microfone necessária nas configurações.", "error");
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
        return;
      }

      setSending(true);
      const uploadRes = await api.uploads.audio(uri, "audio.m4a", "audio/m4a");
      const audioUrl = getUploadUrl(uploadRes);

      if (!audioUrl) {
        throw new Error("Não foi possível processar o áudio enviado.");
      }

      await api.messages.send({
        receiver_id: targetUserId,
        audio_url: audioUrl,
        content: "",
        is_view_once: isViewOnce
      });

      setIsViewOnce(false);
      loadMessages();
      showToast("Áudio enviado!");
    } catch (err) {
      showToast(errorMessage(err) || "Falha ao enviar áudio.", "error");
    } finally {
      setSending(false);
      setRecordSeconds(0);
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
        showToast(`Você agora segue @${targetUser.username || userName(targetUser)}`);
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
      showToast(isVideo ? "Vídeo salvo na galeria!" : "Foto salva na galeria!");
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
        setMessages((prev) =>
        prev.map((m) =>
        m.id === msgId || String(m.id) === String(msgId) ?
        { ...m, is_deleted: true, deleted_for_everyone: true, content: "" } :
        m
        )
        );
        await api.messages.delete(msgId, { forEveryone: true });
        showToast("Mensagem apagada para todos!");
      } else {
        setMessages((prev) =>
        prev.filter((m) => m.id !== msgId && String(m.id) !== String(msgId))
        );
        await api.messages.delete(msgId, { forEveryone: false });
        showToast("Mensagem apagada para você");
      }
    } catch (err) {
      showToast(errorMessage(err) || "Falha ao apagar mensagem", "error");
    }
  };

  const isOnline = Boolean(targetUser?.is_online || targetUser?.isOnline);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {}
      <View
        style={[
        styles.headerDirect,
        {
          paddingTop: topInset + 6,
          backgroundColor: colors.background,
          borderBottomColor: colors.border || "rgba(255, 255, 255, 0.08)"
        }]
        }>
        
        <IconButton name="arrow-left" onPress={onBack} label="Voltar" />

        <Pressable
          style={styles.headerUserPressable}
          onPress={() => onOpenProfile?.(targetUser)}>
          
          <View style={{ position: "relative" }}>
            <Avatar user={targetUser} size={42} />
            {isOnline &&
            <View
              style={[
              styles.onlineDotHeader,
              { borderColor: colors.background }]
              } />

            }
          </View>

          <View style={styles.headerUserText}>
            <View style={styles.nameBadgeRow}>
              <Text
                numberOfLines={1}
                style={[styles.headerUserName, { color: colors.text }]}>
                
                {userName(targetUser)}
              </Text>
              <VerificationBadge user={targetUser} size={14} />
            </View>
            <Text
              numberOfLines={1}
              style={[styles.headerUserHandle, { color: isOnline ? "#22c55e" : colors.muted }]}>
              
              {isOnline ?
              "● Online agora" :
              targetUser?.last_seen || targetUser?.lastSeen ?
              `Visto ${formatRelativeTime(targetUser?.last_seen || targetUser?.lastSeen)}` :
              `@${targetUser?.username || "usuario"}`}
            </Text>
          </View>
        </Pressable>

        <IconButton
          name="settings"
          onPress={() => setSettingsVisible(true)}
          label="Configurações" />
        
      </View>

      {}
      {mutualBlocked &&
      <View
        style={[
        styles.mutualBlockBanner,
        {
          backgroundColor: colors.surfaceAlt || "#18181b",
          borderColor: colors.border || "rgba(255, 255, 255, 0.1)"
        }]
        }>
        
          <View style={styles.mutualBlockHeader}>
            <Feather
            name="shield"
            size={18}
            color={colors.primary || "#0284c7"} />
          
            <Text style={[styles.mutualBlockTitle, { color: colors.text }]}>
              Mútua Seguição Necessária
            </Text>
          </View>
          <Text style={[styles.mutualBlockMessage, { color: colors.muted }]}>
            {blockedReason ||
          "Vocês precisam se seguir mutuamente para trocar mensagens diretas."}
          </Text>
          <Pressable
          style={[
          styles.followBackBtn,
          { backgroundColor: colors.primary || "#0284c7" }]
          }
          onPress={handleFollowBack}
          disabled={followingBack}>
          
            {followingBack ?
          <ActivityIndicator size="small" color="#ffffff" /> :

          <>
                <Feather
              name="user-plus"
              size={16}
              color="#ffffff"
              style={{ marginRight: 6 }} />
            
                <Text style={styles.followBackBtnText}>Seguir de Volta</Text>
              </>
          }
          </Pressable>
        </View>
      }

      {}
      <FlatList
        ref={flatListRef}
        data={messages}
        inverted
        keyExtractor={(item, index) => String(item.id || index)}
        contentContainerStyle={styles.chatListContent}
        onScroll={notifyChatScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const isMe =
          String(
            item.sender_id || item.userId || item.user_id || item.user?.id
          ) === String(currentUser?.id);

          const isFirstUnread = String(item.id) === String(firstUnreadId);

          const storyData = item.story || item.story_preview;
          const hasStory = !!(item.story_id || storyData);
          const audioUrl =
          item.audio_url ||
          item.audioUrl || (
          item.media_type === "audio" ? item.media_url : null);
          const mediaUrl = item.media_url || item.mediaUrl;
          const isSticker =
          item.media_type === "STICKER" || item.mediaType === "STICKER";
          const isVideo =
          !isSticker && (
          item.media_type === "VIDEO" ||
          item.mediaType === "VIDEO" ||
          String(mediaUrl || "").toLowerCase().endsWith(".mp4") ||
          String(mediaUrl || "").toLowerCase().includes("/videos/"));
          let isReelShare =
          item.media_type === "REEL_SHARE" ||
          item.media_type === "reel_share" ||
          item.mediaType === "REEL_SHARE" ||
          item.mediaType === "reel_share" ||
          item.type === "reel_share" ||
          item.type === "REEL_SHARE";
          let reelData = null;
          if (item.content) {
            if (typeof item.content === "object" && item.content !== null) {
              if (item.content.video_id || item.content.videoId || item.content.youtube_video_id) {
                reelData = item.content;
                isReelShare = true;
              }
            } else if (typeof item.content === "string") {
              const trimmed = item.content.trim();
              if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                try {
                  const parsed = JSON.parse(trimmed);
                  if (parsed && (parsed.video_id || parsed.videoId || parsed.youtube_video_id || parsed.thumbnail_url || parsed.thumbnailUrl)) {
                    reelData = parsed;
                    isReelShare = true;
                  }
                } catch (e) {}
              }
            }
          }
          const isPhoto = !!mediaUrl && !isVideo && !isSticker && !isReelShare;

          return (
            <View key={String(item.id)}>
              {isFirstUnread &&
              <View style={styles.unreadDividerContainer}>
                  <View style={[styles.unreadDividerLine, { backgroundColor: colors.border || "rgba(255, 255, 255, 0.12)" }]} />
                  <View style={[styles.unreadDividerBadge, { backgroundColor: colors.primary || "#0284c7" }]}>
                    <Feather name="bell" size={11} color="#ffffff" style={{ marginRight: 5 }} />
                    <Text style={styles.unreadDividerText}>Novas Mensagens Não Lidas</Text>
                  </View>
                  <View style={[styles.unreadDividerLine, { backgroundColor: colors.border || "rgba(255, 255, 255, 0.12)" }]} />
                </View>
              }

              {isSticker && mediaUrl && !(item.is_deleted || item.deleted_for_everyone) ?
              <View
                style={[
                styles.msgRow,
                isMe ? styles.msgRowMe : styles.msgRowOther,
                { marginVertical: 6 }]
                }>
                
                  <VideoStickerMessage
                  item={item}
                  isMe={isMe}
                  currentUser={currentUser}
                  onLongPress={() => handleOpenContextMenu(item)}
                  onDelete={() =>
                  setDeleteModal({
                    visible: true,
                    message: item,
                    forEveryone: isMe
                  })
                  } />
                
                </View> :

              <Pressable
                onLongPress={() => handleOpenContextMenu(item)}
                delayLongPress={200}
                style={[
                styles.msgRow,
                isMe ? styles.msgRowMe : styles.msgRowOther]
                }>
                
                  <View
                  style={[
                  styles.bubble,
                  isMe ?
                  [styles.bubbleMe, { backgroundColor: colors.primary || "#0284c7" }] :
                  [
                  styles.bubbleOther,
                  {
                    backgroundColor: colors.surfaceAlt || "#18181b",
                    borderColor: colors.border || "rgba(255, 255, 255, 0.06)"
                  }]]

                  }>
                  
                    {item.is_deleted || item.deleted_for_everyone ?
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Feather
                      name="slash"
                      size={14}
                      color={isMe ? "rgba(255,255,255,0.7)" : colors.muted} />
                    
                        <Text
                      style={[
                      styles.msgText,
                      {
                        color: isMe ? "rgba(255,255,255,0.7)" : colors.muted,
                        fontStyle: "italic"
                      }]
                      }>
                      
                          Esta mensagem foi apagada
                        </Text>
                      </View> :

                  <>
                        {hasStory &&
                    <View
                      style={[
                      styles.storyCardPreview,
                      {
                        backgroundColor: isMe ?
                        "rgba(0,0,0,0.25)" :
                        "rgba(255,255,255,0.06)"
                      }]
                      }>
                      
                            <View style={styles.storyCardHeader}>
                              <Feather
                          name="film"
                          size={12}
                          color={isMe ? "#ffffff" : colors.primary || "#0284c7"} />
                        
                              <Text
                          style={[
                          styles.storyCardLabel,
                          {
                            color: isMe ?
                            "rgba(255,255,255,0.9)" :
                            colors.text
                          }]
                          }>
                          
                                Story de @{targetUser?.username || "usuario"}
                              </Text>
                            </View>
                            {storyData?.mediaUrl &&
                      <Image
                        source={{ uri: storyData.mediaUrl }}
                        style={styles.storyCardThumbnail}
                        resizeMode="cover" />

                      }
                          </View>
                    }

                        {isReelShare && !!reelData &&
                    <ReelShareCard
                      reelData={reelData}
                      isMe={isMe}
                      onPress={(data) => {
                        const vId = data?.video_id || data?.videoId || data?.youtube_video_id;
                        if (vId) {
                          if (Platform.OS === "web" && typeof window !== "undefined") {
                            window.open(`https://www.youtube.com/shorts/${vId}`, "_blank");
                          } else {
                            Linking.openURL(`https://www.youtube.com/shorts/${vId}`).catch(() => {});
                          }
                        }
                      }} />

                    }

                        {isPhoto &&
                    <Pressable
                      onPress={() =>
                      setViewerMedia({
                        url: mediaUrl,
                        type: "image",
                        user: isMe ? currentUser : targetUser,
                        created_at: item.createdAt || item.created_at,
                        content: item.content || "",
                        message: item
                      })
                      }
                      onLongPress={() => handleOpenContextMenu(item)}
                      delayLongPress={200}
                      style={styles.mediaContainer}>
                      
                            <Image
                        source={{ uri: mediaUrl }}
                        style={styles.chatImage}
                        resizeMode="cover" />
                      
                          </Pressable>
                    }

                        {isVideo &&
                    <ChatVideoThumbnail
                      url={mediaUrl}
                      onPress={() =>
                      setViewerMedia({
                        url: mediaUrl,
                        type: "video",
                        user: isMe ? currentUser : targetUser,
                        created_at: item.createdAt || item.created_at,
                        content: item.content || "",
                        message: item
                      })
                      }
                      onLongPress={() => handleOpenContextMenu(item)} />

                    }

                        {!!audioUrl &&
                    <AudioMessagePlayer audioUrl={audioUrl} isMe={isMe} />
                    }

                        {!!item.content && !isReelShare &&
                    <Text
                      style={[
                      styles.msgText,
                      { color: isMe ? "#FFFFFF" : colors.text }]
                      }>
                      
                            {item.content}
                          </Text>
                    }
                      </>
                  }

                    <View style={styles.msgMetaRow}>
                      <Text
                      style={[
                      styles.msgTime,
                      {
                        color: isMe ?
                        "rgba(255, 255, 255, 0.75)" :
                        colors.muted || "#a1a1aa"
                      }]
                      }>
                      
                        {formatRelativeTime(item.createdAt || item.created_at)}
                        {(item.is_edited || item.isEdited) &&
                      !(item.is_deleted || item.deleted_for_everyone) ?
                      " (editada)" :
                      ""}
                      </Text>

                      {isMe && !(item.is_deleted || item.deleted_for_everyone) &&
                    <View style={{ flexDirection: "row", marginLeft: 4 }}>
                          {item.read_at || item.isRead ?
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <Ionicons name="checkmark-done" size={15} color="#38bdf8" />
                            </View> :

                      <Ionicons
                        name="checkmark"
                        size={14}
                        color="rgba(255, 255, 255, 0.7)" />

                      }
                        </View>
                    }
                    </View>
                  </View>
                </Pressable>
              }
            </View>);

        }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
        !loading &&
        <EmptyState icon="message-circle">
              Sem mensagens ainda. Envie uma figurinha ou diga olá!
            </EmptyState>

        } />
      

      {}
      <View
        style={[
        styles.composerContainer,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border || "rgba(255, 255, 255, 0.08)",
          paddingBottom:
          keyboardHeight > 0 ?
          keyboardHeight + 8 :
          Math.max(insets.bottom + 8, 16)
        }]
        }>
        
        {isRecording ?

        <View
          style={[
          styles.recordingBar,
          {
            backgroundColor: colors.surfaceAlt || "#18181b",
            borderColor: "rgba(239, 68, 68, 0.3)"
          }]
          }>
          
            <View style={styles.recordingLiveInfo}>
              <View style={styles.recordingDot} />
              <Feather name="mic" size={18} color="#ef4444" style={{ marginRight: 8 }} />
              <Text style={[styles.recordingTimerText, { color: colors.text }]}>
                {formatAudioTime(recordSeconds * 1000)}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
              onPress={cancelRecording}
              style={styles.trashRecordBtn}
              accessibilityLabel="Cancelar gravação">
              
                <Feather name="trash-2" size={18} color="#ef4444" />
              </Pressable>

              <Pressable
              onPress={stopAndSendRecording}
              style={({ pressed }) => [
              styles.sendRecordBtn,
              {
                backgroundColor: colors.primary || "#0284c7",
                opacity: pressed ? 0.85 : 1
              }]
              }
              accessibilityLabel="Enviar áudio">
              
                <Feather name="send" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View> :


        <>
            {editingMessage &&
          <View
            style={[
            styles.editingBanner,
            {
              backgroundColor: colors.surfaceAlt || "#18181b",
              borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
            }]
            }>
            
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Feather
                name="edit-2"
                size={14}
                color={colors.primary || "#0284c7"} />
              
                  <Text
                style={{
                  color: colors.text,
                  fontSize: 12.5,
                  fontFamily: "Poppins_500Medium"
                }}>
                
                    Editando mensagem
                  </Text>
                </View>
                <Pressable
              onPress={() => {
                setEditingMessage(null);
                setContent("");
              }}
              style={{ padding: 4 }}>
              
                  <Feather name="x" size={16} color={colors.muted} />
                </Pressable>
              </View>
          }

            <View
            style={[
            styles.composerInputWrapper,
            {
              backgroundColor: colors.surfaceAlt || "#18181b",
              borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
            }]
            }>
            
              {}
              {selectedMedia &&
            <View style={styles.selectedMediaPreview}>
                  <Image
                source={{ uri: selectedMedia.uri }}
                style={styles.selectedMediaThumb} />
              
                  <Pressable
                onPress={() => setSelectedMedia(null)}
                style={styles.removeMediaBtn}>
                
                    <Feather name="x" size={14} color="#fff" />
                  </Pressable>
                  <Pressable
                onPress={() => setIsViewOnce(!isViewOnce)}
                style={[
                styles.viewOnceBadge,
                {
                  backgroundColor: isViewOnce ?
                  colors.primary || "#0284c7" :
                  "rgba(0, 0, 0, 0.6)"
                }]
                }>
                
                    <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Poppins_700Bold" }}>
                      1x
                    </Text>
                  </Pressable>
                </View>
            }

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {}
                <Pressable
                onPress={pickMedia}
                style={styles.inputActionBtn}
                accessibilityLabel="Anexar foto ou vídeo">
                
                  <Feather
                  name="image"
                  size={21}
                  color={colors.primary || "#0284c7"} />
                
                </Pressable>

                {}
                <Pressable
                onPress={() => setStickerPickerVisible(true)}
                style={styles.inputActionBtn}
                accessibilityLabel="Abrir figurinhas">
                
                  <MaterialCommunityIcons
                  name="sticker-emoji"
                  size={22}
                  color="#f59e0b" />
                
                </Pressable>

                {}
                <TextInput
                placeholder={
                mutualBlocked ?
                "Mútua seguição necessária..." :
                "Mensagem..."
                }
                placeholderTextColor={colors.muted || "#71717a"}
                value={content}
                onChangeText={setContent}
                style={[
                styles.textInputMain,
                { color: colors.text }]
                }
                editable={!mutualBlocked && !sending}
                multiline />
              
              </View>
            </View>

            {}
            {content.trim().length > 0 || selectedMedia ?
          <Pressable
            style={({ pressed }) => [
            styles.sendCircleBtn,
            {
              backgroundColor: colors.primary || "#0284c7",
              opacity: pressed ? 0.85 : 1
            }]
            }
            onPress={handleSend}
            disabled={mutualBlocked || sending}
            accessibilityLabel="Enviar mensagem">
            
                {sending ?
            <ActivityIndicator size="small" color="#FFFFFF" /> :

            <Feather
              name="send"
              size={18}
              color="#ffffff"
              style={{ marginLeft: -1, marginTop: 1 }} />

            }
              </Pressable> :

          <Pressable
            style={({ pressed }) => [
            styles.sendCircleBtn,
            {
              backgroundColor: mutualBlocked ?
              "#27272a" :
              colors.primary || "#0284c7",
              opacity: pressed ? 0.85 : 1
            }]
            }
            onPress={startRecording}
            disabled={mutualBlocked || sending}
            accessibilityLabel="Gravar mensagem de voz">
            
                <Feather
              name="mic"
              size={20}
              color={mutualBlocked ? colors.muted : "#ffffff"} />
            
              </Pressable>
          }
          </>
        }
      </View>

      {}
      <StickerPickerModal
        visible={stickerPickerVisible}
        onClose={() => setStickerPickerVisible(false)}
        onSelectSticker={handleSelectSticker}
        onOpenCreateModal={() => {
          setStickerPickerVisible(false);
          setCreateStickerVisible(true);
        }}
        currentUser={currentUser} />
      

      {}
      <CreateVideoStickerModal
        visible={createStickerVisible}
        onClose={() => setCreateStickerVisible(false)}
        currentUser={currentUser}
        onStickerCreated={(newSticker) => {
          setCreateStickerVisible(false);
          showToast("Figurinha criada com sucesso!");
          if (newSticker) {
            handleSelectSticker(newSticker);
          }
        }}
        onShowGoldModal={() => setGoldModalVisible(true)} />
      

      {}
      <GoldBadgeModal
        visible={goldModalVisible}
        onClose={() => setGoldModalVisible(false)} />
      

      {}
      <MediaViewerModal
        visible={Boolean(viewerMedia)}
        mediaUrl={viewerMedia?.url}
        isVideo={viewerMedia?.isVideo}
        onClose={() => setViewerMedia(null)}
        onDelete={
        viewerMedia?.message &&
        String(viewerMedia.message.sender_id || viewerMedia.message.userId) === String(currentUser?.id) ?
        () => {
          const msg = viewerMedia.message;
          setViewerMedia(null);
          setDeleteModal({
            visible: true,
            message: msg,
            forEveryone: true
          });
        } :
        null
        } />
      

      {}
      <MediaContextMenuSheet
        visible={contextMenu.visible}
        message={contextMenu.message}
        currentUser={currentUser}
        onClose={() => setContextMenu({ visible: false, message: null })}
        onSaveToGallery={() => {
          const msg = contextMenu.message;
          setContextMenu({ visible: false, message: null });
          handleSaveToGallery(msg);
        }}
        onSaveSticker={() => {
          const msg = contextMenu.message;
          setContextMenu({ visible: false, message: null });
          handleSaveSticker(msg);
        }}
        onReply={() => {
          const msg = contextMenu.message;
          setContextMenu({ visible: false, message: null });
          if (msg?.content) {
            setContent(`> ${msg.content}\n`);
          }
        }}
        onDeleteForMe={() => {
          const msg = contextMenu.message;
          setContextMenu({ visible: false, message: null });
          setDeleteModal({
            visible: true,
            message: msg,
            forEveryone: false
          });
        }}
        onDeleteForEveryone={() => {
          const msg = contextMenu.message;
          setContextMenu({ visible: false, message: null });
          setDeleteModal({
            visible: true,
            message: msg,
            forEveryone: true
          });
        }} />
      

      {}
      <ConfirmDeleteModal
        visible={deleteModal.visible}
        forEveryone={deleteModal.forEveryone}
        onClose={() => setDeleteModal({ visible: false, message: null, forEveryone: false })}
        onConfirm={confirmDeleteMessage} />
      

      {}
      <TriboModernToast
        visible={toast.visible}
        text={toast.text}
        type={toast.type}
        onDismiss={() => setToast({ visible: false, text: "", type: "success" })} />
      

      {}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}>
        
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSettingsVisible(false)}>
          
          <Pressable
            style={[
            styles.modalContent,
            {
              backgroundColor: colors.background || "#121214",
              borderTopColor: colors.border || "rgba(255, 255, 255, 0.1)",
              paddingBottom: Math.max(insets.bottom + 24, 36)
            }]
            }
            onPress={(e) => e.stopPropagation()}>
            
            <View style={styles.sheetHandle} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Configurações da Conversa
            </Text>

            <View style={{ marginTop: 16 }}>
              <View style={styles.settingRow}>
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Status Online / Visto por Último
                </Text>
                <Switch
                  value={showOnlineStatus}
                  onValueChange={(val) => {
                    setShowOnlineStatus(val);
                    api.users.
                    updateSettings({ showOnlineStatus: val }).
                    catch(() => {});
                  }}
                  trackColor={{
                    false: "#27272a",
                    true: colors.primary || "#0284c7"
                  }}
                  thumbColor="#FFFFFF" />
                
              </View>

              <View style={styles.settingRow}>
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Confirmação de Leitura
                </Text>
                <Switch
                  value={readReceipts}
                  onValueChange={(val) => {
                    setReadReceipts(val);
                    api.users.
                    updateSettings({ readReceipts: val }).
                    catch(() => {});
                  }}
                  trackColor={{
                    false: "#27272a",
                    true: colors.primary || "#0284c7"
                  }}
                  thumbColor="#FFFFFF" />
                
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>);

}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  headerModern: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1
  },
  headerDirect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17
  },
  headerUserPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 10
  },
  headerUserText: {
    flex: 1
  },
  headerUserName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14.5
  },
  headerUserHandle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11.5,
    marginTop: 1
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  onlineDotHeader: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#22c55e",
    borderWidth: 2
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    height: 44
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22c55e",
    borderWidth: 2
  },
  convDetails: {
    flex: 1
  },
  convTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  convName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14.5,
    flexShrink: 1
  },
  convTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11
  },
  convBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 3
  },
  convPreview: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    flex: 1,
    marginRight: 8
  },
  convPreviewBold: {
    fontFamily: "Poppins_600SemiBold"
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  unreadCountText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 11,
    color: "#ffffff"
  },
  mutualBlockBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center"
  },
  mutualBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6
  },
  mutualBlockTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 14
  },
  mutualBlockMessage: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    textAlign: "center",
    marginBottom: 14
  },
  followBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16
  },
  followBackBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#ffffff"
  },
  chatListContent: {
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  msgRow: {
    marginVertical: 3,
    flexDirection: "row"
  },
  msgRowMe: {
    justifyContent: "flex-end"
  },
  msgRowOther: {
    justifyContent: "flex-start"
  },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18
  },
  bubbleMe: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4
  },
  bubbleOther: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1
  },
  msgText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 20
  },
  msgMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 3
  },
  msgTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5
  },
  mediaContainer: {
    borderRadius: 14,
    overflow: "hidden",
    marginVertical: 4
  },
  chatImage: {
    width: 220,
    height: 220,
    borderRadius: 14
  },
  chatVideoBox: {
    width: 220,
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#18181b",
    position: "relative"
  },
  chatVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)"
  },
  chatVideoPlayBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center"
  },
  storyCardPreview: {
    padding: 8,
    borderRadius: 12,
    marginBottom: 6
  },
  storyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6
  },
  storyCardLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11
  },
  storyCardThumbnail: {
    width: "100%",
    height: 120,
    borderRadius: 8
  },
  composerContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8
  },
  composerInputWrapper: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 46,
    justifyContent: "center"
  },
  textInputMain: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 20,
    maxHeight: 110,
    paddingVertical: 4
  },
  inputActionBtn: {
    padding: 6
  },
  sendCircleBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1
  },
  selectedMediaPreview: {
    position: "relative",
    marginBottom: 8,
    alignSelf: "flex-start"
  },
  selectedMediaThumb: {
    width: 80,
    height: 80,
    borderRadius: 10
  },
  removeMediaBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    padding: 3
  },
  viewOnceBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  recordingBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 48
  },
  recordingLiveInfo: {
    flexDirection: "row",
    alignItems: "center"
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    marginRight: 8
  },
  recordingTimerText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14
  },
  trashRecordBtn: {
    padding: 8,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.12)"
  },
  sendRecordBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  editingBanner: {
    position: "absolute",
    top: -38,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end"
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 24
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 16
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  settingText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14
  },
  audioPlayerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    minWidth: 190,
    maxWidth: 240,
    gap: 10
  },
  audioPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  audioProgressWrapper: {
    flex: 1,
    justifyContent: "center"
  },
  audioTrack: {
    height: 4,
    borderRadius: 2,
    width: "100%",
    position: "relative",
    justifyContent: "center",
    marginBottom: 4
  },
  audioFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2
  },
  audioTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  audioTimeText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5
  },
  audioSpeedPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32
  },
  audioSpeedText: {
    fontSize: 10.5
  },
  unreadDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    paddingHorizontal: 8
  },
  unreadDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth
  },
  unreadDividerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginHorizontal: 8,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  unreadDividerText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11.5
  }
});