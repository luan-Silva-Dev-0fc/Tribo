import React, { useCallback, useEffect, useRef, useState } from "react";
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
  ScrollView } from
"react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { Audio } from "expo-av";
import { YouTubePostCard } from "./YouTubePostCard";
import { api, getUploadUrl } from "../../api";
import {
  Avatar,
  EmptyState,
  IconButton,
  VerificationBadge } from
"../../components/ui/ui";
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
  userName } from
"../../lib/format";
import { useTheme } from "../../theme";

function PostOptionsModal({
  post,
  currentUser,
  onClose,
  onReport,
  onBlock,
  onDelete,
  showAlert
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
    String(authorId).toLowerCase() === String(currentUserId).toLowerCase()
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
          message: "A publicação foi salva nos seus itens."
        });
      }, 100);
    } catch (err) {
      setTimeout(() => {
        showAlert?.({
          type: "error",
          title: "Erro",
          message: "Não foi possível salvar a publicação."
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
                  "Precisamos de acesso à galeria para salvar a mídia."
                }),
                100
              );
              return;
            }
            if (!mediaUrl) {
              setTimeout(
                () =>
                showAlert?.({
                  type: "error",
                  title: "Erro",
                  message: "Esta publicação não tem mídia para baixar."
                }),
                100
              );
              return;
            }
            const fileExt =
            typeof mediaUrl === "string" && mediaUrl.includes(".mp4") ?
            ".mp4" :
            ".jpg";
            const fileUri =
            FileSystem.documentDirectory + `tribo_${post.id}${fileExt}`;

            const downloadRes = await FileSystem.downloadAsync(
              mediaUrl,
              fileUri
            );

            if (downloadRes.status === 200 || downloadRes.status === 201) {
              await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
              await api.posts.download(post.id).catch(() => {});
              setTimeout(
                () =>
                showAlert?.({
                  type: "success",
                  title: "Sucesso",
                  message: "Mídia salva na galeria com sucesso!"
                }),
                100
              );
            } else {
              setTimeout(
                () =>
                showAlert?.({
                  type: "error",
                  title: "Erro",
                  message: "Não foi possível baixar a mídia."
                }),
                100
              );
            }
          } catch (error) {
            setTimeout(
              () =>
              showAlert?.({
                type: "error",
                title: "Erro",
                message: "Ocorreu um erro ao tentar salvar a mídia."
              }),
              100
            );
          }
        }
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
        }
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
        }
      });
    }, 100);
  };

  const handleReport = () => {
    onClose();
    onReport?.({
      targetType: "POST",
      targetId: post.id,
      authorId: authorId,
      targetName: `publicação de @${authorHandle}`
    });
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View
        style={[
        styles.optionsSheet,
        { backgroundColor: "#121214", borderColor: colors.border }]
        }>
        
        <View
          style={[styles.optionsHandle, { backgroundColor: colors.border }]} />
        
        <Text style={[styles.optionsTitle, { color: colors.text }]}>
          Ações da Publicação
        </Text>

        <Pressable style={styles.optionItem} onPress={handleSave}>
          <View
            style={[styles.optionIcon, { backgroundColor: colors.surfaceAlt }]}>
            
            <Feather name="bookmark" size={20} color={colors.text} />
          </View>
          <Text style={[styles.optionText, { color: colors.text }]}>
            Salvar publicação
          </Text>
        </Pressable>

        {!!mediaUrl &&
        <Pressable style={styles.optionItem} onPress={handleDownload}>
            <View
            style={[
            styles.optionIcon,
            { backgroundColor: colors.surfaceAlt }]
            }>
            
              <Feather name="download" size={20} color={colors.text} />
            </View>
            <Text style={[styles.optionText, { color: colors.text }]}>
              Baixar Mídia
            </Text>
          </Pressable>
        }

        {isMine ?
        <Pressable style={styles.optionItem} onPress={handleDelete}>
            <View
            style={[
            styles.optionIcon,
            { backgroundColor: "rgba(239, 68, 68, 0.15)" }]
            }>
            
              <Feather name="trash-2" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.optionText, { color: "#ef4444" }]}>
              Excluir publicação
            </Text>
          </Pressable> :

        <>
            <Pressable style={styles.optionItem} onPress={handleBlock}>
              <View
              style={[
              styles.optionIcon,
              { backgroundColor: "rgba(245, 158, 11, 0.15)" }]
              }>
              
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
              { backgroundColor: "rgba(239, 68, 68, 0.15)" }]
              }>
              
                <Feather name="flag" size={20} color="#ef4444" />
              </View>
              <Text style={[styles.optionText, { color: "#ef4444" }]}>
                Denunciar e Bloquear
              </Text>
            </Pressable>
          </>
        }
      </View>
    </Modal>);

}

