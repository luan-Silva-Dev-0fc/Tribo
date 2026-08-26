import React from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { estilosCadastro } from "./designer/estilos-cadastro";

const TITULOS_PASSO = {
  1: "Como você se chama?",
  2: "Qual é o seu e-mail?",
  3: "Crie uma senha forte",
  4: "Foto de perfil",
  5: "Conte um pouco sobre você",
};

/**
 * Campo de formulário reutilizável para a tela de Cadastro.
 */
function CampoCadastro({ icon, rightIcon, onRightIconPress, style, editable = true, ...props }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        estilosCadastro.field,
        {
          backgroundColor: editable ? colors.surface : colors.cardSecondary || colors.surfaceAlt,
          borderColor: colors.line,
          opacity: editable ? 1 : 0.85,
        },
        style,
      ]}
    >
      {!!icon && <Feather name={icon} size={18} color="#9EA0A5" />}
      <TextInput
        placeholderTextColor="#9EA0A5"
        style={[estilosCadastro.fieldInput, { color: colors.text }]}
        editable={editable}
        {...props}
      />
      {!!rightIcon && (
        <Pressable onPress={onRightIconPress} hitSlop={10} style={estilosCadastro.fieldRightIcon}>
          <Feather name={rightIcon} size={18} color="#9EA0A5" />
        </Pressable>
      )}
    </View>
  );
}

/**
 * Tela de Cadastro — wizard de 5 passos com card flutuante sobre fundo dividido.
 */
