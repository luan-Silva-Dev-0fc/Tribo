import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme";
import { estilosCadastro } from "./designer/estilos-cadastro";

const TITULOS_PASSO = {
  1: "Como você se chama?",
  2: "Qual é o seu e-mail?",
  3: "Crie uma senha forte",
  4: "Foto de perfil",
  5: "Conte um pouco sobre você"
};

function CampoCadastro({
  icon,
  rightIcon,
  onRightIconPress,
  style,
  editable = true,
  onFocus,
  ...props
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        estilosCadastro.field,
        {
          backgroundColor: editable
            ? colors.surface
            : colors.cardSecondary || colors.surfaceAlt,
          borderColor: colors.line,
          opacity: editable ? 1 : 0.85
        },
        style
      ]}>
      {!!icon && <Feather name={icon} size={18} color="#9EA0A5" />}
      <TextInput
        placeholderTextColor="#9EA0A5"
        style={[estilosCadastro.fieldInput, { color: colors.text }]}
        editable={editable}
        onFocus={onFocus}
        {...props}
      />

      {!!rightIcon && (
        <Pressable
          onPress={onRightIconPress}
          hitSlop={10}
          style={estilosCadastro.fieldRightIcon}>
          <Feather name={rightIcon} size={18} color="#9EA0A5" />
        </Pressable>
      )}
    </View>
  );
}

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
  onSubmit
}) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const handleInputFocus = (offset = 60) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: offset, animated: true });
    }, 100);
  };

  const corCard = isDark ? colors.card || "#16171d" : "#FFFFFF";
  const bordaCard = isDark ? colors.line || "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const descricaoPasso = {
    1: "Informe seu nome e sobrenome para que as pessoas encontrem você.",
    2: isGoogleProvider
      ? "E-mail validado e vinculado diretamente à sua conta Google."
      : "Usaremos este e-mail para validar sua conta e enviar avisos de segurança.",
    3: "Sua senha deve ter no mínimo 6 caracteres para proteger sua conta.",
    4: "Adicione uma foto para personalizar seu perfil na comunidade.",
    5: "Escreva uma breve biografia ou interesses para compartilhar."
  };

  return (
    <View style={[estilosCadastro.containerPrincipal, { backgroundColor: colors.background || "#000000" }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={estilosCadastro.ambientGlow} />

      <KeyboardAvoidingView
        style={estilosCadastro.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            estilosCadastro.scrollContent,
            {
              justifyContent: keyboardVisible ? "flex-start" : "center",
              paddingTop: Math.max(insets.top, 20) + (keyboardVisible ? 8 : 16),
              paddingBottom: keyboardVisible ? 280 : Math.max(insets.bottom, 20) + 24
            }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={estilosCadastro.cabecalho}>
            <Pressable
              onPress={onBack}
              hitSlop={12}
              style={estilosCadastro.botaoVoltar}
              accessibilityLabel="Voltar">
              <Feather name="arrow-left" size={20} color="#FFFFFF" />
            </Pressable>
            <View style={estilosCadastro.logoContainer}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
              <Text style={estilosCadastro.logoTexto}>Tribo</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <View style={[estilosCadastro.cardFlutuante, { backgroundColor: corCard, borderColor: bordaCard }]}>
            <View style={estilosCadastro.progressRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    estilosCadastro.progressDot,
                    { backgroundColor: isDark ? "#2C2E38" : "#E4E4E7" },
                    i <= step && { backgroundColor: colors.primary || colors.text }
                  ]}
                />
              ))}
            </View>

            <View
              style={[
                estilosCadastro.badgeContainer,
                {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.08)"
                    : "#F0F0F0"
                }
              ]}>
              <Ionicons name="people" size={12} color={colors.text} />
              <Text style={[estilosCadastro.badgeText, { color: colors.text }]}>
                Passo {step} de 5
              </Text>
            </View>

            <Text style={[estilosCadastro.tituloCard, { color: colors.text }]}>
              {TITULOS_PASSO[step]}
            </Text>
            <Text style={[estilosCadastro.descricaoCard, { color: colors.muted }]}>
              {descricaoPasso[step]}
            </Text>

            {step === 1 && (
              <View>
                <CampoCadastro
                  icon="user"
                  placeholder="Nome"
                  value={firstName}
                  onChangeText={onChangeFirstName}
                  autoCapitalize="words"
                  autoFocus
                  onFocus={() => handleInputFocus(40)}
                />

                <CampoCadastro
                  icon="user"
                  placeholder="Sobrenome (opcional)"
                  value={lastName}
                  onChangeText={onChangeLastName}
                  autoCapitalize="words"
                  onFocus={() => handleInputFocus(90)}
                />

                <Pressable
                  onPress={onNext}
                  style={[
                    estilosCadastro.submit,
                    { backgroundColor: colors.primary }
                  ]}>
                  <Text style={estilosCadastro.submitText}>Próximo</Text>
                </Pressable>
              </View>
            )}

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
                  onFocus={() => handleInputFocus(40)}
                />

                {isGoogleProvider && (
                  <View style={estilosCadastro.googleVerifiedBadge}>
                    <Feather name="check-circle" size={14} color="#10B981" />
                    <Text style={estilosCadastro.googleVerifiedText}>
                      Conta Google Conectada
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={onNext}
                  style={[
                    estilosCadastro.submit,
                    { backgroundColor: colors.primary }
                  ]}>
                  <Text style={estilosCadastro.submitText}>Próximo</Text>
                </Pressable>
              </View>
            )}

            {step === 3 && (
              <View>
                <CampoCadastro
                  icon="lock"
                  rightIcon={showPassword ? "eye-off" : "eye"}
                  onRightIconPress={onTogglePassword}
                  placeholder="Senha segura"
                  value={password}
                  onChangeText={onChangePassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  autoFocus
                  onFocus={() => handleInputFocus(40)}
                />

                <Pressable
                  onPress={onNext}
                  style={[
                    estilosCadastro.submit,
                    { backgroundColor: colors.primary }
                  ]}>
                  <Text style={estilosCadastro.submitText}>Próximo</Text>
                </Pressable>
              </View>
            )}

            {step === 4 && (
              <View style={estilosCadastro.stepCenter}>
                <Pressable
                  onPress={onPickAvatar}
                  style={estilosCadastro.avatarPreviewContainer}>
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={[
                        estilosCadastro.avatarPreview,
                        { borderColor: colors.primary }
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        estilosCadastro.avatarPlaceholder,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.line
                        }
                      ]}>
                      <Feather name="user" size={42} color={colors.muted} />
                    </View>
                  )}
                  <View
                    style={[
                      estilosCadastro.avatarCameraBadge,
                      { backgroundColor: colors.primary }
                    ]}>
                    <Feather name="camera" size={14} color="#ffffff" />
                  </View>
                </Pressable>

                <Pressable
                  onPress={onPickAvatar}
                  style={[
                    estilosCadastro.secondaryButton,
                    { borderColor: colors.line, backgroundColor: colors.surface }
                  ]}>
                  <Feather
                    name={avatarUri ? "refresh-cw" : "upload"}
                    size={16}
                    color={colors.text}
                  />
                  <Text
                    style={[
                      estilosCadastro.secondaryButtonText,
                      { color: colors.text }
                    ]}>
                    {avatarUri ? "Trocar foto" : "Escolher foto"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={onNext}
                  style={[
                    estilosCadastro.submit,
                    { backgroundColor: colors.primary }
                  ]}>
                  <Text style={estilosCadastro.submitText}>Próximo</Text>
                </Pressable>

                <Pressable onPress={onNext} style={estilosCadastro.skipButton}>
                  <Text
                    style={[
                      estilosCadastro.skipButtonText,
                      { color: colors.muted }
                    ]}>
                    Agora não / Pular
                  </Text>
                </Pressable>
              </View>
            )}

            {step === 5 && (
              <View>
                <View
                  style={[
                    estilosCadastro.bioContainer,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.line
                    }
                  ]}>
                  <TextInput
                    placeholder="Ex: Apaixonado por tecnologia, música e fotografia..."
                    placeholderTextColor="#9EA0A5"
                    value={bio}
                    onChangeText={onChangeBio}
                    multiline
                    numberOfLines={4}
                    maxLength={160}
                    style={[estilosCadastro.bioInput, { color: colors.text }]}
                    autoFocus
                    onFocus={() => handleInputFocus(50)}
                  />
                  <Text style={estilosCadastro.bioCounter}>
                    {(bio || "").length}/160
                  </Text>
                </View>

                <Pressable
                  disabled={busy}
                  onPress={onSubmit}
                  style={[
                    estilosCadastro.submit,
                    {
                      backgroundColor: colors.primary,
                      opacity: busy ? 0.8 : 1
                    }
                  ]}>
                  {busy ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={estilosCadastro.submitText}>
                      Finalizar Cadastro
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={onSkip}
                  style={estilosCadastro.skipButton}>
                  <Text
                    style={[
                      estilosCadastro.skipButtonText,
                      { color: colors.muted }
                    ]}>
                    Agora não / Pular
                  </Text>
                </Pressable>
              </View>
            )}

            <Pressable
              onPress={onGoToLogin}
              style={estilosCadastro.backToLoginBottom}>
              <Text
                style={[estilosCadastro.linkText, { color: colors.primary }]}>
                Já tem uma conta? Entrar
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
