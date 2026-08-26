import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const palettes = {
  light: {
    mode: "dark",
    background: "#000000",
    card: "#121214",
    cardSecondary: "#18181b",
    surface: "#121214",
    surfaceAlt: "#18181b",
    text: "#FFFFFF",
    title: "#FFFFFF",
    subtext: "#E4E4E7",
    muted: "#A1A1AA",
    border: "#27272a",
    line: "#27272a",
    icon: "#FFFFFF",
    accent: "#0284c7",
    accentSoft: "rgba(2, 132, 199, 0.18)",
    primary: "#0284c7",
    ink: "#FFFFFF",
    danger: "#ef4444",
  },
  dark: {
    mode: "dark",
    background: "#000000",
    card: "#121214",
    cardSecondary: "#18181b",
    surface: "#121214",
    surfaceAlt: "#18181b",
    text: "#FFFFFF",
    title: "#FFFFFF",
    subtext: "#E4E4E7",
    muted: "#A1A1AA",
    border: "#27272a",
    line: "#27272a",
    icon: "#FFFFFF",
    accent: "#0284c7",
    accentSoft: "rgba(2, 132, 199, 0.18)",
    primary: "#0284c7",
    ink: "#FFFFFF",
    danger: "#ef4444",
  },
  oled: {
    mode: "oled",
    background: "#000000",
    card: "#121214",
    cardSecondary: "#18181b",
    surface: "#121214",
    surfaceAlt: "#18181b",
    text: "#FFFFFF",
    title: "#FFFFFF",
    subtext: "#E4E4E7",
    muted: "#A1A1AA",
    border: "#27272a",
    line: "#27272a",
    icon: "#FFFFFF",
    accent: "#0284c7",
    accentSoft: "rgba(2, 132, 199, 0.18)",
    primary: "#0284c7",
    ink: "#FFFFFF",
    danger: "#ef4444",
  },
};

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "@tribo_theme_mode";

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState("dark");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved) {
          setPreferenceState(saved);
        }
      } catch (err) {}
      setIsReady(true);
    }
    loadTheme();
  }, []);

  const setPreference = async (newPref) => {
    setPreferenceState(newPref);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newPref);
    } catch (err) {}
  };

  const mode = preference === "light" ? "dark" : preference; // Always dark/oled for true black immersion

  const value = useMemo(
    () => ({
      colors: palettes[mode] || palettes.dark,
      mode,
      isDark: true,
      preference,
      setPreference,
    }),
    [mode, preference],
  );

  if (!isReady) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme deve estar dentro de ThemeProvider");
  return theme;
}
