import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  FlatList,
  Pressable,
  Platform,
  Image,
  Switch,
  ActivityIndicator } from
"react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { api, getUploadUrl } from "../../api";
import { errorMessage, userName } from "../../lib/format";
import { useTheme } from "../../theme";
import { Avatar, Button, IconButton, Input } from "../../components/ui/ui";
import {
  clearChatHistory,
  exportChatHistory } from
"../../services/chatExportService";
import { CustomModal } from "../../components/modals/CustomModal";
import { BanReasonModal } from "../../components/chat/BanReasonModal";
import { ReportModal } from "../../components/modals/report-modal";
import { AppHeader } from "../../components/ui/ui";

export function GroupSettingsScreen({
  group: initialGroup,
  user,
  onBack,
  onInvite,
  onGroupDeleted,
  onLeft
}) {
  const insets = useSafeAreaInsets();
  const { colors, mode, isDark: themeIsDark } = useTheme();
  const isDark =
  themeIsDark ?? (
  mode === "dark" || mode === "oled" || colors.background !== "#f5f5f7");
  const [busy, setBusy] = useState(false);
  const [group, setGroup] = useState(initialGroup);
  const [membersList, setMembersList] = useState(() => {
    const initial = initialGroup?.members;
    if (!Array.isArray(initial)) return [];
    return initial.filter((m) => {
      const u = m?.user || m;
      const uid = u?.id || u?._id || m?.userId || m?.user_id;
      const uname = u?.name || u?.username || m?.name;
      return uid != null && String(uid) !== "undefined" && String(uid) !== "null" && uname !== "Tribo";
    });
  });
  const [name, setName] = useState(initialGroup?.name || "");
  const [rules, setRules] = useState(initialGroup?.rules || "");
  const [avatarUri, setAvatarUri] = useState(
    initialGroup?.avatarUrl ||
    initialGroup?.avatar_url ||
    initialGroup?.avatar ||
    null
  );
  const [newImage, setNewImage] = useState(null);
  const [isMuted, setIsMuted] = useState(
    Boolean(initialGroup?.is_muted || initialGroup?.isMuted)
  );


  const [promoteModalVisible, setPromoteModalVisible] = useState(false);
  const [leaveWarningVisible, setLeaveWarningVisible] = useState(false);
  const [isLastAdminWarning, setIsLastAdminWarning] = useState(false);
  const [bannedModalVisible, setBannedModalVisible] = useState(false);
  const [bannedList, setBannedList] = useState([]);
  const [loadingBanned, setLoadingBanned] = useState(false);
  const [banModal, setBanModal] = useState({
    visible: false,
    member: null
  });
  const [reportModalVisible, setReportModalVisible] = useState(false);
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

  useEffect(() => {
    if (!initialGroup?.id) return;
    let isActive = true;
    const fetchGroupData = async () => {
      try {
        const [resGroup, resMembers, resNotif] = await Promise.all([
        api.groups.get(initialGroup.id),
        api.groups.members(initialGroup.id).catch(() => ({ members: [] })),
        api.groups.
        getNotificationSettings(initialGroup.id).
        catch(() => ({ muted: false }))]
        );

        if (isActive) {
          const fetchedGroup = resGroup.group || resGroup.data || resGroup;
          setGroup(fetchedGroup);
          if (fetchedGroup?.name) setName(fetchedGroup.name);
          if (fetchedGroup?.rules !== undefined)
          setRules(fetchedGroup.rules || "");
          const img =
          fetchedGroup?.avatarUrl ||
          fetchedGroup?.avatar_url ||
          fetchedGroup?.avatar;
          if (img) setAvatarUri(img);

          if (resNotif?.muted !== undefined) {
            setIsMuted(Boolean(resNotif.muted));
          } else if (fetchedGroup?.is_muted !== undefined) {
            setIsMuted(Boolean(fetchedGroup.is_muted));
          }

          let fetchedMembers =
          resMembers.members || resMembers.data || resMembers || [];
          if (!Array.isArray(fetchedMembers)) fetchedMembers = [];
          const validMembers = fetchedMembers.filter((m) => {
            const u = m?.user || m;
            const uid = u?.id || u?._id || m?.userId || m?.user_id;
            const uname = u?.name || u?.username || m?.name;
            return uid != null && String(uid) !== "undefined" && String(uid) !== "null" && uname !== "Tribo";
          });
          setMembersList(validMembers);
        }
      } catch (error) {
        console.warn("Error refreshing group data", error);
      }
    };
    fetchGroupData();
    return () => {
      isActive = false;
    };
  }, [initialGroup?.id]);

  const isCreator = Boolean(
    (group?.created_by && String(group.created_by) === String(user?.id)) ||
    (group?.createdBy && String(group.createdBy) === String(user?.id)) ||
    (group?.creator_id && String(group.creator_id) === String(user?.id)) ||
    (group?.creatorId && String(group.creatorId) === String(user?.id)) ||
    (group?.owner_id && String(group.owner_id) === String(user?.id)) ||
    (group?.ownerId && String(group.ownerId) === String(user?.id)) ||
    (group?.admin_id && String(group.admin_id) === String(user?.id)) ||
    (group?.adminId && String(group.adminId) === String(user?.id)) ||
    (initialGroup?.created_by && String(initialGroup.created_by) === String(user?.id)) ||
    (initialGroup?.createdBy && String(initialGroup.createdBy) === String(user?.id)) ||
    (initialGroup?.creator_id && String(initialGroup.creator_id) === String(user?.id)) ||
    (initialGroup?.creatorId && String(initialGroup.creatorId) === String(user?.id)) ||
    (initialGroup?.owner_id && String(initialGroup.owner_id) === String(user?.id)) ||
    (initialGroup?.ownerId && String(initialGroup.ownerId) === String(user?.id))
  );

  const isAdmin = isCreator;

  const pickImage = async () => {
    try {
      const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert({
          title: "Permissão Necessária",
          message:
          "Permita o acesso à galeria de fotos para alterar a imagem da tribo.",
          type: "warning"
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewImage(result.assets[0]);
        setAvatarUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Erro ao selecionar foto da tribo", err);
      showAlert({
        title: "Erro na Imagem",
        message: "Não foi possível selecionar a imagem.",
        type: "error"
      });
    }
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      showAlert({
        title: "Aviso",
        message: "Por favor, digite o nome da tribo.",
        type: "warning"
      });
      return;
    }
    try {
      setBusy(true);
      let updatedAvatarUrl =
      group?.avatarUrl || group?.avatar_url || group?.avatar || null;

      if (newImage) {
        const uploadRes = await api.uploads.photo(
          newImage.uri,
          newImage.fileName || newImage.name || "group_avatar.jpg",
          newImage.mimeType || newImage.type || "image/jpeg"
        );
        const uploaded =
        getUploadUrl(uploadRes) ||
        uploadRes?.url ||
        uploadRes?.fileUrl ||
        uploadRes?.avatar_url ||
        uploadRes?.mediaUrl;
        if (uploaded) {
          updatedAvatarUrl = uploaded;
        }
      }

      const payload = {
        name: name.trim(),
        rules: rules.trim(),
        avatarUrl: updatedAvatarUrl,
        avatar_url: updatedAvatarUrl,
        avatar: updatedAvatarUrl
      };

      const res = await api.groups.update(group.id, payload);
      const updatedGroup = res?.group ||
      res?.data ||
      res || { ...group, ...payload };
      setGroup((prev) => ({ ...prev, ...updatedGroup, ...payload }));
      setNewImage(null);
      showAlert({
        title: "Sucesso",
        message: "Tribo atualizada com sucesso!",
        type: "success"
      });
    } catch (error) {
      showAlert({
        title: "Erro ao Atualizar",
        message: errorMessage(error),
        type: "error"
      });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleMute = async (value) => {
    try {
      setIsMuted(value);
      const res = await api.groups.toggleMute(group.id, value);
      if (res?.muted !== undefined) {
        setIsMuted(Boolean(res.muted));
      }
    } catch (err) {
      setIsMuted(!value);
      showAlert({
        title: "Erro",
        message: errorMessage(err),
        type: "error"
      });
    }
  };

  const handleBanMember = (memberUser) => {
    setBanModal({
      visible: true,
      member: memberUser
    });
  };

  const handleConfirmBanMember = async (memberUser, reason) => {
    const memberId = memberUser?.id || memberUser?._id || memberUser?.userId;
    try {
      setBusy(true);
      await api.groups.banMember(group.id, memberId, reason);


      setMembersList((prev) =>
      prev.filter((m) => {
        const mId = (m.user || m)?.id || (m.user || m)?._id || m?.userId;
        return String(mId) !== String(memberId);
      })
      );


      setBannedList((prev) => [
      { ...memberUser, id: memberId, reason, ban_reason: reason },
      ...prev.filter(
        (u) => String(u.id || u._id || u.userId) !== String(memberId)
      )]
      );

      setBanModal({ visible: false, member: null });
      showAlert({
        title: "Membro Banido",
        message: `${userName(memberUser)} foi banido da tribo com sucesso.`,
        type: "success"
      });
    } catch (err) {
      showAlert({
        title: "Erro ao Banir",
        message: errorMessage(err),
        type: "error"
      });
    } finally {
      setBusy(false);
    }
  };

  const openBannedModal = async () => {
    try {
      setLoadingBanned(true);
      setBannedModalVisible(true);
      const res = await api.groups.listBanned(group.id);
      const list = res.banned || res.data || [];
      setBannedList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("Erro ao buscar banidos", err);
      setBannedList([]);
    } finally {
      setLoadingBanned(false);
    }
  };

  const handleUnbanMember = (bannedUser) => {
    const userId = bannedUser?.id || bannedUser?._id || bannedUser?.userId;
    const uHandle = bannedUser?.username ?
    `@${bannedUser.username}` :
    userName(bannedUser);
    showAlert({
      title: "Desbanir Membro",
      message: `Tem certeza que deseja desbanir ${uHandle}? Ele poderá voltar a interagir ou ser readicionado ao grupo.`,
      type: "info",
      primaryText: "Desbanir",
      secondaryText: "Cancelar",
      onPrimaryPress: async () => {
        try {
          setBusy(true);
          await api.groups.unbanMember(group.id, userId);
          setBannedList((prev) =>
          prev.filter(
            (u) => String(u.id || u._id || u.userId) !== String(userId)
          )
          );
          showAlert({
            title: "Sucesso",
            message: "Membro desbanido com sucesso!",
            type: "success"
          });
        } catch (err) {
          showAlert({
            title: "Erro ao Desbanir",
            message: errorMessage(err),
            type: "error"
          });
        } finally {
          setBusy(false);
        }
      }
    });
  };

  const confirmLeave = async (newAdminId = null) => {
    try {
      setBusy(true);
      setPromoteModalVisible(false);
      await api.groups.leave(group.id, newAdminId);
      showAlert({
        title: "Sucesso",
        message: newAdminId ?
        "Você saiu e passou a liderança adiante." :
        "Você saiu da tribo.",
        type: "success",
        onPrimaryPress: () => onLeft()
      });
    } catch (error) {
      showAlert({
        title: "Erro ao Sair",
        message: errorMessage(error),
        type: "error"
      });
      setBusy(false);
    }
  };

  const handleLeave = () => {
    try {
      const adminCount = membersList.filter(
        (m) =>
        m?.role === "admin" ||
        m?.role === "owner" ||
        (m?.user || m)?.id === group?.ownerId
      ).length;
      const otherMembers = membersList.filter((m) => {
        const mId = (m?.user || m)?.id || m?._id || m?.userId;
        return mId !== user?.id;
      });

      if (isAdmin && adminCount <= 1) {
        if (otherMembers.length > 0) {
          setPromoteModalVisible(true);
        } else {
          setIsLastAdminWarning(true);
          setLeaveWarningVisible(true);
        }
      } else {
        setIsLastAdminWarning(false);
        setLeaveWarningVisible(true);
      }
    } catch (error) {
      console.warn(error);
      showAlert({
        title: "Erro ao Sair",
        message: "Não foi possível processar a saída do grupo.",
        type: "error"
      });
    }
  };

  const handleExportChat = async () => {
    try {
      setBusy(true);
      const res = await api.groups.getChat(group.id);
      const raw = Array.isArray(res) ?
      res :
      res?.messages || res?.data?.messages || res?.data || [];
      await exportChatHistory({
        groupName: group.name,
        messages: raw,
        onAlert: showAlert
      });
    } catch (e) {
      showAlert({
        title: "Erro na Exportação",
        message: "Não foi possível exportar a conversa.",
        type: "error"
      });
    } finally {
      setBusy(false);
    }
  };

  const handleClearChat = () => {
    showAlert({
      title: "Limpar conversa",
      message:
      "Tem certeza que deseja limpar as mensagens deste grupo? As mensagens serão removidas do seu histórico visual.",
      type: "delete",
      primaryText: "Limpar Conversa",
      secondaryText: "Cancelar",
      onPrimaryPress: async () => {
        await clearChatHistory(group.id);
        showAlert({
          title: "Conversa Limpa",
          message: "O histórico deste grupo foi limpo com sucesso!",
          type: "success"
        });
      }
    });
  };

  const handleReport = () => {
    setReportModalVisible(true);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Configurações"
        onBack={onBack}
        onBack={onBack} />
      

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        
        {}
        <View style={styles.imageSection}>
          <Pressable
            onPress={isAdmin ? pickImage : undefined}
            style={({ pressed }) => [
            styles.imageWrapper,
            {
              backgroundColor: colors.surface,
              borderColor: colors.line,
              opacity: pressed && isAdmin ? 0.8 : 1
            }]
            }>
            
            {avatarUri ?
            <Image source={{ uri: avatarUri }} style={styles.imagePreview} /> :

            <View style={styles.imagePlaceholder}>
                <Feather
                name={isAdmin ? "camera" : "users"}
                size={36}
                color={colors.muted} />
              
              </View>
            }

            {isAdmin &&
            <View
              style={[
              styles.cameraBadge,
              { backgroundColor: colors.primary || "#3b82f6" }]
              }>
              
                <Feather name="camera" size={16} color="#FFFFFF" />
              </View>
            }
          </Pressable>

          {isAdmin &&
          <Pressable onPress={pickImage} style={styles.changePhotoBtn}>
              <Text
              style={[
              styles.changePhotoText,
              { color: colors.primary || "#3b82f6" }]
              }>
              
                {avatarUri ?
              "Alterar foto da tribo" :
              "Adicionar foto da tribo"}
              </Text>
            </Pressable>
          }
        </View>

        {}
        <View
          style={[
          styles.cardSection,
          { backgroundColor: colors.surface, borderColor: colors.line }]
          }>
          
          <View style={styles.cardSectionLeft}>
            <View
              style={[
              styles.iconCircle,
              {
                backgroundColor: isMuted ?
                (colors.danger || "#ef4444") + "18" :
                (colors.primary || "#3b82f6") + "18"
              }]
              }>
              
              <Feather
                name={isMuted ? "bell-off" : "bell"}
                size={18}
                color={
                isMuted ?
                colors.danger || "#ef4444" :
                colors.primary || "#3b82f6"
                } />
              
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Silenciar Notificações
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                {isMuted ?
                "Notificações silenciadas para esta tribo" :
                "Receber notificações de mensagens e posts"}
              </Text>
            </View>
          </View>
          <Switch
            value={isMuted}
            onValueChange={handleToggleMute}
            trackColor={{
              false: colors.line,
              true: colors.primary || "#3b82f6"
            }}
            thumbColor="#FFFFFF" />
          
        </View>

        {isAdmin ?
        <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Editar Informações
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Nome da Tribo
              </Text>
              <Input
              placeholder="Ex: Vigília"
              value={name}
              onChangeText={setName}
              maxLength={50} />
            
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Regras da Tribo
              </Text>
              <Input
              placeholder="Escreva as regras e diretrizes para os membros..."
              value={rules}
              onChangeText={setRules}
              multiline
              numberOfLines={4}
              maxLength={500}
              style={styles.rulesInput} />
            
            </View>

            <View style={{ height: 8 }} />
            <Button
            title="Salvar Alterações"
            onPress={handleUpdate}
            loading={busy}
            variant="primary" />
          

            <View style={{ height: 24 }} />
            <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8
            }}>
            
              <Text
              style={[
              styles.sectionTitle,
              { color: colors.text, marginBottom: 0 }]
              }>
              
                Membros ({membersList.length})
              </Text>
              {isCreator && (
                <Pressable
                  onPress={openBannedModal}
                  style={[
                    styles.bannedLinkBtn,
                    {
                      backgroundColor: isDark ?
                      "rgba(239, 68, 68, 0.12)" :
                      "#fee2e2",
                      borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "#fca5a5",
                      borderWidth: 1,
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6
                    }
                  ]}>
                  <Feather name="shield" size={13} color="#ef4444" />
                  <Text
                    style={[
                      styles.bannedLinkText,
                      { color: "#ef4444", fontSize: 12.5 }
                    ]}>
                    Membros Banidos ({bannedList.length})
                  </Text>
                </Pressable>
              )}
            </View>

            <View style={{ marginBottom: 16 }}>
              {membersList
                .filter((m) => {
                  const memberUser = m?.user || m;
                  const memberId = memberUser?.id || memberUser?._id || m?.userId || m?.user_id;
                  return memberId != null && String(memberId) !== "undefined" && String(memberId) !== "null";
                })
                .map((m) => {
                  const memberUser = m.user || m;
                  const memberId = memberUser.id || memberUser._id || m.userId || m.user_id;
                  const role = (m.role || "").toLowerCase();
                  const isMemberAdm =
                    role === "admin" ||
                    role === "owner" ||
                    role === "criador" ||
                    role === "creator" ||
                    role === "administrador" ||
                    String(memberId) === String(group?.ownerId || group?.owner_id || group?.adminId || group?.admin_id || group?.creatorId || group?.creator_id);

                  const isSelf = String(memberId) === String(user?.id);

                  return (
                    <View key={String(memberId)} style={styles.memberRow}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          flex: 1
                        }}>
                        <Avatar user={memberUser} size={40} />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 15,
                              fontFamily: "Poppins_600SemiBold",
                              color: colors.text
                            }}
                            numberOfLines={1}>
                            {userName(memberUser)} {isSelf ? "(Você)" : ""}
                          </Text>
                          {isMemberAdm && (
                            <Text
                              style={{
                                fontSize: 12,
                                fontFamily: "Poppins_400Regular",
                                color: colors.primary || "#3b82f6"
                              }}>
                              Administrador
                            </Text>
                          )}
                        </View>
                      </View>

                      {isAdmin && !isMemberAdm && !isSelf && (
                        <Pressable
                          onPress={() => handleBanMember(memberUser)}
                          style={[
                            styles.banBtn,
                            {
                              backgroundColor:
                                (colors.danger || "#ef4444") + "15"
                            }
                          ]}>
                          <Feather
                            name="slash"
                            size={14}
                            color={colors.danger || "#ef4444"}
                          />
                          <Text
                            style={[
                              styles.banBtnText,
                              { color: colors.danger || "#ef4444" }
                            ]}>
                            Banir
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
            </View>

            <Button
            title="Convidar Membros"
            onPress={onInvite}
            variant="secondary" />
          

            <View style={{ height: 16 }} />
            <Button
            title="Sair da Tribo"
            onPress={handleLeave}
            loading={busy}
            variant="secondary" />
          
          </> :

        <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Informações da Tribo
            </Text>

            <View
            style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.line }]
            }>
            
              <View style={styles.infoRowColumn}>
                <Text
                style={[
                styles.infoLabel,
                { color: colors.muted, marginBottom: 4 }]
                }>
                
                  Nome
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {group?.name}
                </Text>
              </View>

              <View
              style={[styles.infoDivider, { backgroundColor: colors.line }]} />
            

              <View style={styles.infoRowColumn}>
                <Text
                style={[
                styles.infoLabel,
                { color: colors.muted, marginBottom: 4 }]
                }>
                
                  Regras
                </Text>
                <Text
                style={[
                styles.infoValue,
                { color: colors.text, lineHeight: 22 }]
                }>
                
                  {group?.rules || "Nenhuma regra definida para esta tribo."}
                </Text>
              </View>
            </View>

            <View style={{ height: 24 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Membros ({membersList.length})
            </Text>
            <View style={{ marginBottom: 16 }}>
              {membersList
                .filter((m) => {
                  const memberUser = m?.user || m;
                  const memberId = memberUser?.id || memberUser?._id || m?.userId || m?.user_id;
                  return memberId != null && String(memberId) !== "undefined" && String(memberId) !== "null";
                })
                .map((m) => {
                  const memberUser = m.user || m;
                  const memberId = memberUser.id || memberUser._id || m.userId || m.user_id;
                  const role = (m.role || "").toLowerCase();
                  const isMemberAdm =
                    role === "admin" ||
                    role === "owner" ||
                    role === "criador" ||
                    role === "creator" ||
                    role === "administrador" ||
                    String(memberId) === String(group?.ownerId || group?.owner_id || group?.adminId || group?.admin_id || group?.creatorId || group?.creator_id);

                  const isSelf = String(memberId) === String(user?.id);

                  return (
                    <View key={String(memberId)} style={styles.memberRow}>
                      <Avatar user={memberUser} size={40} />
                      <View style={{ marginLeft: 12 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontFamily: "Poppins_600SemiBold",
                            color: colors.text
                          }}>
                          {userName(memberUser)} {isSelf ? "(Você)" : ""}
                        </Text>
                        {isMemberAdm && (
                          <Text
                            style={{
                              fontSize: 12,
                              fontFamily: "Poppins_400Regular",
                              color: colors.primary || "#3b82f6"
                            }}>
                            Administrador
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
            </View>

            <View style={{ height: 24 }} />
            <Button
            title="Exportar Conversa"
            onPress={handleExportChat}
            loading={busy}
            variant="outline" />
          
            <View style={{ height: 12 }} />
            <Button
            title="Limpar Conversa"
            onPress={handleClearChat}
            loading={busy}
            variant="outline" />
          
            <View style={{ height: 12 }} />
            <Button
            title="Sair da Tribo"
            onPress={handleLeave}
            loading={busy}
            variant="secondary" />
          
            <View style={{ height: 12 }} />
            <Button
            title="Denunciar Tribo"
            onPress={handleReport}
            loading={busy}
            variant="destructive" />
          
          </>
        }
      </ScrollView>

      {}
      <Modal
        visible={bannedModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBannedModalVisible(false)}>
        
        <View style={styles.modalOverlay}>
          <View
            style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom + 16, 28)
            }]
            }>
            
            <View style={styles.modalHeaderRow}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                
                <Text
                  style={[
                  styles.modalTitle,
                  { color: colors.text, marginBottom: 0 }]
                  }>
                  
                  Membros Banidos ({bannedList.length})
                </Text>
              </View>
              <Pressable
                onPress={() => setBannedModalVisible(false)}
                hitSlop={12}>
                
                <Feather name="x" size={20} color={colors.text} />
              </Pressable>
            </View>

            <Text
              style={[
              styles.modalDesc,
              { color: colors.muted, marginBottom: 16 }]
              }>
              
              Usuários banidos não podem enviar mensagens nesta tribo.
            </Text>

            {loadingBanned ?
            <ActivityIndicator
              size="small"
              color={colors.primary || "#3b82f6"}
              style={{ marginVertical: 32 }} /> :

            bannedList.length === 0 ?
            <View style={styles.emptyBannedContainer}>
                <Feather name="user-check" size={36} color={colors.muted} />
                <Text style={[styles.emptyBannedText, { color: colors.muted }]}>
                  Nenhum membro banido nesta tribo.
                </Text>
              </View> :

            <FlatList
              data={bannedList}
              keyExtractor={(item) => String(item.id || item._id)}
              style={{ maxHeight: 300, marginBottom: 16 }}
              renderItem={({ item }) => {
                const banReason =
                item.reason || item.ban_reason || item.banReason;
                return (
                  <View
                    style={[
                    styles.candidateRow,
                    {
                      borderColor: colors.line,
                      justifyContent: "space-between"
                    }]
                    }>
                    
                      <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                        marginRight: 8
                      }}>
                      
                        <Avatar user={item} size={40} />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text
                          style={[
                          styles.candidateName,
                          { color: colors.text, marginLeft: 0 }]
                          }
                          numberOfLines={1}>
                          
                            {userName(item)}
                          </Text>
                          {item.username &&
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.muted
                          }}>
                          
                              @{item.username}
                            </Text>
                        }
                          {Boolean(banReason) &&
                        <View
                          style={{
                            alignSelf: "flex-start",
                            backgroundColor: "rgba(239, 68, 68, 0.12)",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                            marginTop: 4
                          }}>
                          
                              <Text
                            style={{
                              fontSize: 11,
                              fontFamily: "Poppins_500Medium",
                              color: "#ef4444"
                            }}
                            numberOfLines={1}>
                            
                                Motivo: {banReason}
                              </Text>
                            </View>
                        }
                        </View>
                      </View>

                      <Pressable
                      onPress={() => handleUnbanMember(item)}
                      style={({ pressed }) => [
                      styles.unbanBtn,
                      {
                        backgroundColor: colors.primary || "#3b82f6",
                        borderColor: colors.primary || "#3b82f6",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        opacity: pressed || busy ? 0.8 : 1
                      }]
                      }
                      disabled={busy}>
                      
                        <Feather name="user-check" size={13} color="#ffffff" />
                        <Text
                        style={[styles.unbanBtnText, { color: "#ffffff" }]}>
                        
                          Desbanir
                        </Text>
                      </Pressable>
                    </View>);

              }} />

            }

            <Button
              title="Fechar"
              variant="secondary"
              onPress={() => setBannedModalVisible(false)} />
            
          </View>
        </View>
      </Modal>

      {}
      <Modal
        visible={promoteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPromoteModalVisible(false)}>
        
        <View style={styles.modalOverlay}>
          <View
            style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom + 16, 28)
            }]
            }>
            
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nomear Administrador
            </Text>
            <Text style={[styles.modalDesc, { color: colors.muted }]}>
              Você é o último administrador. Escolha quem assumirá seu lugar, ou
              saia sem nomear ninguém (a tribo será apagada).
            </Text>

            <FlatList
              data={membersList.filter((m) => {
                const mId = (m.user || m).id || m._id || m.userId;
                return mId !== user?.id;
              })}
              keyExtractor={(item) =>
              String((item.user || item).id || item._id || item.userId)
              }
              style={{ maxHeight: 250, marginVertical: 16 }}
              renderItem={({ item }) => {
                const memberUser = item.user || item;
                const memberId = memberUser.id || memberUser._id || item.userId;
                return (
                  <Pressable
                    style={[styles.candidateRow, { borderColor: colors.line }]}
                    onPress={() => {
                      showAlert({
                        title: "Confirmar Liderança",
                        message: `Passar liderança para ${userName(memberUser)} e sair?`,
                        primaryText: "Sim, Confirmar",
                        secondaryText: "Cancelar",
                        onPrimaryPress: () => confirmLeave(memberId)
                      });
                    }}>
                    
                    <Avatar user={memberUser} size={40} />
                    <Text
                      style={[styles.candidateName, { color: colors.text }]}>
                      
                      {userName(memberUser)}
                    </Text>
                  </Pressable>);

              }} />
            

            <Button
              title="Sair e Apagar Tribo"
              variant="destructive"
              onPress={() => {
                setIsLastAdminWarning(true);
                setPromoteModalVisible(false);
                setLeaveWarningVisible(true);
              }}
              loading={busy} />
            
            <View style={{ height: 8 }} />
            <Button
              title="Cancelar"
              variant="secondary"
              onPress={() => setPromoteModalVisible(false)}
              disabled={busy} />
            
          </View>
        </View>
      </Modal>

      {}
      <Modal
        visible={leaveWarningVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLeaveWarningVisible(false)}>
        
        <View style={styles.modalOverlay}>
          <View
            style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom + 16, 28)
            }]
            }>
            
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isLastAdminWarning ? "Apagar Tribo" : "Sair da Tribo"}
            </Text>
            <Text
              style={[
              styles.modalDesc,
              { color: colors.muted, marginBottom: 24, lineHeight: 22 }]
              }>
              
              {isLastAdminWarning ?
              "Sair sem nomear ninguém irá apagar a tribo permanentemente. Todos os dados e publicações serão perdidos. Deseja continuar?" :
              "Tem certeza de que deseja sair desta tribo? Você precisará receber um convite novamente para voltar."}
            </Text>

            <Button
              title={
              isLastAdminWarning ? "Sim, apagar tribo" : "Sim, quero sair"
              }
              variant="destructive"
              onPress={() => {
                setLeaveWarningVisible(false);
                confirmLeave(null);
              }}
              loading={busy} />
            
            <View style={{ height: 12 }} />
            <Button
              title="Cancelar"
              variant="secondary"
              onPress={() => setLeaveWarningVisible(false)}
              disabled={busy} />
            
          </View>
        </View>
      </Modal>

      {isCreator && (
        <BanReasonModal
          visible={banModal.visible}
          member={banModal.member}
          loading={busy}
          onClose={() => setBanModal({ visible: false, member: null })}
          onConfirmBan={handleConfirmBanMember}
        />
      )}
      

      {}
      <ReportModal
        visible={reportModalVisible}
        targetType="GROUP"
        targetId={group?.id}
        authorId={group?.ownerId || group?.owner_id}
        targetName={`Tribo "${group?.name}"`}
        onClose={() => setReportModalVisible(false)}
        onSuccess={() => {
          showAlert({
            title: "Denúncia Enviada",
            message:
            "Agradecemos por manter a comunidade segura. Sua denúncia foi registrada para moderação.",
            type: "success"
          });
        }} />
      

      {}
      <CustomModal
        visible={customAlert.visible}
        type={customAlert.type}
        title={customAlert.title}
        message={customAlert.message}
        primaryText={customAlert.primaryText}
        onPrimaryPress={() => {
          if (customAlert.onPrimaryPress) customAlert.onPrimaryPress();
          setCustomAlert((prev) => ({ ...prev, visible: false }));
        }}
        secondaryText={customAlert.secondaryText}
        onSecondaryPress={() => {
          if (customAlert.onSecondaryPress) customAlert.onSecondaryPress();
          setCustomAlert((prev) => ({ ...prev, visible: false }));
        }}
        onClose={() => setCustomAlert((prev) => ({ ...prev, visible: false }))} />
      
    </View>);

}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 14
  },
  imageSection: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12
  },
  imageWrapper: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 52
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center"
  },
  cameraBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  changePhotoBtn: {
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 12
  },
  changePhotoText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold"
  },
  cardSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginVertical: 4
  },
  cardSectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold"
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    marginTop: 1
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    marginTop: 4,
    marginBottom: 4
  },
  fieldGroup: {
    gap: 6
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    marginLeft: 2
  },
  rulesInput: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  bannedLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8
  },
  bannedLinkText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold"
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  banBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  },
  banBtnText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold"
  },
  unbanBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1
  },
  unbanBtnText: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold"
  },
  emptyBannedContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8
  },
  emptyBannedText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular"
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 4
  },
  infoRowColumn: {
    flexDirection: "column",
    alignItems: "flex-start"
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  infoValue: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular"
  },
  infoDivider: {
    height: 1,
    marginVertical: 12
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 300
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    marginBottom: 8
  },
  modalDesc: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular"
  },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  candidateName: {
    marginLeft: 12,
    fontSize: 15,
    fontFamily: "Poppins_500Medium"
  }
});