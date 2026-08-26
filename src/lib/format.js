export const unwrap = (value, key) => value?.[key] || value?.data?.[key] || value?.data || value;
export const listFrom = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  return [];
};
export const userName = (user) => {
  if (!user) return "Membro";
  const target =
  typeof user === "object" ?
  user?.follower || user?.following || user?.user || user?.author || user :
  {};
  const name =
  target?.name ||
  target?.fullName ||
  target?.full_name ||
  [target?.firstName || target?.first_name, target?.lastName || target?.last_name].
  filter(Boolean).
  join(" ") ||
  target?.displayName ||
  target?.display_name || (
  target?.username ? target.username.startsWith("@") ? target.username : `@${target.username}` : null) || (
  typeof target?.email === "string" ? target.email.split("@")[0] : null) ||
  "Membro";
  return name;
};
export const errorMessage = (error) =>
error?.payload?.message ||
error?.response?.data?.message ||
error?.data?.message ||
error?.message ||
"Não foi possível concluir esta ação.";

export const getUserAvatar = (user, fallbackUser = null) => {
  if (!user && !fallbackUser) return null;
  if (typeof user === "string") return user;

  const target =
  typeof user === "object" ?
  user?.follower || user?.following || user?.author || user?.user || user :
  {};
  const photo =
  target.avatar_url ||
  target.avatarUrl ||
  target.avatar ||
  target.photo_url ||
  target.photoUrl ||
  target.image_url ||
  target.imageUrl ||
  target.profile_pic ||
  target.profilePic ||
  null;

  if (photo) return photo;


  if (fallbackUser && typeof fallbackUser === "object") {
    const targetId = target.id ?? target.userId ?? target.authorId ?? target._id;
    const fallbackId = fallbackUser.id ?? fallbackUser._id;
    const isSameUser =
    targetId !== undefined && fallbackId !== undefined && String(targetId) === String(fallbackId) ||
    target.username && fallbackUser.username && target.username === fallbackUser.username ||
    target.email && fallbackUser.email && target.email === fallbackUser.email;

    if (isSameUser) {
      return (
        fallbackUser.avatar_url ||
        fallbackUser.avatarUrl ||
        fallbackUser.avatar ||
        fallbackUser.photo_url ||
        fallbackUser.photoUrl ||
        fallbackUser.image_url ||
        fallbackUser.imageUrl ||
        null);

    }
  }

  return null;
};

export const getUserBadge = (user) => {
  if (!user && typeof user !== "object") return null;
  const target =
  typeof user === "object" ?
  user?.follower || user?.following || user?.author || user?.user || user :
  {};
  const badge =
  target?.badge_type ||
  target?.badgeType ||
  target?.badge ||
  target?.verified_type ||
  target?.verifiedType || (
  target?.is_verified || target?.isVerified ? "BLUE" : null);

  if (typeof badge === "string") {
    const upper = badge.toUpperCase();
    if (upper.includes("GOLD") || upper.includes("DOURAD") || upper.includes("ORANGE") || upper.includes("YELLOW")) return "GOLD";
    if (upper.includes("BLUE") || upper.includes("AZUL") || upper === "VERIFIED" || upper === "TRUE") return "BLUE";
    return upper;
  }
  return null;
};

export const normalizeUser = (user) => {
  if (!user || typeof user !== "object") return user;
  const avatar = getUserAvatar(user);
  const badge = getUserBadge(user);
  return {
    ...user,
    avatarUrl: avatar,
    avatar_url: avatar,
    avatar: avatar,
    badge_type: badge,
    badgeType: badge
  };
};

export const formatRelativeTime = (dateInput) => {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "agora";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}sem`;
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};