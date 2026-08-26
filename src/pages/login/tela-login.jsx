import React, { useEffect, useRef } from "react";
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
  Animated } from
"react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { estilosLogin } from "./designer/estilos-login";




function CampoLogin({ icon, rightIcon, onRightIconPress, style, editable = true, ...props }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
      estilosLogin.field,
      {
        backgroundColor: editable ? colors.surface : colors.cardSecondary || colors.surfaceAlt,
        borderColor: colors.line,
        opacity: editable ? 1 : 0.85
      },
      style]
      }>
      
      {!!icon && <Feather name={icon} size={18} color="#9EA0A5" />}
      <TextInput
        placeholderTextColor="#9EA0A5"
        style={[estilosLogin.fieldInput, { color: colors.text }]}
        editable={editable}
        {...props} />
      
      {!!rightIcon &&
      <Pressable onPress={onRightIconPress} hitSlop={10} style={estilosLogin.fieldRightIcon}>
          <Feather name={rightIcon} size={18} color="#9EA0A5" />
        </Pressable>
      }
    </View>);

}




function BotaoSocial({ title, onPress, disabled, loading }) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={[
      estilosLogin.socialButton,
      {
        backgroundColor: colors.surface || (isDark ? "#20222B" : "#FFFFFF"),
        borderColor: colors.line || (isDark ? "#2C2E38" : "#E1E2E5")
      },
      (disabled || loading) && { opacity: 0.7 }]
      }>
      
      {loading ?
      <ActivityIndicator size="small" color="#EA4335" style={estilosLogin.socialIcon} /> :

      <Image
        source={{ uri: "https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" }}
        style={estilosLogin.socialIcon} />

      }
      <Text style={[estilosLogin.socialText, { color: colors.text }]}>
        {loading ? "Conectando ao Google..." : title}
      </Text>
    </Pressable>);

}




export default function TelaLogin({
  email,
  onChangeEmail,
  password,
  onChangePassword,
  showPassword,
  onTogglePassword,
  busy,
  googleBusy,
  onLogin,
  onGoogleLogin,
  onGoToCadastro,
  onEsqueciSenha
}) {
  const { colors, isDark } = useTheme();


  const animValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(animValue, {
      toValue: 1,
      friction: 4,
      tension: 20,
      useNativeDriver: true
    }).start();
  }, []);

  const fundoClaro = isDark ? colors.background : "#F5F5F7";
  const corCard = isDark ? colors.card || "#181920" : "#FFFFFF";
  const bordaCard = isDark ? colors.line : "rgba(0,0,0,0.04)";

  return (
    <View style={estilosLogin.containerPrincipal}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {}
      <View style={estilosLogin.fundoAbsoluto} pointerEvents="none">
        <View style={estilosLogin.topoFundoEscuro} />
        <View style={[estilosLogin.corpoFundoClaro, { backgroundColor: fundoClaro }]} />
      </View>

      {}
      <KeyboardAvoidingView
        style={estilosLogin.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        
        <ScrollView
          contentContainerStyle={estilosLogin.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          
          {}
          <Animated.View
            style={[
            estilosLogin.logoContainer,
            {
              opacity: animValue,
              transform: [
              { scale: animValue.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
              { translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }]

            }]
            }>
            
            <Ionicons name="people" size={48} color="#FFFFFF" />
            <Text style={estilosLogin.logoTexto}>Tribo</Text>
          </Animated.View>

          {}
          <View style={[estilosLogin.cardFlutuante, { backgroundColor: corCard, borderColor: bordaCard }]}>
            {}
            <View style={[estilosLogin.badgeContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F0F0F0" }]}>
              <Ionicons name="people" size={12} color={colors.text} />
              <Text style={[estilosLogin.badgeText, { color: colors.text }]}>Tribo</Text>
            </View>

            {}
            <Text style={[estilosLogin.tituloCard, { color: colors.text }]}>Entrar</Text>
            <Text style={[estilosLogin.descricaoCard, { color: colors.muted }]}>
              Acesse sua conta para continuar na comunidade Tribo.
            </Text>

            {}
            <CampoLogin
              icon="mail"
              placeholder="E-mail"
              value={email}
              onChangeText={onChangeEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email" />
            

            <CampoLogin
              icon="lock"
              rightIcon={showPassword ? "eye-off" : "eye"}
              onRightIconPress={onTogglePassword}
              placeholder="Senha"
              value={password}
              onChangeText={onChangePassword}
              secureTextEntry={!showPassword}
              autoComplete="password" />
            

            <Pressable
              disabled={busy}
              onPress={onLogin}
              style={[
              estilosLogin.submit,
              { backgroundColor: colors.primary, opacity: busy ? 0.8 : 1 }]
              }>
              
              {busy ?
              <ActivityIndicator color="#ffffff" /> :

              <Text style={estilosLogin.submitText}>Entrar</Text>
              }
            </Pressable>

            <View style={estilosLogin.links}>
              <Pressable onPress={onGoToCadastro}>
                <Text style={[estilosLogin.linkText, { color: colors.primary }]}>
                  Criar conta
                </Text>
              </Pressable>
              <Pressable onPress={onEsqueciSenha}>
                <Text style={[estilosLogin.linkText, { color: colors.muted }]}>
                  Esqueci a senha
                </Text>
              </Pressable>
            </View>

            <View style={estilosLogin.divider}>
              <View style={[estilosLogin.dividerLine, { backgroundColor: colors.line }]} />
              <Text style={estilosLogin.dividerText}>ou</Text>
              <View style={[estilosLogin.dividerLine, { backgroundColor: colors.line }]} />
            </View>

            <View style={estilosLogin.social}>
              <BotaoSocial
                title="Continuar com Google"
                onPress={onGoogleLogin}
                disabled={busy || googleBusy}
                loading={googleBusy} />
              
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>);

}