import React from "react";
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme";

export function ReelsCategoryFilterModal({
  visible,
  onClose,
  categories = [],
  activeCategory,
  onSelectCategory,
  onOpenCalibrate
}) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.surface || "#18181b",
              borderColor: colors.border || "rgba(255, 255, 255, 0.1)"
            }
          ]}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="sparkles" size={20} color="#f59e0b" />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Feed & Categorias
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.muted || "#a1a1aa"} />
            </Pressable>
          </View>

          <Text style={[styles.sectionSubtitle, { color: colors.muted || "#a1a1aa" }]}>
            Escolha o que você quer ver agora ou personalize seu algoritmo:
          </Text>

          <ScrollView contentContainerStyle={styles.categoryGrid}>
            <Pressable
              onPress={() => {
                onSelectCategory("all");
                onClose();
              }}
              style={[
                styles.categoryCard,
                {
                  backgroundColor:
                    activeCategory === "all"
                      ? "rgba(245, 158, 11, 0.15)"
                      : colors.surfaceAlt || "#27272a",
                  borderColor:
                    activeCategory === "all"
                      ? "#f59e0b"
                      : colors.border || "rgba(255, 255, 255, 0.08)"
                }
              ]}>
              <Ionicons
                name="sparkles"
                size={22}
                color={activeCategory === "all" ? "#f59e0b" : colors.text}
              />
              <Text
                style={[
                  styles.categoryCardText,
                  {
                    color: activeCategory === "all" ? "#f59e0b" : colors.text,
                    fontFamily:
                      activeCategory === "all" ? "Poppins_700Bold" : "Poppins_500Medium"
                  }
                ]}>
                ✨ Para Você
              </Text>
              {activeCategory === "all" && (
                <Feather name="check" size={16} color="#f59e0b" style={styles.checkIcon} />
              )}
            </Pressable>

            {categories.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    onSelectCategory(cat.id);
                    onClose();
                  }}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: isSelected
                        ? "rgba(59, 130, 246, 0.15)"
                        : colors.surfaceAlt || "#27272a",
                      borderColor: isSelected
                        ? "#3b82f6"
                        : colors.border || "rgba(255, 255, 255, 0.08)"
                    }
                  ]}>
                  <Image
                    source={{
                      uri:
                        cat.iconUrl ||
                        `https://pub-08d4ac7de5354fadbfe07fcbc70237ba.r2.dev/${cat.id}.png`
                    }}
                    style={{ width: 22, height: 22 }}
                    tintColor={isSelected ? "#3b82f6" : colors.text}
                    resizeMode="contain"
                  />
                  <Text
                    style={[
                      styles.categoryCardText,
                      {
                        color: isSelected ? "#3b82f6" : colors.text,
                        fontFamily: isSelected ? "Poppins_700Bold" : "Poppins_500Medium"
                      }
                    ]}>
                    {cat.label}
                  </Text>
                  {isSelected && (
                    <Feather name="check" size={16} color="#3b82f6" style={styles.checkIcon} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footerAction}>
            <Pressable
              onPress={() => {
                onClose();
                if (onOpenCalibrate) onOpenCalibrate();
              }}
              style={[styles.calibrateButton, { backgroundColor: colors.surfaceAlt || "#27272a" }]}>
              <Ionicons name="options" size={18} color="#f59e0b" style={{ marginRight: 8 }} />
              <Text style={[styles.calibrateButtonText, { color: colors.text }]}>
                Calibrar Preferências do Algoritmo
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end"
  },
  sheetContainer: {
    maxHeight: "75%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: 12
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold"
  },
  closeBtn: {
    padding: 6
  },
  sectionSubtitle: {
    fontSize: 12.5,
    fontFamily: "Poppins_400Regular",
    marginBottom: 14
  },
  categoryGrid: {
    gap: 8,
    paddingBottom: 16
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12
  },
  categoryCardText: {
    fontSize: 13.5,
    flex: 1
  },
  checkIcon: {
    marginLeft: "auto"
  },
  footerAction: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 12
  },
  calibrateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)"
  },
  calibrateButtonText: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold"
  }
});
