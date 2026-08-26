import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View } from
"react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api } from "../../api";
import { errorMessage, listFrom, userName } from "../../lib/format";
import { useTheme } from "../../theme";
import { Avatar, EmptyState, IconButton, Input, VerificationBadge } from "../ui/ui";

export function FollowersModal({
  visible,
  userId,
  targetName = "",
  initialTab = "followers",
  onClose,
  onOpenProfile
}) {
  const { colors } = useTheme();
  const [mainTab, setMainTab] = useState(initialTab || "followers");
  const [subFilter, setSubFilter] = useState("all");
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const loadData = useCallback(async (tabToLoad) => {
    if (!userId) return;
    try {
      setLoading(true);
      if (tabToLoad === "followers") {
        const response = await api.users.followers(userId);
        setFollowers(listFrom(response, ["followers", "users", "data"]));
      } else {
        const response = await api.users.following(userId);
        setFollowing(listFrom(response, ["following", "users", "data"]));
      }
    } catch (error) {
      console.warn("Erro ao buscar conexões:", errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (visible && userId) {
      const startTab = initialTab === "following" ? "following" : "followers";
      setMainTab(startTab);
      setSubFilter("all");
      setQuery("");
      loadData(startTab);
    }
  }, [visible, userId, initialTab, loadData]);

  const handleSwitchTab = (tab) => {
    setMainTab(tab);
    setQuery("");
    setSubFilter("all");
    loadData(tab);
  };

  const loyalFollowers = useMemo(() => {
    return followers.filter((item) => {
      const u = item?.follower || item?.following || item?.user || item;
      return (
        item.is_loyal_follower ||
        item.isLoyalFollower ||
        item.loyal ||
        u.is_loyal_follower ||
        u.isLoyalFollower ||
        u.loyal);

    });
  }, [followers]);

  const displayedList = useMemo(() => {
    let base = [];
    if (mainTab === "followers") {
      base = subFilter === "loyal" ? loyalFollowers : followers;
    } else {
      base = following;
    }

    if (!query.trim()) return base;
    const q = query.toLowerCase().trim();
    return base.filter((item) => {
      const u = item?.follower || item?.following || item?.user || item;
      const name = (userName(u) || "").toLowerCase();
      const handle = (u?.username || item?.username || "").toLowerCase();
      return name.includes(q) || handle.includes(q);
    });
  }, [mainTab, subFilter, followers, following, loyalFollowers, query]);

  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets?.top || 0,
    Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}>
      
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        {}
        <View
          style={[
          styles.bar,
          {
            paddingTop: topInset,
            height: 58 + topInset,
            backgroundColor: colors.surface,
            borderColor: colors.line
          }]
          }>
          
          <IconButton name="x" onPress={onClose} label="Fechar conexões" />
          <Text style={[styles.title, { color: colors.text }]}>
            {targetName ? `@${targetName}` : "Conexões"}
          </Text>
          <View style={styles.spacer} />
        </View>

        {}
        <View
          style={[
          styles.mainTabsContainer,
          { backgroundColor: colors.surface, borderColor: colors.line }]
          }>
          
          <Pressable
            onPress={() => handleSwitchTab("followers")}
            style={({ pressed }) => [
            styles.mainTabBtn,
            { opacity: pressed ? 0.75 : 1 },
            mainTab === "followers" && {
              borderBottomColor: colors.accent,
              borderBottomWidth: 2.5
            }]
            }>
            
            <Text
              style={[
              styles.mainTabText,
              {
                color: mainTab === "followers" ? colors.text : colors.muted,
                fontFamily:
                mainTab === "followers" ?
                "Poppins_700Bold" :
                "Poppins_500Medium"
              }]
              }>
              
              Seguidores ({followers.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleSwitchTab("following")}
            style={({ pressed }) => [
            styles.mainTabBtn,
            { opacity: pressed ? 0.75 : 1 },
            mainTab === "following" && {
              borderBottomColor: colors.accent,
              borderBottomWidth: 2.5
            }]
            }>
            
            <Text
              style={[
              styles.mainTabText,
              {
                color: mainTab === "following" ? colors.text : colors.muted,
                fontFamily:
                mainTab === "following" ?
                "Poppins_700Bold" :
                "Poppins_500Medium"
              }]
              }>
              
              Seguindo ({following.length})
            </Text>
          </Pressable>
        </View>

        {}
        {mainTab === "followers" &&
        <View style={styles.subFilterRow}>
            <Pressable
            onPress={() => setSubFilter("all")}
            style={[
            styles.subFilterChip,
            {
              backgroundColor:
              subFilter === "all" ? colors.accent : colors.surfaceAlt,
              borderColor:
              subFilter === "all" ? colors.accent : colors.line
            }]
            }>
            
              <Text
              style={[
              styles.subFilterText,
              {
                color: subFilter === "all" ? "#ffffff" : colors.muted,
                fontFamily:
                subFilter === "all" ?
                "Poppins_600SemiBold" :
                "Poppins_400Regular"
              }]
              }>
              
                Todos
              </Text>
            </Pressable>

            <Pressable
            onPress={() => setSubFilter("loyal")}
            style={[
            styles.subFilterChip,
            {
              backgroundColor:
              subFilter === "loyal" ?
              "rgba(245, 158, 11, 0.2)" :
              colors.surfaceAlt,
              borderColor:
              subFilter === "loyal" ? "#f59e0b" : colors.line
            }]
            }>
            
              <Feather
              name="star"
              size={12}
              color={subFilter === "loyal" ? "#f59e0b" : colors.muted} />
            
              <Text
              style={[
              styles.subFilterText,
              {
                color: subFilter === "loyal" ? "#f59e0b" : colors.muted,
                fontFamily:
                subFilter === "loyal" ?
                "Poppins_600SemiBold" :
                "Poppins_400Regular"
              }]
              }>
              
                Seguidores Fiéis ({loyalFollowers.length})
              </Text>
            </Pressable>
          </View>
        }

        {}
        <View style={styles.searchSection}>
          <View
            style={[
            styles.searchField,
            { backgroundColor: colors.surface, borderColor: colors.line }]
            }>
            
            <Feather name="search" size={17} color={colors.muted} />
            <Input
              placeholder={
              mainTab === "followers" ?
              "Buscar em seguidores..." :
              "Buscar em quem está seguindo..."
              }
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput} />
            
          </View>
        </View>

        {loading && displayedList.length === 0 ?
        <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View> :

        <FlatList
          data={displayedList}
          keyExtractor={(item, index) => {
            const u = item?.follower || item?.following || item?.user || item;
            return String(u?.id || item?.id || item?.userId || index);
          }}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={() => loadData(mainTab)}
          renderItem={({ item }) => {
            const userObj =
            item?.follower || item?.following || item?.user || item;
            const isLoyal = Boolean(
              item.is_loyal_follower ||
              item.isLoyalFollower ||
              item.loyal ||
              userObj.is_loyal_follower ||
              userObj.isLoyalFollower ||
              userObj.loyal
            );
            const realName = userName(userObj);
            const rawHandle = userObj?.username || item?.username || "";
            const handle = rawHandle ? rawHandle.replace(/^@/, "") : "";
            const followingDate =
            item.following_since ||
            item.followingSince ||
            item.createdAt ||
            item.created_at;

            return (
              <Pressable
                onPress={() => {
                  onClose();
                  onOpenProfile?.(userObj);
                }}
                style={({ pressed }) => [
                styles.followerRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.line,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                  opacity: pressed ? 0.88 : 1
                }]
                }>
                
                  <Avatar user={userObj} size={46} />
                  <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                      <Text
                      numberOfLines={1}
                      style={[styles.userName, { color: colors.text }]}>
                      
                        {realName}
                      </Text>
                      <VerificationBadge user={userObj} size={14} />
                      {isLoyal &&
                    <View style={styles.loyalTag}>
                          <Feather name="star" size={10} color="#f59e0b" />
                          <Text style={styles.loyalTagText}>
                            Fiel
                          </Text>
                        </View>
                    }
                    </View>

                    <View style={styles.subRow}>
                      <Text
                      numberOfLines={1}
                      style={[styles.userHandle, { color: colors.muted }]}>
                      
                        @{handle || "tribo"}
                      </Text>

                      {followingDate &&
                    <>
                          <Text
                        style={[
                        styles.dotSeparator,
                        { color: colors.muted }]
                        }>
                        
                            •
                          </Text>
                          <Text
                        style={[
                        styles.followingSinceText,
                        { color: colors.muted }]
                        }>
                        
                            desde{" "}
                            {new Date(followingDate).toLocaleDateString(
                          "pt-BR"
                        )}
                          </Text>
                        </>
                    }
                    </View>
                  </View>
                  <Feather
                  name="chevron-right"
                  size={18}
                  color={colors.muted} />
                
                </Pressable>);

          }}
          ListEmptyComponent={
          !loading &&
          <EmptyState
            icon={mainTab === "followers" ? subFilter === "loyal" ? "star" : "users" : "user-check"}>
            
                  {mainTab === "followers" ?
            subFilter === "loyal" ?
            "Nenhum seguidor fiel identificado ainda." :
            "Nenhum seguidor encontrado." :
            "Não está seguindo ninguém ainda."}
                </EmptyState>

          } />

        }
      </View>
    </Modal>);

}

const styles = StyleSheet.create({
  page: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    padding: 15
  },
  title: { fontFamily: "Poppins_700Bold", fontSize: 16 },
  spacer: { width: 42 },
  mainTabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1
  },
  mainTabBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center"
  },
  mainTabText: {
    fontSize: 13.5
  },
  subFilterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  subFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1
  },
  subFilterText: {
    fontSize: 12
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4
  },
  searchField: {
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 12
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    minHeight: 44,
    paddingLeft: 8,
    backgroundColor: "transparent"
  },
  listContent: {
    padding: 16,
    gap: 10,
    flexGrow: 1
  },
  followerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12
  },
  userInfo: {
    flex: 1,
    justifyContent: "center"
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap"
  },
  userName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2
  },
  userHandle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5
  },
  dotSeparator: {
    fontSize: 10
  },
  loyalTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4
  },
  loyalTagText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 10,
    color: "#f59e0b"
  },
  followingSinceText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10.5
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  }
});