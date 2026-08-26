import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View } from
"react-native";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../theme";

export const GUIDELINES_STORAGE_KEY = "@tribo_guidelines_accepted";

export function CommunityGuidelinesModal({ onAccepted }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [loadingStorage, setLoadingStorage] = useState(true);

  useEffect(() => {
    async function checkAccepted() {
      try {
        const accepted = await AsyncStorage.getItem(GUIDELINES_STORAGE_KEY);
        if (accepted !== "true") {
          setVisible(true);
        }
      } catch (err) {
        console.warn("[Guidelines] Erro ao ler status no AsyncStorage:", err);
      } finally {
        setLoadingStorage(false);
      }
    }
    checkAccepted();
  }, []);

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(GUIDELINES_STORAGE_KEY, "true");
    } catch (err) {
      console.warn("[Guidelines] Erro ao salvar status no AsyncStorage:", err);
    }
    setVisible(false);
    onAccepted?.();
  };

  if (loadingStorage || !visible) return null;

  const guidelinesList = [
  {
    icon: "users",
    title: "Respeito Mútuo",
    description:
    "Não toleramos discurso de ódio, assédio, discriminação ou qualquer forma de bullying."
  },
  {
    icon: "eye-off",
    title: "Conteúdo Seguro",
    description:
    "Conteúdos adultos (+18) só são permitidos se a opção for ativada. Shitposts e memes são liberados, respeitando as regras digitais do ECA Digital (Lei nº 15.211/2025)."
  },
  {
    icon: "check-circle",
    title: "Autenticidade",
    description:
    "Não publique spam, fake news, golpes ou mídias de terceiros sem autorização."
  },
  {
    icon: "activity",
    title: "Moderação Ativa",
    description:
    "Mídias enviadas passam por moderação automática (Sightengine). Violações graves podem levar ao banimento da conta."
  }];


  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent>
      
      <View style={styles.overlay}>
        <View
          style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border
          }]
          }>
          
          {}
          <View
            style={[
            styles.iconWrapper,
            {
              backgroundColor: colors.accentSoft || "rgba(29, 155, 240, 0.15)"
            }]
            }>
            
            <Feather
              name="shield"
              size={28}
              color={colors.primary || colors.accent} />
            
          </View>

          {}
          <Text style={[styles.title, { color: colors.text }]}>
            Bem-vindo à Tribo: Diretrizes da Comunidade
          </Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            Para manter nossa comunidade segura e agradável para todos, siga nossas regras:
          </Text>

          {}
          <ScrollView
            style={styles.topicsScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.topicsContent}>
            
            {guidelinesList.map((item, index) =>
            <View
              key={index}
              style={[
              styles.topicRow,
              {
                backgroundColor: colors.surfaceAlt || colors.background,
                borderColor: colors.border
              }]
              }>
              
                <View
                style={[
                styles.topicIconContainer,
                {
                  backgroundColor: colors.card
                }]
                }>
                
                  <Feather
                  name={item.icon}
                  size={18}
                  color={colors.primary || colors.accent} />
                
                </View>
                <View style={styles.topicTextContainer}>
                  <Text style={[styles.topicTitle, { color: colors.text }]}>
                    {index + 1}. {item.title}
                  </Text>
                  <Text style={[styles.topicDescription, { color: colors.subtext }]}>
                    {item.description}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {}
          <Pressable
            style={({ pressed }) => [
            styles.acceptButton,
            {
              backgroundColor: colors.primary || colors.accent,
              opacity: pressed ? 0.85 : 1
            }]
            }
            onPress={handleAccept}>
            
            <Feather
              name="check"
              size={18}
              color="#FFFFFF"
              style={{ marginRight: 8 }} />
            
            <Text style={styles.acceptButtonText}>Entendi e Aceito</Text>
          </Pressable>
        </View>
      </View>
    </Modal>);

}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 32
  },
  card: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "88%",
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 17,
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 24
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 18
  },
  topicsScroll: {
    width: "100%",
    marginBottom: 20
  },
  topicsContent: {
    gap: 10
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12
  },
  topicIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  topicTextContainer: {
    flex: 1
  },
  topicTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13.5,
    marginBottom: 3
  },
  topicDescription: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 17
  },
  acceptButton: {
    width: "100%",
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  acceptButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF"
  }
});

export default CommunityGuidelinesModal;