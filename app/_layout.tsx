import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import MobileAds from "react-native-google-mobile-ads";
import { ThemeProvider, useTheme } from "../src/theme";
import { LangProvider } from "../src/lang";

LogBox.ignoreLogs(["Support for defaultProps will be removed"]);

MobileAds().initialize();

GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

function AppShell() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
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
