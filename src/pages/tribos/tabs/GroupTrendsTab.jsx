import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../../theme";

export function GroupTrendsTab({ groupId, colors: propColors, onTrendClick, onPlayVideo }) {
  const { colors: themeColors, isDark: themeIsDark, mode } = useTheme();
  const colors = propColors || themeColors;

  return (
    <View style={styles.tabContent}>
      <Text style={{ textAlign: "center", color: colors.text, marginTop: 20, fontFamily: "Poppins_400Regular" }}>
        Em breve...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
    padding: 16
  }
});
