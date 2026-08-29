import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View } from
"react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../api";
import { Avatar, IconButton, EmptyState } from "../../components/ui/ui";
import { errorMessage } from "../../lib/format";
import { useTheme } from "../../theme";
import { getChatSocket } from "../../services/chatSocket";
import { NativeOptimization } from "../../services/nativeOptimization";
import { ChatCache } from "../../services/chatCache";

export { CreateTribeScreen } from "./CreateTribeScreen";
export { GroupDetailsScreen } from "./GroupDetailsScreen";
export { GroupSettingsScreen } from "./GroupSettingsScreen";
export { InviteMembersScreen } from "./InviteMembersScreen";

export function TribosListScreen({ onOpenTribe, onCreateTribe, onBack }) {
  const { colors } = useTheme();
  const [tribos, setTribos] = useState(() => ChatCache.getTribosSync() || []);
  const [loading, setLoading] = useState(() => !(ChatCache.getTribosSync()?.length > 0));
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadMap, setUnreadMap] = useState({});

  const loadUnreadCounts = useCallback(async (tribeList) => {
    try {
      const map = {};
      for (const t of tribeList) {
        const idStr = String(t.id);
        const storedCount = await AsyncStorage.getItem(`@tribo_unread_count_${idStr}`);
        if (storedCount) {
          map[idStr] = parseInt(storedCount, 10) || 0;
        } else if (t.unreadCount || t.unread_count) {
          map[idStr] = t.unreadCount || t.unread_count || 0;
        }
      }
      setUnreadMap((prev) => ({ ...prev, ...map }));
    } catch (e) {}
  }, []);

  const loadTribos = useCallback(async () => {
    try {
      const cached = ChatCache.getTribosSync();
      if (!cached || cached.length === 0) {
        setLoading(true);
      }
      const res = await api.groups.list();
      const list = res.groups || res.data || [];
      setTribos(list);
      ChatCache.setTribosSync(list);
      loadUnreadCounts(list);
    } catch (error) {
      if (!ChatCache.getTribosSync()?.length) {
        Alert.alert("Erro", errorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  }, [loadUnreadCounts]);

  useEffect(() => {
    const cached = ChatCache.getTribosSync();
    if (cached?.length > 0) {
      loadUnreadCounts(cached);
    }
    loadTribos();
  }, [loadTribos, loadUnreadCounts]);

  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;

    const handleGroupMsg = (msg) => {
      const targetGroupId = String(msg.groupId || msg.group_id || msg.room);
      if (targetGroupId) {
        setUnreadMap((prev) => {
          const currentCount = prev[targetGroupId] || 0;
          const nextCount = currentCount + 1;
          AsyncStorage.setItem(`@tribo_unread_count_${targetGroupId}`, String(nextCount)).catch(() => {});
          return {
            ...prev,
            [targetGroupId]: nextCount
          };
        });
      }
    };

    socket.on("group_message", handleGroupMsg);
    socket.on("new_message", handleGroupMsg);

    return () => {
      socket.off("group_message", handleGroupMsg);
      socket.off("new_message", handleGroupMsg);
    };
  }, []);

  const handlePressTribe = async (tribeId) => {
    const idStr = String(tribeId);
    setUnreadMap((prev) => ({ ...prev, [idStr]: 0 }));
    try {
      await AsyncStorage.setItem(`@tribo_unread_count_${idStr}`, "0");
      await AsyncStorage.setItem(`@tribo_group_last_read_${idStr}`, new Date().toISOString());
    } catch (e) {}
    onOpenTribe(tribeId);
  };

  const filteredTribos = tribos.filter((t) =>
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.rules?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <IconButton name="arrow-left" onPress={onBack} label="Voltar" />
        <Text style={[styles.title, { color: colors.text }]}>Minhas Tribos</Text>
        <IconButton name="plus" onPress={onCreateTribe} label="Criar Tribo" />
      </View>
      
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Feather name="search" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar tribo..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery} />
        </View>
      </View>

      <FlatList
        data={filteredTribos}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadTribos}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const unreadCount = unreadMap[String(item.id)] || item.unreadCount || item.unread_count || 0;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.surface },
                pressed && { transform: [{ scale: 0.98 }] }
              ]}
              onPress={() => handlePressTribe(item.id)}>
              
              <Avatar url={item.avatarUrl || item.avatar_url} size={56} fallback={item.name} />
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                <Text numberOfLines={1} style={[styles.rules, { color: colors.muted }]}>
                  {item.rules || "Sem regras definidas"}
                </Text>
                <View style={styles.memberBadge}>
                  <Ionicons name="people" size={12} color={colors.primary} />
                  <Text style={[styles.memberBadgeText, { color: colors.primary }]}>
                    {item.memberCount || item.members?.length || "Vários"} Membros
                  </Text>
                </View>
              </View>

              {unreadCount > 0 ? (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary || "#0284c7" }]}>
                  <Text style={styles.unreadCountText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              ) : (
                <View style={[styles.actionBtn, { backgroundColor: (colors.primary || "#3b82f6") + "15" }]}>
                  <Feather name="arrow-right" size={18} color={colors.primary || "#3b82f6"} />
                </View>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading &&
          <EmptyState icon="users">
            {searchQuery ? "Nenhuma tribo encontrada com essa busca." : "Você ainda não participa de nenhuma tribo."}
          </EmptyState>
        } />
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
    zIndex: 10
  },
  title: { fontSize: 20, fontFamily: "Poppins_700Bold", letterSpacing: -0.5 },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    gap: 10
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    marginTop: 2
  },
  list: { padding: 16, paddingTop: 8, gap: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3
  },
  info: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12
  },
  name: { fontSize: 17, fontFamily: "Poppins_700Bold", marginBottom: 2 },
  rules: { fontSize: 13, fontFamily: "Poppins_400Regular", marginBottom: 6 },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  memberBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold"
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  unreadBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3
  },
  unreadCountText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 11,
    color: "#ffffff"
  }
});