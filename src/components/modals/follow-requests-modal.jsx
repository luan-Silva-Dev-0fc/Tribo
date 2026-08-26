import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View } from
"react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { api } from "../../api";
import {
  errorMessage,
  formatRelativeTime,
  getUserAvatar,
  listFrom,
  userName } from
"../../lib/format";
import { useTheme } from "../../theme";
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  VerificationBadge } from
"../ui/ui";
import { CustomModal } from "./CustomModal";

export function FollowRequestsModal({
  visible,
  onClose,
  onOpenProfile,
  onOpenPost,
  onRequestHandled
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [activeTab, setActiveTab] = useState("notifications");
  const [modalAlert, setModalAlert] = useState({
    visible: false,
    type: "info",
    title: "",
    message: ""
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, notRes] = await Promise.all([
      api.users.followRequests().catch(() => null),
      api.notifications.list().catch(() => null)]
      );
      if (reqRes) setRequests(listFrom(reqRes, ["requests", "users", "data"]));
      if (notRes) {
        const rawNotif =
        listFrom(notRes, ["notifications", "data"]) || notRes || [];

        const filtered = Array.isArray(rawNotif) ?
        rawNotif.filter((n) => {
          const msg = (n?.message || n?.text || "").trim().toLowerCase();
          return (
            msg &&
            msg !== "test" &&
            msg !== "test success" &&
            msg !== "undefined");

        }) :
        [];
        setNotifications(filtered);
      }
    } catch (error) {
      console.warn("Erro ao buscar notificações:", errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const handleAccept = async (item) => {
    const requestId = item?.requestId || item?.id;
    try {
      setActionLoadingId(item.id);
      await api.users.acceptRequest(requestId);
      setRequests((prev) =>
      prev.filter(
        (r) =>
        String(r.id) !== String(item.id) &&
        String(r.requestId) !== String(requestId)
      )
      );
      onRequestHandled?.();
    } catch (error) {
      setModalAlert({
        visible: true,
        type: "error",
        title: "Erro",
        message: errorMessage(error)
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (item) => {
    const requestId = item?.requestId || item?.id;
    try {
      setActionLoadingId(item.id);
      await api.users.rejectRequest(requestId);
      setRequests((prev) =>
      prev.filter(
        (r) =>
        String(r.id) !== String(item.id) &&
        String(r.requestId) !== String(requestId)
      )
      );
      onRequestHandled?.();
    } catch (error) {
      setModalAlert({
        visible: true,
        type: "error",
        title: "Erro",
        message: errorMessage(error)
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const parseNotification = (item) => {
    const actor = item.actor || item.sender || item.user || item.follower || {};
    const rawName =
    item.actor_name ||
    item.actorName ||
    item.user_name ||
    item.userName ||
    userName(actor) ||
    "Usuário";
    const name = rawName.startsWith("@") ? rawName : `@${rawName}`;
    const avatarUrl =
    item.actor_avatar || item.actorAvatar || getUserAvatar(actor);
    const rawMsg = (item.message || item.text || item.content || "").trim();
    const type = (item.type || "").toUpperCase();
    const lowerMsg = rawMsg.toLowerCase();

    let icon = "bell";
    let iconBg = "#0284c7";
    let actionLabel = rawMsg;
    let notifType = "generic";

    if (type === "LIKE" || lowerMsg.includes("curtiu")) {
      icon = "heart";
      iconBg = "#ef4444";
      notifType = "like";
      actionLabel = "curtiu sua publicação";
    } else if (type === "COMMENT" || lowerMsg.includes("comentou")) {
      icon = "message-circle";
      iconBg = "#3b82f6";
      notifType = "comment";
      if (rawMsg.includes(":")) {
        const parts = rawMsg.split(":");
        actionLabel = `comentou: "${parts.slice(1).join(":").trim()}"`;
      } else {
        actionLabel = "comentou na sua publicação";
      }
    } else if (
    type === "FOLLOW" ||
    lowerMsg.includes("seguir") ||
    lowerMsg.includes("seguiu"))
    {
      icon = "user-plus";
      iconBg = "#8b5cf6";
      notifType = "follow";
      actionLabel = "começou a te seguir";
    } else if (type === "TRIBO" || lowerMsg.includes("tribo")) {
      icon = "users";
      iconBg = "#f59e0b";
      notifType = "tribo";
      actionLabel = "interagiu na sua tribo";
    }

    const timeAgo = formatRelativeTime(item.created_at || item.createdAt);
    const postMedia =
    item.post_media ||
    item.postMedia ||
    item.media_url ||
    item.thumbnail_url ||
    item.post?.media_url ||
    null;

    return {
      actor,
      name,
      avatarUrl,
      icon,
      iconBg,
      actionLabel,
      notifType,
      timeAgo,
      postMedia
    };
  };

  const handlePressNotification = (item, parsed) => {
    if (parsed.notifType === "follow") {
      onClose();
      onOpenProfile?.(parsed.actor);
    } else if (item.post_id || item.postId || item.post) {
      onClose();
      if (onOpenPost) {
        onOpenPost(item.post_id || item.postId || item.post);
      } else {
        onOpenProfile?.(parsed.actor);
      }
    } else if (
    parsed.actor && (
    parsed.actor.id || parsed.actor._id || parsed.actor.username))
    {
      onClose();
      onOpenProfile?.(parsed.actor);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.page, { backgroundColor: "#000000" }]}>
        {}
        <View
          style={[
          styles.bar,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: 14,
            paddingHorizontal: 16,
            backgroundColor: "#000000",
            borderBottomColor: "#27272a",
            borderBottomWidth: 1
          }]
          }>
          
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
            {
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#18181b",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1
            }]
            }
            accessibilityLabel="Fechar notificações">
            
            <Feather name="x" size={20} color="#FFFFFF" />
          </Pressable>

          <Text style={styles.title}>Notificações</Text>

          <View style={{ width: 36 }} />
        </View>

        {}
        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => setActiveTab("notifications")}
            style={[
            styles.tabItem,
            activeTab === "notifications" && styles.tabItemActive]
            }>
            
            <Text
              style={[
              styles.tabText,
              activeTab === "notifications" ?
              styles.tabTextActive :
              styles.tabTextInactive]
              }>
              
              Atividades
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("requests")}
            style={[
            styles.tabItem,
            activeTab === "requests" && styles.tabItemActive]
            }>
            
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              
              <Text
                style={[
                styles.tabText,
                activeTab === "requests" ?
                styles.tabTextActive :
                styles.tabTextInactive]
                }>
                
                Solicitações
              </Text>
              {requests.length > 0 &&
              <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{requests.length}</Text>
                </View>
              }
            </View>
          </Pressable>
        </View>

        {loading && requests.length === 0 && notifications.length === 0 ?
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#0284c7" />
          </View> :
        activeTab === "requests" ?
        <FlatList
          data={requests}
          keyExtractor={(item, index) =>
          String(item.id || item.requestId || index)
          }
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadData}
          ListEmptyComponent={
          <EmptyState
            title="Nenhuma solicitação"
            message="Você não tem novas solicitações de seguidores."
            icon="users" />

          }
          renderItem={({ item }) => {
            const isWorking = actionLoadingId === item.id;
            const u = item?.follower || item?.user || item;
            const realName = userName(u);
            const rawHandle = u?.username || item?.username || "";
            const handle = rawHandle ? rawHandle.replace(/^@/, "") : "";

            return (
              <View style={styles.requestCard}>
                  <Pressable
                  style={({ pressed }) => [
                  styles.userSection,
                  { opacity: pressed ? 0.8 : 1 }]
                  }
                  onPress={() => {
                    onClose();
                    onOpenProfile?.(u);
                  }}>
                  
                    <Avatar user={u} size={46} />
                    <View style={styles.userInfo}>
                      <View style={styles.nameRow}>
                        <Text numberOfLines={1} style={styles.userName}>
                          {realName}
                        </Text>
                        <VerificationBadge user={u} size={14} />
                      </View>
                      <Text numberOfLines={1} style={styles.userHandle}>
                        @{handle || "tribo"}
                      </Text>
                      {!!(u?.bio || item?.bio) &&
                    <Text numberOfLines={1} style={styles.bioText}>
                          {u?.bio || item?.bio}
                        </Text>
                    }
                    </View>
                  </Pressable>

                  <View style={styles.actionsRow}>
                    <Button
                    title="Aceitar"
                    icon="check"
                    variant="accent"
                    onPress={() => handleAccept(item)}
                    loading={isWorking}
                    disabled={isWorking}
                    style={styles.actionBtn} />
                  
                    <Button
                    title="Recusar"
                    icon="x"
                    variant="secondary"
                    onPress={() => handleReject(item)}
                    disabled={isWorking}
                    style={styles.actionBtn} />
                  
                  </View>
                </View>);

          }} /> :


        <FlatList
          data={notifications}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadData}
          ListEmptyComponent={
          <EmptyState
            title="Nenhuma atividade"
            message="Quando as pessoas interagirem com você, as notificações aparecerão aqui."
            icon="bell" />

          }
          renderItem={({ item }) => {
            const parsed = parseNotification(item);

            return (
              <Pressable
                onPress={() => handlePressNotification(item, parsed)}
                style={({ pressed }) => [
                styles.notificationCard,
                {
                  backgroundColor:
                  item.is_read || item.isRead ? "#000000" : "#121214",
                  opacity: pressed ? 0.75 : 1
                }]
                }>
                
                  {}
                  <View style={styles.avatarContainer}>
                    <Avatar
                    url={parsed.avatarUrl}
                    fallback={parsed.name}
                    size={46} />
                  
                    <View
                    style={[
                    styles.actionBadge,
                    { backgroundColor: parsed.iconBg }]
                    }>
                    
                      <Feather name={parsed.icon} size={10} color="#FFFFFF" />
                    </View>
                  </View>

                  {}
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationText}>
                      <Text style={styles.actorName}>{parsed.name} </Text>
                      <Text style={styles.actionText}>
                        {parsed.actionLabel}{" "}
                      </Text>
                      <Text style={styles.timeText}>
                        · {parsed.timeAgo || "agora"}
                      </Text>
                    </Text>
                  </View>

                  {}
                  {parsed.postMedia ?
                <Image
                  source={{ uri: parsed.postMedia }}
                  style={styles.postThumbnail}
                  resizeMode="cover" /> :

                parsed.notifType === "follow" ?
                <Pressable
                  onPress={() => {
                    onClose();
                    onOpenProfile?.(parsed.actor);
                  }}
                  style={({ pressed }) => [
                  styles.profileBtn,
                  { opacity: pressed ? 0.7 : 1 }]
                  }>
                  
                      <Text style={styles.profileBtnText}>Perfil</Text>
                    </Pressable> :
                null}
                </Pressable>);

          }} />

        }
      </View>

      <CustomModal
        visible={modalAlert.visible}
        type={modalAlert.type}
        title={modalAlert.title}
        message={modalAlert.message}
        onClose={() => setModalAlert({ ...modalAlert, visible: false })} />
      
    </Modal>);

}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#000000" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    color: "#FFFFFF"
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#27272a"
  },
  tabItem: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  tabItemActive: {
    borderBottomColor: "#FFFFFF"
  },
  tabText: {
    fontSize: 14
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold"
  },
  tabTextInactive: {
    color: "#A1A1AA",
    fontFamily: "Poppins_400Regular"
  },
  countBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Poppins_700Bold"
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: {
    paddingVertical: 6,
    flexGrow: 1
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.07)"
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12
  },
  actionBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center"
  },
  notificationContent: {
    flex: 1,
    marginRight: 10
  },
  notificationText: {
    fontSize: 13.5,
    lineHeight: 19
  },
  actorName: {
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF"
  },
  actionText: {
    fontFamily: "Poppins_400Regular",
    color: "#E4E4E7"
  },
  timeText: {
    fontFamily: "Poppins_400Regular",
    color: "#A1A1AA",
    fontSize: 12
  },
  postThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#18181b"
  },
  profileBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a"
  },
  profileBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold"
  },
  requestCard: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "#121214",
    gap: 12
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  userInfo: {
    flex: 1
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  userName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF"
  },
  userHandle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#A1A1AA",
    marginTop: 1
  },
  bioText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#E4E4E7",
    marginTop: 3
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10
  },
  actionBtn: {
    flex: 1
  }
});