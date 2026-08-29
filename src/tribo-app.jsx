import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
  Text,
  BackHandler,
  AppState,
  Platform } from
"react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold } from
"@expo-google-fonts/poppins";
import { api, session } from "./api";
import AuthScreen from "./pages/login/Login";
import FeedScreen from "./pages/feed/Feed";
import { ReelsScreen } from "./pages/reels/Reels";
import { ProfileScreen, SearchScreen, Settings } from "./pages/perfil/Perfil";
import IntroScreen from "./pages/login/Intro";
import {
  TribosListScreen,
  CreateTribeScreen,
  GroupDetailsScreen,
  GroupSettingsScreen,
  InviteMembersScreen } from
"./pages/tribos/Tribos";
import { ConversationsListScreen, DirectChatScreen } from "./pages/mensagens/Mensagens";
import { TrendsScreen } from "./pages/tendencias/Tendencias";
import { SavedPostsScreen } from "./pages/perfil/SavedPosts";
import { ArchivedPostsScreen } from "./pages/perfil/ArchivedPosts";
import { AppearanceScreen } from "./pages/aparencia/Aparencia";
import { AppShell } from "./components/layout/app-shell";
import { SuspendedModal } from "./components/modals/suspended-modal";
import { PlatformSuspendedScreen } from "./components/modals/PlatformSuspendedScreen";
import { PublicProfile } from "./components/profile/public-profile";
import { ThemeProvider, useTheme } from "./theme";
import { UserProvider } from "./context/user-context";
import { normalizeUser, unwrap } from "./lib/format";
import { initGlobalAudioMode } from "./services/audioRecordingDucking";
import { getChatSocket } from "./services/chatSocket";
import * as Notifications from "expo-notifications";
import {
  registerForPushNotificationsAsync,
  unregisterPushNotificationsAsync } from
"./services/notifications";

