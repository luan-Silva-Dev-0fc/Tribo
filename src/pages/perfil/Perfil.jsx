import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Image,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { api, getUploadUrl } from "../../api";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  Input,
  VerificationBadge,
} from "../../components/ui/ui";
import { ReportModal } from "../../components/modals/report-modal";
import { FollowersModal } from "../../components/modals/followers-modal";
import { FollowRequestsModal } from "../../components/modals/follow-requests-modal";
import { ProfileDrawer } from "../../components/profile/profile-drawer";
import { TriboAlertModal } from "../../components/modals/tribo-alert-modal";
import { AppLayout } from "../../components/layout/AppLayout";
import { AppHeader } from "../../components/ui/ui";
import {
  errorMessage,
  getUserAvatar,
  listFrom,
  normalizeUser,
  unwrap,
  userName,
} from "../../lib/format";
import { useTheme } from "../../theme";
import { useUserContext } from "../../context/user-context";
import { PostCard } from "../../components/feed/PostCard";

function belongsToUser(post, id) {
  if (!post || !id) return false;
  return (
    String(post.userId) === String(id) ||
    String(post.authorId) === String(id) ||
    String(post.user?.id) === String(id) ||
    String(post.author?.id) === String(id)
  );
}

async function downloadUserData(user, data) {
  const filename = `tribo-dados-${user?.username || "usuario"}.json`;
  const jsonStr = typeof data === "string" ? data : JSON.stringify(data, null, 2);

  if (Platform.OS === "web" && typeof document !== "undefined") {
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }

  try {
    const FileSystem = require("expo-file-system/legacy");
    const Sharing = require("expo-sharing");
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
      encoding: FileSystem.EncodingType?.UTF8 || "utf8",
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Baixar Meus Dados da Tribo",
        UTI: "public.json",
      });
      return true;
    }
  } catch (nativeErr) {
    console.warn("Could not save file natively:", nativeErr);
  }
  return false;
}

