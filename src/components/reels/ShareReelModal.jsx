import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View } from
"react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { api } from "../../api";
import { Avatar, VerificationBadge } from "../ui/ui";
import { userName } from "../../lib/format";
import { useTheme } from "../../theme";

export function ShareReelModal({
  visible,
  reel,
  onClose,
  onSent
}) {
  const { colors } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [sendingToUserId, setSendingToUserId] = useState(null);
  const [sentUserIds, setSentUserIds] = useState(new Set());

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.messages.conversations();
      const list = Array.isArray(res) ? res : res?.conversations || [];
      setConversations(list);
    } catch (err) {
      console.warn("[ShareReelModal] Erro ao carregar conversas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadConversations();
      setSentUserIds(new Set());
      setFilterText("");
    }
  }, [visible, loadConversations]);

  const handleSendToUser = async (targetUser) => {
    const targetUserId = targetUser?.id || targetUser?.userId || targetUser?._id;
    if (!targetUserId || sendingToUserId || sentUserIds.has(targetUserId) || !reel) return;

    try {
      setSendingToUserId(targetUserId);

      const reelPayload = {
        id: reel.id || reel._id,
        title: reel.title || "Reel da Tribo",
        video_id: reel.videoId || reel.video_id || reel.youtube_video_id,
        thumbnail_url:
        reel.thumbnail_url ||
        reel.thumbnailUrl ||
        `https://img.youtube.com/vi/${reel.videoId || reel.video_id}/hqdefault.jpg`,
        author_name:
        reel.author_name ||
        reel.authorName ||
        reel.channel ||
        reel.channelTitle ||
        "Tribo"
      };

      await api.messages.send({
        recipient_id: targetUserId,
        type: "reel_share",
        media_type: "REEL_SHARE",
        content: JSON.stringify(reelPayload)
      });

      setSentUserIds((prev) => new Set([...prev, targetUserId]));
      if (onSent) {
        onSent(targetUser, reelPayload);
      }
    } catch (err) {
      console.warn("[ShareReelModal] Erro ao enviar reel:", err);
    } finally {
      setSendingToUserId(null);
    }
  };

  const filtered = conversations.filter((item) => {
    const userObj = item.contact || item.user || item.participant || {};
    const name = (userName(userObj) || "").toLowerCase();
    const handle = (userObj.username || "").toLowerCase();
    const q = filterText.toLowerCase();
    return name.includes(q) || handle.includes(q);
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View
          style={[
          styles.sheetContainer,
          {
            backgroundColor: colors.surface || "#18181b",
            borderColor: colors.border || "rgba(255, 255, 255, 0.1)"
          }]
          }>
          
          {}
          <View style={styles.handleBar} />

          {}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="share-social" size={20} color={colors.primary || "#3b82f6"} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Compartilhar Reel
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.muted || "#a1a1aa"} />
            </Pressable>
          </View>

          {}
          <View
            style={[
            styles.searchBar,
            {
              backgroundColor: colors.surfaceAlt || "#27272a",
              borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
            }]
            }>
            
            <Feather name="search" size={16} color={colors.muted || "#a1a1aa"} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Buscar amigos ou conversas..."
              placeholderTextColor={colors.muted || "#71717a"}
              value={filterText}
              onChangeText={setFilterText}
              style={[styles.searchInput, { color: colors.text }]} />
            
            {!!filterText &&
            <Pressable onPress={() => setFilterText("")} style={{ padding: 4 }}>
                <Feather name="x" size={14} color={colors.muted || "#a1a1aa"} />
              </Pressable>
            }
          </View>

          {}
          {loading ?
          <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={colors.primary || "#3b82f6"} />
              <Text style={[styles.loadingText, { color: colors.muted || "#a1a1aa" }]}>
                Carregando conversas...
              </Text>
            </View> :
          filtered.length === 0 ?
          <View style={styles.centerContainer}>
              <Feather name="message-square" size={32} color={colors.muted || "#71717a"} />
              <Text style={[styles.emptyText, { color: colors.muted || "#a1a1aa" }]}>
                {filterText ? "Nenhum amigo encontrado" : "Nenhuma conversa recente"}
              </Text>
            </View> :

          <FlatList
            data={filtered}
            keyExtractor={(item, index) => String(item.id || item.contact?.id || index)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const targetUser = item.contact || item.user || item.participant || {};
              const targetUserId = targetUser?.id || targetUser?.userId;
              const isSending = sendingToUserId === targetUserId;
              const isSent = sentUserIds.has(targetUserId);

              return (
                <View
                  style={[
                  styles.userRow,
                  {
                    borderBottomColor: colors.border || "rgba(255, 255, 255, 0.05)"
                  }]
                  }>
                  
                    <View style={styles.userInfo}>
                      <Avatar user={targetUser} size={44} />
                      <View style={styles.nameDetails}>
                        <View style={styles.nameRow}>
                          <Text numberOfLines={1} style={[styles.userNameText, { color: colors.text }]}>
                            {userName(targetUser)}
                          </Text>
                          <VerificationBadge user={targetUser} size={14} />
                        </View>
                        <Text numberOfLines={1} style={[styles.userHandleText, { color: colors.muted || "#a1a1aa" }]}>
                          @{targetUser.username || "usuario"}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                    onPress={() => handleSendToUser(targetUser)}
                    disabled={isSending || isSent}
                    style={[
                    styles.sendBtn,
                    isSent ?
                    styles.sentBtn :
                    { backgroundColor: colors.primary || "#3b82f6" }]
                    }>
                    
                      {isSending ?
                    <ActivityIndicator size="small" color="#ffffff" /> :
                    isSent ?
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Feather name="check" size={14} color="#22c55e" />
                          <Text style={styles.sentBtnText}>Enviado</Text>
                        </View> :

                    <Text style={styles.sendBtnText}>Enviar</Text>
                    }
                    </Pressable>
                  </View>);

            }} />

          }
        </View>
      </View>
    </Modal>);

}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end"
  },
  sheetContainer: {
    height: "65%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 12
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold"
  },
  closeBtn: {
    padding: 6
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: "Poppins_400Regular",
    padding: 0
  },
  listContent: {
    paddingBottom: 20
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12
  },
  nameDetails: {
    marginLeft: 12,
    flex: 1
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  userNameText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold"
  },
  userHandleText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 1
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 74
  },
  sendBtnText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontFamily: "Poppins_600SemiBold"
  },
  sentBtn: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)"
  },
  sentBtnText: {
    color: "#22c55e",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold"
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular"
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    textAlign: "center"
  }
});