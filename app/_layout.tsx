import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import MobileAds from "react-native-google-mobile-ads";
import Constants from "expo-constants";
import { ThemeProvider, useTheme } from "../src/theme";
import { LangProvider } from "../src/lang";
import { ForceUpgradeModal } from "../src/components/ForceUpgradeModal";
import { useEffect, useState } from "react";

LogBox.ignoreLogs(["Support for defaultProps will be removed"]);

MobileAds().initialize();

GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
  }
  return 0;
}

function AppShell() {
  const { isDark } = useTheme();
  const [forceUpgrade, setForceUpgrade] = useState(false);

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/config`)
      .then((r) => r.json())
      .then((data) => {
        const current = Constants.expoConfig?.version ?? "0.0.0";
        const min = data.minVersion ?? "1.0.0";
        if (compareVersions(current, min) < 0) setForceUpgrade(true);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
      <ForceUpgradeModal visible={forceUpgrade} />
    </>
  );
}

export default function RootLayout() {
  return (
    <LangProvider>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AppShell />
        </GestureHandlerRootView>
      </ThemeProvider>
    </LangProvider>
  );
}