function SearchUserOptionsModal({ user, visible, onClose, onBlock, onReport }) {
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
            onBlock(user);
          }}
        >
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
            onReport(user);
          }}
        >
          <View style={[styles.optionIcon, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
            <Feather name="flag" size={20} color="#ef4444" />
          </View>
          <Text style={[styles.optionText, { color: "#ef4444" }]}>
            Denunciar e Bloquear
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export { SearchScreen } from "../Search";
import { EditProfile, FeedbackModal, UpdateModal, SettingsDrawer, Settings } from "../Search";

export function ProfileScreen({
  user,
  onRefresh,
  onLogout,
  onUpdateUser,
  onOpenProfile,
  onOpenAppearance,
  onOpenSavedPosts,
  onOpenArchivedPosts,
}) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [followersVisible, setFollowersVisible] = useState(false);
  const [followersTab, setFollowersTab] = useState("followers");
  const [deletionInfo, setDeletionInfo] = useState(null);
  const [cancelingDeletion, setCancelingDeletion] = useState(false);
  const [profileData, setProfileData] = useState(user);
  const [profileAlert, setProfileAlert] = useState({ visible: false });
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.users.get(user.id);
      if (res) {
        setProfileData(res);
        onUpdateUser?.(res); // Keep global state in sync if possible
      }
    } catch (err) {
      // Ignore
    }

    // Fetch user posts
    try {
      setLoadingPosts(true);
      const postsRes = await api.users.posts(user.id);
      const allPosts = postsRes?.posts || postsRes?.data || postsRes || [];
      setUserPosts(Array.isArray(allPosts) ? allPosts : []);
    } catch (err) {
      // Ignore
    } finally {
      setLoadingPosts(false);
    }
  }, [user?.id]); // Removed onUpdateUser to prevent infinite loop

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDeletionStatus = useCallback(async () => {
    try {
      const res = await api.users.deletionStatus();
      if (res) {
        setDeletionInfo(res.data || res);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchDeletionStatus();
  }, [fetchDeletionStatus, user]);

  const handleCancelDeletion = async () => {
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
        onClose: () => setProfileAlert({ visible: false }),
      });
      onRefresh?.();
    } catch (err) {
      setProfileAlert({
        visible: true,
        type: "error",
        title: "Erro ao Cancelar",
        message: errorMessage(err) || "Não foi possível cancelar o agendamento de exclusão.",
        buttonText: "Fechar",
        onClose: () => setProfileAlert({ visible: false }),
      });
    } finally {
      setCancelingDeletion(false);
    }
  };

  const followersCount = profileData?.followers_count ?? profileData?.followersCount ?? 0;
  const followingCount = profileData?.following_count ?? profileData?.followingCount ?? 0;
  const postsCount = profileData?.posts_count ?? profileData?.postsCount ?? userPosts?.length ?? 0;
  const isLoyal = Boolean(
    profileData?.is_loyal_follower ||
    profileData?.isLoyalFollower ||
    profileData?.loyal
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ position: "absolute", top: 20, right: 20, zIndex: 100 }}>
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
        >
          {/* Banner de Exclusão Agendada no Perfil */}
          {deletionInfo?.isPendingDeletion && (
            <View
              style={[
                styles.deletionBanner,
                {
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                },
              ]}
            >
              <View style={styles.deletionBannerHeader}>
                <Feather name="alert-triangle" size={18} color="#ef4444" />
                <Text style={styles.deletionBannerTitle}>
                  Exclusão Agendada ({deletionInfo.daysRemaining ?? 15} dias restantes)
                </Text>
              </View>
              <Text style={[styles.deletionBannerText, { color: colors.text }]}>
                Sua conta está agendada para ser excluída permanentemente. Todos os seus dados serão apagados ao final do prazo.
              </Text>
              <Pressable
                style={styles.cancelDeletionBtn}
                onPress={handleCancelDeletion}
                disabled={cancelingDeletion}
              >
                {cancelingDeletion ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.cancelDeletionBtnText}>Cancelar Exclusão da Conta</Text>
                )}
              </Pressable>
            </View>
          )}

          <View
            style={[
              styles.profileCard,
              {
                backgroundColor: colors.surface || colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.profileTop}>
              <Pressable
                onPress={() => setEditing(true)}
                style={styles.profileAvatarContainer}
                accessibilityLabel="Editar foto de perfil"
              >
                <Avatar user={user} size={84} />
                <View
                  style={[
                    styles.profileAvatarEditBadge,
                    { backgroundColor: colors.accent, borderColor: colors.card },
                  ]}
                >
                  <Feather name="camera" size={13} color="#fff" />
                </View>
              </Pressable>

              {/* Estatísticas de Posts / Seguidores / Seguindo */}
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
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                  onPress={() => {
                    setFollowersTab("followers");
                    setFollowersVisible(true);
                  }}
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
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                  onPress={() => {
                    setFollowersTab("following");
                    setFollowersVisible(true);
                  }}
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
                  {userName(user)}
                </Text>
                <VerificationBadge user={user} size={18} />
                {isLoyal && (
                  <View style={styles.loyalTag}>
                    <Feather name="star" size={12} color="#f59e0b" />
                    <Text style={styles.loyalTagText}>Fiel</Text>
                  </View>
                )}
              </View>
              <Text
                selectable
                style={[
                  styles.profileHandle,
                  { color: colors.subtext },
                ]}
              >
                @{user?.username || "tribo"}
              </Text>

              {!!user?.bio && (
                <Text
                  selectable
                  style={[
                    styles.profileBio,
                    { color: colors.text },
                  ]}
                >
                  {user?.bio}
                </Text>
              )}

              {!!user?.website && (
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      user?.website.startsWith("http")
                        ? user?.website
                        : `https://${user?.website}`,
                    )
                  }
                >
                  <Text style={[styles.profileWebsite, { color: colors.accent }]}>
                    {user?.website}
                  </Text>
                </Pressable>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.profileEditBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                }
              ]}
              onPress={() => setEditing(true)}
            >
              <Text style={[styles.profileEditBtnText, { color: colors.text }]}>
                Editar perfil
              </Text>
            </Pressable>
          </View>

          <View style={[styles.profileSectionHeader, { borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 12, marginBottom: 4 }]}>
            <Text style={[styles.profileSectionTitle, { color: colors.text }]}>
              Seu espaço
            </Text>
            <Text style={[styles.profileSectionSub, { color: colors.subtext }]}>
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
                <PostCard
                  key={p.id}
                  post={p}
                  currentUser={user}
                  currentUserId={user?.id}
                />
              ))}
            </View>
          )}

          <EditProfile
            user={user}
            visible={editing}
            onClose={() => setEditing(false)}
            onUpdateUser={onUpdateUser}
            onSaved={onRefresh}
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

          {/* Menu Drawer Lateral (3 palitos) */}
          <SettingsDrawer
            visible={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            onLogout={() => {
              setTimeout(() => {
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
                    onLogout();
                  }
                });
              }, 100);
            }}
            onOpenSettings={() => {
              setDrawerVisible(false);
              setSettings(true);
            }}
            onOpenAppearance={onOpenAppearance}
            onOpenSavedPosts={onOpenSavedPosts}
            onOpenArchivedPosts={onOpenArchivedPosts}
            user={user}
            onUpdateUser={onUpdateUser}
          />

          {/* Modal de Alerta Padronizado Tribo */}
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
        </ScrollView>
      </AppLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchTop: { paddingBottom: 12 },
  sectionTitle: { fontFamily: "Poppins_700Bold", fontSize: 22, letterSpacing: -0.3 },
  sectionSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  searchField: {
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    marginTop: 6,
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    minHeight: 48,
    paddingLeft: 10,
    backgroundColor: "transparent",
  },
  results: { paddingTop: 4, paddingBottom: 110, gap: 12, flexGrow: 1 },
  personRow: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  personTrigger: { flex: 1, flexDirection: "row", alignItems: "center", gap: 11 },
  personName: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  personHandle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  personBio: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 4 },
  profileScroll: { paddingTop: 4, paddingBottom: 110, gap: 14, flexGrow: 1 },
  profileCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  profileSectionHeader: {
    paddingHorizontal: 4,
    marginTop: 6,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileAvatarContainer: {
    position: "relative",
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
    borderWidth: 2,
  },
  profileStatsRow: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around",
    alignItems: "center",
    marginLeft: 14,
  },
  profileStatItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  profileStatNumber: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    lineHeight: 24,
  },
  profileStatLabel: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11.5,
    marginTop: 1,
  },
  nameBlock: {
    marginTop: 16,
    width: "100%",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  profileName: { fontFamily: "Poppins_700Bold", fontSize: 23, flexShrink: 1 },
  profileHandle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    marginTop: 2,
  },
  profileBio: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    lineHeight: 21,
    marginTop: 12,
  },
  loyalTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  loyalTagText: {
    color: "#f59e0b",
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },
  profileEditBtn: {
    marginTop: 18,
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  profileEditBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  pendingBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  pendingBannerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingBannerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  pendingBannerSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    marginTop: 1,
  },
  modalPage: { flex: 1, borderRadius: 26 },
  modalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    padding: 15,
  },
  modalTitle: { fontFamily: "Poppins_700Bold", fontSize: 16 },
  editForm: { padding: 20, gap: 16 },
  avatarEditContainer: {
    alignItems: "center",
    marginVertical: 12,
    gap: 10,
  },
  avatarPickerPressable: {
    position: "relative",
  },
  avatarImageWrapper: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  avatarLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 46,
  },
  avatarLoadingText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    marginTop: 4,
  },
  avatarCameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
  },
  avatarChangeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    paddingLeft: 4,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  counterText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    paddingRight: 4,
  },
  editButtonsRow: {
    marginTop: 10,
    gap: 10,
  },
  settings: { padding: 20, gap: 12 },
  deletionBanner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  deletionBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deletionBannerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#ef4444",
  },
  deletionBannerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  cancelDeletionBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#ef4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  cancelDeletionBtnText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },
  settingRow: {
    minHeight: 76,
    padding: 13,
    borderWidth: 1,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  settingCaption: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    marginTop: 2,
  },
  delete: { alignItems: "center", padding: 12 },
  deleteText: { fontFamily: "Poppins_600SemiBold", fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
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
    paddingBottom: 36,
  },
  optionsHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#555",
    alignSelf: "center",
    marginBottom: 16,
  },
  optionsTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
  },
  feedbackSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },
  feedbackTypesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  feedbackTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  feedbackTypeChipText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
  },
  ageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  ageModalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 26,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  ageModalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ageModalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    textAlign: "center",
    marginBottom: 8,
  },
  ageModalDescription: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 19,
  },
  ageModalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  ageModalBtnCancel: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ageModalBtnCancelText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  ageModalBtnConfirm: {
    flex: 1.2,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  ageModalBtnConfirmText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  trendsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  trendsHeaderTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    marginBottom: 12,
  },
  trendItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  trendHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  trendRank: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
  },
  trendTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
});





