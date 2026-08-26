import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
  BackHandler,
  Platform } from
"react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
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
import { ProfileScreen, SearchScreen } from "./pages/perfil/Perfil";
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
import { PublicProfile } from "./components/profile/public-profile";
import { ThemeProvider, useTheme } from "./theme";
import { UserProvider } from "./context/user-context";
import { normalizeUser, unwrap } from "./lib/format";
import { initGlobalAudioMode } from "./services/audioRecordingDucking";
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

  useEffect(() => {
    const unsubscribe = api.onBan((message) => {
      setUser(null);
      setScreen("feed");
      setBannedMessage(
        message ||
        "Sua conta foi banida por violação das diretrizes da comunidade."
      );
    });
    return unsubscribe;
  }, []);

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

  if (booting)
  return (
    <View style={[styles.loading, { backgroundColor: colors.ink }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>);

  if (!user) return <AuthScreen onAuthenticated={authenticated} />;

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
  "appearance"].
  includes(screen))
  {
    return (
      <UserProvider user={user}>
        <SafeAreaView
          style={[styles.safe, { backgroundColor: colors.background }]}
          edges={["top", "bottom"]}>
          
          <StatusBar style="light" />
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