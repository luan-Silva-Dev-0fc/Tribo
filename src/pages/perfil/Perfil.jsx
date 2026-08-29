import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { EmptyState, IconButton } from "../../components/ui/ui";
import { FollowersModal } from "../../components/modals/followers-modal";
import { TriboAlertModal } from "../../components/modals/tribo-alert-modal";
import { AppLayout } from "../../components/layout/AppLayout";
import { PostCard } from "../../components/feed/PostCard";
import { ProfileHeaderCard } from "../../components/profile/ProfileHeaderCard";
import { ProfileDeletionBanner } from "../../components/profile/ProfileDeletionBanner";
import { useTheme } from "../../theme";
import { userName } from "../../lib/format";
import { useProfile } from "../../hooks/useProfile";
import { EditProfile, SettingsDrawer, Settings } from "../Search";

export { SearchScreen, Settings } from "../Search";

export function ProfileScreen({
  user,
  onRefresh,
  onLogout,
  onUpdateUser,
  onOpenProfile,
  onOpenSettings,
  onOpenAppearance,
  onOpenSavedPosts,
  onOpenArchivedPosts
}) {
  const { colors } = useTheme();

  const {
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
  } = useProfile(user, onRefresh, onUpdateUser, onLogout);

  const currentProfile = profileData || user;
  const followersCount = currentProfile?.followers_count ?? currentProfile?.followersCount ?? 0;
  const followingCount = currentProfile?.following_count ?? currentProfile?.followingCount ?? 0;
  const postsCount = currentProfile?.posts_count ?? currentProfile?.postsCount ?? userPosts?.length ?? 0;

  return (
    <View style={styles.flex}>
      <View style={styles.menuButtonWrapper}>
        <IconButton
          name="menu"
          label="Abrir menu de configurações"
          onPress={() => setDrawerVisible(true)}
          color={colors.text}
        />
      </View>

      <AppLayout
        tagText="★ Tribo"
        title="Seu Perfil"
        description="Gerencie suas informações e preferências."
      >
        <ScrollView
          contentContainerStyle={styles.profileScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary || "#3b82f6"}
              colors={[colors.primary || "#3b82f6"]}
            />
          }
        >
          <ProfileDeletionBanner
            deletionInfo={deletionInfo}
            cancelingDeletion={cancelingDeletion}
            onCancelDeletion={handleCancelDeletion}
          />

          <ProfileHeaderCard
            profile={currentProfile}
            postsCount={postsCount}
            followersCount={followersCount}
            followingCount={followingCount}
            onEdit={() => setEditing(true)}
            onOpenFollowers={() => {
              setFollowersTab("followers");
              setFollowersVisible(true);
            }}
            onOpenFollowing={() => {
              setFollowersTab("following");
              setFollowersVisible(true);
            }}
          />

          <View style={[styles.sectionHeader, { borderBottomColor: colors.line }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Seu espaço</Text>
            <Text style={[styles.sectionSub, { color: colors.subtext }]}>
              Suas publicações e conversas na Tribo aparecem aqui.
            </Text>
          </View>

          {loadingPosts ? (
            <ActivityIndicator style={{ marginTop: 24 }} size="small" color={colors.primary} />
          ) : userPosts.length === 0 ? (
            <EmptyState
              title="Sem publicações"
              description="Você ainda não publicou nada na Tribo."
              icon="inbox"
            />
          ) : (
            <View style={{ marginTop: 8 }}>
              {userPosts.map((p) => (
                <PostCard key={p.id} post={p} currentUser={user} currentUserId={user?.id} />
              ))}
            </View>
          )}
        </ScrollView>

        <EditProfile
          user={currentProfile}
          visible={editing}
          onClose={() => setEditing(false)}
          onUpdateUser={(updated) => {
            setProfileData(updated);
            onUpdateUser?.(updated);
          }}
          onSaved={handleRefresh}
        />

        <Settings
          user={user}
          visible={settings}
          onClose={() => {
            setSettings(false);
            fetchDeletionStatus();
          }}
          onLogout={onLogout}
          onUpdateUser={onUpdateUser}
          onOpenAppearance={onOpenAppearance}
          onOpenSavedPosts={onOpenSavedPosts}
          onOpenArchivedPosts={onOpenArchivedPosts}
          showAlert={setProfileAlert}
        />

        <FollowersModal
          visible={followersVisible}
          userId={user?.id}
          initialTab={followersTab}
          targetName={userName(user)}
          onClose={() => setFollowersVisible(false)}
          onOpenProfile={onOpenProfile}
        />

        <SettingsDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          onLogout={() => setTimeout(confirmLogout, 100)}
          onOpenSettings={() => {
            setDrawerVisible(false);
            if (onOpenSettings) onOpenSettings();
            else setSettings(true);
          }}
          onOpenAppearance={onOpenAppearance}
          onOpenSavedPosts={onOpenSavedPosts}
          onOpenArchivedPosts={onOpenArchivedPosts}
          user={user}
          onUpdateUser={onUpdateUser}
        />

        <TriboAlertModal
          visible={profileAlert.visible}
          type={profileAlert.type}
          title={profileAlert.title}
          message={profileAlert.message}
          buttonText={profileAlert.buttonText}
          onClose={() => {
            if (profileAlert.onClose) profileAlert.onClose();
            setProfileAlert({ visible: false });
          }}
          secondaryButtonText={profileAlert.secondaryButtonText}
          onSecondaryPress={profileAlert.onSecondaryPress}
        />
      </AppLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  menuButtonWrapper: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 100
  },
  profileScroll: {
    paddingTop: 4,
    paddingBottom: 110,
    gap: 14,
    flexGrow: 1
  },
  sectionHeader: {
    paddingHorizontal: 4,
    marginTop: 6,
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1
  },
  sectionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16
  },
  sectionSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    marginTop: 2
  }
});