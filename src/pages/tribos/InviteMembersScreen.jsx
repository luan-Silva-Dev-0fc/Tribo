import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../../api";
import { Avatar, IconButton } from "../../components/ui/ui";
import { CustomModal } from "../../components/modals/CustomModal";
import { errorMessage, listFrom, userName } from "../../lib/format";
import { useTheme } from "../../theme";

const UserItem = ({
  item,
  colors,
  groupId,
  initialAdded,
  isBanned,
  banRecord,
  onShowAlert,
}) => {
  const [loading, setLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(initialAdded);

  const handlePressAction = async () => {
    if (loading || isAdded) return;

    // Se o usuário estiver banido, bloquear e abrir modal explicativo
    if (isBanned) {
      const reasonText = banRecord?.reason || "Comportamento Inadequado";
      const uName = item.username ? `@${item.username}` : userName(item);
      onShowAlert?.({
        title: "Usuário Banido",
        message: `🚫 @${item.username || item.name} está banido desta Tribo.\n\nMotivo do banimento: "${reasonText}"\n\nPara adicioná-lo novamente, é necessário desbani-lo primeiro na aba de Membros Banidos nas configurações do grupo.`,
        type: "error",
        primaryText: "Entendido",
      });
      return;
    }

    try {
      setLoading(true);
      const actualTargetUserId = item.id;

      if (!actualTargetUserId) {
        onShowAlert?.({
          title: "Erro",
          message: "Não foi possível encontrar o ID deste usuário.",
          type: "error",
        });
        return;
      }

      await api.groups.addMember(groupId, actualTargetUserId);
      setIsAdded(true);
    } catch (error) {
      onShowAlert?.({
        title: "Erro ao Adicionar",
        message: errorMessage(error),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.userCard,
        {
          backgroundColor: colors.surface,
          borderColor: isBanned ? "rgba(239, 68, 68, 0.3)" : colors.line,
          opacity: isBanned ? 0.85 : 1,
        },
      ]}
    >
      <Avatar
        url={item.avatarUrl || item.avatar_url}
        size={40}
        fallback={item.username}
      />
      <View style={styles.userInfo}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <Text style={[styles.userName, { color: colors.text }]}>
            {userName(item)}
          </Text>
          {isBanned && (
            <View style={styles.bannedTag}>
              <Feather name="slash" size={10} color="#ef4444" />
              <Text style={styles.bannedTagText}>Banido deste grupo</Text>
            </View>
          )}
        </View>
        <Text style={[styles.userHandle, { color: colors.muted }]}>
          @{item.username}
        </Text>
      </View>
      <Pressable
        onPress={handlePressAction}
        disabled={loading || isAdded}
        style={({ pressed }) => [
          styles.inviteBtn,
          {
            backgroundColor: isBanned
              ? "rgba(239, 68, 68, 0.15)"
              : isAdded
                ? colors.success || "#10B981"
                : loading
                  ? colors.muted
                  : colors.primary,
            borderWidth: isBanned ? 1 : 0,
            borderColor: isBanned ? "#ef4444" : "transparent",
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : isBanned ? (
          <Text style={[styles.inviteBtnText, { color: "#ef4444" }]}>
            Banido
          </Text>
        ) : isAdded ? (
          <Text style={styles.inviteBtnText}>Adicionado</Text>
        ) : (
          <Text style={styles.inviteBtnText}>Adicionar</Text>
        )}
      </Pressable>
    </View>
  );
};

export function InviteMembersScreen({ groupId, user, onBack }) {
  const { colors } = useTheme();
  const [mutuals, setMutuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState({});
  const [bannedMap, setBannedMap] = useState({});

  const loadMutuals = async () => {
    try {
      // 1. Fetch followers
      const followersRes = await api.users.followers(user.id);
      const followers = listFrom(followersRes, ["followers", "users", "data"]);

      // 2. Fetch following
      const followingRes = await api.users.following(user.id);
      const following = listFrom(followingRes, ["following", "users", "data"]);

      // 3. Fetch group members
      let existingMembers = [];
      try {
        const membersRes = await api.groups.members(groupId);
        existingMembers =
          membersRes.members || membersRes.data || membersRes || [];
        if (!Array.isArray(existingMembers)) {
          existingMembers = [];
        }
      } catch (e) {
        console.warn("Failed to load group members", e);
      }

      const currentAddedIds = {};
      existingMembers.forEach((m) => {
        const uid = m.user?.id || m.userId || m.id || m;
        if (uid) currentAddedIds[String(uid)] = true;
      });
      setAddedIds(currentAddedIds);

      // 4. Fetch group banned members
      const currentBannedMap = {};
      try {
        const bannedRes = await api.groups.listBanned(groupId);
        const bannedList = bannedRes.banned || bannedRes.data || [];
        if (Array.isArray(bannedList)) {
          bannedList.forEach((b) => {
            const bId = b.id || b._id || b.userId || b.user_id;
            if (bId) {
              currentBannedMap[String(bId)] = b;
            }
          });
        }
      } catch (e) {
        console.warn("Failed to load group banned members", e);
      }
      setBannedMap(currentBannedMap);

      // 5. Find intersection (Mutual Follow)
      const getFollowerId = (f) => {
        const u = f.follower || f.user || f;
        return String(u.id || u._id || u.userId || f.followerId || f.id);
      };

      const getFollowingId = (f) => {
        const u = f.following || f.target || f.user || f;
        return String(
          u.id || u._id || u.userId || f.followingId || f.targetId || f.id,
        );
      };

      const followerIds = new Set(followers.map(getFollowerId));

      const mutualList = following.filter((f) => {
        const targetId = getFollowingId(f);
        return followerIds.has(targetId);
      });

      // Remapear para objeto de usuário limpo
      const usersToDisplay = mutualList.map((item) => {
        const extractedUser =
          item.following || item.target || item.user || item;
        const correctId =
          extractedUser._id ||
          extractedUser.userId ||
          item.followingId ||
          item.targetId ||
          extractedUser.id ||
          item.id;

        return {
          ...extractedUser,
          id: correctId,
        };
      });

      // Filter out duplicate IDs
      const uniqueUsers = [];
      const seen = new Set();
      for (const u of usersToDisplay) {
        const uid = u.id;
        if (uid && !seen.has(uid)) {
          seen.add(uid);
          uniqueUsers.push(u);
        }
      }

      setMutuals(uniqueUsers);
    } catch (error) {
      setCustomAlert({
        visible: true,
        type: "error",
        title: "Erro ao Carregar",
        message: errorMessage(error),
        primaryText: "Entendido",
      });
    } finally {
      setLoading(false);
    }
  };

  const [customAlert, setCustomAlert] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    primaryText: "Entendido",
  });

  const showAlert = (cfg) => {
    setCustomAlert({
      visible: true,
      type: cfg.type || "info",
      title: cfg.title || "",
      message: cfg.message || "",
      primaryText: cfg.primaryText || "Entendido",
    });
  };

  useEffect(() => {
    loadMutuals();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <IconButton name="arrow-left" onPress={onBack} label="Voltar" />
        <Text style={[styles.title, { color: colors.text }]}>
          Adicionar Membros
        </Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={mutuals}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isBanned = Boolean(bannedMap[String(item.id)]);
            const banRecord = bannedMap[String(item.id)];
            return (
              <UserItem
                item={item}
                colors={colors}
                groupId={groupId}
                initialAdded={!!addedIds[item.id]}
                isBanned={isBanned}
                banRecord={banRecord}
                onShowAlert={showAlert}
              />
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40, padding: 24 }}>
              <Feather
                name="users"
                size={48}
                color={colors.muted}
                style={{ marginBottom: 16 }}
              />
              <Text
                style={{
                  color: colors.muted,
                  textAlign: "center",
                  fontSize: 16,
                }}
              >
                Você só pode adicionar pessoas que você segue e que também te
                seguem de volta (Mutual Follow).
              </Text>
            </View>
          }
        />
      )}

      <CustomModal
        visible={customAlert.visible}
        type={customAlert.type}
        title={customAlert.title}
        message={customAlert.message}
        primaryText={customAlert.primaryText}
        onClose={() => setCustomAlert((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    zIndex: 10,
  },
  title: { fontSize: 20, fontFamily: "Poppins_700Bold", letterSpacing: -0.5 },
  list: { padding: 16 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 15, fontFamily: "Poppins_600SemiBold" },
  userHandle: { fontSize: 13, fontFamily: "Poppins_400Regular" },
  bannedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  bannedTagText: {
    color: "#ef4444",
    fontSize: 10.5,
    fontFamily: "Poppins_600SemiBold",
  },
  inviteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteBtnText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
});
