import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { getUserAvatar } from "../../lib/format";
import { useTheme } from "../../theme";

export function IconButton({ name, onPress, label, color, small = false, style }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label || name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        small && styles.iconSmall,
        {
          backgroundColor: colors.surfaceAlt,
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
        style,
      ]}
    >
      <Feather name={name} size={small ? 16 : 20} color={color || colors.text} />
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  icon,
  loading,
  disabled,
  variant = "primary",
  compact = false,
  style,
  textStyle,
}) {
  const { colors } = useTheme();
  const isSecondary = variant === "secondary";
  const isAccent = variant === "accent";
  const isOutline = variant === "outline";
  const isDestructive = variant === "destructive" || variant === "danger";

  let bg = colors.accent;
  let textColor = "#ffffff";
  let borderColor = "transparent";

  if (isDestructive) {
    bg = colors.danger || "#ef4444";
    textColor = "#ffffff";
    borderColor = "transparent";
  } else if (variant === "ink") {
    bg = colors.text;
    textColor = colors.background;
    borderColor = "transparent";
  } else if (isSecondary) {
    bg = colors.surfaceAlt;
    textColor = colors.text;
    borderColor = colors.line;
  } else if (isAccent || variant === "primary") {
    bg = colors.accent;
    textColor = "#ffffff";
    borderColor = "transparent";
  } else if (isOutline) {
    bg = "transparent";
    textColor = colors.text;
    borderColor = colors.line;
  }

  return (
    <Pressable
      disabled={loading || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        {
          backgroundColor: bg,
          borderColor,
          opacity: loading || disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled && !loading ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {icon && (
            <Feather
              name={icon}
              size={compact ? 13 : 16}
              color={textColor}
            />
          )}
          <Text
            style={[
              styles.buttonText,
              compact && styles.buttonTextCompact,
              { color: textColor },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Input({ style, multiline, ...props }) {
  const { colors } = useTheme();
  return <TextInput placeholderTextColor={colors.muted} multiline={multiline} style={[styles.input, multiline && styles.textarea, { backgroundColor: colors.surfaceAlt, borderColor: colors.line, color: colors.text }, style]} {...props} />;
}

export function Avatar({ user, url, uri, fallback, fallbackUser, size = 42, style }) {
  const { colors } = useTheme();
  const [imgError, setImgError] = React.useState(false);

  const safeUser =
    typeof user === "object" && user !== null
      ? user?.author || user?.user || user
      : {};

  const userAvatar =
    url || uri || (typeof user === "string" ? user : getUserAvatar(safeUser, fallbackUser));

  React.useEffect(() => {
    setImgError(false);
  }, [userAvatar]);

  const fallbackName =
    fallback ||
    safeUser.name ||
    safeUser.username ||
    safeUser.firstName ||
    (typeof user === "string"
      ? "U"
      : fallbackUser?.name || fallbackUser?.username || "M");

  const label = (fallbackName || "M").slice(0, 1).toUpperCase();

  return userAvatar && !imgError ? (
    <Image
      source={{ uri: userAvatar }}
      onError={() => setImgError(true)}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.line,
          borderWidth: 1,
          borderColor: colors.line,
        },
        style,
      ]}
    />
  ) : (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.accentSoft,
          borderWidth: 1,
          borderColor: colors.line,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: colors.accent,
          fontFamily: "Poppins_700Bold",
          fontSize: Math.max(12, Math.floor(size * 0.38)),
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export const BADGE_URLS = {
  BLUE: "https://pub-34192334d7d14328ace69168b62cc510.r2.dev/selo%20de%20verificacao/selo%20azul.png",
  GOLD: "https://pub-34192334d7d14328ace69168b62cc510.r2.dev/selo%20de%20verificacao/selo%20dourado.png",
};

export function VerificationBadge({ user, badgeType, size = 15, style }) {
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();

  const safeUser =
    typeof user === "object" && user !== null
      ? user?.author || user?.user || user
      : {};
  const rawBadge =
    badgeType ||
    safeUser?.badge_type ||
    safeUser?.badgeType ||
    safeUser?.badge ||
    (safeUser?.isVerified || safeUser?.verified ? "BLUE" : null);

  if (!rawBadge) return null;

  const normalized = String(rawBadge).toUpperCase();
  const uri = BADGE_URLS[normalized];
  if (!uri) return null;

  const isGold = normalized === "GOLD";

  return (
    <>
      <Pressable onPress={() => setModalVisible(true)} style={[{ justifyContent: "center" }, style]}>
        <Image
          source={{ uri }}
          resizeMode="contain"
          accessibilityLabel={`Selo de Verificação ${isGold ? "Dourado" : "Azul"}`}
          style={{
            width: size,
            height: size,
            marginLeft: 4,
            alignSelf: "center",
          }}
        />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}
          onPress={() => setModalVisible(false)}
        >
          <Pressable 
            style={{ 
              width: "100%", 
              maxWidth: 340, 
              backgroundColor: colors.background, 
              borderRadius: 24, 
              padding: 28, 
              alignItems: "center",
              shadowColor: isGold ? "#FFD700" : "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isGold ? 0.3 : 0.1,
              shadowRadius: 20,
              elevation: 10,
              borderWidth: isGold ? 1 : 0,
              borderColor: isGold ? "rgba(255, 215, 0, 0.4)" : "transparent"
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{
              width: 80, 
              height: 80, 
              marginBottom: 20,
              backgroundColor: isGold ? "rgba(255, 215, 0, 0.1)" : "rgba(59, 130, 246, 0.1)",
              borderRadius: 40,
              justifyContent: "center",
              alignItems: "center"
            }}>
              <Image
                source={{ uri }}
                style={{ width: 50, height: 50 }}
                resizeMode="contain"
              />
            </View>
            
            <Text style={{ 
              fontSize: 22, 
              fontWeight: "bold", 
              color: colors.text, 
              marginBottom: 12,
              textAlign: "center"
            }}>
              {isGold ? "Selo Oficial" : "Conta Verificada"}
            </Text>
            
            <Text style={{ 
              fontSize: 15, 
              color: colors.muted, 
              textAlign: "center", 
              marginBottom: 28,
              lineHeight: 22
            }}>
              {isGold 
                ? "O selo dourado indica pessoas próximas e conhecidas. Usuários com este selo têm maior prioridade em sugestões e recebem novidades em primeira mão."
                : "O selo azul de verificação confirma que a conta existe e que o e-mail do usuário foi devidamente verificado."}
            </Text>

            <Pressable 
              onPress={() => setModalVisible(false)}
              style={({ pressed }) => [{
                width: "100%",
                backgroundColor: isGold ? "#FFD700" : colors.primary,
                paddingVertical: 14,
                borderRadius: 12,
                opacity: pressed ? 0.8 : 1,
              }]}
            >
              <Text style={{ 
                color: isGold ? "#000" : "#FFF", 
                fontSize: 16, 
                fontWeight: "bold", 
                textAlign: "center" 
              }}>
                Entendi
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function AppHeader({ title, subtitle, onBack, right, style }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets?.top || 0,
    Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0
  );

  return (
    <View style={[styles.header, { paddingTop: topInset + 8 }, style]}>
      <View style={styles.headerRow}>
        {onBack ? (
          <IconButton name="arrow-left" onPress={onBack} label="Voltar" />
        ) : (
          <View style={styles.iconSpacer} />
        )}
        <View style={styles.headerCopy}>
          <Text selectable style={[styles.headerTitle, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text selectable style={[styles.headerSubtitle, { color: colors.muted }]}>
              {subtitle}
            </Text>
          )}
        </View>
        {right || <View style={styles.iconSpacer} />}
      </View>
    </View>
  );
}

export function EmptyState({ icon = "inbox", children }) {
  const { colors } = useTheme();
  return <View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}><Feather name={icon} size={24} color={colors.accent} /></View><Text selectable style={[styles.emptyText, { color: colors.muted }]}>{children}</Text></View>;
}

const styles = StyleSheet.create({
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  iconSmall: { width: 34, height: 34, borderRadius: 17 },
  iconSpacer: { width: 42 },
  button: {
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonCompact: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 5,
  },
  buttonText: { fontFamily: "Poppins_600SemiBold", fontSize: 13 },
  buttonTextCompact: { fontFamily: "Poppins_600SemiBold", fontSize: 11 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontFamily: "Poppins_400Regular", fontSize: 14 },
  textarea: { minHeight: 112, paddingTop: 15, textAlignVertical: "top" },
  avatar: { alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 22, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerCopy: { flex: 1, alignItems: "center", paddingHorizontal: 10 },
  headerTitle: { fontFamily: "Poppins_700Bold", fontSize: 17 },
  headerSubtitle: { fontFamily: "Poppins_400Regular", fontSize: 11, marginTop: 1 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 64, paddingHorizontal: 28, gap: 14 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: "Poppins_400Regular", fontSize: 13, textAlign: "center", lineHeight: 21 },
});

export { CustomModal } from "../modals/CustomModal";