export default function TelaCadastro({
  step,
  isGoogleProvider,
  firstName,
  onChangeFirstName,
  lastName,
  onChangeLastName,
  email,
  onChangeEmail,
  password,
  onChangePassword,
  showPassword,
  onTogglePassword,
  avatarUri,
  onPickAvatar,
  bio,
  onChangeBio,
  busy,
  onNext,
  onSkip,
  onBack,
  onGoToLogin,
  onSubmit,
}) {
  const { colors, isDark } = useTheme();

  const fundoClaro = isDark ? colors.background : "#F5F5F7";
  const corCard = isDark ? (colors.card || "#181920") : "#FFFFFF";
  const bordaCard = isDark ? colors.line : "rgba(0,0,0,0.04)";

  const descricaoPasso = {
    1: "Informe seu nome e sobrenome para que as pessoas encontrem você.",
    2: isGoogleProvider
      ? "E-mail validado e vinculado diretamente à sua conta Google."
      : "Usaremos este e-mail para validar sua conta e enviar avisos de segurança.",
    3: "Sua senha deve ter no mínimo 6 caracteres para proteger sua conta.",
    4: "Adicione uma foto para personalizar seu perfil na comunidade.",
    5: "Escreva uma breve biografia ou interesses para compartilhar.",
  };

  return (
    <View style={estilosCadastro.containerPrincipal}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* CAMADA 1: FUNDO ABSOLUTO — fica atrás de tudo */}
      <View style={estilosCadastro.fundoAbsoluto} pointerEvents="none">
        <View style={estilosCadastro.topoFundoEscuro} />
        <View style={[estilosCadastro.corpoFundoClaro, { backgroundColor: fundoClaro }]} />
      </View>

      {/* CAMADA 2: CONTEÚDO — fica por cima do fundo */}
      <KeyboardAvoidingView
        style={estilosCadastro.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={estilosCadastro.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* CABEÇALHO: botão voltar + logo */}
          <View style={estilosCadastro.cabecalho}>
            <Pressable
              onPress={onBack}
              hitSlop={12}
              style={estilosCadastro.botaoVoltar}
              accessibilityLabel="Voltar"
            >
              <Feather name="arrow-left" size={20} color="#FFFFFF" />
            </Pressable>
            <View style={estilosCadastro.logoContainer}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
              <Text style={estilosCadastro.logoTexto}>Tribo</Text>
            </View>
          </View>

          {/* CARD FLUTUANTE */}
          <View style={[estilosCadastro.cardFlutuante, { backgroundColor: corCard, borderColor: bordaCard }]}>

            {/* Indicador de progresso */}
            <View style={estilosCadastro.progressRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    estilosCadastro.progressDot,
                    { backgroundColor: isDark ? "#2C2E38" : "#E4E4E7" },
                    i <= step && { backgroundColor: colors.text },
                  ]}
                />
              ))}
            </View>

            {/* Badge */}
            <View style={[estilosCadastro.badgeContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F0F0F0" }]}>
              <Ionicons name="people" size={12} color={colors.text} />
              <Text style={[estilosCadastro.badgeText, { color: colors.text }]}>
                Passo {step} de 5
              </Text>
            </View>

            {/* Título e descrição */}
            <Text style={[estilosCadastro.tituloCard, { color: colors.text }]}>
              {TITULOS_PASSO[step]}
            </Text>
            <Text style={[estilosCadastro.descricaoCard, { color: colors.muted }]}>
              {descricaoPasso[step]}
            </Text>

            {/* PASSO 1: NOME E SOBRENOME */}
            {step === 1 && (
              <View>
                <CampoCadastro
                  icon="user"
                  placeholder="Nome"
                  value={firstName}
                  onChangeText={onChangeFirstName}
                  autoCapitalize="words"
                  autoFocus
                />
                <CampoCadastro
                  icon="user"
                  placeholder="Sobrenome (opcional)"
                  value={lastName}
                  onChangeText={onChangeLastName}
                  autoCapitalize="words"
                />
                <Pressable
                  onPress={onNext}
                  style={[estilosCadastro.submit, { backgroundColor: colors.primary }]}
                >
                  <Text style={estilosCadastro.submitText}>Próximo</Text>
                </Pressable>
              </View>
            )}

            {/* PASSO 2: E-MAIL */}
            {step === 2 && (
              <View>
                <CampoCadastro
                  icon="mail"
                  rightIcon={isGoogleProvider ? "lock" : undefined}
                  editable={!isGoogleProvider}
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChangeText={onChangeEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus={!isGoogleProvider}
                />
                {isGoogleProvider && (
                  <View style={estilosCadastro.googleVerifiedBadge}>
                    <Feather name="check-circle" size={14} color="#10B981" />
                    <Text style={estilosCadastro.googleVerifiedText}>
                      E-mail autenticado pelo Google (somente leitura)
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={onNext}
                  style={[estilosCadastro.submit, { backgroundColor: colors.primary }]}
                >
                  <Text style={estilosCadastro.submitText}>Próximo</Text>
                </Pressable>
              </View>
            )}

            {/* PASSO 3: SENHA */}
            {step === 3 && (
              <View>
                <CampoCadastro
                  icon="lock"
                  rightIcon={showPassword ? "eye-off" : "eye"}
                  onRightIconPress={onTogglePassword}
                  placeholder="Sua senha secreta"
                  value={password}
                  onChangeText={onChangePassword}
                  secureTextEntry={!showPassword}
                  autoFocus
                />
                <Pressable
                  onPress={onNext}
                  style={[estilosCadastro.submit, { backgroundColor: colors.primary }]}
                >
                  <Text style={estilosCadastro.submitText}>Próximo</Text>
                </Pressable>
              </View>
            )}

            {/* PASSO 4: FOTO DE PERFIL (OPCIONAL) */}
            {step === 4 && (
              <View style={estilosCadastro.stepCenter}>
                <View style={estilosCadastro.avatarPreviewContainer}>
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={[estilosCadastro.avatarPreview, { borderColor: colors.text }]}
                    />
                  ) : (
                    <View
                      style={[
                        estilosCadastro.avatarPlaceholder,
                        { backgroundColor: colors.surface, borderColor: colors.line },
                      ]}
                    >
                      <Feather name="user" size={48} color="#9EA0A5" />
                    </View>
                  )}
                  <Pressable
                    onPress={onPickAvatar}
                    style={[estilosCadastro.avatarCameraBadge, { backgroundColor: colors.primary }]}
                  >
                    <Feather name="camera" size={16} color="#ffffff" />
                  </Pressable>
                </View>

                <Pressable
                  onPress={onPickAvatar}
                  style={[
                    estilosCadastro.secondaryButton,
                    { borderColor: colors.line, backgroundColor: colors.surface },
                  ]}
                >
                  <Feather name="image" size={18} color={colors.text} />
                  <Text style={[estilosCadastro.secondaryButtonText, { color: colors.text }]}>
                    {avatarUri ? "Alterar foto" : "Escolher foto"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onNext}
                  style={[estilosCadastro.submit, { backgroundColor: colors.primary }]}
                >
                  <Text style={estilosCadastro.submitText}>Próximo</Text>
                </Pressable>

                <Pressable onPress={onSkip} style={estilosCadastro.skipButton}>
                  <Text style={[estilosCadastro.skipButtonText, { color: colors.muted }]}>
                    Agora não / Pular
                  </Text>
                </Pressable>
              </View>
            )}

            {/* PASSO 5: BIOGRAFIA (OPCIONAL) */}
            {step === 5 && (
              <View>
                <View
                  style={[
                    estilosCadastro.bioContainer,
                    { borderColor: colors.line, backgroundColor: colors.surface },
                  ]}
                >
                  <TextInput
                    placeholder="Ex: Designer, apaixonado por tecnologia e viagens..."
                    placeholderTextColor="#9EA0A5"
                    value={bio}
                    onChangeText={(text) => onChangeBio(text.slice(0, 160))}
                    multiline
                    numberOfLines={4}
                    style={[estilosCadastro.bioInput, { color: colors.text }]}
                    autoFocus
                  />
                  <Text style={estilosCadastro.bioCounter}>{bio.length}/160</Text>
                </View>

                <Pressable
                  disabled={busy}
                  onPress={onSubmit}
                  style={[
                    estilosCadastro.submit,
                    { backgroundColor: colors.primary, opacity: busy ? 0.8 : 1 },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={estilosCadastro.submitText}>Finalizar Cadastro</Text>
                  )}
                </Pressable>

                <Pressable disabled={busy} onPress={onSkip} style={estilosCadastro.skipButton}>
                  <Text style={[estilosCadastro.skipButtonText, { color: colors.muted }]}>
                    Agora não / Pular
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Rodapé: link para login */}
            <Pressable onPress={onGoToLogin} style={estilosCadastro.backToLoginBottom}>
              <Text style={[estilosCadastro.linkText, { color: colors.primary }]}>
                Já tem uma conta? Entrar
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