function TriboRoot() {
  useEffect(() => {
    initGlobalAudioMode();
  }, []);
  const { colors, mode } = useTheme();
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState("feed");
  const [profileToOpen, setProfileToOpen] = useState(null);
  const [chatToOpen, setChatToOpen] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [activeGroupObject, setActiveGroupObject] = useState(null);
  const [showIntro, setShowIntro] = useState(false);
  const [bannedMessage, setBannedMessage] = useState(null);
  const [platformSuspended, setPlatformSuspended] = useState(null);
  const [showAdminAuth, setShowAdminAuth] = useState(false);

  const checkPlatformStatus = useCallback(async () => {
    try {
      const res = await api.app.version().catch(() => null);
      if (res?.platform_status && res.platform_status !== "ACTIVE") {
        setPlatformSuspended({
          status: res.platform_status,
          message: res.suspension_reason || res.message,
          reason: res.suspension_reason
        });
      } else {
        setPlatformSuspended(null);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const unsubBan = api.onBan((message) => {
      setUser(null);
      setScreen("feed");
      setBannedMessage(
        message ||
        "Sua conta foi banida por violação das diretrizes da comunidade."
      );
    });

    const unsubSuspension = api.onPlatformSuspended((payload) => {
      setPlatformSuspended({
        status: payload?.status || payload?.platform_status || "MAINTENANCE",
        message: payload?.message || "",
        reason: payload?.reason || payload?.suspension_reason || ""
      });
    });


    const socket = getChatSocket();
    const handleStatusChangedSocket = (payload) => {
      if (payload?.platform_status && payload.platform_status !== "ACTIVE") {
        setPlatformSuspended({
          status: payload.platform_status,
          message: payload.suspension_reason || payload.message || "",
          reason: payload.suspension_reason || ""
        });
      } else if (payload?.platform_status === "ACTIVE" || payload?.status === "ACTIVE") {
        setPlatformSuspended(null);
      }
    };

    if (socket) {
      socket.on("platform-status-changed", handleStatusChangedSocket);
      socket.on("platform_status_changed", handleStatusChangedSocket);
    }


    checkPlatformStatus();

    // Re-check and reconnect when app returns from background / becomes active
    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkPlatformStatus();
        try {
          const s = getChatSocket();
          if (s && !s.connected) {
            s.connect();
          }
        } catch (_) {}
      }
    });

    // Gentle fallback check every 60s (WebSocket delivers instant updates)
    const interval = setInterval(checkPlatformStatus, 60000);

    return () => {
      unsubBan();
      unsubSuspension();
      appStateSub?.remove?.();
      clearInterval(interval);
      if (socket) {
        socket.off("platform-status-changed", handleStatusChangedSocket);
        socket.off("platform_status_changed", handleStatusChangedSocket);
      }
    };
  }, [checkPlatformStatus]);

  useEffect(() => {
    const handleBackPress = () => {
      if (showIntro) {
        return true;
      }

      if (profileToOpen !== null) {
        setProfileToOpen(null);
        return true;
      }

      const backMap = {
        tribe_invite: "tribe_settings",
        tribe_settings: "tribe_details",
        tribe_details: "tribes_list",
        tribe_create: "tribes_list",
        tribes_list: "feed",
        appearance: "profile",
        saved_posts: "profile",
        archived_posts: "profile",
        chat: "conversations",
        conversations: "feed",
        reels: "feed",
        search: "feed",
        trends: "feed",
        profile: "feed"
      };

      if (screen !== "feed" && backMap[screen]) {
        setScreen(backMap[screen]);
        return true;
      }

      if (screen === "feed") {
        return false;
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );

    return () => backHandler.remove();
  }, [profileToOpen, screen, showIntro]);

  const handleOpenChat = useCallback((targetUser) => {
    setChatToOpen(targetUser);
    setScreen("chat");
  }, []);

  const handleNotificationResponse = useCallback(
    (response) => {
      try {
        const data = response?.notification?.request?.content?.data;
        if (!data) return;

        const type = data.type || data.notification_type;

        if (type === "chat" || type === "message") {
          const senderId =
          data.senderId || data.sender_id || data.userId || data.user_id;
          const senderUsername =
          data.senderUsername ||
          data.sender_username ||
          data.username ||
          "usuario";
          if (senderId) {
            handleOpenChat({ id: senderId, username: senderUsername });
          } else {
            setScreen("conversations");
          }
        } else if (
        type === "post_like" ||
        type === "like" ||
        type === "post_comment" ||
        type === "comment")
        {
          setScreen("feed");
        } else if (
        type === "group" ||
        type === "group_message" ||
        type === "group_invite" ||
        type === "tribe")
        {
          const groupId = data.groupId || data.group_id;
          if (groupId) {
            setActiveGroupId(groupId);
            setScreen("tribe_details");
          } else {
            setScreen("tribes_list");
          }
        } else if (
        type === "request" ||
        type === "follow" ||
        type === "follow_request")
        {
          const targetId =
          data.requesterId ||
          data.requester_id ||
          data.userId ||
          data.user_id;
          if (targetId) {
            setProfileToOpen({ id: targetId });
          } else {
            setScreen("profile");
          }
        }
      } catch (err) {
        console.warn("[App] Erro ao tratar clique de notificação:", err);
      }
    },
    [handleOpenChat]
  );

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().
    then((response) => {
      if (response) {
        handleNotificationResponse(response);
      }
    }).
    catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      subscription.remove();
    };
  }, [handleNotificationResponse]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.me();
      const current = unwrap(res, "user");
      if (current?.id) {
        const normalized = normalizeUser(current);
        setUser(normalized);
        return normalized;
      }
      return current;
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        await session.clear();
      } else {
        console.warn(
          "[App] Não foi possível verificar sessão do usuário:",
          error?.message || error
        );
      }
      setUser(null);
      return null;
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const hasToken = await session.restore();
        if (hasToken) {
          await refreshUser();
        }
      } catch (err) {
        console.warn("[App] Erro na restauração inicial:", err);
      } finally {
        setBooting(false);
      }
    })();
  }, [refreshUser]);

  useEffect(() => {
    if (user?.id) {
      registerForPushNotificationsAsync(api).catch((err) => {
        console.warn("[App] Falha ao registrar push notifications:", err);
      });
    }
  }, [user?.id]);

  const authenticated = async (current) => {
    setShowIntro(true);
    if (current?.id) setUser(normalizeUser(current));else
    await refreshUser();
    setScreen("feed");
  };

  const logout = async () => {
    await unregisterPushNotificationsAsync(api).catch(() => {});
    await session.clear();
    setUser(null);
    setScreen("feed");
  };

  const isMasterAdmin = Boolean(
    user?.email?.trim().toLowerCase() === "luansilva@gmail.com"
  );

  if (booting)
  return (
    <View style={[styles.loading, { backgroundColor: colors.ink }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>);

  if (platformSuspended && !isMasterAdmin && !showAdminAuth) {
    return (
      <PlatformSuspendedScreen
        visible={true}
        status={platformSuspended.status}
        message={platformSuspended.message}
        reason={platformSuspended.reason}
        onRetry={checkPlatformStatus}
        onAdminLogin={() => setShowAdminAuth(true)} />);


  }

  if (!user) {
    return (
      <AuthScreen
        onAuthenticated={(current) => {
          setShowAdminAuth(false);
          authenticated(current);
        }} />);


  }

  if (showIntro) {
    return <IntroScreen onFinish={() => setShowIntro(false)} />;
  }

  const pages = {
    feed: <FeedScreen user={user} onOpenProfile={setProfileToOpen} />,
    reels: <ReelsScreen user={user} />,
    search: <SearchScreen user={user} onOpenProfile={setProfileToOpen} />,
    trends: <TrendsScreen />,
    profile:
    <ProfileScreen
      user={user}
      onRefresh={refreshUser}
      onLogout={logout}
      onOpenProfile={setProfileToOpen}
      onOpenSettings={() => setScreen("settings")}
      onOpenAppearance={() => setScreen("appearance")}
      onOpenSavedPosts={() => setScreen("saved_posts")}
      onOpenArchivedPosts={() => setScreen("archived_posts")}
      onUpdateUser={(next) =>
      setUser(typeof next === "function" ? next : normalizeUser(next))
      } />,

    settings:
    <Settings
      user={user}
      onClose={() => setScreen("profile")}
      onLogout={logout}
      onOpenAppearance={() => setScreen("appearance")}
      onOpenSavedPosts={() => setScreen("saved_posts")}
      onOpenArchivedPosts={() => setScreen("archived_posts")}
      onUpdateUser={(next) =>
      setUser(typeof next === "function" ? next : normalizeUser(next))
      } />,

    appearance: <AppearanceScreen onBack={() => setScreen("profile")} />,
    saved_posts:
    <SavedPostsScreen
      user={user}
      onBack={() => setScreen("profile")}
      onOpenProfile={setProfileToOpen} />,


    archived_posts:
    <ArchivedPostsScreen
      user={user}
      onBack={() => setScreen("profile")}
      onOpenProfile={setProfileToOpen} />,


    tribes_list:
    <TribosListScreen
      onBack={() => setScreen("feed")}
      onCreateTribe={() => setScreen("tribe_create")}
      onOpenTribe={(id) => {
        setActiveGroupId(id);
        setScreen("tribe_details");
      }} />,


    tribe_create:
    <CreateTribeScreen
      user={user}
      onBack={() => setScreen("tribes_list")}
      onCreated={(id) => {
        setActiveGroupId(id);
        setScreen("tribe_details");
      }} />,


    tribe_details:
    <GroupDetailsScreen
      groupId={activeGroupId}
      user={user}
      onBack={() => setScreen("tribes_list")}
      onSettings={(grp) => {
        setActiveGroupObject(grp);
        setScreen("tribe_settings");
      }}
      onInvite={() => setScreen("tribe_invite")}
      onOpenProfile={setProfileToOpen} />,


    tribe_settings:
    <GroupSettingsScreen
      group={activeGroupObject}
      user={user}
      onBack={() => setScreen("tribe_details")}
      onInvite={() => setScreen("tribe_invite")}
      onGroupDeleted={() => setScreen("tribes_list")}
      onLeft={() => setScreen("tribes_list")} />,


    tribe_invite:
    <InviteMembersScreen
      groupId={activeGroupId}
      user={user}
      onBack={() => setScreen("tribe_settings")} />,


    conversations:
    <ConversationsListScreen
      user={user}
      onBack={() => setScreen("feed")}
      onOpenChat={handleOpenChat}
      onOpenProfile={setProfileToOpen} />,


    chat:
    <DirectChatScreen
      targetUser={chatToOpen}
      currentUser={user}
      onBack={() => setScreen("conversations")}
      onOpenProfile={setProfileToOpen} />


  };


  if (
  [
  "tribes_list",
  "tribe_create",
  "tribe_details",
  "tribe_settings",
  "tribe_invite",
  "conversations",
  "chat",
  "appearance",
  "settings"].
  includes(screen))
  {
    return (
      <UserProvider user={user}>
        <SafeAreaView
          style={[styles.safe, { backgroundColor: colors.background }]}
          edges={["top", "bottom"]}>
          
          <StatusBar style="light" />

          {}
          {platformSuspended && isMasterAdmin &&
          <View style={{
            backgroundColor: platformSuspended.status === "LEGAL_ORDER" ? "#ef4444" : "#f59e0b",
            paddingVertical: 5,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6
          }}>
              <Feather name="shield" size={13} color="#000000" />
              <Text style={{ color: "#000000", fontSize: 11, fontFamily: "Poppins_700Bold" }}>
                {platformSuspended.status === "LEGAL_ORDER" ?
              "Modo Ordem Legal Ativo • Acesso Master Liberado (luansilva@gmail.com)" :
              "Modo Manutenção Ativo • Acesso Master Liberado (luansilva@gmail.com)"}
              </Text>
            </View>
          }

          {pages[screen]}
          <PublicProfile
            user={profileToOpen}
            currentUserId={user.id}
            onClose={() => setProfileToOpen(null)}
            onBlocked={() => setProfileToOpen(null)}
            onOpenProfile={setProfileToOpen}
            onOpenChat={(target) => {
              setProfileToOpen(null);
              handleOpenChat(target);
            }} />
          
          <PlatformSuspendedScreen
            visible={Boolean(platformSuspended && !isMasterAdmin)}
            status={platformSuspended?.status}
            message={platformSuspended?.message}
            reason={platformSuspended?.reason}
            onRetry={checkPlatformStatus} />
          
        </SafeAreaView>
      </UserProvider>);

  }

  return (
    <UserProvider user={user}>
      <View
        style={[
        styles.safe,
        { backgroundColor: colors.card || colors.background }]
        }>
        
        <SafeAreaView style={{ backgroundColor: "#000000" }} edges={["top"]}>
          <StatusBar style="light" />
        </SafeAreaView>

        {}
        {platformSuspended && isMasterAdmin &&
        <View style={{
          backgroundColor: platformSuspended.status === "LEGAL_ORDER" ? "#ef4444" : "#f59e0b",
          paddingVertical: 5,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6
        }}>
            <Feather name="shield" size={13} color="#000000" />
            <Text style={{ color: "#000000", fontSize: 11, fontFamily: "Poppins_700Bold" }}>
              {platformSuspended.status === "LEGAL_ORDER" ?
            "Modo Ordem Legal Ativo • Acesso Master Liberado (luansilva@gmail.com)" :
            "Modo Manutenção Ativo • Acesso Master Liberado (luansilva@gmail.com)"}
            </Text>
          </View>
        }

        <View
          style={{ flex: 1, backgroundColor: colors.card || colors.background }}>
          
          <AppShell
            active={screen}
            onNavigate={setScreen}
            onCreateTribo={() => setScreen("tribes_list")}
            onOpenMessages={() => setScreen("conversations")}
            onOpenProfile={setProfileToOpen}>
            
            {pages[screen]}
          </AppShell>
          <PublicProfile
            user={profileToOpen}
            currentUserId={user.id}
            onClose={() => setProfileToOpen(null)}
            onBlocked={() => setProfileToOpen(null)}
            onOpenProfile={setProfileToOpen}
            onOpenChat={(target) => {
              setProfileToOpen(null);
              handleOpenChat(target);
            }} />
          
          <SuspendedModal
            visible={!!bannedMessage}
            message={bannedMessage}
            onClose={() => setBannedMessage(null)} />

          <PlatformSuspendedScreen
            visible={Boolean(platformSuspended && !isMasterAdmin)}
            status={platformSuspended?.status}
            message={platformSuspended?.message}
            reason={platformSuspended?.reason}
            onRetry={checkPlatformStatus} />
          
        </View>
      </View>
    </UserProvider>);

}

export default function TriboApp() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold
  });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <TriboRoot />
      </ThemeProvider>
    </SafeAreaProvider>);

}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" }
});