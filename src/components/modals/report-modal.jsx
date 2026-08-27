import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View } from
"react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../api";
import { errorMessage } from "../../lib/format";
import { useTheme } from "../../theme";
import { Button, IconButton, CustomModal } from "../ui/ui";

const REPORT_REASONS = [
"Spam ou Golpe",
"Discurso de ódio ou discriminação",
"Assédio ou Bullying",
"Conteúdo sexualmente explícito / Nudez",
"Violência ou ameaças",
"Desinformação prejudicial",
"Outro motivo"];


export function ReportModal({
  visible,
  targetType = "POST",
  targetId,
  authorId,
  targetName,
  onClose,
  onSuccess
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
    onCloseAction: null
  });

  if (!visible) return null;

  const targetLabel =
  targetType === "USER" ?
  "este usuário" :
  targetType === "POST" ?
  "esta publicação" :
  "este comentário";

  const handleConfirm = async () => {
    if (!targetId) return;

    try {
      const finalReason =
      selectedReason === "Outro motivo" && details.trim() ?
      `Outro: ${details.trim()}` :
      selectedReason;

      setSubmitting(true);


      await api.reports.create(finalReason, targetType, targetId);


      const targetUserId = authorId || (targetType === "USER" ? targetId : null);
      if (targetUserId) {
        try {
          await api.users.block(targetUserId);
        } catch (blockErr) {

          console.log("Nota sobre bloqueio automático:", blockErr?.message);
        }
      }

      setCustomAlert({
        visible: true,
        type: "success",
        title: "Denúncia Enviada",
        message: "Agradecemos por manter a comunidade segura. Este usuário foi bloqueado e o conteúdo não será mais exibido para você.",
        onCloseAction: () => {
          onClose();
          onSuccess?.({ targetType, targetId, authorId: targetUserId });
        }
      });
    } catch (error) {
      setCustomAlert({
        visible: true,
        type: "error",
        title: "Erro ao Enviar Denúncia",
        message: errorMessage(error),
        onCloseAction: null
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.line, paddingBottom: Math.max(insets.bottom, 20) + 8 }]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
            <Feather name="shield-alert" size={18} color="#ef4444" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Denunciar e Bloquear</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {targetName ? `Denunciando ${targetName}` : `Denunciando ${targetLabel}`}
            </Text>
          </View>
          <IconButton name="x" small onPress={onClose} label="Fechar" />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
          <View style={[styles.warningBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.line }]}>
            <Feather name="info" size={16} color={colors.accent} style={{ marginTop: 2 }} />
            <Text style={[styles.warningText, { color: colors.muted }]}>
              Ao confirmar a denúncia, nossa equipe analisará o conteúdo e o autor será{" "}
              <Text style={{ color: colors.text, fontWeight: "600" }}>bloqueado automaticamente</Text> da sua conta.
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Selecione o motivo principal:
          </Text>

          <View style={styles.reasonsList}>
            {REPORT_REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <Pressable
                  key={reason}
                  onPress={() => setSelectedReason(reason)}
                  style={[
                  styles.reasonItem,
                  {
                    backgroundColor: isSelected ? "rgba(239, 68, 68, 0.12)" : colors.surfaceAlt,
                    borderColor: isSelected ? "#ef4444" : colors.line
                  }]
                  }>
                  
                  <View
                    style={[
                    styles.radioCircle,
                    { borderColor: isSelected ? "#ef4444" : colors.muted }]
                    }>
                    
                    {isSelected && <View style={[styles.radioDot, { backgroundColor: "#ef4444" }]} />}
                  </View>
                  <Text
                    style={[
                    styles.reasonText,
                    { color: isSelected ? "#ef4444" : colors.text, fontWeight: isSelected ? "600" : "400" }]
                    }>
                    
                    {reason}
                  </Text>
                </Pressable>);

            })}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Detalhes adicionais (opcional):
          </Text>

          <TextInput
            placeholder="Descreva brevemente o que aconteceu..."
            placeholderTextColor={colors.muted}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={3}
            style={[
            styles.input,
            {
              backgroundColor: colors.surfaceAlt,
              borderColor: colors.line,
              color: colors.text
            }]
            } />
          

          <View style={styles.actions}>
            <Button
              title="Cancelar"
              variant="secondary"
              onPress={onClose}
              disabled={submitting}
              style={{ flex: 1 }} />
            
            <Pressable
              disabled={submitting}
              onPress={handleConfirm}
              style={({ pressed }) => [
              styles.confirmButton,
              {
                backgroundColor: "#ef4444",
                opacity: pressed || submitting ? 0.65 : 1
              }]
              }>
              
              {submitting ?
              <ActivityIndicator color="#ffffff" size="small" /> :

              <>
                  <Feather name="slash" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmText}>Denunciar e Bloquear</Text>
                </>
              }
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <CustomModal
        visible={customAlert.visible}
        type={customAlert.type}
        title={customAlert.title}
        message={customAlert.message}
        onClose={() => {
          setCustomAlert((prev) => ({ ...prev, visible: false }));
          if (customAlert.onCloseAction) {
            customAlert.onCloseAction();
          }
        }} />
      
    </Modal>);

}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.65)"
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "88%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 20
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 12
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  headerText: {
    flex: 1
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    marginTop: 1
  },
  body: {
    paddingBottom: 20
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10
  },
  warningText: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 12.5,
    lineHeight: 18
  },
  sectionLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    marginBottom: 8,
    marginTop: 4
  },
  reasonsList: {
    gap: 8,
    marginBottom: 16
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  reasonText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontFamily: "Poppins_400Regular",
    fontSize: 13.5,
    minHeight: 70,
    textAlignVertical: "top",
    marginBottom: 20
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center"
  },
  confirmButton: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14
  },
  confirmText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14
  }
});