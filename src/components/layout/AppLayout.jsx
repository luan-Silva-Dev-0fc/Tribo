import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Platform, Animated } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";
import { GoldBadgeModal } from "../modals/gold-badge-modal";

export function AppLayout({
  children,
  tagText = "★ Tribo",
  title,
  description,
  headerRight,
  style,
  cardStyle,
  contentStyle
}) {
  const { colors, mode } = useTheme();


  const animValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(animValue, {
      toValue: 1,
      friction: 4,
      tension: 20,
      useNativeDriver: true
    }).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }, style]}>
      <View
        style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border
        },
        cardStyle]
        }>
        
        {}
        {(title || headerRight) &&
        <View style={styles.titleRow}>
            {!!title &&
          <Text
            style={[
            styles.title,
            { color: colors.text }]
            }>
            
                {title}
              </Text>
          }
            {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
          </View>
        }

        {!!description &&
        <Text
          style={[
          styles.description,
          { color: colors.subtext }]
          }>
          
            {description}
          </Text>
        }

        {}
        <View style={[styles.content, contentStyle]}>{children}</View>
      </View>
      <GoldBadgeModal />
    </View>);

}

export default AppLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  card: {
    flex: 1,
    marginTop: -32,
    marginHorizontal: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingTop: 16,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    overflow: "hidden",
    borderTopWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,

    ...Platform.select({
      web: {
        boxShadow: "0px 24px 48px rgba(0,0,0,0.12)"
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.12,
        shadowRadius: 32,
        elevation: 12
      }
    })
  },
  tag: {
    alignSelf: "center",
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center"
  },
  tagText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold"
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  title: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    letterSpacing: -0.3,
    flex: 1
  },
  headerRight: {
    marginLeft: 12
  },
  description: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    lineHeight: 20,
    marginBottom: 16
  },
  content: {
    flex: 1
  }
});