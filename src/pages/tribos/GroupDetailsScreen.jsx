import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { api, getUploadUrl } from "../../api";
import { Avatar } from "../../components/ui/ui";
import { useTheme } from "../../theme";
import { errorMessage } from "../../lib/format";
import { TriboAlertModal } from "../../components/modals/tribo-alert-modal";
import { clearChatHistory } from "../../services/chatExportService";
import { ChatCache } from "../../services/chatCache";
import { GroupChatTab } from "./tabs/GroupChatTab";
import { GroupFeedTab } from "./tabs/GroupFeedTab";
import { GroupTrendsTab } from "./tabs/GroupTrendsTab";
import { useGroupAudioSync } from "../../hooks/useGroupAudioSync";
import { GroupAudioHeaderPlayer } from "../../components/chat/GroupAudioHeaderPlayer";
import { GroupAudioQueueBottomSheet } from "../../components/chat/GroupAudioQueueBottomSheet";
import { SelectTrackModal } from "../../components/chat/SelectTrackModal";

export function GroupDetailsScreen({
  groupId,
  user,
  onBack,
  onSettings,
  onOpenProfile,
  onOpenMedia,
  onInvite
}) {
  const insets = useSafeAreaInsets();
  const { colors, mode, isDark: themeIsDark } = useTheme();
  const isDark = Boolean(
    themeIsDark || mode === "dark" || mode === "oled" || colors.mode === "dark"
  );
  const [group, setGroup] = useState(() => ChatCache.getGroupSync?.(groupId) || null);
  const [loading, setLoading] = useState(() => !ChatCache.getGroupSync?.(groupId));
  const [activeTab, setActiveTab] = useState("chat");
  const [enableTriboFeed, setEnableTriboFeed] = useState(false);
  const [enableTriboTrends, setEnableTriboTrends] = useState(false);
  const [targetMessageId, setTargetMessageId] = useState(null);
  const [groupMenuVisible, setGroupMenuVisible] = useState(false);
  const [clearChatConfirmVisible, setClearChatConfirmVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    primaryText: "Entendido",
    onPrimaryPress: null,
    secondaryText: null,
    onSecondaryPress: null
  });
  const chatTabRef = useRef(null);
  const [queueVisible, setQueueVisible] = useState(false);
  const [selectTrackVisible, setSelectTrackVisible] = useState(false);

  const {
    audioState,
    isGold,
    isMuted,
    localProgressMs,
    play,
    pause,
    skip,
    addToQueue,
    removeFromQueue,
    toggleMute
  } = useGroupAudioSync({
    groupId,
    currentUser: user,
    onPermissionError: (msg) => {
      showAlert({
        title: "⭐ Selo Dourado",
        message: msg,
        type: "info"
      });
    }
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const showAlert = ({
    title,
    message,
    type = "info",
    primaryText = "Entendido",
    onPrimaryPress,
    secondaryText,
    onSecondaryPress
  }) => {
    setCustomAlert({
      visible: true,
      type,
      title,
      message,
      primaryText,
      onPrimaryPress,
      secondaryText,
      onSecondaryPress
    });
  };

  const handleExportChatTrigger = () => {
    setGroupMenuVisible(false);
    if (chatTabRef.current?.exportChat) {
      chatTabRef.current.exportChat();
    } else {
      showAlert({
        title: "Exportar Conversa",
        message: "Abra a aba de Chat para exportar o histórico.",
        type: "info"
      });
    }
  };

  const handleClearChatConfirmed = async () => {
    setClearChatConfirmVisible(false);
    if (chatTabRef.current?.clearChat) {
      await chatTabRef.current.clearChat();
    } else {
      await clearChatHistory(groupId);
      showToast("Conversa limpa com sucesso!");
    }
  };

  const loadGroup = useCallback(async () => {
    try {
      const res = await api.groups.get(groupId);
      const grp = res.group || res;
      setGroup(grp);
      ChatCache.setGroupSync?.(groupId, grp);
    } catch (error) {
      if (!ChatCache.getGroupSync?.(groupId)) {
        showAlert({
          title: "Erro ao Carregar",
          message: errorMessage(error),
          type: "error",
          onPrimaryPress: onBack
        });
      }
    } finally {
      setLoading(false);
    }
  }, [groupId, onBack]);

  const loadAppSettings = useCallback(async () => {
    try {
      const res = await api.app.settings();
      const feedEnabled = Boolean(
        res?.enableTriboFeed ?? res?.enable_tribo_feed ?? false
      );
      const trendsEnabled = Boolean(
        res?.enableTriboTrends ?? res?.enable_tribo_trends ?? false
      );
      setEnableTriboFeed(feedEnabled);
      setEnableTriboTrends(trendsEnabled);

      setActiveTab((prev) => {
        if (prev === "feed" && !feedEnabled) return "chat";
        if (prev === "trends" && !trendsEnabled) return "chat";
        return prev;
      });
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadGroup();
    loadAppSettings();
  }, [loadGroup, loadAppSettings]);

  const handleEditGroupAvatar = async () => {
    if (!isAdmin || updatingAvatar) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85
      });

      if (res.canceled || !res.assets || !res.assets[0]) return;
      setUpdatingAvatar(true);
      const asset = res.assets[0];
      let uploadedUrl = asset.uri;

      if (api.uploads?.photo) {
        const uploadRes = await api.uploads.photo(
          asset.uri,
          `group_avatar_${Date.now()}.jpg`,
          "image/jpeg"
        );
        uploadedUrl = getUploadUrl(uploadRes) || uploadRes?.url || asset.uri;
      }

      await api.groups.update(groupId, {
        avatar_url: uploadedUrl,
        avatarUrl: uploadedUrl
      });

      const updated = {
        ...group,
        avatar_url: uploadedUrl,
        avatarUrl: uploadedUrl
      };
      setGroup(updated);
      ChatCache.setGroupSync?.(groupId, updated);
      showToast("Foto do grupo atualizada com sucesso!");
    } catch (err) {
      showAlert({
        title: "Erro ao Atualizar Foto",
        message: errorMessage(err) || "Não foi possível atualizar a foto do grupo.",
        type: "error"
      });
    } finally {
      setUpdatingAvatar(false);
    }
  };

  if (loading && !group) {
    return (
      <View
        style={[
          styles.root,
          { backgroundColor: colors.background, justifyContent: "center" }
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isAdmin = String(group?.admin_id || group?.adminId) === String(user?.id);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Cabeçalho Superior */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.background
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Pressable
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ padding: 4, marginRight: 8 }}
          >
            <Feather name="arrow-left" size={24} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={() => setAvatarModalVisible(true)}
            style={{ position: "relative", marginRight: 12 }}
            accessibilityLabel="Ver foto do grupo"
          >
            <Avatar
              url={group?.avatarUrl || group?.avatar_url}
              size={44}
              fallback={group?.name || "Grupo"}
            />
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: "#22c55e",
                borderWidth: 2,
                borderColor: colors.background || "#ffffff"
              }}
            />
          </Pressable>

          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text
              style={{
                fontFamily: "Poppins_700Bold",
                fontSize: 18,
                color: colors.text
              }}
              numberOfLines={1}
            >
              {group?.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 1 }}>
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  backgroundColor: "#22c55e",
                  marginRight: 5
                }}
              />
              <Text
                style={{
                  fontFamily: "Poppins_400Regular",
                  fontSize: 12,
                  color: colors.muted || "#64748b"
                }}
              >
                {group?.members_count ||
                  group?.membersCount ||
                  (group?.members ? group.members.length : 1)}{" "}
                membros
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {/* Botão de Música e Fila da Tribo */}
          <Pressable
            onPress={() => setQueueVisible(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isGold ? "rgba(255, 184, 0, 0.15)" : (colors.surfaceAlt || (isDark ? "#222" : "#f1f5f9")),
              borderWidth: isGold ? 1 : 0,
              borderColor: isGold ? "rgba(255, 184, 0, 0.4)" : "transparent",
              alignItems: "center",
              justifyContent: "center"
            }}
            accessibilityLabel="Músicas do grupo"
          >
            <Ionicons name="musical-notes" size={19} color={isGold ? "#FFB800" : colors.text} />
          </Pressable>
          {onInvite && (
            <Pressable
              onPress={onInvite}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.surfaceAlt || (isDark ? "#222" : "#f1f5f9"),
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Feather name="user-plus" size={18} color={colors.text} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setGroupMenuVisible(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surfaceAlt || (isDark ? "#222" : "#f1f5f9"),
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Feather name="more-vertical" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Mini-Player de Áudio Sincronizado */}
      <GroupAudioHeaderPlayer
        currentTrack={audioState.current_track}
        isPlaying={audioState.is_playing}
        isGold={isGold}
        isMuted={isMuted}
        progressMs={localProgressMs}
        queueCount={audioState.queue_list?.length || 0}
        onPlay={play}
        onPause={pause}
        onSkip={skip}
        onToggleMute={toggleMute}
        onOpenQueue={() => setQueueVisible(true)}
      />

      {/* Barra de Abas (Chat, Feed, Trends) */}
      {(enableTriboFeed || enableTriboTrends) && (
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border || "#e2e8f0",
            backgroundColor: colors.background
          }}
        >
          {enableTriboFeed && (
            <Pressable
              style={styles.tabBtn}
              onPress={() => setActiveTab("feed")}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: activeTab === "feed" ? "Poppins_600SemiBold" : "Poppins_500Medium",
                  color: activeTab === "feed" ? colors.primary || "#0284c7" : colors.muted
                }}
              >
                Feed
              </Text>
              {activeTab === "feed" && <View style={[styles.tabIndicator, { backgroundColor: colors.primary || "#0284c7" }]} />}
            </Pressable>
          )}

          <Pressable
            style={styles.tabBtn}
            onPress={() => setActiveTab("chat")}
          >
            <Text
              style={{
                fontSize: 14,
                fontFamily: activeTab === "chat" ? "Poppins_600SemiBold" : "Poppins_500Medium",
                color: activeTab === "chat" ? colors.primary || "#0284c7" : colors.muted
              }}
            >
              Chat
            </Text>
            {activeTab === "chat" && <View style={[styles.tabIndicator, { backgroundColor: colors.primary || "#0284c7" }]} />}
          </Pressable>

          {enableTriboTrends && (
            <Pressable
              style={styles.tabBtn}
              onPress={() => setActiveTab("trends")}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: activeTab === "trends" ? "Poppins_600SemiBold" : "Poppins_500Medium",
                  color: activeTab === "trends" ? colors.primary || "#0284c7" : colors.muted
                }}
              >
                Trends
              </Text>
              {activeTab === "trends" && <View style={[styles.tabIndicator, { backgroundColor: colors.primary || "#0284c7" }]} />}
            </Pressable>
          )}
        </View>
      )}

      {/* Conteúdo da Aba */}
      <View style={styles.content}>
        {activeTab === "feed" && enableTriboFeed && (
          <GroupFeedTab
            groupId={groupId}
            user={user}
            colors={colors}
            group={group}
            isAdmin={isAdmin}
            onOpenProfile={onOpenProfile}
          />
        )}
        {(activeTab === "chat" ||
          (!enableTriboFeed && activeTab === "feed") ||
          (!enableTriboTrends && activeTab === "trends")) && (
          <GroupChatTab
            ref={chatTabRef}
            groupId={groupId}
            group={group}
            user={user}
            colors={colors}
            targetMessageId={targetMessageId}
            onTargetReached={() => setTargetMessageId(null)}
            onOpenProfile={onOpenProfile}
            onShowToast={showToast}
            onShowAlert={showAlert}
          />
        )}
        {activeTab === "trends" && enableTriboTrends && (
          <GroupTrendsTab
            groupId={groupId}
            colors={colors}
            onTrendClick={(msgId) => {
              setTargetMessageId(msgId);
              setActiveTab("chat");
            }}
            onPlayVideo={(media) => onOpenMedia(media)}
          />
        )}
      </View>

      {/* Menu de Opções do Grupo */}
      <Modal
        visible={groupMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGroupMenuVisible(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setGroupMenuVisible(false)}
        >
          <Pressable
            style={[
              styles.menuSheet,
              {
                backgroundColor: colors.card || "#ffffff",
                borderColor: colors.border || "#e2e8f0",
                paddingBottom: Math.max(insets.bottom + 16, 28)
              }
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border || "#cbd5e1" }]} />

            <View style={[styles.sheetHeader, { borderColor: colors.border || "#f1f5f9" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <Avatar
                  url={group?.avatarUrl || group?.avatar_url}
                  size={36}
                  fallback={group?.name || "Grupo"}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Poppins_700Bold", fontSize: 15, color: colors.text }} numberOfLines={1}>
                    {group?.name}
                  </Text>
                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.muted || "#64748b" }}>
                    Opções do Grupo
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setGroupMenuVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt || "#f1f5f9" }]}
              >
                <Feather name="x" size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              <Pressable
                onPress={() => {
                  setGroupMenuVisible(false);
                  onSettings(group);
                }}
                style={({ pressed }) => [styles.menuOption, { backgroundColor: pressed ? (isDark ? "rgba(255, 255, 255, 0.06)" : "#f8fafc") : "transparent" }]}
              >
                <View style={[styles.menuIconBox, { backgroundColor: isDark ? "#1e293b" : "#f1f5f9" }]}>
                  <Feather name="settings" size={20} color={colors.primary || "#0284c7"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.text }}>
                    Configurações do Grupo
                  </Text>
                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.muted || "#64748b" }}>
                    Ver detalhes, membros e permissões
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.muted || "#94a3b8"} />
              </Pressable>

              <Pressable
                onPress={handleExportChatTrigger}
                style={({ pressed }) => [styles.menuOption, { backgroundColor: pressed ? (isDark ? "rgba(255, 255, 255, 0.06)" : "#f8fafc") : "transparent" }]}
              >
                <View style={[styles.menuIconBox, { backgroundColor: isDark ? "#0c4a6e" : "#e0f2fe" }]}>
                  <Feather name="download" size={20} color="#0284c7" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: colors.text }}>
                    Exportar Conversa
                  </Text>
                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.muted || "#64748b" }}>
                    Gerar arquivo .txt com todo o histórico
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.muted || "#94a3b8"} />
              </Pressable>

              <Pressable
                onPress={() => {
                  setGroupMenuVisible(false);
                  setClearChatConfirmVisible(true);
                }}
                style={({ pressed }) => [styles.menuOption, { backgroundColor: pressed ? (isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2") : "transparent" }]}
              >
                <View style={[styles.menuIconBox, { backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2" }]}>
                  <Feather name="trash-2" size={20} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 14, color: "#ef4444" }}>
                    Limpar Conversa
                  </Text>
                  <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 12, color: colors.muted || "#64748b" }}>
                    Apagar todas as mensagens no seu aparelho
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.muted || "#94a3b8"} />
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirmação de Limpeza de Conversa */}
      <TriboAlertModal
        visible={clearChatConfirmVisible}
        type="danger"
        title="Limpar Conversa"
        message="Tem certeza de que deseja apagar todas as mensagens desta tribo no seu aparelho?"
        buttonText="Limpar"
        secondaryButtonText="Cancelar"
        onSecondaryPress={() => setClearChatConfirmVisible(false)}
        onClose={handleClearChatConfirmed}
      />

      {/* Alertas Customizados */}
      <TriboAlertModal
        visible={customAlert.visible}
        type={customAlert.type}
        title={customAlert.title}
        message={customAlert.message}
        buttonText={customAlert.primaryText}
        secondaryButtonText={customAlert.secondaryText}
        onSecondaryPress={() => {
          if (customAlert.onSecondaryPress) customAlert.onSecondaryPress();
          setCustomAlert((prev) => ({ ...prev, visible: false }));
        }}
        onClose={() => {
          if (customAlert.onPrimaryPress) customAlert.onPrimaryPress();
          setCustomAlert((prev) => ({ ...prev, visible: false }));
        }}
      />

      {/* Modal de Visualização / Edição da Foto do Grupo */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <Pressable
          style={styles.avatarModalOverlay}
          onPress={() => setAvatarModalVisible(false)}
        >
          <Pressable
            style={[
              styles.avatarModalCard,
              {
                backgroundColor: isDark ? "#18181b" : colors.card || "#ffffff",
                borderColor: colors.border || "#27272a"
              }
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.avatarModalHeader}>
              <Text
                style={{
                  fontFamily: "Poppins_700Bold",
                  fontSize: 16,
                  color: colors.text,
                  flex: 1
                }}
                numberOfLines={1}
              >
                Foto de {group?.name}
              </Text>
              <Pressable
                onPress={() => setAvatarModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt || "#27272a" }]}
              >
                <Feather name="x" size={18} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.avatarLargeContainer}>
              {group?.avatarUrl || group?.avatar_url ? (
                <Image
                  source={{ uri: group?.avatarUrl || group?.avatar_url }}
                  style={styles.avatarLargeImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarLargeImage, { backgroundColor: colors.primary || "#0284c7", alignItems: "center", justifyContent: "center" }]}>
                  <Text style={{ color: "#ffffff", fontSize: 48, fontFamily: "Poppins_700Bold" }}>
                    {(group?.name || "G")[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {isAdmin ? (
              <Pressable
                onPress={handleEditGroupAvatar}
                disabled={updatingAvatar}
                style={({ pressed }) => [
                  styles.editAvatarBtn,
                  {
                    backgroundColor: colors.primary || "#0284c7",
                    opacity: pressed || updatingAvatar ? 0.85 : 1
                  }
                ]}
              >
                {updatingAvatar ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Feather name="camera" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.editAvatarBtnText}>
                      Alterar Foto do Grupo
                    </Text>
                  </>
                )}
              </Pressable>
            ) : (
              <Text style={{ color: colors.muted || "#71717a", fontSize: 12, fontFamily: "Poppins_400Regular", textAlign: "center", marginTop: 12 }}>
                Apenas o administrador pode alterar a foto do grupo.
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* BottomSheet da Fila Compartilhada */}
      <GroupAudioQueueBottomSheet
        visible={queueVisible}
        onClose={() => setQueueVisible(false)}
        currentTrack={audioState.current_track}
        queueList={audioState.queue_list || []}
        isPlaying={audioState.is_playing}
        isGold={isGold}
        progressMs={localProgressMs}
        onPlay={play}
        onPause={pause}
        onSkip={skip}
        onRemoveTrack={removeFromQueue}
        onOpenAddModal={() => {
          setQueueVisible(false);
          setSelectTrackVisible(true);
        }}
      />

      {/* Modal Seletor de Músicas da Galeria */}
      <SelectTrackModal
        visible={selectTrackVisible}
        onClose={() => setSelectTrackVisible(false)}
        onSelectTrack={(track) => {
          addToQueue(track);
          setQueueVisible(true);
        }}
      />

      {/* Toast Notifier */}
      {Boolean(toastMessage) && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative"
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    width: "45%",
    height: 2.5,
    borderRadius: 2
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end"
  },
  menuSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    elevation: 10
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 14
  },
  menuIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center"
  },
  toastContainer: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "#1e1e24",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 25,
    gap: 9,
    elevation: 12,
    zIndex: 9999
  },
  toastText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5
  },
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  avatarModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    elevation: 12
  },
  avatarModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18
  },
  avatarLargeContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10
  },
  avatarLargeImage: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.15)"
  },
  editAvatarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 13,
    borderRadius: 16,
    elevation: 3
  },
  editAvatarBtnText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15
  }
});

