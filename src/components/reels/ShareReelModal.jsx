import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
  const [activeTab, setActiveTab] = useState("direct");
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState("");
  const [sendingTargetId, setSendingTargetId] = useState(null);
  const [sentTargetIds, setSentTargetIds] = useState(new Set());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [convRes, groupsRes] = await Promise.all([
        api.messages.conversations().catch(() => []),
        api.groups.list().catch(() => [])
      ]);

      const convList = Array.isArray(convRes) ? convRes : convRes?.conversations || [];
      const groupsList = Array.isArray(groupsRes) ? groupsRes : groupsRes?.groups || [];

      setConversations(convList);
      setGroups(groupsList);
    } catch (err) {
      console.warn("[ShareReelModal] Erro ao carregar dados de compartilhamento:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadData();
      setSentTargetIds(new Set());
      setFilterText("");
    }
  }, [visible, loadData]);

  const getReelPayload = () => {
    if (!reel) return null;
    return {
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
  };

  const handleSendToUser = async (targetUser) => {
    const targetUserId = targetUser?.id || targetUser?.userId || targetUser?._id;
    if (!targetUserId || sendingTargetId || sentTargetIds.has(`user_${targetUserId}`) || !reel) return;

    try {
      setSendingTargetId(`user_${targetUserId}`);
      const payload = getReelPayload();

      await api.messages.send({
        receiver_id: targetUserId,
        recipient_id: targetUserId,
        type: "reel_share",
        media_type: "REEL_SHARE",
        content: JSON.stringify(payload)
      });

      setSentTargetIds((prev) => new Set([...prev, `user_${targetUserId}`]));
      if (onSent) {
        onSent(targetUser, payload, "direct");
      }
    } catch (err) {
      console.warn("[ShareReelModal] Erro ao enviar reel para usuário:", err);
    } finally {
      setSendingTargetId(null);
    }
  };

  const handleSendToGroup = async (group) => {
    const groupId = group?.id || group?._id;
    if (!groupId || sendingTargetId || sentTargetIds.has(`group_${groupId}`) || !reel) return;

    try {
      setSendingTargetId(`group_${groupId}`);
      const payload = getReelPayload();

      await api.groups.sendMessage(groupId, {
        content: JSON.stringify(payload),
        media_type: "REEL_SHARE",
        mediaType: "REEL_SHARE",
        type: "reel_share"
      });

      setSentTargetIds((prev) => new Set([...prev, `group_${groupId}`]));
      if (onSent) {
        onSent(group, payload, "group");
      }
    } catch (err) {
      console.warn("[ShareReelModal] Erro ao enviar reel para grupo:", err);
    } finally {
      setSendingTargetId(null);
    }
  };

  const handleNativeShare = async () => {
    try {
      const vId = reel?.videoId || reel?.video_id;
      const shareUrl = reel?.videoUrl || `https://www.youtube.com/shorts/${vId}`;
      await Share.share({
        message: `${reel?.title || "Reel da Tribo"}\n\nAssista no Tribo: ${shareUrl}`,
        url: shareUrl
      });
      onClose();
    } catch (err) {
      console.warn("Erro ao compartilhar externamente:", err);
    }
  };

  const filteredConversations = conversations.filter((item) => {
    const userObj = item.contact || item.user || item.participant || {};
    const name = (userName(userObj) || "").toLowerCase();
    const handle = (userObj.username || "").toLowerCase();
    const q = filterText.toLowerCase();
    return name.includes(q) || handle.includes(q);
  });

  const filteredGroups = groups.filter((g) => {
    const name = (g.name || g.title || "").toLowerCase();
    const q = filterText.toLowerCase();
    return name.includes(q);
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
            }
          ]}>
          <View style={styles.handleBar} />

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

          <View style={styles.tabBar}>
            <Pressable
              onPress={() => setActiveTab("direct")}
              style={[
                styles.tabItem,
                activeTab === "direct" && {
                  backgroundColor: colors.surfaceAlt || "#27272a",
                  borderColor: colors.primary || "#3b82f6"
                }
              ]}>
              <Feather
                name="message-circle"
                size={15}
                color={activeTab === "direct" ? colors.primary || "#3b82f6" : colors.muted || "#a1a1aa"}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "direct"
                        ? colors.text
                        : colors.muted || "#a1a1aa",
                    fontFamily:
                      activeTab === "direct"
                        ? "Poppins_600SemiBold"
                        : "Poppins_400Regular"
                  }
                ]}>
                Chat Privado
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab("tribos")}
              style={[
                styles.tabItem,
                activeTab === "tribos" && {
                  backgroundColor: colors.surfaceAlt || "#27272a",
                  borderColor: colors.primary || "#3b82f6"
                }
              ]}>
              <Ionicons
                name="people"
                size={16}
                color={activeTab === "tribos" ? colors.primary || "#3b82f6" : colors.muted || "#a1a1aa"}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === "tribos"
                        ? colors.text
                        : colors.muted || "#a1a1aa",
                    fontFamily:
                      activeTab === "tribos"
                        ? "Poppins_600SemiBold"
                        : "Poppins_400Regular"
                  }
                ]}>
                Grupos da Tribo
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.surfaceAlt || "#27272a",
                borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
              }
            ]}>
            <Feather name="search" size={16} color={colors.muted || "#a1a1aa"} style={{ marginRight: 8 }} />
            <TextInput
              placeholder={
                activeTab === "direct"
                  ? "Buscar amigos ou conversas..."
                  : "Buscar grupos da Tribo..."
              }
              placeholderTextColor={colors.muted || "#71717a"}
              value={filterText}
              onChangeText={setFilterText}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {!!filterText && (
              <Pressable onPress={() => setFilterText("")} style={{ padding: 4 }}>
                <Feather name="x" size={14} color={colors.muted || "#a1a1aa"} />
              </Pressable>
            )}
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={colors.primary || "#3b82f6"} />
              <Text style={[styles.loadingText, { color: colors.muted || "#a1a1aa" }]}>
                Carregando...
              </Text>
            </View>
          ) : activeTab === "direct" ? (
            filteredConversations.length === 0 ? (
              <View style={styles.centerContainer}>
                <Feather name="message-square" size={32} color={colors.muted || "#71717a"} />
                <Text style={[styles.emptyText, { color: colors.muted || "#a1a1aa" }]}>
                  {filterText ? "Nenhum amigo encontrado" : "Nenhuma conversa recente"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredConversations}
                keyExtractor={(item, index) => String(item.id || item.contact?.id || index)}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const targetUser = item.contact || item.user || item.participant || {};
                  const targetUserId = targetUser?.id || targetUser?.userId;
                  const key = `user_${targetUserId}`;
                  const isSending = sendingTargetId === key;
                  const isSent = sentTargetIds.has(key);

                  return (
                    <View
                      style={[
                        styles.userRow,
                        {
                          borderBottomColor: colors.border || "rgba(255, 255, 255, 0.05)"
                        }
                      ]}>
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
                          isSent
                            ? styles.sentBtn
                            : { backgroundColor: colors.primary || "#3b82f6" }
                        ]}>
                        {isSending ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : isSent ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Feather name="check" size={14} color="#22c55e" />
                            <Text style={styles.sentBtnText}>Enviado</Text>
                          </View>
                        ) : (
                          <Text style={styles.sendBtnText}>Enviar</Text>
                        )}
                      </Pressable>
                    </View>
                  );
                }}
              />
            )
          ) : (
            filteredGroups.length === 0 ? (
              <View style={styles.centerContainer}>
                <Ionicons name="people-outline" size={32} color={colors.muted || "#71717a"} />
                <Text style={[styles.emptyText, { color: colors.muted || "#a1a1aa" }]}>
                  {filterText ? "Nenhum grupo encontrado" : "Você ainda não participa de nenhuma Tribo"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredGroups}
                keyExtractor={(item, index) => String(item.id || item._id || index)}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const groupId = item.id || item._id;
                  const key = `group_${groupId}`;
                  const isSending = sendingTargetId === key;
                  const isSent = sentTargetIds.has(key);

                  return (
                    <View
                      style={[
                        styles.userRow,
                        {
                          borderBottomColor: colors.border || "rgba(255, 255, 255, 0.05)"
                        }
                      ]}>
                      <View style={styles.userInfo}>
                        <Avatar
                          url={item.avatarUrl || item.avatar_url || item.image || item.photo || item.icon}
                          size={44}
                          fallback={item.name || item.title || "T"}
                        />
                        <View style={styles.nameDetails}>
                          <Text numberOfLines={1} style={[styles.userNameText, { color: colors.text }]}>
                            {item.name || item.title || "Grupo da Tribo"}
                          </Text>
                          <Text numberOfLines={1} style={[styles.userHandleText, { color: colors.muted || "#a1a1aa" }]}>
                            {item.members_count ? `${item.members_count} membros` : item.memberCount ? `${item.memberCount} membros` : "Grupo ativo"}
                          </Text>
                        </View>
                      </View>

                      <Pressable
                        onPress={() => handleSendToGroup(item)}
                        disabled={isSending || isSent}
                        style={[
                          styles.sendBtn,
                          isSent
                            ? styles.sentBtn
                            : { backgroundColor: colors.primary || "#3b82f6" }
                        ]}>
                        {isSending ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : isSent ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Feather name="check" size={14} color="#22c55e" />
                            <Text style={styles.sentBtnText}>Enviado</Text>
                          </View>
                        ) : (
                          <Text style={styles.sendBtnText}>Enviar</Text>
                        )}
                      </Pressable>
                    </View>
                  );
                }}
              />
            )
          )}

          <View style={styles.footerAction}>
            <Pressable
              onPress={handleNativeShare}
              style={[
                styles.nativeShareBtn,
                {
                  backgroundColor: colors.surfaceAlt || "#27272a",
                  borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
                }
              ]}>
              <Ionicons name="share-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.nativeShareText, { color: colors.text }]}>
                Compartilhar em outros aplicativos (WhatsApp, Insta, etc.)
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end"
  },
  sheetContainer: {
    height: "75%",
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
    marginBottom: 12
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold"
  },
  closeBtn: {
    padding: 6
  },
  tabBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 6
  },
  tabText: {
    fontSize: 12.5
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: "Poppins_400Regular",
    padding: 0
  },
  listContent: {
    paddingBottom: 16
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
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)"
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
    paddingVertical: 30,
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
  },
  footerAction: {
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 8
  },
  nativeShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1
  },
  nativeShareText: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium"
  }
});