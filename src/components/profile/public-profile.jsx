import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import { useVideoPlayer, VideoView } from "expo-video";
import { api } from "../../api";
import { errorMessage, listFrom, normalizeUser, unwrap, userName } from "../../lib/format";
import { useTheme } from "../../theme";
import { useUserContext } from "../../context/user-context";
import { PostCard } from "../feed/PostCard";
import { Avatar, Button, EmptyState, IconButton, VerificationBadge } from "../ui/ui";
import { ReportModal } from "../modals/report-modal";
import { FollowersModal } from "../modals/followers-modal";
import { MediaViewerModal } from "../modals/media-viewer-modal";
import { Comments } from "../feed/Composer";
import { RepostModal } from "../modals/repost-modal";

const ownerOf = (post = {}) => post.user || post.author || {};

function belongsToUser(post, id) {
  const owner = ownerOf(post);
  return [post.userId, post.authorId, owner.id, owner.userId].
  filter((value) => value !== undefined && value !== null).
  some((value) => String(value) === String(id));
}

function ProfileOptionsModal({ user, visible, onClose, onBlock, onReport }) {
  const { colors } = useTheme();
  if (!visible || !user) return null;
  const handle = user?.username || userName(user);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View style={[styles.optionsSheet, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.optionsHandle} />
        <Text style={[styles.optionsTitle, { color: colors.text }]}>Ações do Perfil</Text>

        <Pressable
          style={styles.optionItem}
          onPress={() => {
            onClose();
            onBlock();
          }}>
          
          <View style={[styles.optionIcon, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
            <Feather name="user-x" size={20} color="#f59e0b" />
          </View>
          <Text style={[styles.optionText, { color: "#f59e0b" }]}>
            Bloquear @{handle}
          </Text>
        </Pressable>

        <Pressable
          style={styles.optionItem}
          onPress={() => {
            onClose();
            onReport();
          }}>
          
          <View style={[styles.optionIcon, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
            <Feather name="flag" size={20} color="#ef4444" />
          </View>
          <Text style={[styles.optionText, { color: "#ef4444" }]}>
            Denunciar e Bloquear
          </Text>
        </Pressable>
      </View>
    </Modal>);

}

function InlineVideo({ url, onOpenMedia, item, styles }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  return (
    <Pressable
      onPress={() => onOpenMedia?.({ url, type: "video", post: item })}
      style={({ pressed }) => [
      styles.imageWrapper,
      { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.995 : 1 }] }]
      }>
      
      <VideoView
        player={player}
        style={[
        styles.image,
        { backgroundColor: "#000000", height: undefined, minHeight: 220, maxHeight: 500, marginTop: 12 }]
        }
        contentFit="contain"
        nativeControls={false} />
      
      <View style={styles.expandPill}>
        <Feather name="maximize-2" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
        <Text style={styles.expandPillText}>Tela cheia</Text>
      </View>
    </Pressable>);

}

function ProfilePostCard({ item, onOpenMedia }) {
  const { colors } = useTheme();
  const { isAdultContentEnabled } = useUserContext();
  const [revealedTemporarily, setRevealedTemporarily] = useState(false);
  const [imageAspect, setImageAspect] = useState(null);

  const isNSFW = Boolean(
    item.isNSFW ??
    item.is_nsfw ??
    item.nsfw ??
    item.isAdult ??
    item.is_adult ??
    false
  );
  const isImageHidden = isNSFW && !isAdultContentEnabled && !revealedTemporarily;
  const mediaUrl = item.imageUrl || item.image_url || item.videoUrl || item.video_url;
  const isVideo = Boolean(
    item.videoUrl ||
    item.video_url ||
    typeof mediaUrl === "string" && (mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".webm") || mediaUrl.includes("video"))
  );

  useEffect(() => {
    if (mediaUrl && !isVideo) {
      Image.getSize(
        mediaUrl,
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
  }, [mediaUrl, isVideo]);

  return (
    <View
      style={[
      styles.post,
      {
        backgroundColor: colors.surface,
        borderColor: colors.line
      }]
      }>
      
      {!!item.content &&
      <Text style={[styles.postText, { color: colors.text }]}>
          {item.content}
        </Text>
      }

      {!!mediaUrl && (
      isImageHidden ?
      <Pressable
        onPress={() => setRevealedTemporarily(true)}
        style={({ pressed }) => [
        styles.nsfwContainer,
        {
          backgroundColor: colors.cardSecondary || colors.surfaceAlt || colors.surface,
          borderColor: colors.border || colors.line,
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
              <Text style={[styles.nsfwHint, { color: colors.subtext || colors.muted }]}>
                Esta publicação contém mídia classificada como sensível.
              </Text>
              <View
            style={[
            styles.nsfwRevealBtn,
            {
              backgroundColor: colors.card || colors.surface,
              borderColor: colors.border || colors.line
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
      isVideo ?
      <InlineVideo url={mediaUrl} onOpenMedia={onOpenMedia} item={item} styles={styles} /> :

      <Pressable
        onPress={() =>
        onOpenMedia?.({
          url: mediaUrl,
          type: "image",
          post: item
        })
        }
        style={({ pressed }) => [
        styles.imageWrapper,
        { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.995 : 1 }] }]
        }>
        
            <Image
          source={{ uri: mediaUrl }}
          style={[
          styles.image,
          {
            backgroundColor: colors.surfaceAlt,
            height: imageAspect ? undefined : 220,
            aspectRatio: imageAspect || undefined,
            maxHeight: 500,
            marginTop: 12
          }]
          }
          resizeMode={imageAspect ? "contain" : "cover"} />
        
            <View style={styles.expandPill}>
              <Feather
            name="maximize-2"
            size={13}
            color="#FFFFFF"
            style={{ marginRight: 4 }} />
          
              <Text style={styles.expandPillText}>
                Tela cheia
              </Text>
            </View>

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
          
                <Feather name="eye-off" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.nsfwHideBadgeText}>Ocultar (+18)</Text>
              </Pressable>
        }
          </Pressable>)

      }
    </View>);

}


export function PublicProfile({ user, currentUserId, onClose, onBlocked, onOpenProfile, onOpenChat }) {
  const { colors } = useTheme();
  const [profile, setProfile] = useState(user);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [followWorking, setFollowWorking] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [commentPost, setCommentPost] = useState(null);
  const [repostModalPost, setRepostModalPost] = useState(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [followersModalVisible, setFollowersModalVisible] = useState(false);
  const [followersModalTab, setFollowersModalTab] = useState("followers");
  const [fullscreenMedia, setFullscreenMedia] = useState(null);

  const targetUserId =
  (typeof user === "string" ? user : user?.id || user?.user_id || user?.userId || user?.author_id || user?.authorId) || null;

  const visible = Boolean(targetUserId);
  const isOwnProfile = String(profile?.id || targetUserId) === String(currentUserId);

  const isFollowing =
  profile?.isFollowing ||
  profile?.is_following ||
  profile?.followStatus === "following" ||
  profile?.followStatus === "ACCEPTED" ||
  profile?.follow_status === "following" ||
  profile?.follow_status === "ACCEPTED";

  const isPending =
  profile?.isPending ||
  profile?.is_pending ||
  profile?.followStatus === "pending" ||
  profile?.followStatus === "PENDING" ||
  profile?.follow_status === "pending" ||
  profile?.follow_status === "PENDING";

  const followStatus = isOwnProfile ?
  "SELF" :
  isFollowing ?
  "ACCEPTED" :
  isPending ?
  "PENDING" :
  "NONE";

  const isPrivate = Boolean(profile?.is_private ?? profile?.isPrivate ?? false);


  const canViewContent =
  isOwnProfile ||
  profile?.can_view_content === true ||
  profile?.canViewContent === true ||
  !isPrivate && profile?.can_view_content !== false ||
  followStatus === "ACCEPTED";

  const load = useCallback(async () => {
    const uid =
    (typeof user === "string" ? user : user?.id || user?.user_id || user?.userId || user?.author_id || user?.authorId) || null;

    if (!uid) return;
    setLoading(true);
    setFetchingProfile(true);
    try {
      const profileResponse = await api.users.getById(uid);
      const rawUser = unwrap(profileResponse, "user") || unwrap(profileResponse, "data") || profileResponse;
      console.log("-> [DEBUG FINAL] Dados brutos do perfil recebidos:", rawUser);
      console.log("-> [DEBUG FINAL] is_following:", rawUser?.is_following);
      console.log("-> [DEBUG FINAL] isFollowing:", rawUser?.isFollowing);

      const normalized = normalizeUser(rawUser) || {};

      const isUserFollowing =
      rawUser?.is_following === true ||
      rawUser?.isFollowing === true ||
      rawUser?.follow_status === "following" ||
      rawUser?.followStatus === "following" ||
      rawUser?.follow_status === "ACCEPTED" ||
      rawUser?.followStatus === "ACCEPTED";

      const isUserPending =
      rawUser?.is_pending === true ||
      rawUser?.isPending === true ||
      rawUser?.follow_status === "pending" ||
      rawUser?.followStatus === "pending" ||
      rawUser?.follow_status === "PENDING" ||
      rawUser?.followStatus === "PENDING";

      const nextProfile = {
        ...(typeof user === "object" ? user : {}),
        ...normalized,
        id: rawUser?.id || uid,
        name: rawUser?.name || rawUser?.fullName || (typeof user === "object" ? user.name : null),
        username: rawUser?.username || (typeof user === "object" ? user.username : null),
        avatar_url: rawUser?.avatar_url || rawUser?.avatarUrl || normalized?.avatarUrl || (typeof user === "object" ? user.avatar_url : null),
        badge_type: rawUser?.badge_type || rawUser?.badgeType || normalized?.badgeType || (typeof user === "object" ? user.badge_type : null),
        followers_count: Number(rawUser?.followers_count ?? rawUser?.followersCount ?? 0),
        following_count: Number(rawUser?.following_count ?? rawUser?.followingCount ?? 0),
        follow_status: isUserFollowing ? "ACCEPTED" : isUserPending ? "PENDING" : "NONE",
        followStatus: isUserFollowing ? "ACCEPTED" : isUserPending ? "PENDING" : "NONE",
        is_following: isUserFollowing,
        isFollowing: isUserFollowing,
        is_pending: isUserPending,
        isPending: isUserPending,
        is_private: Boolean(rawUser?.is_private ?? rawUser?.isPrivate ?? false),
        can_view_content: rawUser?.can_view_content ?? rawUser?.canViewContent ?? null
      };

      setProfile(nextProfile);

      const canView =
      String(nextProfile?.id || uid) === String(currentUserId) ||
      nextProfile?.can_view_content === true ||
      nextProfile?.canViewContent === true ||
      !(nextProfile?.is_private ?? nextProfile?.isPrivate) && nextProfile?.can_view_content !== false ||
      nextProfile?.follow_status === "ACCEPTED";

      if (canView) {
        const postsResponse = await api.users.posts(nextProfile.id || uid).catch(() => null);
        if (postsResponse) {
          const fetchedPosts = postsResponse.posts || postsResponse.data || postsResponse || [];
          setPosts(Array.isArray(fetchedPosts) ? fetchedPosts : []);
        }
      } else {
        setPosts([]);
      }
    } catch (error) {
      Alert.alert("Perfil indisponível", errorMessage(error));
    } finally {
      setLoading(false);
      setFetchingProfile(false);
    }
  }, [user, currentUserId]);

  useEffect(() => {
    setProfile(user);
    setPosts([]);
    if (targetUserId) load();
  }, [user, targetUserId, load]);

  const handleFollowAction = async () => {
    if (!profile?.id || followWorking || isOwnProfile) return;
    const handle = profile?.username || userName(profile);

    try {
      setFollowWorking(true);
      const res = await api.users.follow(profile.id);
      const rawData = unwrap(res, "data") || res || {};

      const status = rawData.status || rawData.followStatus || (rawData.is_following ? "ACCEPTED" : "NONE");
      const followStatus = rawData.followStatus || rawData.status || status;
      const followersCount = rawData.followersCount ?? rawData.followers_count;
      const followingCount = rawData.followingCount ?? rawData.following_count;

      const isNowFollowing = status === "ACCEPTED" || followStatus === "ACCEPTED";
      const isNowPending = status === "PENDING" || followStatus === "PENDING";


      setProfile((prev) => {
        const nextFollowers =
        followersCount !== undefined ?
        followersCount :
        isNowFollowing ?
        Number(prev?.followers_count || prev?.followersCount || 0) + 1 :
        Math.max(0, Number(prev?.followers_count || prev?.followersCount || 1) - 1);

        return {
          ...prev,
          status,
          followStatus,
          follow_status: followStatus,
          isFollowing: isNowFollowing,
          is_following: isNowFollowing,
          isPending: isNowPending,
          is_pending: isNowPending,
          can_view_content: isNowFollowing || !isPrivate,
          canViewContent: isNowFollowing || !isPrivate,
          followersCount: nextFollowers,
          followers_count: nextFollowers,
          followingCount: followingCount !== undefined ? followingCount : prev?.followingCount ?? prev?.following_count,
          following_count: followingCount !== undefined ? followingCount : prev?.following_count ?? prev?.followingCount
        };
      });

      if (isNowPending) {
        Alert.alert(
          "Solicitação enviada",
          `Sua solicitação para seguir @${handle} foi enviada com sucesso.`
        );
      } else if (isNowFollowing) {

        const postsResponse = await api.posts.list().catch(() => null);
        if (postsResponse) {
          setPosts(
            listFrom(postsResponse, ["posts"]).filter((post) =>
            belongsToUser(post, profile.id)
            )
          );
        }
      } else {

        if (isPrivate) {
          setPosts([]);
        }
      }
    } catch (error) {
      const msg = errorMessage(error);
      if (error?.status === 403) {
        Alert.alert("Ação não permitida", msg || "Não é possível seguir este usuário devido a um bloqueio ativo.");
      } else if (error?.status === 400) {
        Alert.alert("Ação inválida", msg || "Você não pode seguir seu próprio perfil.");
      } else {
        Alert.alert("Erro ao atualizar", msg);
      }
    } finally {
      setFollowWorking(false);
    }
  };

  const handleToggleLike = async (postItem) => {
    const effectiveUserId = currentUserId || user?.id;
    const likesList = postItem.likes || [];
    const isCurrentlyLiked = Boolean(
      postItem.isLiked ||
      postItem.is_liked ||
      likesList.some(
        (item) =>
        item.userId === effectiveUserId ||
        item.user_id === effectiveUserId ||
        item.user?.id === effectiveUserId
      )
    );

    setPosts((prev) =>
    prev.map((p) => {
      if (p.id === postItem.id) {
        const currentCount = p.likesCount ?? p.likes_count ?? (p.likes?.length || 0);
        return {
          ...p,
          isLiked: !isCurrentlyLiked,
          is_liked: !isCurrentlyLiked,
          likesCount: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
          likes_count: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
          likes: isCurrentlyLiked ?
          likesList.filter((l) => (l.userId || l.user_id || l.user?.id) !== effectiveUserId) :
          [...likesList, { userId: effectiveUserId }]
        };
      }
      return p;
    })
    );

    try {
      if (isCurrentlyLiked) {
        await api.likes.delete({ postId: postItem.id });
      } else {
        await api.likes.create({ postId: postItem.id });
      }
    } catch (error) {
      setPosts((prev) => prev.map((p) => p.id === postItem.id ? postItem : p));
      Alert.alert("Curtida não atualizada", errorMessage(error));
    }
  };

  const block = () => {
    const handle = profile?.username || userName(profile);
    Alert.alert(
      "Bloquear perfil",
      `Tem certeza que deseja bloquear @${handle}? Você não verá mais conteúdos nem o perfil desta pessoa.`,
      [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Bloquear",
        style: "destructive",
        onPress: async () => {
          try {
            setWorking(true);
            await api.users.block(profile.id);
            Alert.alert("Usuário bloqueado", `@${handle} foi bloqueado com sucesso.`);
            onBlocked?.(profile.id);
            onClose();
          } catch (error) {
            Alert.alert("Não foi possível bloquear", errorMessage(error));
          } finally {
            setWorking(false);
          }
        }
      }]

    );
  };

  const handleReportSuccess = () => {
    onBlocked?.(profile?.id || user?.id);
    onClose();
  };

  const followersCount =
  profile?.followers_count ?? profile?.followersCount ?? 0;
  const followingCount =
  profile?.following_count ?? profile?.followingCount ?? 0;
  const postsCount =
  profile?.posts_count ?? profile?.postsCount ?? posts.length;

  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets?.top || 0,
    Platform.OS === "android" ? StatusBar.currentHeight || 24 : 0
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.page, { backgroundColor: colors.background }]}>
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
          
          <IconButton name="x" onPress={onClose} label="Fechar perfil" />
          <Text style={[styles.title, { color: colors.text }]}>Perfil</Text>
          {!isOwnProfile ?
          <IconButton
            name="more-horizontal"
            onPress={() => setOptionsVisible(true)}
            label="Ações do perfil" /> :


          <View style={styles.spacer} />
          }
        </View>

        {loading && !profile ?
        <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View> :

        <FlatList
          data={canViewContent ? posts : []}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 24, 40) }]
          }
          refreshing={loading}
          onRefresh={load}
          ListHeaderComponent={
          <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <View style={styles.headerTopRow}>
                  <Avatar user={profile || user} size={82} />
                  
                  {}
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: colors.text }]}>
                        {postsCount}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.muted }]}>
                        Publicações
                      </Text>
                    </View>

                    <Pressable
                  style={({ pressed }) => [
                  styles.statItem,
                  {
                    opacity: pressed && canViewContent ? 0.7 : 1,
                    transform: [
                    { scale: pressed && canViewContent ? 0.96 : 1 }]

                  }]
                  }
                  onPress={() => {
                    if (canViewContent) {
                      setFollowersModalTab("followers");
                      setFollowersModalVisible(true);
                    }
                  }}>
                  
                      <Text style={[styles.statNumber, { color: colors.text }]}>
                        {followersCount}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.muted }]}>
                        Seguidores
                      </Text>
                    </Pressable>

                    <Pressable
                  style={({ pressed }) => [
                  styles.statItem,
                  {
                    opacity: pressed && canViewContent ? 0.7 : 1,
                    transform: [
                    { scale: pressed && canViewContent ? 0.96 : 1 }]

                  }]
                  }
                  onPress={() => {
                    if (canViewContent) {
                      setFollowersModalTab("following");
                      setFollowersModalVisible(true);
                    }
                  }}>
                  
                      <Text style={[styles.statNumber, { color: colors.text }]}>
                        {followingCount}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.muted }]}>
                        Seguindo
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {}
                <View style={styles.nameBlock}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: colors.text }]}>
                      {userName(profile ?? user)}
                    </Text>
                    <VerificationBadge user={profile ?? user} size={18} />
                  </View>
                  <Text
                style={[
                styles.handle,
                {
                  color:
                  colors.mode === "dark" ? "#C6C6C2" : "#555550"
                }]
                }>
                
                    @{profile?.username || "tribo"}
                  </Text>

                  {}
                  {!!(profile?.bio && profile.bio.trim()) &&
              <Text style={[styles.bio, { color: colors.text }]}>
                      {profile.bio.trim()}
                    </Text>
              }
                </View>

                {}
                {!isOwnProfile &&
            <View style={styles.actions}>
                    {fetchingProfile ?
              <View style={[styles.followBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
                         <ActivityIndicator size="small" color={colors.muted} />
                      </View> :

              <Pressable
                onPress={handleFollowAction}
                disabled={followWorking}
                style={({ pressed }) => [
                isPending ?
                styles.pendingBtn :
                isFollowing ?
                styles.followingBtn :
                styles.followBtn,
                isPending ?
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.line
                } :
                isFollowing ?
                {
                  backgroundColor:
                  colors.mode === "dark" ?
                  "rgba(181, 167, 255, 0.16)" :
                  "rgba(111, 86, 232, 0.12)",
                  borderColor:
                  colors.mode === "dark" ?
                  "rgba(181, 167, 255, 0.38)" :
                  "rgba(111, 86, 232, 0.32)"
                } :
                {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent
                },
                {
                  opacity: followWorking ? 0.7 : pressed ? 0.88 : 1,
                  transform: [
                  { scale: pressed && !followWorking ? 0.975 : 1 }]

                }]
                }>
                
                        {followWorking ?
                <ActivityIndicator
                  size="small"
                  color={isPending ? colors.muted : isFollowing ? colors.accent : "#ffffff"} /> :

                isPending ?
                <>
                            <Feather
                    name="clock"
                    size={16}
                    color={colors.muted}
                    style={{ marginRight: 6 }} />
                  
                            <Text
                    style={[
                    styles.pendingBtnText,
                    { color: colors.muted }]
                    }>
                    
                              Solicitado
                            </Text>
                          </> :
                isFollowing ?
                <>
                            <Feather
                    name="check"
                    size={16}
                    color={colors.accent}
                    style={{ marginRight: 6 }} />
                  
                            <Text
                    style={[
                    styles.followingBtnText,
                    { color: colors.accent }]
                    }>
                    
                              Seguindo
                            </Text>
                          </> :

                <>
                            <Feather
                    name="user-plus"
                    size={16}
                    color="#ffffff"
                    style={{ marginRight: 6 }} />
                  
                            <Text style={styles.followBtnText}>Seguir</Text>
                          </>
                }
                      </Pressable>
              }

                {onOpenChat &&
              <Pressable
                onPress={() => {
                  onClose();
                  onOpenChat(profile || user);
                }}
                accessibilityLabel="Enviar mensagem"
                style={({ pressed }) => [
                styles.optionsIconBtn,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.line,
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                  marginRight: 8
                }]
                }>
                
                        <Feather
                  name="message-circle"
                  size={20}
                  color={colors.text} />
                
                      </Pressable>
              }

                    <Pressable
                onPress={() => setOptionsVisible(true)}
                accessibilityLabel="Opções do perfil"
                style={({ pressed }) => [
                styles.optionsIconBtn,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.line,
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.94 : 1 }]
                }]
                }>
                
                      <Feather
                  name="more-horizontal"
                  size={20}
                  color={colors.text} />
                
                    </Pressable>
                  </View>
            }

                {canViewContent &&
            <Text style={[styles.postsTitle, { color: colors.text }]}>
                    Publicações
                  </Text>
            }
              </View>
          }
          renderItem={({ item }) =>
          <PostCard
            post={item}
            currentUser={user}
            currentUserId={currentUserId}
            onLike={() => handleToggleLike(item)}
            onComment={() => setCommentPost(item)}
            onRepost={() => setRepostModalPost(item)}
            onOpenMedia={(media) => setFullscreenMedia(media)}
            onOpenProfile={onOpenProfile} />

          }
          ListEmptyComponent={
          !loading && (
          canViewContent ?
          <View style={styles.emptyContainer}>
                    <EmptyState icon="message-circle">
                      Este perfil ainda não tem publicações.
                    </EmptyState>
                  </View> :

          <View
            style={[
            styles.privateBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line
            }]
            }>
            
                    <View
              style={[
              styles.privateIconCircle,
              { backgroundColor: colors.accentSoft }]
              }>
              
                      <Feather name="lock" size={28} color={colors.accent} />
                    </View>
                    <Text style={[styles.privateTitle, { color: colors.text }]}>
                      Conta Privada
                    </Text>
                    <Text
              style={[
              styles.privateSubtitle,
              { color: colors.muted }]
              }>
              
                      Este perfil e privado. Siga este perfil para ver suas
                      fotos e publicacoes.
                    </Text>
                  </View>)


          } />

        }

        <ProfileOptionsModal
          user={profile || user}
          visible={optionsVisible}
          onClose={() => setOptionsVisible(false)}
          onBlock={block}
          onReport={() => setReportModal(true)} />
        

        <ReportModal
          visible={reportModal}
          targetType="USER"
          targetId={profile?.id || user?.id}
          authorId={profile?.id || user?.id}
          targetName={`@${profile?.username || userName(profile ?? user)}`}
          onClose={() => setReportModal(false)}
          onSuccess={handleReportSuccess} />
        

        <FollowersModal
          visible={followersModalVisible}
          userId={profile?.id || user?.id}
          initialTab={followersModalTab}
          targetName={userName(profile ?? user)}
          onClose={() => setFollowersModalVisible(false)}
          onOpenProfile={(selectedUser) => {
            setFollowersModalVisible(false);
            onOpenProfile?.(selectedUser);
          }} />
        

        <Comments
          post={commentPost}
          onClose={() => setCommentPost(null)}
          onOpenProfile={onOpenProfile}
          currentUser={user} />
        

        <RepostModal
          visible={Boolean(repostModalPost)}
          post={repostModalPost}
          currentUser={user}
          onClose={() => setRepostModalPost(null)}
          onSuccess={(newPost) => {
            setPosts((prev) => [newPost, ...prev]);
            setRepostModalPost(null);
          }} />
        

        <MediaViewerModal
          visible={Boolean(fullscreenMedia)}
          mediaUrl={fullscreenMedia?.url}
          mediaType={fullscreenMedia?.type || "image"}
          post={fullscreenMedia?.post}
          onClose={() => setFullscreenMedia(null)} />
        
      </View>
    </Modal>);

}

