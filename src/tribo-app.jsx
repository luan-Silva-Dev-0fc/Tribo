import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
  Text,
  BackHandler,
  AppState,
  ToastAndroid,
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
import { BiometricAuthModal } from "./components/modals/BiometricAuthModal";
import { getSecuritySettings } from "./services/biometricsService";
import { PublicProfile } from "./components/profile/public-profile";
import { ThemeProvider, useTheme } from "./theme";
import { UserProvider } from "./context/user-context";

export const APP_OTA_VERSION = "1.0.4";
import { normalizeUser, unwrap } from "./lib/format";
import { initGlobalAudioMode } from "./services/audioRecordingDucking";
import { getChatSocket } from "./services/chatSocket";
import * as Notifications from "expo-notifications";
import {
  registerForPushNotificationsAsync,
  unregisterPushNotificationsAsync } from
"./services/notifications";
import { ProfileCache } from "./services/profileCache";
import { signOutGoogle } from "./services/google-auth";
import { supabase } from "./lib/supabase";

function TriboRoot() {
  useEffect(() => {
    initGlobalAudioMode();
  }, []);
  const { colors, mode } = useTheme();
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [screenStack, setScreenStack] = useState(["feed"]);
  const screen = screenStack[screenStack.length - 1] || "feed";
  const [profileToOpen, setProfileToOpen] = useState(null);
  const [chatToOpen, setChatToOpen] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [activeGroupObject, setActiveGroupObject] = useState(null);
  const [showIntro, setShowIntro] = useState(false);
  const [bannedMessage, setBannedMessage] = useState(null);
  const [platformSuspended, setPlatformSuspended] = useState(null);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [isAppUnlocked, setIsAppUnlocked] = useState(true);
  const [biometricPrompt, setBiometricPrompt] = useState({ visible: false });

  useEffect(() => {
    async function checkAppLock() {
      try {
        const security = await getSecuritySettings();
        if (security.appLock) {
          setIsAppUnlocked(false);
        }
      } catch (e) {}
    }
    checkAppLock();
  }, []);

  const handleOpenTribeSecurely = useCallback(async (id) => {
    try {
      const security = await getSecuritySettings();
      if (security.groupLock) {
        setBiometricPrompt({
          visible: true,
          title: "Tribo Protegida",
          reason: "Confirme sua digital para acessar esta tribo",
          onSuccess: () => {
            setBiometricPrompt({ visible: false });
            setActiveGroupId(id);
            navigate("tribe_details");
          },
          onCancel: () => {
            setBiometricPrompt({ visible: false });
          }
        });
        return;
      }
    } catch (e) {}
    setActiveGroupId(id);
    navigate("tribe_details");
  }, [navigate]);
  // Invalida respostas de sessao iniciadas antes de um login/logout.
  const authEpochRef = useRef(0);
  const lastBackPressRef = useRef(0);

  const navigate = useCallback((targetScreen) => {
    if (!targetScreen) return;
    setScreenStack((prev) => {
      if (prev[prev.length - 1] === targetScreen) {
        return prev;
      }
      if (targetScreen === "feed") {
        return ["feed"];
      }
      const mainTabs = ["search", "reels", "trends", "profile"];
      if (mainTabs.includes(targetScreen)) {
        return ["feed", targetScreen];
      }
      return [...prev, targetScreen];
    });
  }, []);

  const goBack = useCallback(() => {
    if (profileToOpen !== null) {
      setProfileToOpen(null);
      return true;
    }

    if (screenStack.length > 1) {
      setScreenStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
      return true;
    }

    return false;
  }, [profileToOpen, screenStack.length]);

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
      setScreenStack(["feed"]);
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

      if (screenStack.length > 1) {
        setScreenStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
        return true;
      }

      if (screen !== "feed") {
        setScreenStack(["feed"]);
        return true;
      }

      if (Platform.OS === "android") {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPressRef.current = now;
        ToastAndroid.show("Pressione voltar novamente para sair", ToastAndroid.SHORT);
        return true;
      }

      return false;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );

    return () => backHandler.remove();
  }, [profileToOpen, screenStack.length, screen, showIntro]);

  const handleOpenChat = useCallback((targetUser) => {
    setChatToOpen(targetUser);
    navigate("chat");
  }, [navigate]);

  const handleNotificationResponse = useCallback(
    (response) => {
      try {
        const data = response?.notification?.request?.content?.data;
        if (!data) return;

        const type = data.type || data.notification_type;

        if (
          type === "chat" ||
          type === "message" ||
          type === "story_reply" ||
          type === "story_reaction" ||
          type === "story"
        ) {
          const senderId =
            data.senderId ||
            data.sender_id ||
            data.userId ||
            data.user_id ||
            data.authorId ||
            data.author_id ||
            data.sender?.id ||
            data.user?.id;
          const senderUsername =
            data.senderUsername ||
            data.sender_username ||
            data.username ||
            data.sender?.username ||
            data.user?.username ||
            "";
          const senderName =
            data.senderName ||
            data.sender_name ||
            data.name ||
            data.sender?.name ||
            data.user?.name ||
            "";
          const senderAvatar =
            data.senderAvatar ||
            data.sender_avatar ||
            data.avatar ||
            data.avatar_url ||
            data.sender?.avatar_url ||
            data.user?.avatar_url ||
            "";

          if (senderId) {
            handleOpenChat({
              id: senderId,
              username: senderUsername,
              name: senderName,
              avatar_url: senderAvatar
            });
          } else {
            navigate("conversations");
          }
        } else if (
        type === "post_like" ||
        type === "like" ||
        type === "post_comment" ||
        type === "comment")
        {
          navigate("feed");
        } else if (
        type === "group" ||
        type === "group_message" ||
        type === "group_invite" ||
        type === "tribe")
        {
          const groupId = data.groupId || data.group_id;
          if (groupId) {
            handleOpenTribeSecurely(groupId);
          } else {
            navigate("tribes_list");
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
            navigate("profile");
          }
        }
      } catch (err) {
        console.warn("[App] Erro ao tratar clique de notificação:", err);
      }
    },
    [handleOpenChat, navigate]
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
    const authEpoch = authEpochRef.current;
    const tokenAtStart = session.token;
    try {
      const res = await api.me();
      if (authEpoch !== authEpochRef.current || tokenAtStart !== session.token) {
        return null;
      }
      const current = unwrap(res, "user");
      if (current?.id) {
        const normalized = normalizeUser(current);
        const cached = ProfileCache.getProfileSync(normalized.id);
        const merged = {
          ...(cached || {}),
          ...normalized
        };
        setUser(merged);
        ProfileCache.setProfileSync(normalized.id, merged);
        return merged;
      }
      return current;
    } catch (error) {
      if (authEpoch !== authEpochRef.current || tokenAtStart !== session.token) {
        return null;
      }
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
      const authEpoch = authEpochRef.current;
      try {
        const hasToken = await session.restore();
        // SecureStore e assincrono: se houve logout enquanto ele lia o token,
        // nunca permita que o valor antigo restaure a conta novamente.
        if (authEpoch !== authEpochRef.current) {
          await session.clear();
          return;
        }
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
    if (user?.id && session?.token) {
      registerForPushNotificationsAsync(api).catch(() => {});
    }
  }, [user?.id, session?.token]);

  const authenticated = async (current) => {
    authEpochRef.current += 1;
    setShowIntro(true);
    if (current?.id) {
      const normalized = normalizeUser(current);
      const cached = ProfileCache.getProfileSync(normalized.id);
      const merged = { ...(cached || {}), ...normalized };
      setUser(merged);
      ProfileCache.setProfileSync(normalized.id, merged);
    } else {
      await refreshUser();
    }
    setScreenStack(["feed"]);
  };

  const logout = async () => {
    // Atualiza a interface e invalida imediatamente requisicoes pendentes.
    // Assim, uma resposta antiga de /me nao pode recolocar o usuario na conta.
    authEpochRef.current += 1;
    setUser(null);
    setScreenStack(["feed"]);
    setProfileToOpen(null);
    setActiveGroupId(null);
    setChatToOpen(null);

    try {
      await unregisterPushNotificationsAsync(api).catch(() => {});
    } catch (_) {}
    await Promise.allSettled([
      session.clear(),
      signOutGoogle(),
      supabase.auth.signOut({ scope: "local" })
    ]);
    try {
      const socket = getChatSocket();
      if (socket) {
        socket.disconnect();
      }
    } catch (_) {}
  };

  const isMasterAdmin = Boolean(
    user?.email?.trim().toLowerCase() === "luansilva@gmail.com"
  );

  if (booting)
    return (
      <View style={[styles.loading, { backgroundColor: colors.background || "#000000" }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.accent || "#0284c7"} />
      </View>
    );

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
      onOpenSettings={() => navigate("settings")}
      onOpenAppearance={() => navigate("appearance")}
      onOpenSavedPosts={() => navigate("saved_posts")}
      onOpenArchivedPosts={() => navigate("archived_posts")}
      onUpdateUser={(next) =>
      setUser(typeof next === "function" ? next : normalizeUser(next))
      } />,

    settings:
    <Settings
      user={user}
      onClose={goBack}
      onLogout={logout}
      onOpenAppearance={() => navigate("appearance")}
      onOpenSavedPosts={() => navigate("saved_posts")}
      onOpenArchivedPosts={() => navigate("archived_posts")}
      onUpdateUser={(next) =>
      setUser(typeof next === "function" ? next : normalizeUser(next))
      } />,

    appearance: <AppearanceScreen onBack={goBack} />,
    saved_posts:
    <SavedPostsScreen
      user={user}
      onBack={goBack}
      onOpenProfile={setProfileToOpen} />,


    archived_posts:
    <ArchivedPostsScreen
      user={user}
      onBack={goBack}
      onOpenProfile={setProfileToOpen} />,


    tribes_list:
    <TribosListScreen
      onBack={goBack}
      onCreateTribe={() => navigate("tribe_create")}
      onOpenTribe={handleOpenTribeSecurely} />,


    tribe_create:
    <CreateTribeScreen
      user={user}
      onBack={goBack}
      onCreated={(id) => {
        setActiveGroupId(id);
        navigate("tribe_details");
      }} />,


    tribe_details:
    <GroupDetailsScreen
      groupId={activeGroupId}
      user={user}
      onBack={goBack}
      onSettings={(grp) => {
        setActiveGroupObject(grp);
        navigate("tribe_settings");
      }}
      onInvite={() => navigate("tribe_invite")}
      onOpenProfile={setProfileToOpen} />,


    tribe_settings:
    <GroupSettingsScreen
      group={activeGroupObject}
      user={user}
      onBack={goBack}
      onInvite={() => navigate("tribe_invite")}
      onGroupDeleted={() => navigate("tribes_list")}
      onLeft={() => navigate("tribes_list")} />,


    tribe_invite:
    <InviteMembersScreen
      groupId={activeGroupId}
      user={user}
      onBack={goBack} />,


    conversations:
    <ConversationsListScreen
      user={user}
      onBack={goBack}
      onOpenChat={handleOpenChat}
      onOpenProfile={setProfileToOpen} />,


    chat:
    <DirectChatScreen
      targetUser={chatToOpen}
      currentUser={user}
      onBack={goBack}
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
  "saved_posts",
  "archived_posts",
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

          {/* Bloqueio de Inicialização do App com Biometria */}
          {!isAppUnlocked && (
            <BiometricAuthModal
              visible={!isAppUnlocked}
              title="Tribo Bloqueada"
              reason="Confirme sua digital para entrar no aplicativo"
              cancellable={false}
              onSuccess={() => setIsAppUnlocked(true)}
            />
          )}

          {/* Prompt de Biometria para Ações Protegidas (ex: abrir tribos/grupos) */}
          {biometricPrompt.visible && (
            <BiometricAuthModal
              visible={biometricPrompt.visible}
              title={biometricPrompt.title}
              reason={biometricPrompt.reason}
              cancellable={true}
              onSuccess={biometricPrompt.onSuccess}
              onCancel={biometricPrompt.onCancel}
            />
          )}
          
        </SafeAreaView>
      </UserProvider>);

  }

  return (
    <UserProvider user={user}>
      <View
        style={[
        styles.safe,
        { backgroundColor: "#121214" }]
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
            user={user}
            active={screen}
            onNavigate={navigate}
            onCreateTribo={() => navigate("tribes_list")}
            onOpenMessages={() => navigate("conversations")}
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
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <TriboRoot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" }
});
