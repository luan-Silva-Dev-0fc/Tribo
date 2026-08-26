import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View } from
"react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { userName } from "../../lib/format";
import { Avatar } from "../ui/ui";

const BAN_REASON_PRESETS = [
"Spam / Mensagens em massa",
"Comportamento Inadequado",
"Desrespeito às Regras",
"Discurso de Ódio / Ofensas",
"Assédio / Intimidação",
"Conteúdo Impróprio"];


export function BanReasonModal({
  visible,
  member,
  onClose,
  onConfirmBan,
  loading = false
}) {
  const { colors, mode, isDark: themeIsDark } = useTheme();
  const isDark =
  themeIsDark ?? (
  mode === "dark" || mode === "oled" || colors?.background !== "#f5f5f7");
  const [reason, setReason] = useState("Comportamento Inadequado");
  const [hasError, setHasError] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(0.92)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setReason("Comportamento Inadequado");
      setHasError(false);
      Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 70,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true
      })]
      ).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible || !member) return null;

  const memberUser = member.user || member.author || member;
  const name =
  userName(memberUser) || memberUser.name || memberUser.username || "Membro";

  const handleSelectPreset = (preset) => {
    setReason(preset);
    setHasError(false);
  };

  const handleTextChange = (text) => {
    setReason(text);
    if (text.trim()) {
      setHasError(false);
    }
  };

  const handleConfirm = () => {
    if (!reason.trim()) {
      setHasError(true);
      return;
    }
    onConfirmBan?.(member, reason.trim());
  };

  const isFormValid = Boolean(reason.trim());

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[
          styles.card,
          {
            backgroundColor: isDark ? "#121214" : "#ffffff",
            borderColor: isDark ? "#27272a" : "#e4e4e7",
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim
          }]
          }>
          
          <Pressable
            style={styles.cardInner}
            onPress={(e) => e.stopPropagation()}>
            
            {}
            <View
              style={[
              styles.iconBadge,
              {
                backgroundColor: isDark ?
                "rgba(239, 68, 68, 0.16)" :
                "#fee2e2",
                borderColor: isDark ? "rgba(239, 68, 68, 0.35)" : "#fca5a5"
              }]
              }>
              
              <Feather name="slash" size={26} color="#ef4444" />
            </View>

            {}
            <Text
              style={[styles.title, { color: isDark ? "#f4f4f5" : "#09090b" }]}>
              
              Banir Membro
            </Text>

            <View style={styles.userRow}>
              <Avatar user={memberUser} size={30} />
              <Text
                style={[
                styles.userName,
                { color: isDark ? "#e4e4e7" : "#18181b" }]
                }
                numberOfLines={1}>
                
                {name}
              </Text>
            </View>

            <Text
              style={[
              styles.description,
              { color: isDark ? "#a1a1aa" : "#64748b" }]
              }>
              
              O membro será removido da tribo e proibido de retornar. O
              preenchimento do{" "}
              <Text
                style={{ color: "#ef4444", fontFamily: "Poppins_600SemiBold" }}>
                
                motivo é obrigatório
              </Text>
              :
            </Text>

            {}
            <View style={styles.chipsContainer}>
              {BAN_REASON_PRESETS.map((preset) => {
                const isSelected = reason === preset;
                return (
                  <Pressable
                    key={preset}
                    onPress={() => handleSelectPreset(preset)}
                    style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: isSelected ?
                      isDark ?
                      "rgba(239, 68, 68, 0.2)" :
                      "#fee2e2" :
                      isDark ?
                      "rgba(255, 255, 255, 0.05)" :
                      "#f1f5f9",
                      borderColor: isSelected ?
                      "#ef4444" :
                      isDark ?
                      "rgba(255, 255, 255, 0.1)" :
                      "#e2e8f0",
                      opacity: pressed ? 0.75 : 1
                    }]
                    }>
                    
                    <Text
                      style={[
                      styles.chipText,
                      {
                        color: isSelected ?
                        "#ef4444" :
                        isDark ?
                        "#d4d4d8" :
                        "#475569",
                        fontFamily: isSelected ?
                        "Poppins_600SemiBold" :
                        "Poppins_500Medium"
                      }]
                      }>
                      
                      {preset}
                    </Text>
                  </Pressable>);

              })}
            </View>

            {}
            <View style={{ width: "100%", marginBottom: 16 }}>
              <TextInput
                style={[
                styles.input,
                {
                  backgroundColor: isDark ?
                  "rgba(255, 255, 255, 0.04)" :
                  "#f8fafc",
                  borderColor: hasError ?
                  "#ef4444" :
                  isDark ?
                  "rgba(255, 255, 255, 0.1)" :
                  "#e2e8f0",
                  color: isDark ? "#f4f4f5" : "#09090b"
                }]
                }
                multiline
                numberOfLines={3}
                placeholder="Descreva detalhadamente o motivo do banimento..."
                placeholderTextColor={isDark ? "#71717a" : "#94a3b8"}
                value={reason}
                onChangeText={handleTextChange}
                maxLength={200} />
              
              {hasError &&
              <Text style={styles.errorText}>
                  * O motivo do banimento é obrigatório.
                </Text>
              }
            </View>

            {}
            <View style={styles.buttonRow}>
              <Pressable
                onPress={onClose}
                disabled={loading}
                style={({ pressed }) => [
                styles.cancelBtn,
                {
                  backgroundColor: isDark ?
                  "rgba(255, 255, 255, 0.06)" :
                  "#f1f5f9",
                  borderColor: isDark ?
                  "rgba(255, 255, 255, 0.1)" :
                  "#e2e8f0",
                  opacity: pressed ? 0.75 : 1
                }]
                }>
                
                <Text
                  style={[
                  styles.cancelBtnText,
                  { color: isDark ? "#e4e4e7" : "#334155" }]
                  }>
                  
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                disabled={loading || !isFormValid}
                style={({ pressed }) => [
                styles.banConfirmBtn,
                {
                  backgroundColor: isFormValid ?
                  "#ef4444" :
                  isDark ?
                  "#3f3f46" :
                  "#cbd5e1",
                  opacity: pressed || loading ? 0.8 : isFormValid ? 1 : 0.6
                }]
                }>
                
                {loading ?
                <ActivityIndicator size="small" color="#ffffff" /> :

                <Text style={styles.banConfirmBtnText}>
                    Confirmar Banimento
                  </Text>
                }
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>);

}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
  },
  card: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
    overflow: "hidden"
  },
  cardInner: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: "center",
    width: "100%"
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 12
  },
  title: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    marginBottom: 6
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10
  },
  userName: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5
  },
  description: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 4
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginBottom: 12,
    width: "100%"
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1
  },
  chipText: {
    fontSize: 11
  },
  input: {
    width: "100%",
    minHeight: 65,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    textAlignVertical: "top"
  },
  errorText: {
    color: "#ef4444",
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    marginTop: 4,
    marginLeft: 4
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%"
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5
  },
  banConfirmBtn: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4
  },
  banConfirmBtnText: {
    color: "#ffffff",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5
  }
});