import React from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={true}
        bounces={true}
        overScrollMode="always">
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
      </ScrollView>
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
    height: 56,
    borderBottomWidth: 1
  },
  backBtn: {
    padding: 8
  },
  headerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18
  },
  content: {
    padding: 20
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    marginBottom: 8,
    letterSpacing: 1
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden"
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16
  },
  optionIcon: {
    marginRight: 12
  },
  optionLabel: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
    fontSize: 15
  },
  radioContainer: {
    marginLeft: 8
  },
  radioOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5
  }
});