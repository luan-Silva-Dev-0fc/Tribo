import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Audio } from "expo-av";
import { api, getUploadUrl } from "../../api";
import {
  Avatar,
  EmptyState,
  IconButton,
  VerificationBadge,
} from "../../components/ui/ui";
import { ReportModal } from "../../components/modals/report-modal";
import { AppLayout } from "../../components/layout/AppLayout";
import { StoriesBar } from "../../components/stories/stories-bar";
import { CommunityGuidelinesModal } from "../../components/modals/community-guidelines-modal";
import { MediaViewerModal } from "../../components/modals/media-viewer-modal";
import { RepostModal } from "../../components/modals/repost-modal";
import { TriboAlertModal } from "../../components/modals/tribo-alert-modal";
import { AppHeader } from "../../components/ui/ui";
import { useUserContext } from "../../context/user-context";
import {
  errorMessage,
  formatRelativeTime,
  listFrom,
  userName,
} from "../../lib/format";
import { useTheme } from "../../theme";

import { PostCard } from "../../components/feed/PostCard";
import { Composer, Comments } from "../../components/feed/Composer";

function PostOptionsModal({
  post,
  currentUser,
  onClose,
  onReport,
  onBlock,
  onDelete,
  showAlert,
}) {
  const { colors } = useTheme();
  if (!post) return null;

  const author = post.user || post.author || {};
  const authorId =
    author.id ||
    author._id ||
    author.userId ||
    author.user_id ||
    post.user_id ||
    post.userId ||
    post.author_id ||
    post.authorId;

  const currentUserId =
    currentUser?.id ||
    currentUser?._id ||
    currentUser?.userId ||
    currentUser?.user_id ||
    currentUser?.sub;

  const isMine = Boolean(
    authorId &&
    currentUserId &&
    String(authorId).toLowerCase() === String(currentUserId).toLowerCase(),
  );
  const authorHandle =
    author.username || author.handle || post.username || "usuario";
  const mediaUrl =
    post.imageUrl || post.image_url || post.videoUrl || post.video_url;

  const handleSave = async () => {
    onClose();
    try {
      await api.posts.save(post.id);
      setTimeout(() => {
        showAlert?.({
          type: "success",
          title: "Salvo!",
          message: "A publicação foi salva nos seus itens.",
        });
      }, 100);
    } catch (err) {
      setTimeout(() => {
        showAlert?.({
          type: "error",
          title: "Erro",
          message: "Não foi possível salvar a publicação.",
        });
      }, 100);
    }
  };

  const handleDownload = async () => {
    onClose();
    setTimeout(() => {
      showAlert?.({
        type: "info",
        title: "Baixar Mídia",
        message: "Deseja baixar esta mídia para a sua galeria?",
        buttonText: "Baixar",
        secondaryButtonText: "Cancelar",
        onSecondaryPress: () => showAlert?.({ visible: false }),
        onClose: async () => {
          showAlert?.({ visible: false });
          try {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== "granted") {
              setTimeout(
                () =>
                  showAlert?.({
                    type: "error",
                    title: "Permissão negada",
                    message:
                      "Precisamos de acesso à galeria para salvar a mídia.",
                  }),
                100,
              );
              return;
            }
            if (!mediaUrl) {
              setTimeout(
                () =>
                  showAlert?.({
                    type: "error",
                    title: "Erro",
                    message: "Esta publicação não tem mídia para baixar.",
                  }),
                100,
              );
              return;
            }
            const fileExt =
              typeof mediaUrl === "string" && mediaUrl.includes(".mp4")
                ? ".mp4"
                : ".jpg";
            const fileUri =
              FileSystem.documentDirectory + `tribo_${post.id}${fileExt}`;

            const downloadRes = await FileSystem.downloadAsync(
              mediaUrl,
              fileUri,
            );

            if (downloadRes.status === 200 || downloadRes.status === 201) {
              await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
              await api.posts.download(post.id).catch(() => {});
              setTimeout(
                () =>
                  showAlert?.({
                    type: "success",
                    title: "Sucesso",
                    message: "Mídia salva na galeria com sucesso!",
                  }),
                100,
              );
            } else {
              setTimeout(
                () =>
                  showAlert?.({
                    type: "error",
                    title: "Erro",
                    message: "Não foi possível baixar a mídia.",
                  }),
                100,
              );
            }
          } catch (error) {
            setTimeout(
              () =>
                showAlert?.({
                  type: "error",
                  title: "Erro",
                  message: "Ocorreu um erro ao tentar salvar a mídia.",
                }),
              100,
            );
          }
        },
      });
    }, 100);
  };

  const handleDelete = () => {
    onClose();
    setTimeout(() => {
      showAlert?.({
        type: "error",
        title: "Excluir publicação",
        message:
          "Tem certeza que deseja excluir esta publicação? Essa ação é permanente e sem volta.",
        buttonText: "Excluir",
        secondaryButtonText: "Cancelar",
        onSecondaryPress: () => showAlert?.({ visible: false }),
        onClose: () => {
          showAlert?.({ visible: false });
          onDelete?.(post.id);
        },
      });
    }, 100);
  };

  const handleBlock = () => {
    onClose();
    setTimeout(() => {
      showAlert?.({
        type: "warning",
        title: "Bloquear usuário",
        message: `Deseja bloquear @${authorHandle}? Você deixará de ver as publicações deste perfil.`,
        buttonText: "Bloquear",
        secondaryButtonText: "Cancelar",
        onSecondaryPress: () => showAlert?.({ visible: false }),
        onClose: () => {
          showAlert?.({ visible: false });
          onBlock?.(authorId, authorHandle);
        },
      });
    }, 100);
  };

  const handleReport = () => {
    onClose();
    onReport?.({
      targetType: "POST",
      targetId: post.id,
      authorId: authorId,
      targetName: `publicação de @${authorHandle}`,
    });
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View
        style={[
          styles.optionsSheet,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View
          style={[styles.optionsHandle, { backgroundColor: colors.border }]}
        />
        <Text style={[styles.optionsTitle, { color: colors.text }]}>
          Ações da Publicação
        </Text>

        <Pressable style={styles.optionItem} onPress={handleSave}>
          <View
            style={[styles.optionIcon, { backgroundColor: colors.surfaceAlt }]}
          >
            <Feather name="bookmark" size={20} color={colors.text} />
          </View>
          <Text style={[styles.optionText, { color: colors.text }]}>
            Salvar publicação
          </Text>
        </Pressable>

        {!!mediaUrl && (
          <Pressable style={styles.optionItem} onPress={handleDownload}>
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <Feather name="download" size={20} color={colors.text} />
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>
              Baixar Mídia
            </Text>
          </Pressable>
        )}

        {isMine ? (
          <Pressable style={styles.optionItem} onPress={handleDelete}>
            <View
              style={[
                styles.optionIcon,
                { backgroundColor: "rgba(239, 68, 68, 0.15)" },
              ]}
            >
              <Feather name="trash-2" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.optionText, { color: "#ef4444" }]}>
              Excluir publicação
            </Text>
          </Pressable>
        ) : (
          <>
            <Pressable style={styles.optionItem} onPress={handleBlock}>
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: "rgba(245, 158, 11, 0.15)" },
                ]}
              >
                <Feather name="user-x" size={20} color="#f59e0b" />
              </View>
              <Text style={[styles.optionText, { color: "#f59e0b" }]}>
                Bloquear @{authorHandle}
              </Text>
            </Pressable>

            <Pressable style={styles.optionItem} onPress={handleReport}>
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: "rgba(239, 68, 68, 0.15)" },
                ]}
              >
                <Feather name="flag" size={20} color="#ef4444" />
              </View>
              <Text style={[styles.optionText, { color: "#ef4444" }]}>
                Denunciar e Bloquear
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

