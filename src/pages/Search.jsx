import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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
  TextInput } from
"react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { SecuritySettingsModal } from "../components/modals/SecuritySettingsModal";
import { api, getUploadUrl } from "../api";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  Input,
  VerificationBadge } from
"../components/ui/ui";
import { ReportModal } from "../components/modals/report-modal";
import { FollowersModal } from "../components/modals/followers-modal";
import { FollowRequestsModal } from "../components/modals/follow-requests-modal";
import { ProfileDrawer } from "../components/profile/profile-drawer";
import { TriboAlertModal } from "../components/modals/tribo-alert-modal";
import { AppLayout } from "../components/layout/AppLayout";
import { AppHeader } from "../components/ui/ui";
import {
  errorMessage,
  getUserAvatar,
  listFrom,
  normalizeUser,
  unwrap,
  userName } from
"../lib/format";
import { useTheme } from "../theme";
import { useUserContext } from "../context/user-context";
import { PostCard } from "../components/feed/PostCard";
import {
  downloadApkInternally,
  installApk,
  openUnknownSourcesSettings,
  canRequestPackageInstalls,
  checkCodePushUpdate
} from "../services/appUpdater";

function belongsToUser(post, id) {
  if (!post || !id) return false;
  return (
    String(post.userId) === String(id) ||
    String(post.authorId) === String(id) ||
    String(post.user?.id) === String(id) ||
    String(post.author?.id) === String(id));

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
      encoding: FileSystem.EncodingType?.UTF8 || "utf8"
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Baixar Meus Dados da Tribo",
        UTI: "public.json"
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
            onReport(user);
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

export function SearchScreen({ onOpenProfile, user }) {
  const { colors } = useTheme();
  const [alertConfig, setAlertConfig] = useState({ visible: false });
  const [items, setItems] = useState([]);
  const [trends, setTrends] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [optionsUser, setOptionsUser] = useState(null);
  const [reportModal, setReportModal] = useState({
    visible: false,
    targetType: "USER",
    targetId: null,
    authorId: null,
    targetName: ""
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, trendsRes] = await Promise.all([
      api.users.list().catch(() => ({ users: [] })),
      api.trends.getTrends().catch(() => ({ trends: [] }))]
      );
      setItems(listFrom(usersRes, ["users"]));
      if (trendsRes?.trends) {
        setTrends(trendsRes.trends);
      }
    } catch (error) {
      setAlertConfig({ visible: true, type: "error", title: "Busca indisponível", message: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currentUserId = user?.id || user?.sub;

  const filtered = items.filter((item) => {

    if (currentUserId && String(item.id) === String(currentUserId)) return false;


    const handle = String(item?.username || "").toLowerCase();
    const name = String(userName(item) || "").toLowerCase();
    if (
    handle.startsWith("user_a_") ||
    handle.startsWith("user_b_") ||
    handle.startsWith("tester_") ||
    name.startsWith("user a ") ||
    name.startsWith("user b ") ||
    name.startsWith("tester "))
    {
      return false;
    }

    if (!query.trim()) return true;
    return [userName(item), item.username].
    join(" ").
    toLowerCase().
    includes(query.toLowerCase());
  });

  const block = (user) => {
    const handle = user?.username || userName(user);
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
            await api.users.block(user.id);
            setItems((prev) => prev.filter((u) => String(u.id) !== String(user.id)));
            Alert.alert("Usuário bloqueado", `@${handle} foi bloqueado com sucesso.`);
          } catch (error) {
            setAlertConfig({ visible: true, type: "error", title: "Não foi possível bloquear", message: errorMessage(error) });
          }
        }
      }]

    );
  };

  const handleReport = (user) => {
    const handle = user?.username || userName(user);
    setReportModal({
      visible: true,
      targetType: "USER",
      targetId: user.id,
      authorId: user.id,
      targetName: `@${handle}`
    });
  };

  const handleReportSuccess = ({ authorId, targetId }) => {
    const idToRemove = authorId || targetId;
    if (idToRemove) {
      setItems((prev) => prev.filter((u) => String(u.id) !== String(idToRemove)));
    }
  };

  const renderTrends = () => {
    if (query.trim() !== "" || trends.length === 0) return null;
    return (
      <View style={styles.trendsContainer}>
        <Text style={[styles.trendsHeaderTitle, { color: colors.text }]}>Trend Topics</Text>
        {trends.map((trend, index) =>
        <Pressable
          key={trend.id || index}
          style={({ pressed }) => [
          styles.trendItem,
          { opacity: pressed ? 0.6 : 1, borderBottomColor: colors.border }]
          }
          onPress={() => {
            if (trend.link) Linking.openURL(trend.link).catch(() => {});
          }}>
          
            <View style={styles.trendHeader}>
              <Text style={[styles.trendRank, { color: colors.subtext }]}>
                {index + 1} • {trend.source || "G1"}
              </Text>
            </View>
            <Text style={[styles.trendTitle, { color: colors.text }]}>
              {trend.title}
            </Text>
          </Pressable>
        )}
      </View>);

  };

  return (
    <AppLayout
      tagText="★ Tribo"
      title="Encontre sua gente"
      description="Pessoas e ideias que podem virar conversa.">
      
      <View style={styles.searchTop}>
        <View
          style={[
          styles.searchField,
          { backgroundColor: colors.surfaceAlt || colors.card, borderColor: colors.border }]
          }>
          
          <Feather name="search" size={19} color={colors.subtext} />
          <Input
            placeholder="Buscar pessoas"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput} />
          
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(item.id || index)}
        contentContainerStyle={styles.results}
        refreshing={loading}
        onRefresh={load}
        ListHeaderComponent={renderTrends}
        renderItem={({ item }) =>
        <View
          style={[
          styles.personRow,
          { backgroundColor: colors.surface || colors.card, borderColor: colors.border }]
          }>
          
            <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir perfil de ${userName(item)}`}
            onPress={() => onOpenProfile(item)}
            style={styles.personTrigger}>
            
              <Avatar user={item} />
              <View style={styles.flex}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text selectable style={[styles.personName, { color: colors.text }]}>
                    {userName(item)}
                  </Text>
                  <VerificationBadge user={item} size={14} />
                </View>
                <Text selectable style={[styles.personHandle, { color: colors.subtext }]}>
                  @{item.username || "tribo"}
                </Text>
                {!!item.bio &&
              <Text numberOfLines={1} style={[styles.personBio, { color: colors.subtext }]}>
                    {item.bio}
                  </Text>
              }
              </View>
            </Pressable>
            <IconButton
            name="more-horizontal"
            small
            label="Ações do perfil"
            onPress={() => setOptionsUser(item)} />
          
          </View>
        }
        ListEmptyComponent={
        !loading &&
        <EmptyState icon="search">Nenhum usuário encontrado.</EmptyState>

        } />
      
      <SearchUserOptionsModal
        user={optionsUser}
        visible={Boolean(optionsUser)}
        onClose={() => setOptionsUser(null)}
        onBlock={block}
        onReport={handleReport} />
      
      <ReportModal
        visible={reportModal.visible}
        targetType={reportModal.targetType}
        targetId={reportModal.targetId}
        authorId={reportModal.authorId}
        targetName={reportModal.targetName}
        onClose={() => setReportModal((prev) => ({ ...prev, visible: false }))}
        onSuccess={handleReportSuccess} />
      
      <SecuritySettingsModal
          visible={securityModalVisible}
          onClose={() => setSecurityModalVisible(false)}
        />

        <TriboAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttonText={alertConfig.buttonText || "Fechar"}
        onClose={() => setAlertConfig({ visible: false })} />
      
    </AppLayout>);

}

export function EditProfile({ user, visible, onClose, onSaved, onUpdateUser }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [alertConfig, setAlertConfig] = useState({ visible: false });
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    const avatar = getUserAvatar(user) || "";
    setForm({
      name: user?.name || user?.firstName || "",
      lastName: user?.lastName || "",
      username: user?.username || "",
      bio: user?.bio || "",
      avatarUrl: avatar,
      avatar_url: avatar
    });
  }, [user, visible]);

  const pickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setAlertConfig({ visible: true, type: "info", title: "Permissão necessária", message: "Conceda acesso à galeria para escolher a foto de perfil." });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1]
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.fileName || asset.uri.split("/").pop() || "avatar.jpg";
        const mimeType = asset.mimeType || asset.type || "image/jpeg";


        setForm((f) => ({ ...f, avatarUrl: asset.uri, avatar_url: asset.uri }));
        setUploadingAvatar(true);


        const upload = await api.uploads.photo(asset.uri, filename, mimeType);
        const url =
        getUploadUrl(upload) ||
        upload?.avatar_url ||
        upload?.avatarUrl ||
        upload?.url ||
        upload?.user?.avatar_url ||
        upload?.user?.avatarUrl ||
        upload?.user?.avatar ||
        null;

        setForm((f) => ({ ...f, avatarUrl: url, avatar_url: url }));


        await api.users.update(user.id, { avatar_url: url });


        if (upload?.user) {
          onUpdateUser?.(normalizeUser(upload.user));
        } else if (url) {
          onUpdateUser?.((prev) => normalizeUser({ ...(prev || user), avatarUrl: url, avatar_url: url }));
        }


        if (onSaved) {
          await onSaved();
        }

        setAlertConfig({ visible: true, type: "info", title: "Foto enviada!", message: "Sua foto de perfil foi atualizada com sucesso." });
      }
    } catch (e) {
      setAlertConfig({ visible: true, type: "error", title: "Erro ao enviar foto", message: errorMessage(e) });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const save = async () => {
    const cleanUsername = (form.username || "").replace(/^@/, "").trim();
    if (!cleanUsername) {
      setAlertConfig({ visible: true, type: "info", title: "Atenção", message: "Por favor, informe um nome de usuário." });
      return;
    }
    if ((form.bio || "").length > 160) {
      setAlertConfig({ visible: true, type: "info", title: "Atenção", message: "A biografia não pode ultrapassar 160 caracteres." });
      return;
    }

    try {
      setBusy(true);
      const userAvatar = form.avatar_url || form.avatarUrl || getUserAvatar(user);
      const payload = {
        name: (form.name || "").trim(),
        firstName: (form.name || "").trim(),
        lastName: (form.lastName || "").trim(),
        username: cleanUsername,
        bio: (form.bio || "").trim()
      };
      if (userAvatar && !userAvatar.startsWith("file://")) {
        payload.avatarUrl = userAvatar;
        payload.avatar_url = userAvatar;
      }

      const updated = await api.users.update(user.id, payload);
      const updatedUser = unwrap(updated, "user");
      if (updatedUser?.id) {
        onUpdateUser?.(normalizeUser(updatedUser));
      }


      if (onSaved) {
        await onSaved();
      }

      setAlertConfig({ visible: true, type: "info", title: "Sucesso", message: "Perfil atualizado com sucesso!" });
      onClose();
    } catch (error) {
      setAlertConfig({ visible: true, type: "error", title: "Perfil não atualizado", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const userAvatar =
  form.avatar_url ||
  form.avatarUrl ||
  getUserAvatar(user);

  const bioLength = (form.bio || "").length;
  const isBioOverLimit = bioLength > 160;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalPage, { backgroundColor: colors.background }]}>
        <AppHeader title="Editar perfil" onBack={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
          style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
            styles.editForm,
            {
              flexGrow: 1,
              paddingBottom: Math.max((insets?.bottom || 0) + 120, 180)
            }]
            }
            nestedScrollEnabled={true}
            scrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            bounces={true}
            overScrollMode="always">
          
          {}
          <View style={styles.avatarEditContainer}>
            <Pressable
              onPress={pickAvatar}
              disabled={uploadingAvatar || busy}
              style={({ pressed }) => [
              styles.avatarPickerPressable,
              { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]
              }
              accessibilityLabel="Alterar foto de perfil">
              
              <View
                style={[
                styles.avatarImageWrapper,
                {
                  borderColor: colors.primary || "#0284c7",
                  backgroundColor: colors.surfaceAlt,
                  shadowColor: colors.primary || "#0284c7"
                }]
                }>
                
                {userAvatar ?
                <Image
                  source={{ uri: userAvatar }}
                  style={styles.avatarImage} /> :


                <Avatar user={{ ...user, name: form.name }} size={100} />
                }

                {uploadingAvatar &&
                <View style={styles.avatarLoadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.avatarLoadingText}>Enviando...</Text>
                  </View>
                }
              </View>

              <View
                style={[
                styles.avatarCameraBadge,
                {
                  backgroundColor: colors.primary || "#0284c7",
                  borderColor: colors.card || colors.background
                }]
                }>
                
                <Feather name="camera" size={16} color="#fff" />
              </View>
            </Pressable>

            <Pressable
              onPress={pickAvatar}
              disabled={uploadingAvatar || busy}
              style={({ pressed }) => [
              styles.avatarChangeBtn,
              {
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                opacity: pressed ? 0.75 : 1
              }]
              }>
              
              <Feather name="edit-3" size={13} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.avatarChangeText, { color: colors.primary }]}>
                {uploadingAvatar ? "Enviando nova foto..." : "Alterar foto do perfil"}
              </Text>
            </Pressable>
          </View>

          {}
          <View
            style={[
            styles.formCard,
            {
              backgroundColor: colors.card || colors.surface,
              borderColor: colors.border
            }]
            }>
            
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Feather name="user" size={13} color={colors.subtext} />
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Nome</Text>
              </View>
              <Input
                placeholder="Seu primeiro nome"
                value={form.name}
                onChangeText={set("name")} />
              
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Feather name="users" size={13} color={colors.subtext} />
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Sobrenome</Text>
              </View>
              <Input
                placeholder="Seu sobrenome"
                value={form.lastName}
                onChangeText={set("lastName")} />
              
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Feather name="at-sign" size={13} color={colors.subtext} />
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  Nome de usuário (@)
                </Text>
              </View>
              <Input
                placeholder="usuario"
                value={form.username}
                onChangeText={set("username")}
                autoCapitalize="none"
                autoCorrect={false} />
              
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <View style={styles.fieldLabelRow}>
                  <Feather name="align-left" size={13} color={colors.subtext} />
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Biografia
                  </Text>
                </View>
                <View
                  style={[
                  styles.counterBadge,
                  {
                    backgroundColor: isBioOverLimit ?
                    "rgba(239, 68, 68, 0.15)" :
                    colors.surfaceAlt || "rgba(255,255,255,0.06)"
                  }]
                  }>
                  
                  <Text
                    style={[
                    styles.counterText,
                    { color: isBioOverLimit ? colors.danger : colors.subtext }]
                    }>
                    
                    {bioLength}/160
                  </Text>
                </View>
              </View>
              <Input
                placeholder="Escreva algo sobre você ou sua Tribo..."
                value={form.bio}
                onChangeText={set("bio")}
                multiline
                maxLength={160} />
              
            </View>
          </View>

          <View style={styles.editButtonsRow}>
            <Button
              title="Salvar alterações"
              icon="check"
              onPress={save}
              loading={busy}
              disabled={busy || uploadingAvatar || isBioOverLimit} />
            
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
      <TriboAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttonText={alertConfig.buttonText || "Fechar"}
        onClose={() => setAlertConfig({ visible: false })} />
      
    </Modal>);

}

export function FeedbackModal({ visible, onClose }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [alertConfig, setAlertConfig] = useState({ visible: false });
  const [type, setType] = useState("SUGGESTION");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const categories = [
  { key: "SUGGESTION", label: "Sugestão" },
  { key: "BUG", label: "Problema / Erro" },
  { key: "COMPLIMENT", label: "Elogio" },
  { key: "OTHER", label: "Outro" }];


  const handleSend = async () => {
    if (!message.trim()) {
      return setAlertConfig({ visible: true, type: "info", title: "Mensagem vazia", message: "Por favor, escreva sua mensagem antes de enviar." });
    }
    try {
      setBusy(true);
      await api.feedback.send({ subject: type, message: message.trim() });
      setAlertConfig({
        visible: true,
        type: "success",
        title: "Agradecemos o seu feedback",
        message: "Sua mensagem foi recebida e nossa equipe analisará com atenção.",
        buttonText: "Entendido",
        onClose: () => {
          setAlertConfig({ visible: false });
          onClose();
        }
      });
      setMessage("");
    } catch (error) {
      setAlertConfig({ visible: true, type: "error", title: "Erro ao enviar feedback", message: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const bottomPadding = Math.max((insets?.bottom || 0) + 24, 36);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose} />
      <View
        style={[
        styles.feedbackSheet,
        {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          paddingBottom: bottomPadding
        }]
        }>
        
        <View style={styles.optionsHandle} />
        <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>
          Enviar Feedback
        </Text>

        <View style={styles.feedbackTypesRow}>
          {categories.map((cat) => {
            const isSelected = type === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => setType(cat.key)}
                style={[
                styles.feedbackTypeChip,
                {
                  backgroundColor: isSelected ?
                  colors.primary || "#0284c7" :
                  colors.surfaceAlt || "#27272a",
                  borderColor: isSelected ?
                  colors.primary || "#0284c7" :
                  colors.line || "rgba(255, 255, 255, 0.12)"
                }]
                }>
                
                <Text
                  style={[
                  styles.feedbackTypeChipText,
                  {
                    color: isSelected ? "#ffffff" : colors.text || "#e4e4e7",
                    fontFamily: isSelected ? "Poppins_600SemiBold" : "Poppins_500Medium"
                  }]
                  }>
                  
                  {cat.label}
                </Text>
              </Pressable>);

          })}
        </View>

        <Input
          placeholder="Descreva sua experiência, sugestão ou relate algum problema encontrado..."
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          style={{ minHeight: 110, marginBottom: 16 }} />
        

        <Button
          title="Enviar Mensagem"
          icon="send"
          onPress={handleSend}
          loading={busy}
          disabled={busy || !message.trim()} />
        
      </View>
      <TriboAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttonText={alertConfig.buttonText || "Fechar"}
        onClose={() => setAlertConfig({ visible: false })} />
      
    </Modal>);

}

export function UpdateModal({ visible, updateInfo, onClose }) {
  const { colors } = useTheme();
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedMB, setDownloadedMB] = useState("0.0");
  const [totalMB, setTotalMB] = useState("0.0");
  const [downloadedFilePath, setDownloadedFilePath] = useState(null);
  const [installing, setInstalling] = useState(false);
  const [hasUnknownPermission, setHasUnknownPermission] = useState(true);
  const [alertConfig, setAlertConfig] = useState({ visible: false });

  useEffect(() => {
    if (visible && Platform.OS === "android") {
      canRequestPackageInstalls()
        .then((allowed) => setHasUnknownPermission(Boolean(allowed)))
        .catch(() => {});
    }
  }, [visible]);

  if (!visible || !updateInfo) return null;

  const handleStartDownloadAndInstall = async () => {
    if (downloadedFilePath) {
      await handleInstall(downloadedFilePath);
      return;
    }

    try {
      setDownloading(true);
      setDownloadProgress(0);

      const localUri = await downloadApkInternally(updateInfo.updateUrl, (prog) => {
        setDownloadProgress(prog.percent || 0);
        const recMB = ((prog.receivedBytes || 0) / (1024 * 1024)).toFixed(1);
        const totMB = ((prog.totalBytes || 0) / (1024 * 1024)).toFixed(1);
        setDownloadedMB(recMB);
        setTotalMB(totMB);
      });

      setDownloadedFilePath(localUri);
      setDownloading(false);
      await handleInstall(localUri);
    } catch (err) {
      console.warn("[UpdateModal] Erro ao baixar APK:", err);
      setDownloading(false);
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Erro no Download",
        message: `Não foi possível concluir o download interno (${err?.message || "falha de rede"}). Deseja baixar pelo navegador?`,
        buttonText: "Abrir no Navegador",
        onClose: () => {
          setAlertConfig({ visible: false });
          if (updateInfo.updateUrl) {
            Linking.openURL(updateInfo.updateUrl).catch(() => {});
          }
        }
      });
    }
  };

  const handleInstall = async (filePath) => {
    try {
      setInstalling(true);
      await installApk(filePath);
    } catch (err) {
      console.warn("[UpdateModal] Erro ao instalar APK:", err);
      setAlertConfig({
        visible: true,
        type: "info",
        title: "Permissão de Instalação",
        message: "Para instalar a atualização, permita 'Instalar apps desconhecidos' para a Tribo nas configurações.",
        buttonText: "Abrir Configurações",
        onClose: () => {
          setAlertConfig({ visible: false });
          openUnknownSourcesSettings();
        }
      });
    } finally {
      setInstalling(false);
    }
  };

  const handleOpenSettings = async () => {
    await openUnknownSourcesSettings();
    setTimeout(() => {
      if (Platform.OS === "android") {
        canRequestPackageInstalls()
          .then((allowed) => setHasUnknownPermission(Boolean(allowed)))
          .catch(() => {});
      }
    }, 1500);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={updateInfo.forceUpdate ? () => {} : onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={updateInfo.forceUpdate ? undefined : onClose} />
      <View style={[styles.optionsSheet, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.optionsHandle} />

        <View style={[styles.settingIcon, { backgroundColor: colors.accentSoft, alignSelf: "center", marginBottom: 12 }]}>
          <Feather name="download-cloud" size={20} color={colors.accent} />
        </View>

        <Text style={[styles.optionsTitle, { color: colors.text, marginBottom: 4 }]}>
          {updateInfo.forceUpdate ? "Atualização Obrigatória" : "Nova Versão Disponível"}
        </Text>

        <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 13, color: colors.accent, textAlign: "center", marginBottom: 8 }}>
          Versão {updateInfo.version || "1.0.1"}
        </Text>

        <Text style={{ fontFamily: "Poppins_400Regular", fontSize: 13, color: colors.muted, textAlign: "center", marginBottom: 16, lineHeight: 19 }}>
          {updateInfo.notes || "Uma nova atualização com melhorias de segurança e performance está disponível para o aplicativo Tribo."}
        </Text>

        {/* Card Informativo sobre Permissão de Fontes Desconhecidas */}
        {Platform.OS === "android" && (
          <View
            style={{
              backgroundColor: hasUnknownPermission ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.12)",
              borderColor: hasUnknownPermission ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.35)",
              borderWidth: 1,
              borderRadius: 14,
              padding: 14,
              marginBottom: 16,
              width: "100%"
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <Feather
                name={hasUnknownPermission ? "check-circle" : "shield"}
                size={17}
                color={hasUnknownPermission ? "#10b981" : "#f59e0b"}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  fontSize: 13,
                  color: hasUnknownPermission ? "#10b981" : "#f59e0b",
                  flex: 1
                }}
              >
                {hasUnknownPermission
                  ? "Instalação Interna Liberada"
                  : "Aviso: Permitir Fontes Desconhecidas"}
              </Text>
            </View>

            <Text
              style={{
                fontFamily: "Poppins_400Regular",
                fontSize: 12,
                color: colors.muted,
                lineHeight: 18,
                marginBottom: hasUnknownPermission ? 0 : 10
              }}
            >
              {hasUnknownPermission
                ? "Seu dispositivo já está autorizado a instalar atualizações internamente pelo aplicativo."
                : "O Android exige permissão para instalar arquivos APK atualizados diretamente. Ative 'Instalar apps desconhecidos' para a Tribo."}
            </Text>

            {!hasUnknownPermission && (
              <Pressable
                onPress={handleOpenSettings}
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "rgba(245, 158, 11, 0.2)",
                  paddingVertical: 7,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center"
                }}
              >
                <Feather name="settings" size={13} color="#f59e0b" style={{ marginRight: 6 }} />
                <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: "#f59e0b" }}>
                  Permitir Fontes Desconhecidas
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Barra de Progresso do Download */}
        {downloading && (
          <View style={{ marginBottom: 18, width: "100%", paddingHorizontal: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 12, color: colors.text }}>
                Baixando atualização...
              </Text>
              <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 12, color: colors.accent }}>
                {downloadProgress}% ({downloadedMB}MB / {totalMB}MB)
              </Text>
            </View>

            <View style={{ width: "100%", height: 8, backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: 4, overflow: "hidden" }}>
              <View
                style={{
                  width: `${downloadProgress}%`,
                  height: "100%",
                  backgroundColor: colors.accent || "#3b82f6",
                  borderRadius: 4
                }}
              />
            </View>
          </View>
        )}

        {/* Botão Principal: Baixar / Instalar */}
        {downloadedFilePath ? (
          <Button
            title={installing ? "Abrindo Instalador..." : "Instalar Atualização Agora"}
            icon="check-circle"
            onPress={() => handleInstall(downloadedFilePath)}
            loading={installing}
            style={{ marginBottom: 10 }}
          />
        ) : (
          <Button
            title={downloading ? `Baixando... (${downloadProgress}%)` : "Baixar e Instalar Internamente"}
            icon="download"
            onPress={handleStartDownloadAndInstall}
            loading={downloading}
            disabled={downloading}
            style={{ marginBottom: 10 }}
          />
        )}

        {!updateInfo.forceUpdate && !downloading && (
          <Button
            title="Lembrar mais tarde"
            variant="secondary"
            onPress={onClose}
          />
        )}
      </View>

      <TriboAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttonText={alertConfig.buttonText || "Fechar"}
        onClose={alertConfig.onClose || (() => setAlertConfig({ visible: false }))}
      />
    </Modal>
  );
}

export function SettingsDrawer({
  visible,
  onClose,
  onLogout,
  onOpenSettings,
  onOpenAppearance,
  onOpenSavedPosts,
  onOpenArchivedPosts,
  user,
  onUpdateUser
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max((insets?.bottom || 0) + 24, 40);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} onPress={onClose}>
        <Pressable
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: bottomPadding,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 10
          }}
          onPress={(e) => e.stopPropagation()}>
          
          <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
          
          <Text style={{ fontFamily: "Poppins_600SemiBold", fontSize: 18, color: colors.text, marginBottom: 16 }}>Menu</Text>
          
          <View style={{ backgroundColor: colors.card, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
            <Pressable
              style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: pressed ? colors.surfaceAlt : "transparent", borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => {onClose();onOpenSettings?.();}}>
              
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(100,116,139,0.1)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Feather name="settings" size={18} color={colors.text} />
              </View>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 15, color: colors.text, flex: 1 }}>Configurações</Text>
              <Feather name="chevron-right" size={20} color={colors.muted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: pressed ? colors.surfaceAlt : "transparent", borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => {onClose();onOpenSavedPosts?.();}}>
              
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(16,185,129,0.1)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Feather name="bookmark" size={18} color="#10b981" />
              </View>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 15, color: colors.text, flex: 1 }}>Posts Salvos</Text>
              <Feather name="chevron-right" size={20} color={colors.muted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", padding: 16, backgroundColor: pressed ? colors.surfaceAlt : "transparent", borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => {onClose();onOpenArchivedPosts?.();}}>
              
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.1)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Feather name="archive" size={18} color="#f59e0b" />
              </View>
              <Text style={{ fontFamily: "Poppins_500Medium", fontSize: 15, color: colors.text, flex: 1 }}>Arquivo de Posts</Text>
              <Feather name="chevron-right" size={20} color={colors.muted} />
            </Pressable>


          </View>
        </Pressable>
      </Pressable>
    </Modal>);

}

export function Settings({
  visible,
  onClose,
  onLogout,
  user,
  onUpdateUser,
  onOpenFollowRequests,
  onOpenAppearance,
  onOpenSavedPosts,
  onOpenArchivedPosts,
  showAlert
}) {
  const { colors, mode, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAdultContentEnabled, setAdultContentEnabled } = useUserContext();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [checkingUpdateText, setCheckingUpdateText] = useState("");
  const [updateInfo, setUpdateInfo] = useState(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [ageConfirmModalVisible, setAgeConfirmModalVisible] = useState(false);
  const [isPrivate, setIsPrivate] = useState(
    Boolean(user?.is_private ?? user?.isPrivate ?? false)
  );
  const [showOnlineStatus, setShowOnlineStatus] = useState(
    Boolean(user?.show_online_status ?? user?.showOnlineStatus ?? true)
  );
  const [readReceipts, setReadReceipts] = useState(
    Boolean(user?.read_receipts ?? user?.readReceipts ?? true)
  );
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [downloadingData, setDownloadingData] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [cancelingDeletion, setCancelingDeletion] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ visible: false });
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  const handleToggleAdultContent = (val) => {
    if (val) {
      setAgeConfirmModalVisible(true);
    } else {
      setAdultContentEnabled(false);
    }
  };

  const handleConfirmAge = async () => {
    setAgeConfirmModalVisible(false);
    await setAdultContentEnabled(true);
  };

  useEffect(() => {
    setIsPrivate(Boolean(user?.is_private ?? user?.isPrivate ?? false));
    setShowOnlineStatus(Boolean(user?.show_online_status ?? user?.showOnlineStatus ?? true));
    setReadReceipts(Boolean(user?.read_receipts ?? user?.readReceipts ?? true));
  }, [user]);

  useEffect(() => {
    if (visible) {
      const fetchStatus = api.users?.deletionStatus || api.deletionStatus;
      if (typeof fetchStatus === "function") {
        fetchStatus()
          .then((res) => {
            if (res) {
              setDeletionInfo(res.data || res);
            }
          })
          .catch(() => {});
      }
    }
  }, [visible]);

  const handleTogglePrivacy = async (value) => {
    try {
      setUpdatingPrivacy(true);
      setIsPrivate(value);
      await api.users.privacy(value);
      onUpdateUser?.((prev) => ({
        ...prev,
        is_private: value,
        isPrivate: value
      }));
    } catch (error) {
      setIsPrivate(!value);
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Erro ao Alterar",
        message: errorMessage(error) || "Não foi possível alterar a privacidade.",
        buttonText: "Fechar",
        onClose: () => setAlertConfig({ visible: false })
      });
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const handleToggleSetting = async (key, value, setter) => {
    try {
      setUpdatingSettings(true);
      setter(value);
      await api.users.updateSettings({ [key]: value });
      onUpdateUser?.((prev) => ({
        ...prev,
        [key]: value,
        [key === 'showOnlineStatus' ? 'show_online_status' : 'read_receipts']: value
      }));
    } catch (error) {
      setter(!value);
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Erro ao Salvar",
        message: errorMessage(error) || "Não foi possível salvar a configuração.",
        buttonText: "Fechar",
        onClose: () => setAlertConfig({ visible: false })
      });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleCheckUpdate = async () => {
    try {
      setCheckingUpdate(true);
      setCheckingUpdateText("Verificando...");

      // 1. Checa atualização rápida OTA (CodePush)
      const codePushResult = await checkCodePushUpdate();
      if (codePushResult) {
        setAlertConfig({
          visible: true,
          type: "info",
          title: "Atualização Disponível",
          message: `Uma atualização rápida com melhorias (${codePushResult.label || "OTA"}) está disponível. Deseja baixar e aplicar agora?`,
          buttonText: "Atualizar Agora",
          onClose: async () => {
            setAlertConfig({ visible: false });
            try {
              setCheckingUpdate(true);
              setCheckingUpdateText("Baixando atualização...");
              await codePushResult.downloadAndApply((prog) => {
                setCheckingUpdateText(`Baixando... ${prog.percent}%`);
              });
            } catch (cpErr) {
              console.warn("[CodePush apply error]:", cpErr);
            } finally {
              setCheckingUpdate(false);
              setCheckingUpdateText("");
            }
          }
        });
        return;
      }

      // 2. Checa versão de APK no backend
      const res = await api.app.version();
      const info = res?.data || res;

      const mappedInfo = {
        version: info.latestVersion || info.version,
        updateUrl: info.downloadUrl || info.updateUrl,
        notes: info.releaseNotes || info.notes,
        forceUpdate: info.forceUpdate || false
      };

      const currentVersion = Constants.expoConfig?.version || Constants.manifest?.version || "1.0.0";

      if (mappedInfo.version && mappedInfo.version !== currentVersion && mappedInfo.updateUrl) {
        setUpdateInfo(mappedInfo);
      } else {
        setAlertConfig({
          visible: true,
          type: "info",
          title: "Aplicativo Atualizado",
          message: `Você já está usando a versão mais recente da Tribo (v${currentVersion}).`,
          buttonText: "Entendido",
          onClose: () => setAlertConfig({ visible: false })
        });
      }
    } catch (error) {
      setAlertConfig({
        visible: true,
        type: "info",
        title: "Aplicativo Atualizado",
        message: `Você já está usando a versão mais recente da Tribo.`,
        buttonText: "Entendido",
        onClose: () => setAlertConfig({ visible: false })
      });
    } finally {
      setCheckingUpdate(false);
      setCheckingUpdateText("");
    }
  };

  const handleOpenVerify = async () => {
    try {
      setVerifying(true);
      await api.auth.resendCode(user?.email);
      setVerifyModalVisible(true);
      setVerifyCode("");
    } catch (err) {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Erro",
        message: errorMessage(err) || "Não foi possível enviar o código.",
        buttonText: "Fechar",
        onClose: () => setAlertConfig({ visible: false })
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmVerify = async () => {
    if (!verifyCode || verifyCode.length < 6) {
      return setAlertConfig({
        visible: true, type: "warning", title: "Aviso",
        message: "O código deve ter 6 dígitos.",
        buttonText: "Fechar", onClose: () => setAlertConfig({ visible: false })
      });
    }
    try {
      setVerifying(true);
      await api.auth.verifyEmail(user?.email, verifyCode);
      onUpdateUser?.((prev) => ({ ...prev, email_verified: true, badge_type: "BLUE" }));
      setVerifyModalVisible(false);
      setAlertConfig({
        visible: true, type: "success", title: "Conta Verificada",
        message: "Você ganhou o Selo de Verificação no seu perfil!",
        buttonText: "Ótimo!", onClose: () => setAlertConfig({ visible: false })
      });
    } catch (err) {
      setAlertConfig({
        visible: true, type: "error", title: "Código Inválido",
        message: errorMessage(err),
        buttonText: "Fechar", onClose: () => setAlertConfig({ visible: false })
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleResendVerify = async () => {
    try {
      setResendingCode(true);
      await api.auth.resendCode(user?.email);
      setAlertConfig({
        visible: true, type: "success", title: "Código Enviado",
        message: `Novo código enviado para ${user?.email}`,
        buttonText: "Ok", onClose: () => setAlertConfig({ visible: false })
      });
    } catch (err) {
      setAlertConfig({
        visible: true, type: "error", title: "Erro",
        message: errorMessage(err),
        buttonText: "Fechar", onClose: () => setAlertConfig({ visible: false })
      });
    } finally {
      setResendingCode(false);
    }
  };

  const handleExportData = async () => {
    try {
      setDownloadingData(true);
      const res = await api.users.exportData();
      const payload = res?.data || res;
      await downloadUserData(user, payload);

      setAlertConfig({
        visible: true,
        type: "success",
        title: "Download Concluído",
        message: "Seus dados foram baixados com sucesso!",
        buttonText: "Entendido",
        onClose: () => setAlertConfig({ visible: false })
      });
    } catch (err) {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Erro no Download",
        message: errorMessage(err) || "Não foi possível baixar seus dados.",
        buttonText: "Fechar",
        onClose: () => setAlertConfig({ visible: false })
      });
    } finally {
      setDownloadingData(false);
    }
  };

  const deleteAccount = () => {
    setDeletePassword("");
    setShowDeletePassword(false);
    setDeleteError("");
    setDeleteModalVisible(true);
  };

  const handleConfirmDeleteWithPassword = async () => {
    if (!deletePassword || !deletePassword.trim()) {
      setDeleteError("Por favor, digite sua senha para confirmar a exclusão.");
      return;
    }

    try {
      setRequestingDeletion(true);
      setDeleteError("");
      await api.users.requestDeletion({ password: deletePassword.trim() });
      setDeleteModalVisible(false);
      setDeletePassword("");

      setAlertConfig({
        visible: true,
        type: "success",
        title: "Exclusão Agendada",
        message: "Sua conta foi agendada para exclusão e será removida em 15 dias. Caso se arrependa, basta fazer login novamente para reativá-la.",
        buttonText: "Sair",
        onClose: () => {
          setAlertConfig({ visible: false });
          onLogout?.();
        }
      });
    } catch (err) {
      const msg = errorMessage(err) || "Senha incorreta ou erro ao solicitar exclusão da conta.";
      setDeleteError(msg);
    } finally {
      setRequestingDeletion(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      setCancelingDeletion(true);
      await api.users.cancelDeletion();
      setDeletionInfo({ isPendingDeletion: false });
      setAlertConfig({
        visible: true,
        type: "success",
        title: "Exclusão Cancelada",
        message:
        "O pedido de exclusão da conta foi cancelado com sucesso. Sua conta continua ativa e segura!",
        buttonText: "Ótimo!",
        onClose: () => setAlertConfig({ visible: false })
      });
      onUpdateUser?.((prev) => ({ ...prev, isPendingDeletion: false }));
    } catch (err) {
      setAlertConfig({
        visible: true,
        type: "error",
        title: "Erro ao Cancelar",
        message: errorMessage(err) || "Não foi possível cancelar a exclusão.",
        buttonText: "Fechar",
        onClose: () => setAlertConfig({ visible: false })
      });
    } finally {
      setCancelingDeletion(false);
    }
  };

  const screenContent = (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AppHeader title="Configurações" onBack={onClose} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max((insets?.bottom || 0) + 40, 80),
          gap: 12
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        scrollEnabled={true}
        bounces={true}
        overScrollMode="always">
          
          {}
          {deletionInfo?.isPendingDeletion &&
          <View
            style={[
            styles.deletionBanner,
            {
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              borderColor: "rgba(239, 68, 68, 0.3)"
            }]
            }>
            
              <View style={styles.deletionBannerHeader}>
                <Feather name="alert-triangle" size={18} color="#ef4444" />
                <Text style={styles.deletionBannerTitle}>
                  Exclusão Agendada
                </Text>
              </View>
              <Text style={[styles.deletionBannerText, { color: colors.text }]}>
                Sua conta está programada para exclusão em {deletionInfo.daysRemaining ?? 15} dias.
              </Text>
              <Pressable
              style={styles.cancelDeletionBtn}
              onPress={handleCancelDeletion}
              disabled={cancelingDeletion}>
              
                {cancelingDeletion ?
              <ActivityIndicator size="small" color="#fff" /> :

              <Text style={styles.cancelDeletionBtnText}>Cancelar Exclusão</Text>
              }
              </Pressable>
            </View>
          }

          {}
          <View
            style={[
            styles.settingRow,
            { backgroundColor: colors.surface, borderColor: colors.line }]
            }>
            
            <View
              style={[
              styles.settingIcon,
              { backgroundColor: colors.accentSoft }]
              }>
              
              <Feather name="shield" size={18} color={colors.accent} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Conta privada
              </Text>
              <Text style={[styles.settingCaption, { color: colors.muted }]}>
                Apenas pessoas que você aprovar poderão ver suas fotos e publicações.
              </Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={handleTogglePrivacy}
              disabled={updatingPrivacy}
              trackColor={{ false: colors.line, true: colors.accent }} />
            
          </View>



          {}
          <View
            style={[
            styles.settingRow,
            { backgroundColor: colors.surface, borderColor: colors.line }]
            }>
            
            <View
              style={[
              styles.settingIcon,
              { backgroundColor: colors.accentSoft }]
              }>
              
              <Feather name="activity" size={18} color={colors.accent} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Mostrar status online
              </Text>
              <Text style={[styles.settingCaption, { color: colors.muted }]}>
                Permite que outras pessoas vejam quando você está online. Se desativado, você também não verá o status delas.
              </Text>
            </View>
            <Switch
              value={showOnlineStatus}
              onValueChange={(val) => handleToggleSetting('showOnlineStatus', val, setShowOnlineStatus)}
              disabled={updatingSettings}
              trackColor={{ false: colors.line, true: colors.accent }} />
            
          </View>

          {}
          <View
            style={[
            styles.settingRow,
            { backgroundColor: colors.surface, borderColor: colors.line }]
            }>
            
            <View
              style={[
              styles.settingIcon,
              { backgroundColor: colors.accentSoft }]
              }>
              
              <Feather name="check-square" size={18} color={colors.accent} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Confirmações de leitura
              </Text>
              <Text style={[styles.settingCaption, { color: colors.muted }]}>
                Permite que outras pessoas saibam quando você leu as mensagens. Se desativado, você também não verá as delas.
              </Text>
            </View>
            <Switch
              value={readReceipts}
              onValueChange={(val) => handleToggleSetting('readReceipts', val, setReadReceipts)}
              disabled={updatingSettings}
              trackColor={{ false: colors.line, true: colors.accent }} />
            
          </View>

          {}
          <View
            style={[
            styles.settingRow,
            { backgroundColor: colors.surface, borderColor: colors.line }]
            }>
            
            <View
              style={[
              styles.settingIcon,
              { backgroundColor: colors.accentSoft }]
              }>
              
              <Feather name="eye-off" size={18} color={colors.accent} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Permitir Conteúdo Adulto (+18)
              </Text>
              <Text style={[styles.settingCaption, { color: colors.muted }]}>
                Permite a publicação e visualização de mídias e conteúdos sensíveis (+18) na plataforma.
              </Text>
            </View>
            <Switch
              value={isAdultContentEnabled}
              onValueChange={handleToggleAdultContent}
              trackColor={{ false: colors.line, true: colors.accent }} />
            
          </View>

          {}
          <View
            style={[
            styles.settingRow,
            { backgroundColor: colors.surface, borderColor: colors.line }]
            }>
            
            <View
              style={[
              styles.settingIcon,
              { backgroundColor: colors.accentSoft }]
              }>
              
              <Feather name="bell" size={18} color={colors.accent} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Notificações
              </Text>
              <Text style={[styles.settingCaption, { color: colors.muted }]}>
                Em breve você poderá controlar seus avisos.
              </Text>
            </View>
          </View>

          {}
          <Pressable
            style={[
            styles.settingRow,
            { backgroundColor: colors.surface, borderColor: colors.line, borderBottomWidth: 1 }]
            }
            onPress={() => {
              onClose();
              if (onOpenSavedPosts) onOpenSavedPosts();
            }}>
            
            <View
              style={[
              styles.settingIcon,
              { backgroundColor: "rgba(16, 185, 129, 0.15)" }]
              }>
              
              <Feather
                name="bookmark"
                size={18}
                color="#10b981" />
              
            </View>
            <View style={styles.flex}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Posts Salvos
              </Text>
              <Text style={[styles.settingCaption, { color: colors.muted }]}>
                Suas publicações favoritas.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.muted} />
          </Pressable>

          {}
          <Pressable
            style={[
            styles.settingRow,
            { backgroundColor: colors.surface, borderColor: colors.line, borderBottomWidth: 1 }]
            }
            onPress={() => {
              onClose();
              if (onOpenArchivedPosts) onOpenArchivedPosts();
            }}>
            
            <View
              style={[
              styles.settingIcon,
              { backgroundColor: "rgba(245, 158, 11, 0.15)" }]
              }>
              
              <Feather
                name="archive"
                size={18}
                color="#f59e0b" />
              
            </View>
            <View style={styles.flex}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Arquivo de Posts
              </Text>
              <Text style={[styles.settingCaption, { color: colors.muted }]}>
                Posts que você arquivou.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.muted} />
          </Pressable>

          {}


          {}
          <Pressable
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
            style={[
            styles.settingRow,
            { backgroundColor: colors.surface, borderColor: colors.line }]
            }>
            
            <View
              style={[
              styles.settingIcon,
              { backgroundColor: colors.accentSoft }]
              }>
              
              {checkingUpdate ?
              <ActivityIndicator size="small" color={colors.accent} /> :

              <Feather name="refresh-cw" size={18} color={colors.accent} />
              }
            </View>
            <View style={styles.flex}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                {checkingUpdateText || "Verificar atualizações"}
              </Text>
              <Text style={[styles.settingCaption, { color: colors.muted }]}>
                Versão instalada: v{Constants.expoConfig?.version || "1.0.0"}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </Pressable>

          {}
          {!user?.email_verified &&
          <Pressable
            onPress={handleOpenVerify}
            disabled={verifying}
            style={[
            styles.settingRow,
            { backgroundColor: colors.surface, borderColor: colors.line }]
            }>
            
              <View
              style={[
              styles.settingIcon,
              { backgroundColor: "rgba(59, 130, 246, 0.15)" }]
              }>
              
                {verifying ?
              <ActivityIndicator size="small" color="#3b82f6" /> :

              <Feather name="check-circle" size={18} color="#3b82f6" />
              }
              </View>
              <View style={styles.flex}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  Verificar Conta
                </Text>
                <Text style={[styles.settingCaption, { color: colors.muted }]}>
                  Verifique seu e-mail e ganhe o Selo Azul no perfil.
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.muted} />
            </Pressable>
          }

          {}
          <Pressable
            onPress={handleExportData}
            disabled={downloadingData}
            style={[
            styles.settingRow,
            { backgroundColor: colors.surface, borderColor: colors.line }]
            }>
            
            <View
              style={[
              styles.settingIcon,
              { backgroundColor: colors.accentSoft }]
              }>
              
              {downloadingData ?
              <ActivityIndicator size="small" color={colors.accent} /> :

              <Feather name="download" size={18} color={colors.accent} />
              }
            </View>
            <View style={styles.flex}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Baixar meus dados
              </Text>
              <Text style={[styles.settingCaption, { color: colors.muted }]}>
                Exporte uma cópia completa de suas publicações, seguidores e conversas em JSON.
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </Pressable>

          {}
          <Pressable
            onPress={() => setFeedbackVisible(true)}
            style={[
            styles.settingRow,
            { backgroundColor: colors.surface, borderColor: colors.line }]
            }>
            
            <View
              style={[
              styles.settingIcon,
              { backgroundColor: colors.accentSoft }]
              }>
              
              <Feather name="message-square" size={18} color={colors.accent} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>
                Enviar feedback
              </Text>
              <Text style={[styles.settingCaption, { color: colors.muted }]}>
                Envie sugestões, dúvidas ou relate problemas.
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </Pressable>

          <Button
            title="Sair da conta"
            variant="secondary"
            icon="log-out"
            onPress={() => {
              setAlertConfig({
                visible: true,
                type: "warning",
                title: "Sair da Conta",
                message: "Você está prestes a desconectar da sua conta. Deseja continuar?",
                buttonText: "Sair",
                secondaryButtonText: "Cancelar",
                onSecondaryPress: () => setAlertConfig({ visible: false }),
                onClose: () => {
                  setAlertConfig({ visible: false });
                  onClose?.();
                  onLogout?.();
                }
              });
            }} />
          
          <Pressable
            onPress={deleteAccount}
            disabled={requestingDeletion}
            style={styles.delete}>
            
            {requestingDeletion ?
            <ActivityIndicator size="small" color={colors.danger} /> :

            <Text style={[styles.deleteText, { color: colors.danger }]}>
                Excluir minha conta
              </Text>
            }
          </Pressable>
        </ScrollView>

        {feedbackVisible && (
          <FeedbackModal
            visible={feedbackVisible}
            onClose={() => setFeedbackVisible(false)} />
        )}

        {Boolean(updateInfo) && (
          <UpdateModal
            visible={!!updateInfo}
            updateInfo={updateInfo}
            onClose={() => setUpdateInfo(null)} />
        )}

        {verifyModalVisible && (
          <Modal
            visible={verifyModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setVerifyModalVisible(false)}>
            
            <View style={styles.ageModalOverlay}>
              <View style={[styles.ageModalCard, { backgroundColor: colors.card || colors.surface, borderColor: colors.border || colors.line }]}>
                <View style={[styles.ageModalIconWrap, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
                  <Feather name="mail" size={26} color="#3b82f6" />
                </View>
                <Text style={[styles.ageModalTitle, { color: colors.text }]}>
                  Verifique seu E-mail
                </Text>
                <Text style={[styles.ageModalDescription, { color: colors.muted, textAlign: "center" }]}>
                  Enviamos um código para {user?.email}. Digite-o abaixo para confirmar sua conta.
                </Text>
                <TextInput
                  maxLength={6}
                  style={[
                  styles.bioInput,
                  {
                    borderWidth: 1, borderColor: colors.line, borderRadius: 12,
                    textAlign: "center", fontSize: 24, letterSpacing: 10,
                    paddingVertical: 12, marginBottom: 16, color: colors.text, backgroundColor: colors.background
                  }]
                  }
                  value={verifyCode}
                  onChangeText={setVerifyCode}
                  keyboardType="number-pad"
                  placeholder="000000"
                  placeholderTextColor={colors.muted}
                  autoFocus />
                
                <Pressable
                  onPress={handleConfirmVerify}
                  disabled={verifying}
                  style={[styles.ageModalButton, { backgroundColor: colors.primary || colors.accent, marginBottom: 8 }]}>
                  
                  {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.ageModalButtonText}>Confirmar</Text>}
                </Pressable>
                <Pressable
                  onPress={handleResendVerify}
                  disabled={resendingCode}
                  style={{ paddingVertical: 12, alignItems: "center" }}>
                  
                  <Text style={{ color: colors.primary || colors.accent, fontWeight: "600" }}>
                    {resendingCode ? "Reenviando..." : "Reenviar código"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setVerifyModalVisible(false)}
                  style={[styles.ageModalSecondaryButton, { borderColor: colors.border || colors.line, marginTop: 8 }]}>
                  
                  <Text style={[styles.ageModalSecondaryButtonText, { color: colors.text }]}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}

        {ageConfirmModalVisible && (
          <Modal
            visible={ageConfirmModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setAgeConfirmModalVisible(false)}>
            
            <View style={styles.ageModalOverlay}>
              <View
                style={[
                styles.ageModalCard,
                {
                  backgroundColor: colors.card || colors.surface,
                  borderColor: colors.border || colors.line
                }]
                }>
                
                <View
                  style={[
                  styles.ageModalIconWrap,
                  { backgroundColor: colors.accentSoft || "rgba(29, 155, 240, 0.15)" }]
                  }>
                  
                  <Feather
                    name="shield"
                    size={26}
                    color={colors.primary || colors.accent} />
                  
                </View>
                <Text style={[styles.ageModalTitle, { color: colors.text }]}>
                  Confirmação de Maioridade (+18)
                </Text>
                <Text
                  style={[
                  styles.ageModalDescription,
                  { color: colors.subtext || colors.muted }]
                  }>
                  
                  Você confirma que possui 18 anos ou mais e deseja visualizar publicações com conteúdos sensíveis ou adultos na Tribo?
                </Text>
                <View style={styles.ageModalButtons}>
                  <Pressable
                    style={[
                    styles.ageModalBtnCancel,
                    {
                      borderColor: colors.border || colors.line,
                      backgroundColor: colors.surfaceAlt || colors.background
                    }]
                    }
                    onPress={() => setAgeConfirmModalVisible(false)}>
                    
                    <Text
                      style={[
                      styles.ageModalBtnCancelText,
                      { color: colors.subtext || colors.muted }]
                      }>
                      
                      Cancelar
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                    styles.ageModalBtnConfirm,
                    { backgroundColor: colors.primary || colors.accent }]
                    }
                    onPress={handleConfirmAge}>
                    
                    <Text style={styles.ageModalBtnConfirmText}>
                      Confirmar (+18)
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {deleteModalVisible && (
          <Modal
            visible={deleteModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => {
              if (!requestingDeletion) {
                setDeleteModalVisible(false);
                setDeletePassword("");
                setDeleteError("");
              }
            }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{
                flex: 1,
                backgroundColor: "rgba(0, 0, 0, 0.75)"
              }}>
              <ScrollView
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 20
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <View
                  style={{
                    width: "100%",
                    maxWidth: 400,
                    backgroundColor: colors.surface || "#18181b",
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: "rgba(239, 68, 68, 0.3)",
                    padding: 22,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.5,
                    shadowRadius: 20,
                    elevation: 10
                  }}>
                  <View style={{ alignItems: "center", marginBottom: 16 }}>
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 12
                      }}>
                      <Feather name="trash-2" size={26} color="#ef4444" />
                    </View>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 18,
                        fontFamily: "Poppins_700Bold",
                        textAlign: "center"
                      }}>
                      Excluir Minha Conta
                    </Text>
                    <Text
                      style={{
                        color: colors.muted || "#a1a1aa",
                        fontSize: 13,
                        fontFamily: "Poppins_400Regular",
                        textAlign: "center",
                        marginTop: 6,
                        lineHeight: 18
                      }}>
                      Esta ação agendará a exclusão definitiva da sua conta. Para confirmar sua identidade, digite sua senha abaixo:
                    </Text>
                  </View>

                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 13,
                        fontFamily: "Poppins_600SemiBold",
                        marginBottom: 6
                      }}>
                      Senha atual:
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: colors.surfaceAlt || "#27272a",
                        borderWidth: 1,
                        borderColor: deleteError ? "#ef4444" : colors.border || "rgba(255, 255, 255, 0.1)",
                        borderRadius: 14,
                        paddingHorizontal: 14
                      }}>
                      <Feather name="lock" size={16} color={colors.muted || "#71717a"} style={{ marginRight: 8 }} />
                      <TextInput
                        style={{
                          flex: 1,
                          height: 48,
                          color: colors.text,
                          fontSize: 14.5,
                          fontFamily: "Poppins_400Regular"
                        }}
                        placeholder="Digite sua senha"
                        placeholderTextColor={colors.muted || "#71717a"}
                        secureTextEntry={!showDeletePassword}
                        value={deletePassword}
                        onChangeText={(val) => {
                          setDeletePassword(val);
                          if (deleteError) setDeleteError("");
                        }}
                        autoFocus
                        editable={!requestingDeletion}
                      />
                      <Pressable
                        onPress={() => setShowDeletePassword((prev) => !prev)}
                        style={{ padding: 6 }}>
                        <Feather
                          name={showDeletePassword ? "eye-off" : "eye"}
                          size={18}
                          color={colors.muted || "#71717a"}
                        />
                      </Pressable>
                    </View>
                    {Boolean(deleteError) && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <Feather name="alert-circle" size={14} color="#ef4444" />
                        <Text style={{ color: "#ef4444", fontSize: 12, fontFamily: "Poppins_400Regular", flex: 1 }}>
                          {deleteError}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      onPress={() => {
                        setDeleteModalVisible(false);
                        setDeletePassword("");
                        setDeleteError("");
                      }}
                      disabled={requestingDeletion}
                      style={{
                        flex: 1,
                        height: 46,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: colors.surfaceAlt || "#27272a",
                        borderWidth: 1,
                        borderColor: colors.border || "rgba(255, 255, 255, 0.08)"
                      }}>
                      <Text style={{ color: colors.text, fontSize: 14, fontFamily: "Poppins_600SemiBold" }}>
                        Cancelar
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleConfirmDeleteWithPassword}
                      disabled={requestingDeletion}
                      style={{
                        flex: 1.2,
                        height: 46,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#ef4444",
                        opacity: requestingDeletion ? 0.7 : 1
                      }}>
                      {requestingDeletion ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={{ color: "#ffffff", fontSize: 14, fontFamily: "Poppins_700Bold" }}>
                          Confirmar Exclusão
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>
        )}

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
          onSecondaryPress={alertConfig.onSecondaryPress} />
        
      </View>
  );

  if (visible !== undefined) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent={true}>
        {screenContent}
      </Modal>
    );
  }

  return screenContent;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchTop: { paddingBottom: 12 },
  sectionTitle: { fontFamily: "Poppins_700Bold", fontSize: 22, letterSpacing: -0.3 },
  sectionSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2
  },
  searchField: {
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    marginTop: 6
  },
  searchInput: {
    flex: 1,
    borderWidth: 0,
    minHeight: 48,
    paddingLeft: 10,
    backgroundColor: "transparent"
  },
  results: { paddingTop: 4, paddingBottom: 110, gap: 12, flexGrow: 1 },
  personRow: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11
  },
  personTrigger: { flex: 1, flexDirection: "row", alignItems: "center", gap: 11 },
  personName: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  personHandle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    marginTop: 1
  },
  personBio: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 4 },
  profileScroll: { paddingTop: 4, paddingBottom: 110, gap: 14, flexGrow: 1 },
  profileCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18
  },
  profileSectionHeader: {
    paddingHorizontal: 4,
    marginTop: 6
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
  profileName: { fontFamily: "Poppins_700Bold", fontSize: 23, flexShrink: 1 },
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
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16
  },
  pendingBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1
  },
  pendingBannerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  pendingBannerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  },
  pendingBannerSubtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    marginTop: 1
  },
  modalPage: { flex: 1, borderRadius: 26 },
  modalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    padding: 15
  },
  modalTitle: { fontFamily: "Poppins_700Bold", fontSize: 16 },
  editForm: { padding: 20, gap: 20, paddingBottom: 40 },
  avatarEditContainer: {
    alignItems: "center",
    marginVertical: 10,
    gap: 12
  },
  avatarPickerPressable: {
    position: "relative"
  },
  avatarImageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50
  },
  avatarLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50
  },
  avatarLoadingText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Poppins_500Medium",
    marginTop: 4
  },
  avatarCameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3
  },
  avatarChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  avatarChangeText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  },
  formCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 16
  },
  fieldGroup: {
    gap: 8
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  fieldLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  counterText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11
  },
  editButtonsRow: {
    marginTop: 6,
    marginBottom: 20
  },
  settings: { padding: 20, gap: 12 },
  deletionBanner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8
  },
  deletionBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  deletionBannerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#ef4444"
  },
  deletionBannerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 18
  },
  cancelDeletionBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#ef4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4
  },
  cancelDeletionBtnText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12
  },
  settingRow: {
    minHeight: 76,
    padding: 13,
    borderWidth: 1,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  settingTitle: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  settingCaption: {
    fontFamily: "Poppins_400Regular",
    fontSize: 10,
    marginTop: 2
  },
  delete: { alignItems: "center", padding: 12 },
  deleteText: { fontFamily: "Poppins_600SemiBold", fontSize: 12 },
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
    paddingBottom: 36
  },
  feedbackTypesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16
  },
  feedbackTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1
  },
  feedbackTypeChipText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12
  },
  ageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
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
    elevation: 8
  },
  ageModalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  ageModalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    textAlign: "center",
    marginBottom: 8
  },
  ageModalDescription: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 19
  },
  ageModalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%"
  },
  ageModalBtnCancel: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  ageModalBtnCancelText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13
  },
  ageModalBtnConfirm: {
    flex: 1.2,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  ageModalBtnConfirmText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF"
  },
  trendsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24
  },
  trendsHeaderTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    marginBottom: 12
  },
  trendItem: {
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  trendHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  trendRank: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12
  },
  trendTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    lineHeight: 20
  }
});