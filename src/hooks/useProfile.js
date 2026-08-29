import { useCallback, useEffect, useRef, useState } from "react";
import { api, session } from "../api";
import { ProfileCache } from "../services/profileCache";
import { errorMessage, normalizeUser, unwrap } from "../lib/format";

export function useProfile(user, onRefresh, onUpdateUser, onLogout) {
  const onUpdateUserRef = useRef(onUpdateUser);
  onUpdateUserRef.current = onUpdateUser;

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [followersVisible, setFollowersVisible] = useState(false);
  const [followersTab, setFollowersTab] = useState("followers");
  const [deletionInfo, setDeletionInfo] = useState(null);
  const [cancelingDeletion, setCancelingDeletion] = useState(false);

  const userId = user?.id || user?._id || user?.userId || null;

  const [profileData, setProfileData] = useState(() => {
    const cached = userId ? ProfileCache.getProfileSync(userId) : null;
    return cached ? { ...(user || {}), ...cached } : (user || null);
  });

  const [userPosts, setUserPosts] = useState(() => {
    return userId ? ProfileCache.getPostsSync(userId) : [];
  });

  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileAlert, setProfileAlert] = useState({ visible: false });

  const isFetchingRef = useRef(false);

  const fetchProfile = useCallback(
    async (silent = false) => {
      const targetId = userId;
      if (!targetId || isFetchingRef.current) {
        return;
      }
      isFetchingRef.current = true;

      const cached = ProfileCache.getProfileSync(targetId);
      const cachedPosts = ProfileCache.getPostsSync(targetId);
      if (!silent && (!cached || cachedPosts.length === 0)) {
        setLoadingPosts(true);
      }

      try {
        const [res, meRes, postsRes, fallbackPostsRes] = await Promise.all([
          api.users.get(targetId).catch(() => null),
          api.me().catch(() => null),
          api.users.posts(targetId).catch(() => null),
          api.posts.list({ userId: targetId }).catch(() => null)
        ]);

        const resolved = res || unwrap(meRes, "user") || meRes;
        if (resolved) {
          const normalized = normalizeUser(resolved);
          const merged = {
            ...(cached || {}),
            ...normalized,
            followers_count: Number(
              normalized.followers_count ??
              normalized.followersCount ??
              cached?.followers_count ??
              cached?.followersCount ??
              0
            ),
            following_count: Number(
              normalized.following_count ??
              normalized.followingCount ??
              cached?.following_count ??
              cached?.followingCount ??
              0
            ),
            posts_count: Number(
              normalized.posts_count ??
              normalized.postsCount ??
              cached?.posts_count ??
              cached?.postsCount ??
              0
            )
          };
          setProfileData(merged);
          ProfileCache.setProfileSync(targetId, merged);
          onUpdateUserRef.current?.(merged);
        }

        const validPosts =
          (Array.isArray(postsRes) ? postsRes : null) ||
          postsRes?.posts ||
          postsRes?.data?.posts ||
          postsRes?.data ||
          (Array.isArray(fallbackPostsRes) ? fallbackPostsRes : null) ||
          fallbackPostsRes?.posts ||
          fallbackPostsRes?.data ||
          [];

        const finalPosts = Array.isArray(validPosts) ? validPosts : [];
        setUserPosts(finalPosts);
        ProfileCache.setPostsSync(targetId, finalPosts);
      } catch (err) {
        console.warn("Erro ao carregar perfil:", err);
      } finally {
        isFetchingRef.current = false;
        setLoadingPosts(false);
      }
    },
    [userId]
  );

  const fetchDeletionStatus = useCallback(async () => {
    if (!session?.token) return;
    try {
      const res = await api.users.deletionStatus();
      if (res) {
        setDeletionInfo(res.data || res);
      }
    } catch (_) { }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchProfile(true),
        fetchDeletionStatus(),
        onRefreshRef.current ? Promise.resolve(onRefreshRef.current()) : Promise.resolve()
      ]);
    } catch (err) {
      console.warn("Erro ao recarregar perfil:", err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchProfile, fetchDeletionStatus]);

  useEffect(() => {
    fetchProfile();
    fetchDeletionStatus();
  }, [userId, fetchProfile, fetchDeletionStatus]);

  const handleCancelDeletion = useCallback(async () => {
    try {
      setCancelingDeletion(true);
      await api.users.cancelDeletion();
      setDeletionInfo({ isPendingDeletion: false });
      setProfileAlert({
        visible: true,
        type: "success",
        title: "Exclusão Cancelada",
        message: "O pedido de exclusão da conta foi cancelado com sucesso! Sua conta permanece ativa.",
        buttonText: "Entendido",
        onClose: () => setProfileAlert({ visible: false })
      });
      onRefreshRef.current?.();
    } catch (err) {
      setProfileAlert({
        visible: true,
        type: "error",
        title: "Erro ao Cancelar",
        message: errorMessage(err) || "Não foi possível cancelar o agendamento de exclusão.",
        buttonText: "Fechar",
        onClose: () => setProfileAlert({ visible: false })
      });
    } finally {
      setCancelingDeletion(false);
    }
  }, []);

  const confirmLogout = useCallback(() => {
    setProfileAlert({
      visible: true,
      type: "warning",
      title: "Sair da Conta",
      message: "Você está prestes a desconectar da sua conta. Deseja continuar?",
      buttonText: "Sair",
      secondaryButtonText: "Cancelar",
      onSecondaryPress: () => setProfileAlert({ visible: false }),
      onClose: () => {
        setProfileAlert({ visible: false });
        onLogout?.();
      }
    });
  }, [onLogout]);

  return {
    profileData,
    setProfileData,
    userPosts,
    loadingPosts,
    refreshing,
    deletionInfo,
    cancelingDeletion,
    editing,
    setEditing,
    settings,
    setSettings,
    drawerVisible,
    setDrawerVisible,
    followersVisible,
    setFollowersVisible,
    followersTab,
    setFollowersTab,
    profileAlert,
    setProfileAlert,
    handleRefresh,
    handleCancelDeletion,
    fetchDeletionStatus,
    confirmLogout
  };
}
