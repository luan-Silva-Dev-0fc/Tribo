import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";

export function BaseCardLayout({
  badgeIcon,
  badgeText,
  title,
  subtitle,
  description,
  showBack = false,
  onBack,
  headerAccessory,
  children,
  cardStyle,
  contentStyle,
  scrollable = true,
}) {
  const { colors, isDark } = useTheme();

  const subText = subtitle || description;

  const content = (
    <View
      style={[
        styles.floatingCard,
        {
          backgroundColor: colors.card || (isDark ? "#181920" : "#FFFFFF"),
          borderColor: isDark ? colors.line : "rgba(0, 0, 0, 0.04)",
        },
        cardStyle,
      ]}
    >
      {/* Top Accessory (e.g. step indicators) */}
      {headerAccessory}

      {/* Badge / Tag Superior */}
      {(!!badgeText || !!badgeIcon) && (
        <View
          style={[
            styles.badgeContainer,
            {
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "#F0F0F0",
            },
          ]}
        >
          {badgeIcon}
          {!!badgeText && (
            <Text style={[styles.badgeText, { color: colors.text }]}>
              {badgeText}
            </Text>
          )}
        </View>
      )}

      {/* Título Principal */}
      {!!title && (
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      )}

      {/* Subtítulo / Descrição */}
      {!!subText && (
        <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
          {subText}
        </Text>
      )}

      {/* Conteúdo Dinâmico */}
      <View style={[styles.contentContainer, contentStyle]}>{children}</View>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? colors.background : "#F5F5F7" },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Background Escuro Superior (28% da tela) */}
      <View style={[styles.topBackground, { zIndex: 1 }]}>
        {showBack && !!onBack && (
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            hitSlop={12}
            accessibilityLabel="Voltar"
          >
            <Feather name="arrow-left" size={20} color="#FFFFFF" />
          </Pressable>
        )}

        <View style={styles.brandLogo}>
          <Ionicons name="people" size={32} color="#FFFFFF" />
          <Text style={styles.brandText}>Tribo</Text>
        </View>
      </View>

      {/* Background Claro Inferior com Card Flutuante */}
      <View
        style={[
          styles.bottomBackground,
          { backgroundColor: isDark ? colors.background : "#F5F5F7", zIndex: 2, overflow: "visible" },
        ]}
      >
        <KeyboardAvoidingView
          style={[styles.flex, { overflow: "visible" }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {scrollable ? (
            <ScrollView
              style={{ overflow: "visible" }}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {content}
            </ScrollView>
          ) : (
            <View style={[styles.staticContent, { overflow: "visible" }]}>{content}</View>
          )}
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  flex: {
    flex: 1,
    width: "100%",
  },
  topBackground: {
    height: 190,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    paddingTop: 10,
  },
  backButton: {
    position: "absolute",
    left: 20,
    top: 48,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  brandLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  brandText: {
    color: "#FFFFFF",
    fontFamily: "System",
    fontWeight: "800",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  bottomBackground: {
    flex: 1,
    backgroundColor: "#F5F5F7",
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  staticContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  floatingCard: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: 36,
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 40,
    marginTop: -65,
    ...Platform.select({
      web: {
        boxShadow: "0px 24px 48px rgba(0,0,0,0.12)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
        elevation: 12,
      },
    }),
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111111",
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#666D77",
    marginBottom: 22,
  },
  contentContainer: {
    marginTop: 2,
  },
});

export default BaseCardLayout;