const styles = StyleSheet.create({
  page: { flex: 1 },
  bar: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingHorizontal: 16
  },
  title: { fontFamily: "Poppins_700Bold", fontSize: 16.5, textAlign: "center" },
  spacer: { width: 42, height: 42 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 12, flexGrow: 1 },
  profileCard: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 20,
    marginBottom: 4
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  statsContainer: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around",
    alignItems: "center",
    marginLeft: 14
  },
  statItem: {
    alignItems: "center",
    justifyContent: "center"
  },
  statNumber: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    lineHeight: 24
  },
  statLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    marginTop: 1
  },
  nameBlock: {
    marginTop: 16,
    width: "100%"
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap"
  },
  name: {
    fontFamily: "Poppins_700Bold",
    fontSize: 23
  },
  handle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    marginTop: 2
  },
  bio: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    lineHeight: 21,
    marginTop: 12
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    width: "100%"
  },
  followBtn: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  followBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#ffffff"
  },
  followingBtn: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  followingBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14
  },
  pendingBtn: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  pendingBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14
  },
  optionsIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  postsTitle: { fontFamily: "Poppins_700Bold", fontSize: 16, marginTop: 22 },
  post: { borderWidth: 1, borderRadius: 20, padding: 16 },
  postText: { fontFamily: "Poppins_400Regular", fontSize: 14, lineHeight: 21 },
  image: { width: "100%", borderRadius: 16 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    minHeight: 220
  },
  privateBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 14,
    gap: 10
  },
  privateIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  privateTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17
  },
  privateSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)"
  },
  optionsSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36
  },
  optionsHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#555",
    alignSelf: "center",
    marginBottom: 16
  },
  optionsTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center"
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  optionText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15
  },
  imageWrapper: {
    position: "relative",
    width: "100%"
  },
  nsfwContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative"
  },
  nsfwBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  nsfwBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Poppins_700Bold"
  },
  nsfwContent: {
    alignItems: "flex-start",
    paddingRight: 40
  },
  nsfwHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  nsfwTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  },
  nsfwHint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    marginBottom: 12
  },
  nsfwRevealBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1
  },
  nsfwRevealText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12
  },
  nsfwHideBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14
  },
  nsfwHideBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold"
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
  }
});