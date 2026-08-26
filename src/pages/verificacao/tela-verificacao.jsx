import React from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View } from
"react-native";
import { Feather, FontAwesome } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import BaseCardLayout from "../../components/layout/base-card-layout";
import { estilosVerificacao } from "./designer/estilos-verificacao";





export function ModalContaVerificada({ visible, onContinuar }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinuar}>
      <View style={estilosVerificacao.rewardOverlay}>
        <View style={estilosVerificacao.rewardCard}>
          <Image
            source={{
              uri: "https://pub-34192334d7d14328ace69168b62cc510.r2.dev/selo%20de%20verificacao/selo%20azul.png"
            }}
            style={estilosVerificacao.rewardBadgeImage}
            resizeMode="contain" />
          
          <Text style={estilosVerificacao.rewardTitle}>Conta verificada com sucesso!</Text>
          <Text style={estilosVerificacao.rewardMessage}>
            Verificamos seu e-mail! Você acaba de ganhar o Selo de Verificação no seu perfil.
          </Text>
          <Pressable onPress={onContinuar} style={estilosVerificacao.rewardButton}>
            <Text style={estilosVerificacao.rewardButtonText}>Continuar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>);

}
















export default function TelaVerificacao({
  email,
  codigo,
  onChangeCodigo,
  busy,
  reenviando,
  showModal,
  onVerificar,
  onReenviar,
  onVoltarLogin,
  onContinuar
}) {
  const { colors, isDark } = useTheme();

  return (
    <>
      <BaseCardLayout
        showBack
        onBack={onVoltarLogin}
        badgeIcon={<FontAwesome name="star" size={12} color={colors.text} />}
        badgeText="Verificação"
        title="Verifique seu e-mail"
        description="Enviamos um código de segurança de 6 dígitos para o seu e-mail.">
        
        <View style={{ backgroundColor: "#111111", padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: "row", alignItems: "center" }}>
          <Feather name="info" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={{ flex: 1, color: "#FFFFFF", fontSize: 13, lineHeight: 18 }}>
            Não encontrou o código? Verifique a caixa de Spam ou Lixo Eletrônico.
          </Text>
        </View>

        <View
          style={[
          estilosVerificacao.verifyEmailBadge,
          { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6" }]
          }>
          
          <Feather name="mail" size={16} color={colors.muted} />
          <Text style={[estilosVerificacao.verifyEmailText, { color: colors.text }]}>
            {email}
          </Text>
        </View>

        <View style={estilosVerificacao.codeContainer}>
          <TextInput
            maxLength={6}
            style={[
            estilosVerificacao.codeInput,
            {
              borderColor: colors.line,
              backgroundColor: colors.surface,
              color: colors.text
            }]
            }
            value={codigo}
            onChangeText={onChangeCodigo}
            keyboardType="number-pad"
            placeholder="000000"
            placeholderTextColor={colors.subtext || "#999999"}
            autoFocus />
          
        </View>

        <Pressable
          disabled={busy}
          onPress={onVerificar}
          style={[
          estilosVerificacao.submit,
          { backgroundColor: colors.primary, opacity: busy ? 0.8 : 1 }]
          }>
          
          {busy ?
          <ActivityIndicator color="#ffffff" /> :

          <Text style={estilosVerificacao.submitText}>Finalizar</Text>
          }
        </Pressable>

        <View style={estilosVerificacao.resendContainer}>
          <Text style={[estilosVerificacao.resendPrompt, { color: colors.muted }]}>
            Não recebeu o código?
          </Text>
          <Pressable disabled={reenviando} onPress={onReenviar} style={estilosVerificacao.resendButton}>
            <Text style={[estilosVerificacao.resendText, { color: colors.primary }]}>
              {reenviando ? "Reenviando..." : "Reenviar código"}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={onVoltarLogin} style={estilosVerificacao.backToLogin}>
          <Feather name="arrow-left" size={16} color={colors.muted} />
          <Text style={[estilosVerificacao.backToLoginText, { color: colors.muted }]}>
            Voltar para o login
          </Text>
        </Pressable>
      </BaseCardLayout>

      <ModalContaVerificada visible={showModal} onContinuar={onContinuar} />
    </>);

}