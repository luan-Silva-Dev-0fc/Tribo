import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { api, getUploadUrl } from "../../api";
import { Button, IconButton, Input } from "../../components/ui/ui";
import { errorMessage } from "../../lib/format";
import { useTheme } from "../../theme";
import { TriboAlertModal } from "../../components/modals/tribo-alert-modal";

export function CreateTribeScreen({ onCreated, onBack, user }) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [rules, setRules] = useState("");
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false });

  const showAlert = (config) => {
    setAlertConfig({ visible: true, ...config });
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        return showAlert({
          type: "error",
          title: "Permissão necessária",
          message: "Permita o acesso às fotos.",
          onClose: () => setAlertConfig({ visible: false })
        });
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0]);
      }
    } catch (err) {
      console.warn("Erro ao selecionar imagem", err);
    }
  };

  const create = async () => {
    if (!name.trim()) {
      return showAlert({
        type: "warning",
        title: "Nome obrigatório",
        message: "Por favor, insira o nome da tribo.",
        onClose: () => setAlertConfig({ visible: false })
      });
    }
    try {
      setBusy(true);
      let avatarUrl = null;
      
      if (image) {
        const uploadRes = await api.uploads.photo(
          image.uri,
          image.fileName || image.name || "avatar.jpg",
          image.mimeType || image.type || "image/jpeg"
        );
        avatarUrl = getUploadUrl(uploadRes) || uploadRes?.url || uploadRes?.fileUrl || uploadRes?.avatar_url || uploadRes?.mediaUrl;
      }

      const res = await api.groups.create({
        name: name.trim(),
        rules: rules.trim(),
        avatarUrl,
        avatar_url: avatarUrl,
        avatar: avatarUrl,
      });
      
      const createdId = res?.group?.id || res?.id;
      if (!createdId) throw new Error("ID do grupo não retornado pela API");

      showAlert({
        type: "success",
        title: "Tribo criada!",
        message: "Sua tribo foi criada com sucesso.",
        onClose: () => {
          setAlertConfig({ visible: false });
          onCreated(createdId);
        }
      });
    } catch (error) {
      showAlert({
        type: "error",
        title: "Erro ao criar",
        message: errorMessage(error),
        onClose: () => setAlertConfig({ visible: false })
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <IconButton name="arrow-left" onPress={onBack} label="Voltar" />
        <Text style={[styles.title, { color: colors.text }]}>Criar Tribo</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView contentContainerStyle={styles.form}>
        <View style={styles.imageSelector}>
          <Pressable onPress={pickImage} style={[styles.imagePreview, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.imageFilled} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Feather name="camera" size={32} color={colors.muted} />
                <Text style={[styles.imageText, { color: colors.muted }]}>Foto da Tribo</Text>
              </View>
            )}
          </Pressable>
        </View>
        <Input
          label="Nome da Tribo"
          placeholder="Ex: Desenvolvedores BR"
          value={name}
          onChangeText={setName}
          maxLength={50}
        />
        <Input
          label="Regras da Tribo"
          placeholder="Ex: Proibido spam, respeitar os membros..."
          value={rules}
          onChangeText={setRules}
          multiline
          numberOfLines={4}
          maxLength={300}
        />
        <View style={styles.spacer} />
        <Button
          title="Criar Tribo"
          onPress={create}
          loading={busy}
          variant="primary"
        />
      </ScrollView>

      <TriboAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={alertConfig.onClose || (() => setAlertConfig({ visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    zIndex: 10,
  },
  title: { fontSize: 20, fontFamily: "Poppins_700Bold", letterSpacing: -0.5 },
  form: { padding: 24, gap: 16 },
  imageSelector: { alignItems: "center", marginBottom: 24 },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: "solid",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  imageFilled: { width: "100%", height: "100%", borderRadius: 60 },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  spacer: { height: 16 },
});
