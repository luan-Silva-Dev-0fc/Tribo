import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api } from "../../api";
import { Avatar, EmptyState, IconButton, VerificationBadge } from "../../components/ui/ui";
import { formatRelativeTime, listFrom, userName } from "../../lib/format";
import { useTheme } from "../../theme";
import { getChatSocket } from "../../services/chatSocket";
import { NativeOptimization } from "../../services/nativeOptimization";
import { ChatCache } from "../../services/chatCache";

export function ConversationsListScreen({
  user,
  onBack,
  onOpenChat,
  onOpenProfile
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState(() => ChatCache.getConversationsSync() || []);
  const [loading, setLoading] = useState(() => !(ChatCache.getConversationsSync()?.length > 0));
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
      const list = Array.isArray(res) ? res : res?.conversations || res?.data || [];
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
            new Date(groups.get(targetId).createdAt) < new Date(msg.createdAt)
          ) {
            groups.set(targetId, {
              id: targetId,
              user: target,
              last_message: msg,
              content: msg.content,
              createdAt: msg.createdAt,
              unread_count: msg.isRead === false && msg.user?.id !== user?.id ? 1 : 0
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
      <View
        style={[
          styles.headerModern,
          {
            paddingTop: topInset + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border || "rgba(255, 255, 255, 0.08)"
          }
        ]}
      >
        <IconButton name="arrow-left" onPress={onBack} label="Voltar" />
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mensagens</Text>
          <Text style={{ fontSize: 11.5, color: colors.muted, fontFamily: "Poppins_400Regular" }}>
            Conversas Privadas
          </Text>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <View
        style={[
          styles.searchBarContainer,
          {
            backgroundColor: colors.surfaceAlt || "#18181b",
            borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
          }
        ]}
      >
        <Feather
          name="search"
          size={18}
          color={colors.muted || "#a1a1aa"}
          style={{ marginRight: 8 }}
        />
        <TextInput
          placeholder="Buscar conversas..."
          placeholderTextColor={colors.muted || "#71717a"}
          value={filterText}
          onChangeText={setFilterText}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {!!filterText && (
          <Pressable onPress={() => setFilterText("")} style={{ padding: 4 }}>
            <Feather name="x" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item, index) => String(item.id || item.user?.id || index)}
        refreshing={loading}
        onRefresh={loadConversations}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom + 24, 40) }
        ]}
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
          } else if (
            lastMsg.media_type === "REEL_SHARE" ||
            lastMsg.media_type === "reel_share" ||
            lastMsg.type === "reel_share"
          ) {
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
                }
              ]}
              onPress={() => handleOpenUserChat(otherUser)}
            >
              <View style={{ position: "relative" }}>
                <Avatar user={otherUser} size={50} />
                {isOnline && (
                  <View
                    style={[
                      styles.onlineDot,
                      { borderColor: colors.card || "#18181b" }
                    ]}
                  />
                )}
              </View>

              <View style={styles.convDetails}>
                <View style={styles.convTopRow}>
                  <View style={styles.nameBadgeRow}>
                    <Text
                      numberOfLines={1}
                      style={[styles.convName, { color: colors.text }]}
                    >
                      {userName(otherUser)}
                    </Text>
                    <VerificationBadge user={otherUser} size={14} />
                  </View>
                  <Text style={[styles.convTime, { color: colors.muted }]}>
                    {formatRelativeTime(lastMsg.createdAt || lastMsg.created_at)}
                  </Text>
                </View>

                <View style={styles.convBottomRow}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.convPreview,
                      { color: isUnread ? colors.text : colors.muted },
                      isUnread && styles.convPreviewBold
                    ]}
                  >
                    {previewText}
                  </Text>

                  {isUnread && (
                    <View
                      style={[
                        styles.unreadBadge,
                        { backgroundColor: colors.primary || "#0284c7" }
                      ]}
                    >
                      <Text style={styles.unreadCountText}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading && (
            <EmptyState icon="message-square">
              Nenhuma conversa encontrada.
            </EmptyState>
          )
        }
      />
    </View>
  );
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
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    borderWidth: 1
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    paddingVertical: 0
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 8
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#22c55e",
    borderWidth: 2
  },
  convDetails: {
    flex: 1,
    justifyContent: "center",
    gap: 3
  },
  convTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginRight: 8
  },
  convName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14.5
  },
  convTime: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11
  },
  convBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  convPreview: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    flex: 1
  },
  convPreviewBold: {
    fontFamily: "Poppins_600SemiBold"
  },
  unreadBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  unreadCountText: {
    color: "#ffffff",
    fontFamily: "Poppins_700Bold",
    fontSize: 10.5
  }
});