export function CommentOptionsModal({
  comment,
  currentUser,
  postAuthorId,
  onClose,
  onReport,
  onBlock,
  onDelete
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
    String(authorId).toLowerCase() === String(currentUserId).toLowerCase()
  );

  const isPostAuthor = Boolean(
    postAuthorId &&
    currentUserId &&
    String(postAuthorId).toLowerCase() === String(currentUserId).toLowerCase()
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
        }
      }]

    );
  };

  const handleReport = () => {
    if (isMine) return;
    onClose();
    onReport?.({
      targetType: "COMMENT",
      targetId: comment.id,
      authorId: authorId,
      targetName: `comentário de @${authorHandle}`
    });
  };

  const handleDelete = () => {
    onClose();
    onDelete?.(comment);
  };

  return (
    <Modal
      visible={true}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View
        style={[
        styles.optionsSheet,
        { backgroundColor: "#121214", borderColor: colors.border }]
        }>
        
        <View
          style={[styles.optionsHandle, { backgroundColor: colors.border }]} />
        
        <Text style={[styles.optionsTitle, { color: colors.text }]}>
          Ações do Comentário
        </Text>

        {(isMine || isPostAuthor) &&
        <Pressable style={styles.optionItem} onPress={handleDelete}>
            <View
            style={[
            styles.optionIcon,
            { backgroundColor: "rgba(239, 68, 68, 0.15)" }]
            }>
            
              <Feather name="trash-2" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.optionText, { color: "#ef4444" }]}>
              Excluir Comentário
            </Text>
          </Pressable>
        }

        {!isMine &&
        <>
            <Pressable style={styles.optionItem} onPress={handleBlock}>
              <View
              style={[
              styles.optionIcon,
              { backgroundColor: "rgba(245, 158, 11, 0.15)" }]
              }>
              
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
              { backgroundColor: "rgba(239, 68, 68, 0.15)" }]
              }>
              
                <Feather name="flag" size={20} color="#ef4444" />
              </View>
              <Text style={[styles.optionText, { color: "#ef4444" }]}>
                Denunciar e Bloquear
              </Text>
            </Pressable>
          </>
        }
      </View>
    </Modal>);

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
        transform: [{ scale: pressed ? 0.995 : 1 }]
      }]
      }>
      
      <SafePostInlineVideo key={url} url={url} styles={styles} />
      <View style={styles.expandPill}>
        <Feather
          name="maximize-2"
          size={13}
          color="#FFFFFF"
          style={{ marginRight: 4 }} />
        
        <Text style={styles.expandPillText}>Tela cheia</Text>
      </View>
    </Pressable>);

}

function SafePostInlineVideo({ url, styles }) {
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
          { backgroundColor: "#000000", height: 460, borderRadius: 16 }
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
          width: "100%",
          height: 460,
          borderRadius: 16,
          overflow: "hidden"
        }
      ]}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

function QuoteVideo({ url, styles }) {
  const player = useVideoPlayer(url ? url : "", (p) => {
    p.loop = true;
    p.muted = true;
    if (url) p.play();
  });
  if (!url || !player) return null;
  return (
    <VideoView
      key={url}
      player={player}
      style={styles.quoteMedia}
      contentFit="cover"
      nativeControls={false} />);


}

