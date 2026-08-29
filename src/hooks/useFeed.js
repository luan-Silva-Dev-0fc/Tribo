import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated } from "react-native";
import { api, session } from "../api";
import { ProfileCache } from "../services/profileCache";
import { errorMessage, listFrom } from "../lib/format";

export function useFeed(user, isAdultContentEnabled, scrollToTopSignal) {
  const [posts, setPosts] = useState(() => ProfileCache.getFeedPostsSync() || []);
  const [loading, setLoading] = useState(() => !(ProfileCache.getFeedPostsSync()?.length > 0));
  const [refreshing, setRefreshing] = useState(false);
  const [commentPost, setCommentPost] = useState(null);
  const [optionsPost, setOptionsPost] = useState(null);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [repostModalPost, setRepostModalPost] = useState(null);
  const [activeVisiblePostId, setActiveVisiblePostId] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [alertConfig, setAlertConfig] = useState({ visible: false });
  const [reportModal, setReportModal] = useState({
    visible: false,
    targetType: "POST",
    targetId: null,
    authorId: null,
    targetName: ""
  });

  const flatListRef = useRef(null);
  const scrollTopAnim = useRef(new Animated.Value(0)).current;
  const pullY = useRef(new Animated.Value(0)).current;

  const visiblePosts = useMemo(() => {
    return (posts || []).filter((p) => {
      const isNsfw = Boolean(p.isNSFW ?? p.is_nsfw ?? p.nsfw);
      if (isNsfw && !isAdultContentEnabled) {
        return false;
      }
      return true;
    });
  }, [posts, isAdultContentEnabled]);

  const showAlert = useCallback((config) => {
    setAlertConfig({ visible: true, ...config });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig({ visible: false });
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      const cached = ProfileCache.getFeedPostsSync();
      if (!cached || cached.length === 0) {
        setLoading(true);
      }
      if (isRefresh) {
        setRefreshing(true);
      }

      if (!session?.token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const res = await api.posts.list();
        const fetched = listFrom(res, ["posts"]);
        const postList = Array.isArray(fetched) ? fetched : [];
        setPosts(postList);
        ProfileCache.setFeedPostsSync(postList);
      } catch (error) {
        const msg = errorMessage(error) || "";
        const isAuthError =
          error?.status === 401 ||
          msg.includes("Token de autenticação ausente") ||
          msg.includes("jwt") ||
          msg.includes("autenticação");

        if (!isAuthError && !ProfileCache.getFeedPostsSync()?.length) {
          showAlert({
            type: "error",
            title: "Feed indisponível",
            message: msg,
            onClose: hideAlert
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showAlert, hideAlert]
  );

  useEffect(() => {
    if (session?.token || user?.id) {
      load();
    }
  }, [load, user?.id]);

  useEffect(() => {
    if (scrollToTopSignal) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [scrollToTopSignal]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      const sorted = [...viewableItems].sort(
        (a, b) => (b.percentVisible || 0) - (a.percentVisible || 0)
      );
      const primaryItem = sorted[0]?.item;
      if (primaryItem?.id) {
        setActiveVisiblePostId(primaryItem.id);
        return;
      }
    }
    setActiveVisiblePostId(null);
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 80
  }).current;

  const handleScroll = useCallback(
    (e) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      pullY.setValue(offsetY);
      if (offsetY > 320 && !showScrollTop) {
        setShowScrollTop(true);
        Animated.spring(scrollTopAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true
        }).start();
      } else if (offsetY <= 320 && showScrollTop) {
        Animated.timing(scrollTopAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true
        }).start(() => {
          setShowScrollTop(false);
        });
      }
    },
    [showScrollTop, pullY, scrollTopAnim]
  );

  const scrollToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleBlockUser = useCallback(
    async (authorId, authorHandle) => {
      if (!authorId) return;
      try {
        await api.users.block(authorId);
        setPosts((prev) => {
          const updated = prev.filter((p) => {
            const aId = p.user?.id || p.author?.id || p.userId;
            return String(aId) !== String(authorId);
          });
          ProfileCache.setFeedPostsSync(updated);
          return updated;
        });
        showAlert({
          type: "success",
          title: "Usuário bloqueado",
          message: `Você não verá mais conteúdos nem o perfil de @${authorHandle}.`,
          onClose: hideAlert
        });
      } catch (error) {
        showAlert({
          type: "error",
          title: "Erro ao bloquear",
          message: errorMessage(error),
          onClose: hideAlert
        });
      }
    },
    [showAlert, hideAlert]
  );

  const handleReportSuccess = useCallback(({ targetType, targetId, authorId }) => {
    setPosts((prev) => {
      let updated = prev;
      if (authorId) {
        updated = prev.filter((p) => {
          const aId = p.user?.id || p.author?.id || p.userId;
          return String(aId) !== String(authorId) && String(p.id) !== String(targetId);
        });
      } else if (targetType === "POST" && targetId) {
        updated = prev.filter((p) => String(p.id) !== String(targetId));
      }
      ProfileCache.setFeedPostsSync(updated);
      return updated;
    });
  }, []);

  const like = useCallback(
    async (post) => {
      const effectiveUserId = user?.id;
      const likesList = post.likes || [];
      const isCurrentlyLiked = Boolean(
        post.isLiked ||
        post.is_liked ||
        likesList.some(
          (item) =>
            item.userId === effectiveUserId ||
            item.user_id === effectiveUserId ||
            item.user?.id === effectiveUserId
        )
      );

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === post.id) {
            const currentCount = p.likesCount ?? p.likes_count ?? (p.likes?.length || 0);
            return {
              ...p,
              isLiked: !isCurrentlyLiked,
              is_liked: !isCurrentlyLiked,
              likesCount: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
              likes_count: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
              likes: isCurrentlyLiked
                ? likesList.filter((l) => (l.userId || l.user_id || l.user?.id) !== effectiveUserId)
                : [...likesList, { userId: effectiveUserId }]
            };
          }
          return p;
        })
      );

      try {
        if (isCurrentlyLiked) {
          await api.likes.delete({ postId: post.id });
        } else {
          await api.likes.create({ postId: post.id });
        }
      } catch (error) {
        setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
        showAlert({
          type: "error",
          title: "Curtida não atualizada",
          message: errorMessage(error),
          onClose: hideAlert
        });
      }
    },
    [user?.id, showAlert, hideAlert]
  );

  const executeRepost = useCallback(
    async (post, content) => {
      if (content) {
        try {
          await api.posts.create({ content, repost_post_id: post.id });
          load(true);
        } catch (error) {
          showAlert({
            type: "error",
            title: "Erro ao criar repost",
            message: errorMessage(error),
            onClose: hideAlert
          });
        }
        return;
      }

      const effectiveUserId = user?.id;
      const repostsList = post.reposts || [];
      const isCurrentlyReposted = Boolean(
        post.isReposted ||
        post.is_reposted ||
        post.reposted ||
        repostsList.some(
          (item) =>
            item.userId === effectiveUserId ||
            item.user_id === effectiveUserId ||
            item.user?.id === effectiveUserId ||
            item.id === effectiveUserId
        )
      );

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === post.id) {
            const currentCount = p.repostsCount ?? p.reposts_count ?? (p.reposts?.length || 0);
            return {
              ...p,
              isReposted: !isCurrentlyReposted,
              is_reposted: !isCurrentlyReposted,
              repostsCount: isCurrentlyReposted ? Math.max(0, currentCount - 1) : currentCount + 1,
              reposts_count: isCurrentlyReposted ? Math.max(0, currentCount - 1) : currentCount + 1,
              reposts: isCurrentlyReposted
                ? repostsList.filter((r) => (r.userId || r.user_id || r.user?.id || r.id) !== effectiveUserId)
                : [...repostsList, { userId: effectiveUserId }]
            };
          }
          return p;
        })
      );

      try {
        if (isCurrentlyReposted) {
          await api.posts.undoRepost(post.id);
        } else {
          await api.posts.repost(post.id);
        }
      } catch (error) {
        setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
        showAlert({
          type: "error",
          title: "Não foi possível recompartilhar",
          message: errorMessage(error),
          onClose: hideAlert
        });
      }
    },
    [user?.id, load, showAlert, hideAlert]
  );

  const handleDeletePost = useCallback(
    async (postId) => {
      try {
        await api.posts.remove(postId);
        setPosts((prev) => {
          const updated = prev.filter((p) => p.id !== postId);
          ProfileCache.setFeedPostsSync(updated);
          return updated;
        });
        showAlert({
          type: "success",
          title: "Sucesso",
          message: "Publicação excluída com sucesso.",
          onClose: hideAlert
        });
      } catch (err) {
        showAlert({
          type: "error",
          title: "Erro",
          message: errorMessage(err) || "Não foi possível excluir a publicação.",
          onClose: hideAlert
        });
      }
    },
    [showAlert, hideAlert]
  );

  return {
    posts: visiblePosts,
    loading,
    refreshing,
    commentPost,
    setCommentPost,
    optionsPost,
    setOptionsPost,
    fullscreenMedia,
    setFullscreenMedia,
    repostModalPost,
    setRepostModalPost,
    activeVisiblePostId,
    showScrollTop,
    alertConfig,
    setAlertConfig,
    reportModal,
    setReportModal,
    flatListRef,
    scrollTopAnim,
    pullY,
    showAlert,
    hideAlert,
    load,
    onViewableItemsChanged,
    viewabilityConfig,
    handleScroll,
    scrollToTop,
    handleBlockUser,
    handleReportSuccess,
    like,
    executeRepost,
    handleDeletePost
  };
}
