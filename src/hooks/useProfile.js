import { useCallback, useEffect, useState } from "react";
import { api, session } from "../api";
import { ProfileCache } from "../services/profileCache";
import { errorMessage, normalizeUser, unwrap } from "../lib/format";

export function useProfile(user, onRefresh, onUpdateUser, onLogout) {
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [followersVisible, setFollowersVisible] = useState(false);
  const [followersTab, setFollowersTab] = useState("followers");
  const [deletionInfo, setDeletionInfo] = useState(null);
  const [cancelingDeletion, setCancelingDeletion] = useState(false);

  const [profileData, setProfileData] = useState(() => {
    const cached = user?.id ? ProfileCache.getProfileSync(user.id) : null;
    return cached ? { ...(user || {}), ...cached } : (user || null);
  });

  const [userPosts, setUserPosts] = useState(() => {
    return user?.id ? ProfileCache.getPostsSync(user.id) : [];
  });

  const [loadingPosts, setLoadingPosts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileAlert, setProfileAlert] = useState({ visible: false });

  useEffect(() => {
    if (user?.id) {
      const cached = ProfileCache.getProfileSync(user.id);
      if (cached) {
        setProfileData((prev) => ({ ...(prev || {}), ...cached }));
      } else if (user) {
        setProfileData((prev) => ({ ...(prev || {}), ...user }));
      }
    }
  }, [user?.id]);

  const fetchProfile = useCallback(
    async (silent = false) => {
      if (!user?.id || !session?.token) return;
      try {
        const cached = ProfileCache.getProfileSync(user.id);
        const cachedPosts = ProfileCache.getPostsSync(user.id);
        if (!silent && (!cached || cachedPosts.length === 0)) {
          setLoadingPosts(true);
        }
        const [res, meRes, postsRes] = await Promise.all([
          api.users.get(user.id).catch(() => null),
          api.me().catch(() => null),
          api.users.posts(user.id).catch(() => null)
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
          ProfileCache.setProfileSync(user.id, merged);
          onUpdateUser?.(merged);
        }
        const allPosts = postsRes?.posts || postsRes?.data || postsRes || [];
        if (Array.isArray(allPosts)) {
          setUserPosts(allPosts);
          ProfileCache.setPostsSync(user.id, allPosts);
        }
      } catch (err) {
        console.warn("Erro ao carregar perfil:", err);
      } finally {
        setLoadingPosts(false);
      }
    },
    [user?.id, onUpdateUser]
  );

  const fetchDeletionStatus = useCallback(async () => {
    if (!session?.token) return;
    try {
      const res = await api.users.deletionStatus();
      if (res) {
        setDeletionInfo(res.data || res);
      }
    } catch (_) {}
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchProfile(true),
        fetchDeletionStatus(),
        onRefresh ? Promise.resolve(onRefresh()) : Promise.resolve()
      ]);
    } catch (err) {
      console.warn("Erro ao recarregar perfil:", err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchProfile, fetchDeletionStatus, onRefresh]);

  useEffect(() => {
    fetchProfile();
    fetchDeletionStatus();
  }, [fetchProfile, fetchDeletionStatus]);

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
      onRefresh?.();
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
  }, [onRefresh]);

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
