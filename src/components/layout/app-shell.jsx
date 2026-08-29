import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Image
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { api } from "../../api";
import { listFrom } from "../../lib/format";
import { FollowRequestsModal } from "../modals/follow-requests-modal";

export function AppShell({
  children,
  active,
  onNavigate,
  onCreateTribo,
  onOpenMessages,
  onOpenProfile,
  user
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [followRequestsVisible, setFollowRequestsVisible] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      const [reqRes, notRes] = await Promise.all([
        api.users.followRequests().catch(() => null),
        api.notifications.list().catch(() => null)
      ]);
      const listReq = listFrom(reqRes, ["requests", "users", "data"]);
      const listNotif =
        listFrom(notRes, ["notifications", "data"]) || notRes || [];
      const unreadNotif = Array.isArray(listNotif)
        ? listNotif.filter((n) => !n.is_read && !n.isRead)
        : [];
      setPendingRequestsCount(listReq.length + unreadNotif.length);
    } catch (err) {}
  }, []);

  useEffect(() => {
    if (active === "feed") {
      fetchRequests();
    }
  }, [active, fetchRequests]);

  const avatarUrl = user?.avatar_url || user?.avatar || user?.photo_url || user?.profile_photo;

  return (
    <View style={styles.root}>
      {/* Header Superior */}
      <View
        style={[
          styles.header,
          active === "reels" && {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: "transparent",
            borderBottomWidth: 0,
            height: 100
          }
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoContainer}>
            <Ionicons name="people" size={28} color="#ffffff" />
            <Text style={styles.wordmark}>Tribo</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.iconButton}
              onPress={() => setFollowRequestsVisible(true)}
            >
              <Feather name="bell" size={19} color="#ffffff" />
              {pendingRequestsCount > 0 && <View style={styles.badge} />}
            </Pressable>

            <Pressable style={styles.iconButton} onPress={onOpenMessages}>
              <Feather name="message-square" size={19} color="#ffffff" />
            </Pressable>

            <Pressable style={styles.iconButton} onPress={onCreateTribo}>
              <Feather name="plus" size={19} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Conteúdo Principal */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.footerContainer}>
        <View
          style={[
            styles.navBar,
            {
              paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 10 : 8)
            }
          ]}
        >
          {/* Feed Tab */}
          <Pressable
            onPress={() => onNavigate("feed")}
            style={styles.tab}
          >
            {({ pressed }) => {
              const isActive = active === "feed";
              return (
                <View style={[styles.tabContent, { opacity: pressed ? 0.6 : 1 }]}>
                  <Feather
                    name="home"
                    size={22}
                    color={isActive ? "#FFFFFF" : "#8E8E93"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? "#FFFFFF" : "#8E8E93",
                        fontFamily: isActive ? "Poppins_600SemiBold" : "Poppins_400Regular"
                      }
                    ]}
                  >
                    Feed
                  </Text>
                </View>
              );
            }}
          </Pressable>

          {/* Reels Tab */}
          <Pressable
            onPress={() => onNavigate("reels")}
            style={styles.tab}
          >
            {({ pressed }) => {
              const isActive = active === "reels";
              return (
                <View style={[styles.tabContent, { opacity: pressed ? 0.6 : 1 }]}>
                  <MaterialCommunityIcons
                    name={isActive ? "movie-play" : "movie-play-outline"}
                    size={24}
                    color={isActive ? "#FFFFFF" : "#8E8E93"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? "#FFFFFF" : "#8E8E93",
                        fontFamily: isActive ? "Poppins_600SemiBold" : "Poppins_400Regular"
                      }
                    ]}
                  >
                    Reels
                  </Text>
                </View>
              );
            }}
          </Pressable>

          {/* Busca Tab */}
          <Pressable
            onPress={() => onNavigate("search")}
            style={styles.tab}
          >
            {({ pressed }) => {
              const isActive = active === "search";
              return (
                <View style={[styles.tabContent, { opacity: pressed ? 0.6 : 1 }]}>
                  <Feather
                    name="search"
                    size={22}
                    color={isActive ? "#FFFFFF" : "#8E8E93"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? "#FFFFFF" : "#8E8E93",
                        fontFamily: isActive ? "Poppins_600SemiBold" : "Poppins_400Regular"
                      }
                    ]}
                  >
                    Busca
                  </Text>
                </View>
              );
            }}
          </Pressable>

          {/* Perfil Tab */}
          <Pressable
            onPress={() => onNavigate("profile")}
            style={styles.tab}
          >
            {({ pressed }) => {
              const isActive = active === "profile";
              return (
                <View style={[styles.tabContent, { opacity: pressed ? 0.6 : 1 }]}>
                  <Feather
                    name="user"
                    size={22}
                    color={isActive ? "#FFFFFF" : "#8E8E93"}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? "#FFFFFF" : "#8E8E93",
                        fontFamily: isActive ? "Poppins_600SemiBold" : "Poppins_400Regular"
                      }
                    ]}
                  >
                    Perfil
                  </Text>
                </View>
              );
            }}
          </Pressable>
        </View>
      </View>

      <FollowRequestsModal
        visible={followRequestsVisible}
        onClose={() => setFollowRequestsVisible(false)}
        onOpenProfile={onOpenProfile}
        onRequestHandled={() => {
          fetchRequests();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#121214"
  },
  header: {
    height: 120,
    backgroundColor: "#000000",
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    zIndex: 1
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  wordmark: {
    color: "#ffffff",
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    letterSpacing: -0.5
  },
  headerActions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1c1c20",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)"
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "#1c1c20"
  },
  content: {
    flex: 1,
    zIndex: 5,
    backgroundColor: "#121214"
  },
  footerContainer: {
    width: "100%",
    backgroundColor: "#121214",
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    zIndex: 100
  },
  navBar: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 8,
    backgroundColor: "#121214"
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  tabText: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center"
  }
});
