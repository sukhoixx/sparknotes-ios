import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

export type ThemeMode = "light" | "dark" | "auto";

export interface Colors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textSub: string;
  textTertiary: string;
  textMuted: string;
  textFaint: string;
  backdrop: string;
  brand: string;
}

const light: Colors = {
  bg: "#f5f5f7",
  surface: "#ffffff",
  surfaceAlt: "#f3f4f6",
  border: "#e5e7eb",
  text: "#2a2a2a",
  textSub: "#374151",
  textTertiary: "#6b7280",
  textMuted: "#9ca3af",
  textFaint: "rgba(0,0,0,0.45)",
  backdrop: "rgba(0,0,0,0.4)",
  brand: "#ff2442",
};

const dark: Colors = {
  bg: "#000000",
  surface: "#1c1c1e",
  surfaceAlt: "#2c2c2e",
  border: "#3a3a3c",
  text: "#bbbbbb",
  textSub: "#e5e7eb",
  textTertiary: "#9ca3af",
  textMuted: "#6b7280",
  textFaint: "rgba(255,255,255,0.45)",
  backdrop: "rgba(0,0,0,0.7)",
  brand: "#ff2442",
};

const STORAGE_KEY = "newsblock_theme";

interface ThemeContextValue {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: Colors;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: "auto",
  setThemeMode: () => {},
  isDark: false,
  colors: light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("auto");

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark" || v === "auto") setThemeModeState(v);
    });
  }, []);

  function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode);
    SecureStore.setItemAsync(STORAGE_KEY, mode);
  }

  const isDark = themeMode === "auto" ? system === "dark" : themeMode === "dark";
  const colors = isDark ? dark : light;

  const value = useMemo(
    () => ({ themeMode, setThemeMode, isDark, colors }),
    [themeMode, isDark, colors]
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