function CommentOptionsModal({
  comment,
  currentUser,
  onClose,
  onReport,
  onBlock,
}) {
  const { colors } = useTheme();
  if (!comment) return null;

  const author = comment.user || comment.author || {};
  const authorId =
    author.id ||
    author._id ||
    author.userId ||
    author.user_id ||
    comment.user_id ||
    comment.userId ||
    comment.author_id ||
    comment.authorId;

  const currentUserId =
    currentUser?.id ||
    currentUser?._id ||
    currentUser?.userId ||
    currentUser?.user_id ||
    currentUser?.sub;

  const isMine = Boolean(
    authorId &&
    currentUserId &&
    String(authorId).toLowerCase() === String(currentUserId).toLowerCase(),
  );

  const authorHandle =
    author.username || author.handle || comment.username || "usuario";

  const handleBlock = () => {
    if (isMine) return;
    Alert.alert(
      "Bloquear usuário",
      `Deseja bloquear @${authorHandle}? Você deixará de ver publicações e comentários deste perfil.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: () => {
            onClose();
            onBlock?.(authorId, authorHandle);
          },
        },
      ],
    );
  };

  const handleReport = () => {
    if (isMine) return;
    onClose();
    onReport?.({
      targetType: "COMMENT",
      targetId: comment.id,
      authorId: authorId,
      targetName: `comentário de @${authorHandle}`,
    });
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View
        style={[
          styles.optionsSheet,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View
          style={[styles.optionsHandle, { backgroundColor: colors.border }]}
        />
        <Text style={[styles.optionsTitle, { color: colors.text }]}>
          Ações do Comentário
        </Text>

        {!isMine && (
          <>
            <Pressable style={styles.optionItem} onPress={handleBlock}>
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: "rgba(245, 158, 11, 0.15)" },
                ]}
              >
                <Feather name="user-x" size={20} color="#f59e0b" />
              </View>
              <Text style={[styles.optionText, { color: "#f59e0b" }]}>
                Bloquear @{authorHandle}
              </Text>
            </Pressable>

            <Pressable style={styles.optionItem} onPress={handleReport}>
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: "rgba(239, 68, 68, 0.15)" },
                ]}
              >
                <Feather name="flag" size={20} color="#ef4444" />
              </View>
              <Text style={[styles.optionText, { color: "#ef4444" }]}>
                Denunciar e Bloquear
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

function InlineVideo({ url, onOpenMedia, post, styles }) {
  if (!url) return null;

  return (
    <Pressable
      onPress={() => onOpenMedia?.({ url, type: "video", post })}
      style={({ pressed }) => [
        styles.imageWrapper,
        {
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.995 : 1 }],
        },
      ]}
    >
      <SafeFeedInlineVideo key={url} url={url} styles={styles} />
      <View style={styles.expandPill}>
        <Feather
          name="maximize-2"
          size={13}
          color="#FFFFFF"
          style={{ marginRight: 4 }}
        />
        <Text style={styles.expandPillText}>Tela cheia</Text>
      </View>
    </Pressable>
  );
}

function SafeFeedInlineVideo({ url, styles }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  if (!url || !player) {
    return (
      <View
        style={[
          styles.postImage,
          { backgroundColor: "#000000", minHeight: 220 },
        ]}
      />
    );
  }

  return (
    <VideoView
      key={url}
      player={player}
      style={[
        styles.postImage,
        {
          backgroundColor: "#000000",
          height: undefined,
          minHeight: 220,
          maxHeight: 500,
        },
      ]}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

export default function FeedScreen({ user, onOpenProfile, scrollToTopSignal }) {
  const { colors } = useTheme();
  const { isAdultContentEnabled } = useUserContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentPost, setCommentPost] = useState(null);
  const [optionsPost, setOptionsPost] = useState(null);
  const [fullscreenMedia, setFullscreenMedia] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false });

  const visiblePosts = useMemo(() => {
    return (posts || []).filter((p) => {
      const isNsfw = Boolean(p.isNSFW ?? p.is_nsfw ?? p.nsfw);
      if (isNsfw && !isAdultContentEnabled) {
        return false;
      }
      return true;
    });
  }, [posts, isAdultContentEnabled]);

  const showAlert = (config) => {
    setAlertConfig({ visible: true, ...config });
  };

  const flatListRef = useRef(null);
  const scrollTopAnim = useRef(new Animated.Value(0)).current;
  const pullY = useRef(new Animated.Value(0)).current;
  const [activeVisiblePostId, setActiveVisiblePostId] = useState(null);

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
    minimumViewTime: 80,
  }).current;

  const [reportModal, setReportModal] = useState({
    visible: false,
    targetType: "POST",
    targetId: null,
    authorId: null,
    targetName: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(listFrom(await api.posts.list(), ["posts"]));
    } catch (error) {
      showAlert({
        type: "error",
        title: "Feed indisponível",
        message: errorMessage(error),
        onClose: () => showAlert({ visible: false }),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (scrollToTopSignal) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [scrollToTopSignal]);

  const handleScroll = (e) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    pullY.setValue(offsetY);
    if (offsetY > 320 && !showScrollTop) {
      setShowScrollTop(true);
      Animated.spring(scrollTopAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else if (offsetY <= 320 && showScrollTop) {
      Animated.timing(scrollTopAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setShowScrollTop(false);
      });
    }
  };

  const handleBlockUser = async (authorId, authorHandle) => {
    if (!authorId) return;
    try {
      await api.users.block(authorId);
      setPosts((prev) =>
        prev.filter((p) => {
          const aId = p.user?.id || p.author?.id || p.userId;
          return String(aId) !== String(authorId);
        }),
      );
      showAlert({
        type: "success",
        title: "Usuário bloqueado",
        message: `Você não verá mais conteúdos nem o perfil de @${authorHandle}.`,
        onClose: () => showAlert({ visible: false }),
      });
    } catch (error) {
      showAlert({
        type: "error",
        title: "Erro ao bloquear",
        message: errorMessage(error),
        onClose: () => showAlert({ visible: false }),
      });
    }
  };

  const handleReportSuccess = ({ targetType, targetId, authorId }) => {
    if (authorId) {
      setPosts((prev) =>
        prev.filter((p) => {
          const aId = p.user?.id || p.author?.id || p.userId;
          return (
            String(aId) !== String(authorId) &&
            String(p.id) !== String(targetId)
          );
        }),
      );
    } else if (targetType === "POST" && targetId) {
      setPosts((prev) => prev.filter((p) => String(p.id) !== String(targetId)));
    }
  };

  const like = async (post) => {
    const effectiveUserId = user?.id;
    const likesList = post.likes || [];
    const isCurrentlyLiked = Boolean(
      post.isLiked ||
      post.is_liked ||
      likesList.some(
        (item) =>
          item.userId === effectiveUserId ||
          item.user_id === effectiveUserId ||
          item.user?.id === effectiveUserId,
      ),
    );

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === post.id) {
          const currentCount =
            p.likesCount ?? p.likes_count ?? (p.likes?.length || 0);
          return {
            ...p,
            isLiked: !isCurrentlyLiked,
            is_liked: !isCurrentlyLiked,
            likesCount: isCurrentlyLiked
              ? Math.max(0, currentCount - 1)
              : currentCount + 1,
            likes_count: isCurrentlyLiked
              ? Math.max(0, currentCount - 1)
              : currentCount + 1,
            likes: isCurrentlyLiked
              ? likesList.filter(
                  (l) =>
                    (l.userId || l.user_id || l.user?.id) !== effectiveUserId,
                )
              : [...likesList, { userId: effectiveUserId }],
          };
        }
        return p;
      }),
    );

    try {
      if (isCurrentlyLiked) {
        await api.likes.delete({ postId: post.id });
      } else {
        await api.likes.create({ postId: post.id });
      }
    } catch (error) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
      Alert.alert("Curtida não atualizada", errorMessage(error));
    }
  };

  const [repostModalPost, setRepostModalPost] = useState(null);

  const executeRepost = async (post, content) => {
    if (content) {
      try {
        await api.posts.create({ content, repost_post_id: post.id });
        load();
      } catch (error) {
        Alert.alert("Erro ao criar repost com comentário", errorMessage(error));
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
          item.id === effectiveUserId,
      ),
    );

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === post.id) {
          const currentCount =
            p.repostsCount ?? p.reposts_count ?? (p.reposts?.length || 0);
          return {
            ...p,
            isReposted: !isCurrentlyReposted,
            is_reposted: !isCurrentlyReposted,
            repostsCount: isCurrentlyReposted
              ? Math.max(0, currentCount - 1)
              : currentCount + 1,
            reposts_count: isCurrentlyReposted
              ? Math.max(0, currentCount - 1)
              : currentCount + 1,
            reposts: isCurrentlyReposted
              ? repostsList.filter(
                  (r) =>
                    (r.userId || r.user_id || r.user?.id || r.id) !==
                    effectiveUserId,
                )
              : [...repostsList, { userId: effectiveUserId }],
          };
        }
        return p;
      }),
    );

    try {
      if (isCurrentlyReposted) {
        await api.posts.undoRepost(post.id);
      } else {
        await api.posts.repost(post.id);
      }
    } catch (error) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
      Alert.alert("Não foi possível recompartilhar", errorMessage(error));
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await api.posts.remove(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      showAlert({
        type: "success",
        title: "Sucesso",
        message: "Publicação excluída com sucesso.",
        onClose: () => showAlert({ visible: false }),
      });
    } catch (err) {
      showAlert({
        type: "error",
        title: "Erro",
        message: "Não foi possível excluir a publicação.",
        onClose: () => showAlert({ visible: false }),
      });
    }
  };

  return (
    <AppLayout
      tagText="★ Tribo"
      title="Seu Feed"
      description="Acompanhe o que está acontecendo na Tribo."
    >
      <View style={{ marginBottom: 16, zIndex: 10 }}>
        <StoriesBar user={user} />
      </View>
      <View style={{ flex: 1 }}>
        <Animated.View
          style={{
            position: "absolute",
            top: 10,
            left: 0,
            right: 0,
            alignItems: "center",
            justifyContent: "center",
            zIndex: -1,
            opacity: pullY.interpolate({
              inputRange: [-80, -20, 0],
              outputRange: [1, 0.5, 0],
              extrapolate: "clamp",
            }),
            transform: [
              {
                rotate: pullY.interpolate({
                  inputRange: [-100, 0],
                  outputRange: ["-360deg", "0deg"],
                  extrapolate: "clamp",
                }),
              },
              {
                scale: pullY.interpolate({
                  inputRange: [-100, 0],
                  outputRange: [1.2, 0.5],
                  extrapolate: "clamp",
                }),
              },
            ],
          }}
        >
          <Text style={{ fontSize: 36, fontWeight: "bold", color: "#000000" }}>
            @
          </Text>
        </Animated.View>

        <Animated.FlatList
          ref={flatListRef}
          data={visiblePosts}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={load}
              tintColor="transparent"
              colors={["transparent"]}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Composer user={user} onPublished={load} />
              <View style={{ height: 16 }} />
            </View>
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              currentUser={user}
              currentUserId={user?.id}
              isCentered={activeVisiblePostId === item.id}
              volume={activeVisiblePostId === item.id ? 1.0 : 0.0}
              onLike={() => like(item)}
              onComment={() => setCommentPost(item)}
              onRepost={() => setRepostModalPost(item)}
              onOpenProfile={onOpenProfile}
              onOpenMedia={(media) => setFullscreenMedia(media)}
              onOptions={() => setOptionsPost(item)}
              showAlert={showAlert}
            />
          )}
          ListEmptyComponent={
            !loading && (
              <EmptyState icon="message-circle">
                Ainda não há publicações na Tribo.
              </EmptyState>
            )
          }
        />

        {/* Botão Flutuante Voltar ao Topo */}
        {showScrollTop && (
          <Animated.View
            style={[
              styles.scrollTopContainer,
              {
                opacity: scrollTopAnim,
                transform: [
                  {
                    scale: scrollTopAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.75, 1],
                    }),
                  },
                  {
                    translateY: scrollTopAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [15, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Pressable
              style={[
                styles.scrollTopButton,
                {
                  backgroundColor: colors.surfaceAlt || "#1e293b",
                  borderColor: colors.border,
                },
              ]}
              onPress={() =>
                flatListRef.current?.scrollToOffset({
                  offset: 0,
                  animated: true,
                })
              }
              accessibilityLabel="Voltar ao topo suavemente"
            >
              <Feather
                name="arrow-up"
                size={17}
                color={colors.accent || "#3b82f6"}
              />
              <Text style={[styles.scrollTopText, { color: colors.text }]}>
                Topo
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Visualizador de Mídia em Tela Cheia */}
        <MediaViewerModal
          visible={Boolean(fullscreenMedia)}
          mediaUrl={fullscreenMedia?.url}
          mediaType={fullscreenMedia?.type || "image"}
          post={fullscreenMedia?.post}
          onClose={() => setFullscreenMedia(null)}
        />

        <Comments
          showAlert={showAlert}
          post={commentPost}
          onClose={() => setCommentPost(null)}
          onOpenProfile={onOpenProfile}
          currentUser={user}
          onBlockUser={handleBlockUser}
          onReportComment={(data) => {
            if (data?.targetType) {
              setReportModal({ visible: true, ...data });
            } else {
              const cUser = data.user || data.author || {};
              const cUserId = cUser.id || data.userId;
              const cHandle = cUser.username || cUser.handle || "usuario";
              setReportModal({
                visible: true,
                targetType: "COMMENT",
                targetId: data.id,
                authorId: cUserId,
                targetName: `comentário de @${cHandle}`,
              });
            }
          }}
        />
        <PostOptionsModal
          post={optionsPost}
          currentUser={user}
          onClose={() => setOptionsPost(null)}
          onReport={(data) => setReportModal({ visible: true, ...data })}
          onBlock={handleBlockUser}
          onDelete={handleDeletePost}
          showAlert={showAlert}
        />
        <ReportModal
          visible={reportModal.visible}
          targetType={reportModal.targetType}
          targetId={reportModal.targetId}
          authorId={reportModal.authorId}
          targetName={reportModal.targetName}
          onClose={() =>
            setReportModal((prev) => ({ ...prev, visible: false }))
          }
          onSuccess={handleReportSuccess}
        />
        <CommunityGuidelinesModal />
        <TriboAlertModal
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttonText={alertConfig.buttonText}
          onClose={() => {
            if (alertConfig.onClose) alertConfig.onClose();
            setAlertConfig({ visible: false });
          }}
          secondaryButtonText={alertConfig.secondaryButtonText}
          onSecondaryPress={alertConfig.onSecondaryPress}
        />

        <RepostModal
          visible={Boolean(repostModalPost)}
          post={repostModalPost}
          currentUser={user}
          onClose={() => setRepostModalPost(null)}
          onRepost={(content) => executeRepost(repostModalPost, content)}
        />
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  quotedPostContainer: {
    margin: 12,
    marginTop: 4,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  quoteAuthorName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  quoteContent: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    paddingTop: 4,
    paddingHorizontal: 0,
    paddingBottom: 110,
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 4,
  },

  composerCardWrapper: {
    borderRadius: 30,
    borderWidth: 0,
    padding: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  composer: {
    width: "100%",
  },
  composerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  composerInputWrapper: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 46,
    borderWidth: 0,
    justifyContent: "center",
  },
  composerInput: {
    flex: 1,
    minHeight: 46,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "center",
    padding: 0,
    margin: 0,
  },
  preview: {
    marginTop: 12,
    position: "relative",
    alignSelf: "flex-start",
    marginLeft: 54,
  },
  previewImage: {
    width: 90,
    height: 70,
    borderRadius: 14,
  },
  removeImageBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  composerDivider: {
    display: "none",
  },
  composerFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingLeft: 54,
  },
  composerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  composerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  publishButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 88,
  },
  publishButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },

  postCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  postHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  name: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  handle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
  commentHandle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
  },
  postText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    marginTop: 12,
  },
  postImage: {
    width: "100%",
    borderRadius: 16,
  },
  nsfwContainer: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
    position: "relative",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
  },
  nsfwBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  nsfwBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  nsfwContent: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  nsfwHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  nsfwTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  nsfwHint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 16,
  },
  nsfwRevealBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  nsfwRevealText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  nsfwHideBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  nsfwHideBadgeText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#FFFFFF",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionCount: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },

  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  commentsList: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  commentItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  commentText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  reply: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  replyInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  optionsSheet: {
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    gap: 8,
  },
  optionsHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  optionsTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 10,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
  },

  expandPill: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  expandPillText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
  },

  scrollTopContainer: {
    position: "absolute",
    bottom: 95,
    right: 20,
    zIndex: 99,
  },
  scrollTopButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  scrollTopText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },
});