export function PostCard({
  post,
  onLike,
  onComment,
  onRepost,
  onOptions,
  onOpenProfile,
  onOpenMedia,
  currentUser,
  currentUserId,
  showAlert,
  onSave,
  isCentered = false,
  volume = 1.0
}) {
  const { colors } = useTheme();
  const { isAdultContentEnabled } = useUserContext();
  const [revealedTemporarily, setRevealedTemporarily] = useState(false);
  const [isSavedLocally, setIsSavedLocally] = useState(
    Boolean(post.isSaved || post.is_saved)
  );
  const [imageAspect, setImageAspect] = useState(null);

  useEffect(() => {
    setIsSavedLocally(Boolean(post.isSaved || post.is_saved));
  }, [post.isSaved, post.is_saved]);

  const effectiveUserId = currentUserId || currentUser?.id;
  const owner =
  post.user ||
  post.author || (
  post.user_id && post.username ?
  {
    id: post.user_id,
    name: post.name,
    username: post.username,
    avatarUrl: post.user_avatar || post.avatar_url
  } :
  null) || (
  post.userId === effectiveUserId ? currentUser : {});
  const count = (value) => value || "";

  const userHandle =
  owner.username ||
  owner.handle || (
  owner.email ? owner.email.split("@")[0] : "usuario");

  const createdAt = post.createdAt || post.created_at || post.date;
  const updatedAt = post.updatedAt || post.updated_at;
  const isEdited =
  updatedAt &&
  createdAt &&
  new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 2000;
  const timeText = formatRelativeTime(createdAt) || "agora";

  const handleToggleSave = async () => {
    if (onSave) {
      return onSave(post);
    }

    const nextState = !isSavedLocally;
    setIsSavedLocally(nextState);
    try {
      if (nextState) {
        await api.posts.save(post.id);
      } else {
        await api.posts.unsave(post.id);
      }
    } catch (err) {
      setIsSavedLocally(!nextState);
      showAlert?.({
        type: "error",
        title: "Erro",
        message: "Não foi possível atualizar o salvamento da publicação."
      });
    }
  };

  const isNSFW = Boolean(
    post.isNSFW ??
    post.is_nsfw ??
    post.nsfw ??
    post.isAdult ??
    post.is_adult ??
    false
  );
  const isImageHidden =
  isNSFW && !isAdultContentEnabled && !revealedTemporarily;

  const likesList = post.likes || [];
  const hasLiked = Boolean(
    post.isLiked ||
    post.is_liked ||
    likesList.some(
      (item) =>
      item.userId === effectiveUserId ||
      item.user_id === effectiveUserId ||
      item.user?.id === effectiveUserId
    )
  );

  const repostsList = post.reposts || [];
  const hasReposted = Boolean(
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

  const rawAttachments = post.media_attachments || post.mediaAttachments || [];
  const hasAttachments =
  Array.isArray(rawAttachments) && rawAttachments.length > 0;
  const legacyMediaUrl =
  post.mediaUrl ||
  post.media_url ||
  post.imageUrl ||
  post.image_url ||
  post.videoUrl ||
  post.video_url;


  const mediaList = hasAttachments ?
  rawAttachments :
  legacyMediaUrl ?
  [
  {
    url: legacyMediaUrl,
    type:
    post.videoUrl ||
    post.video_url ||
    typeof legacyMediaUrl === "string" &&
    legacyMediaUrl.match(/\.(mp4|webm)$/i) ?
    "video" :
    "image"
  }] :

  [];

  const hasMedia = mediaList.length > 0;

  const youtubeVideoId =
  post.youtube_video_id ||
  post.youtubeVideoId || (
  post.media_type === "youtube" ?
  post.youtube_url || post.content :
  null);


  const [carouselIndex, setCarouselIndex] = useState(0);
  const [mediaWidth, setMediaWidth] = useState(0);

  useEffect(() => {
    if (hasMedia && mediaList[0].type !== "video" && mediaList[0].url) {
      Image.getSize(
        mediaList[0].url,
        (width, height) => {
          if (width > 0 && height > 0) {
            setImageAspect(width / height);
          }
        },
        () => {

          setImageAspect(null);
        }
      );
    }
  }, [hasMedia, mediaList]);

  return (
    <View
      style={[
      styles.postCard,
      {
        backgroundColor: colors.surface,
        borderColor: "#27272a"
      }]
      }>
      
      <View style={styles.postHead}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Abrir perfil de ${userName(owner)}`}
          onPress={() => onOpenProfile(owner)}>
          
          <Avatar user={owner} fallbackUser={currentUser} size={44} />
        </Pressable>
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>
              {userName(owner)}
            </Text>
            <VerificationBadge user={owner} size={15} />
          </View>
          <Text style={[styles.handle, { color: colors.subtext }]}>
            @{userHandle} • há {timeText}{" "}
            {isEdited &&
            <Text style={{ fontStyle: "italic", fontSize: 12 }}>
                (Editado)
              </Text>
            }
          </Text>
        </View>
        <Pressable
          onPress={onOptions}
          accessibilityLabel="Mais ações"
          style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.5 : 1 }]}>
          
          <Feather name="more-horizontal" size={20} color={colors.subtext} />
        </Pressable>
      </View>

      {post.content &&
      <Text style={[styles.postText, { color: colors.text }]}>
          {post.content}
        </Text>
      }

      {}
      {!!youtubeVideoId &&
      <View style={{ width: "100%", marginVertical: 6 }}>
          <YouTubePostCard
          videoId={youtubeVideoId}
          youtubeUrl={post.youtube_url || post.youtubeUrl}
          isCentered={isCentered}
          volume={volume} />
        
        </View>
      }

      {hasMedia && (
      isImageHidden ?
      <Pressable
        onPress={() => setRevealedTemporarily(true)}
        style={({ pressed }) => [
        styles.nsfwContainer,
        {
          backgroundColor: colors.cardSecondary || colors.surfaceAlt,
          borderColor: "#27272a",
          opacity: pressed ? 0.9 : 1
        }]
        }>
        
            <View
          style={[
          styles.nsfwBadge,
          {
            backgroundColor: colors.danger || "#F4212E"
          }]
          }>
          
              <Text style={styles.nsfwBadgeText}>+18</Text>
            </View>
            <View style={styles.nsfwContent}>
              <View style={styles.nsfwHeaderRow}>
                <Feather
              name="alert-triangle"
              size={16}
              color={colors.danger || "#F4212E"}
              style={{ marginRight: 6 }} />
            
                <Text style={[styles.nsfwTitle, { color: colors.text }]}>
                  Conteúdo Sensível (+18) - Oculto por padrão
                </Text>
              </View>
              <Text style={[styles.nsfwHint, { color: colors.subtext }]}>
                Esta publicação contém mídia classificada como sensível.
              </Text>
              <View
            style={[
            styles.nsfwRevealBtn,
            {
              backgroundColor: colors.card || colors.surface,
              borderColor: "#27272a"
            }]
            }>
            
                <Feather
              name="eye"
              size={14}
              color={colors.text}
              style={{ marginRight: 6 }} />
            
                <Text style={[styles.nsfwRevealText, { color: colors.text }]}>
                  Toque para visualizar
                </Text>
              </View>
            </View>
          </Pressable> :

      <View
        style={styles.imageWrapper}
        onLayout={(e) => setMediaWidth(e.nativeEvent.layout.width)}>
        
            <FlatList
          data={mediaList}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => index.toString()}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.x /
              e.nativeEvent.layoutMeasurement.width
            );
            setCarouselIndex(index);
          }}
          renderItem={({ item }) => {
            const isItemVideo = item.type === "video";
            return (
              <View style={{ width: mediaWidth || "100%" }}>
                    {}
                    {isItemVideo ?
                <InlineVideo
                  url={item.url}
                  onOpenMedia={onOpenMedia}
                  post={post}
                  styles={styles} /> :


                <Pressable
                  onPress={() =>
                  onOpenMedia?.({ url: item.url, type: "image", post })
                  }
                  style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.995 : 1 }]
                  }]
                  }>
                  
                        <Image
                    source={{ uri: item.url }}
                    style={[
                    styles.postImage,
                    {
                      backgroundColor: colors.surfaceAlt,
                      height: imageAspect ? undefined : 220,
                      aspectRatio: imageAspect || undefined,
                      maxHeight: 500,
                      width: "100%"
                    }]
                    }
                    resizeMode={imageAspect ? "contain" : "cover"} />
                  
                        <View style={styles.expandPill}>
                          <Feather
                      name="maximize-2"
                      size={13}
                      color="#FFFFFF"
                      style={{ marginRight: 4 }} />
                    
                          <Text style={styles.expandPillText}>Tela cheia</Text>
                        </View>
                      </Pressable>
                }
                  </View>);

          }} />
        
            {mediaList.length > 1 &&
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            position: "absolute",
            bottom: 10,
            left: 0,
            right: 0
          }}>
          
                {mediaList.map((_, idx) =>
          <View
            key={idx}
            style={{
              height: 6,
              width: 6,
              borderRadius: 3,
              backgroundColor:
              idx === carouselIndex ? "#1D9BF0" : "#ccc",
              marginHorizontal: 3
            }} />

          )}
              </View>
        }

            {isNSFW && !isAdultContentEnabled && revealedTemporarily &&
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            setRevealedTemporarily(false);
          }}
          style={[
          styles.nsfwHideBadge,
          {
            backgroundColor: "rgba(0, 0, 0, 0.75)"
          }]
          }>
          
                <Feather
            name="eye-off"
            size={12}
            color="#FFFFFF"
            style={{ marginRight: 4 }} />
          
                <Text style={styles.nsfwHideBadgeText}>Ocultar (+18)</Text>
              </Pressable>
        }
          </View>)
      }

      {post.reposted_post && post.reposted_post.id &&
      <View
        style={[styles.quotedPostContainer, { borderColor: colors.border }]}>
        
          <View style={styles.quoteHeader}>
            <Avatar
            user={post.reposted_post.author}
            fallbackUser={post.reposted_post.author}
            size={20} />
          
            <Text style={[styles.quoteAuthorName, { color: colors.text }]}>
              {userName(post.reposted_post.author)}
            </Text>
            <VerificationBadge user={post.reposted_post.author} size={10} />
          </View>
          {(() => {
          const rp = post.reposted_post;
          const rpMediaList =
          rp.media_attachments || rp.mediaAttachments || [];
          const rpLegacyMedia =
          rp.mediaUrl ||
          rp.media_url ||
          rp.imageUrl ||
          rp.image_url ||
          rp.videoUrl ||
          rp.video_url;
          const rpFirstMedia =
          rpMediaList.length > 0 ? rpMediaList[0].url : rpLegacyMedia;
          const isRpVideo =
          rpMediaList.length > 0 ?
          rpMediaList[0].type === "video" :
          rp.videoUrl ||
          rp.video_url ||
          typeof rpLegacyMedia === "string" &&
          rpLegacyMedia.match(/\.(mp4|webm)$/i);

          const rpYoutubeVideoId =
          rp.youtube_video_id ||
          rp.youtubeVideoId || (
          rp.media_type === "youtube" ? rp.youtube_url || rp.content : null);

          return (
            <View>
                {rp.content ?
              <Text style={[styles.quoteContent, { color: colors.text }]}>
                    {rp.content}
                  </Text> :
              null}
                {rpYoutubeVideoId ?
              <View style={{ marginTop: 8, width: "100%" }}>
                    <YouTubePostCard
                  videoId={rpYoutubeVideoId}
                  youtubeUrl={rp.youtube_url || rp.youtubeUrl}
                  isCentered={isCentered}
                  volume={volume} />
                
                  </View> :
              rpFirstMedia ?
              <Pressable
                onPress={() =>
                onOpenMedia &&
                onOpenMedia({
                  url: rpFirstMedia,
                  type: isRpVideo ? "video" : "image",
                  post: rp
                })
                }
                style={{
                  marginTop: 8,
                  borderRadius: 12,
                  overflow: "hidden",
                  height: 200,
                  backgroundColor: colors.surfaceAlt
                }}>
                
                    {isRpVideo ?
                <QuoteVideo
                  url={rpFirstMedia}
                  styles={{
                    quoteMedia: {
                      flex: 1,
                      width: "100%",
                      height: "100%"
                    }
                  }} /> :


                <Image
                  source={{ uri: rpFirstMedia }}
                  style={{ flex: 1, width: "100%", height: "100%" }}
                  resizeMode="cover" />

                }
                    {isRpVideo &&
                <View
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: [{ translateX: -24 }, { translateY: -24 }],
                    backgroundColor: "rgba(0,0,0,0.6)",
                    borderRadius: 24,
                    width: 48,
                    height: 48,
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                  
                        <Feather
                    name="play"
                    size={24}
                    color="#fff"
                    style={{ marginLeft: 4 }} />
                  
                      </View>
                }
                  </Pressable> :

              !rp.content &&
              <Text style={[styles.quoteContent, { color: colors.text }]}>
                      Mídia
                    </Text>

              }
              </View>);

        })()}
        </View>
      }

      <View style={[styles.actions, { borderTopColor: colors.border }]}>
        <Action
          icon="heart"
          iconColor={hasLiked ? "#ef4444" : colors.subtext}
          textColor={hasLiked ? "#ef4444" : colors.subtext}
          value={count(post.likesCount ?? post.likes_count ?? likesList.length)}
          onPress={onLike} />
        
        <Action
          icon="message-circle"
          iconColor={colors.subtext}
          textColor={colors.subtext}
          value={count(
            post.commentsCount ?? post.comments_count ?? post.comments?.length
          )}
          onPress={onComment} />
        
        <Action
          icon="repeat"
          iconColor={hasReposted ? "#10b981" : colors.subtext}
          textColor={hasReposted ? "#10b981" : colors.subtext}
          value={count(
            post.repostsCount ?? post.reposts_count ?? repostsList.length
          )}
          onPress={onRepost} />
        
        <Action
          icon="share-2"
          iconColor={colors.subtext}
          textColor={colors.subtext}
          value=""
          onPress={() => {
            if (hasMedia) {
              const currentMedia = mediaList[carouselIndex];
              onOpenMedia?.({
                url: currentMedia.url,
                type: currentMedia.type,
                post
              });
            }
          }} />
        
        <Action
          icon="bookmark"
          iconColor={
          isSavedLocally ? colors.primary || colors.accent : colors.subtext
          }
          textColor={colors.subtext}
          value=""
          onPress={handleToggleSave} />
        
      </View>
    </View>);

}

function Action({ icon, value, onPress, iconColor, textColor }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
    Animated.timing(scaleAnim, {
      toValue: icon === "heart" ? 1.38 : 1.15,
      duration: 110,
      useNativeDriver: true
    }),
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3.5,
      tension: 40,
      useNativeDriver: true
    })]
    ).start();

    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.7 : 1 }]}>
      
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Feather name={icon} size={18} color={iconColor} />
      </Animated.View>
      {value !== "" &&
      <Text style={[styles.actionCount, { color: textColor }]}>{value}</Text>
      }
    </Pressable>);

}

const styles = StyleSheet.create({
  quotedPostContainer: {
    margin: 12,
    marginTop: 4,
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "transparent"
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6
  },
  quoteAuthorName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  },
  quoteContent: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13
  },
  flex: {
    flex: 1
  },
  listContent: {
    paddingTop: 4,
    paddingHorizontal: 0,
    paddingBottom: 110,
    flexGrow: 1
  },
  listHeader: {
    marginBottom: 4
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
    elevation: 4
  },
  composer: {
    width: "100%"
  },
  composerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  composerInputWrapper: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    minHeight: 46,
    borderWidth: 0,
    justifyContent: "center"
  },
  composerInput: {
    flex: 1,
    minHeight: 46,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "center",
    padding: 0,
    margin: 0
  },
  preview: {
    marginTop: 12,
    position: "relative",
    alignSelf: "flex-start",
    marginLeft: 54
  },
  previewImage: {
    width: 90,
    height: 70,
    borderRadius: 14
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
    justifyContent: "center"
  },
  composerDivider: {
    display: "none"
  },
  composerFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingLeft: 54
  },
  composerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  composerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  publishButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 88
  },
  publishButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF"
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
    elevation: 2
  },
  postHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  name: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14
  },
  handle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    marginTop: 1
  },
  commentHandle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12
  },
  postText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    marginTop: 12
  },
  postImage: {
    width: "100%",
    borderRadius: 16
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
    minHeight: 150
  },
  nsfwBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  nsfwBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 11,
    color: "#FFFFFF"
  },
  nsfwContent: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8
  },
  nsfwHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6
  },
  nsfwTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  },
  nsfwHint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 16
  },
  nsfwRevealBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1
  },
  nsfwRevealText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12
  },
  nsfwHideBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12
  },
  nsfwHideBadgeText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    color: "#FFFFFF"
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  actionCount: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12
  },

  modal: {
    flex: 1
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  modalTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16
  },
  commentsList: {
    padding: 16,
    paddingBottom: 24,
    flexGrow: 1
  },
  commentItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18
  },
  commentText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4
  },
  reply: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14
  },
  replyInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 14
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  optionsSheet: {
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    gap: 8
  },
  optionsHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12
  },
  optionsTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center"
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 10
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  optionText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15
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
    borderColor: "rgba(255, 255, 255, 0.15)"
  },
  expandPillText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11
  },

  scrollTopContainer: {
    position: "absolute",
    bottom: 95,
    right: 20,
    zIndex: 99
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
    elevation: 6
  },
  scrollTopText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12
  }
});