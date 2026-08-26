import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../theme";

export function AppearanceScreen({ onBack }) {
  const { colors, preference, setPreference } = useTheme();

  const options = [
  { id: "system", label: "Automático (Acompanhar Sistema)", icon: "smartphone" },
  { id: "light", label: "Claro (Fundo Branco)", icon: "sun" },
  { id: "dark", label: "Escuro (Fundo Grafite)", icon: "moon" },
  { id: "oled", label: "Preto Absoluto (Fundo OLED #000000)", icon: "monitor" }];


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Aparência</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>TEMA</Text>
        
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {options.map((option, index) => {
            const isSelected = preference === option.id;
            const isLast = index === options.length - 1;

            return (
              <Pressable
                key={option.id}
                style={[
                styles.optionRow,
                !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]
                }
                onPress={() => setPreference(option.id)}>
                
                <View style={styles.optionIcon}>
                  <Feather name={option.icon} size={20} color={isSelected ? colors.accent : colors.subtext} />
                </View>
                <Text style={[styles.optionLabel, { color: colors.text, fontWeight: isSelected ? '600' : '400' }]}>
                  {option.label}
                </Text>
                <View style={styles.radioContainer}>
                  <View style={[
                  styles.radioOutline,
                  { borderColor: isSelected ? colors.accent : colors.border }]
                  }>
                    {isSelected && <View style={[styles.radioFill, { backgroundColor: colors.accent }]} />}
                  </View>
                </View>
              </Pressable>);

          })}
        </View>
      </View>
    </View>);

}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start"
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold"
  },
  content: {
    padding: 16
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden"
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16
  },
  optionIcon: {
    width: 32
  },
  optionLabel: {
    flex: 1,
    fontSize: 15
  },
  radioContainer: {
    marginLeft: 12
  },
  radioOutline: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center"
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5
  }
});