import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Avatar, VerificationBadge } from "../ui/ui";
import { userName } from "../../lib/format";
import { useTheme } from "../../theme";

export function ProfileHeaderCard({
  profile,
  postsCount = 0,
  followersCount = 0,
  followingCount = 0,
  onEdit,
  onOpenFollowers,
  onOpenFollowing
}) {
  const { colors } = useTheme();
  if (!profile) return null;

  const isLoyal = Boolean(
    profile?.is_loyal_follower ||
    profile?.isLoyalFollower ||
    profile?.loyal
  );

  return (
    <View
      style={[
        styles.profileCard,
        {
          backgroundColor: colors.surface || colors.card,
          borderColor: colors.border
        }
      ]}
    >
      <View style={styles.profileTop}>
        <Pressable
          onPress={onEdit}
          style={styles.profileAvatarContainer}
          accessibilityLabel="Editar foto de perfil"
        >
          <Avatar user={profile} size={84} />
          <View
            style={[
              styles.profileAvatarEditBadge,
              { backgroundColor: colors.accent, borderColor: colors.card }
            ]}
          >
            <Feather name="camera" size={13} color="#fff" />
          </View>
        </Pressable>

        <View style={styles.profileStatsRow}>
          <View style={styles.profileStatItem}>
            <Text style={[styles.profileStatNumber, { color: colors.text }]}>
              {postsCount}
            </Text>
            <Text style={[styles.profileStatLabel, { color: colors.subtext }]}>
              Publicações
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.profileStatItem,
              {
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }]
              }
            ]}
            onPress={onOpenFollowers}
          >
            <Text style={[styles.profileStatNumber, { color: colors.text }]}>
              {followersCount}
            </Text>
            <Text style={[styles.profileStatLabel, { color: colors.subtext }]}>
              Seguidores
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.profileStatItem,
              {
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }]
              }
            ]}
            onPress={onOpenFollowing}
          >
            <Text style={[styles.profileStatNumber, { color: colors.text }]}>
              {followingCount}
            </Text>
            <Text style={[styles.profileStatLabel, { color: colors.subtext }]}>
              Seguindo
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.nameBlock}>
        <View style={styles.nameRow}>
          <Text selectable style={[styles.profileName, { color: colors.text }]}>
            {userName(profile)}
          </Text>
          <VerificationBadge user={profile} size={18} />
          {isLoyal && (
            <View style={styles.loyalTag}>
              <Feather name="star" size={12} color="#f59e0b" />
              <Text style={styles.loyalTagText}>Fiel</Text>
            </View>
          )}
        </View>

        <Text selectable style={[styles.profileHandle, { color: colors.subtext }]}>
          @{profile?.username || "tribo"}
        </Text>

        {!!profile?.bio && (
          <Text selectable style={[styles.profileBio, { color: colors.text }]}>
            {profile?.bio}
          </Text>
        )}

        {!!profile?.website && (
          <Pressable
            onPress={() =>
              Linking.openURL(
                profile?.website.startsWith("http")
                  ? profile?.website
                  : `https://${profile?.website}`
              )
            }
          >
            <Text style={[styles.profileWebsite, { color: colors.primary }]}>
              🔗 {profile?.website}
            </Text>
          </Pressable>
        )}

        {!!profile?.location && (
          <Text style={[styles.profileLocation, { color: colors.subtext }]}>
            📍 {profile?.location}
          </Text>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.profileEditBtn,
          {
            borderColor: colors.border,
            backgroundColor: colors.surface,
            opacity: pressed ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          }
        ]}
        onPress={onEdit}
      >
        <Text style={[styles.profileEditBtnText, { color: colors.text }]}>
          Editar perfil
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  profileAvatarContainer: {
    position: "relative"
  },
  profileAvatarEditBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2
  },
  profileStatsRow: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around",
    alignItems: "center",
    marginLeft: 14
  },
  profileStatItem: {
    alignItems: "center",
    justifyContent: "center"
  },
  profileStatNumber: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    lineHeight: 24
  },
  profileStatLabel: {
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
  profileName: {
    fontFamily: "Poppins_700Bold",
    fontSize: 23,
    flexShrink: 1
  },
  profileHandle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    marginTop: 2
  },
  profileBio: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    lineHeight: 21,
    marginTop: 12
  },
  profileWebsite: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    marginTop: 6
  },
  profileLocation: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    marginTop: 4
  },
  loyalTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  loyalTagText: {
    color: "#f59e0b",
    fontSize: 11,
    fontFamily: "Poppins_700Bold"
  },
  profileEditBtn: {
    marginTop: 18,
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  profileEditBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  }
});
