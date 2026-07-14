import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox, Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import MobileAds from "react-native-google-mobile-ads";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { ThemeProvider, useTheme } from "../src/theme";
import { LangProvider } from "../src/lang";
import { EventProvider, useEvent } from "../src/event";
import { CategoriesProvider } from "../src/categoriesContext";
import { ForceUpgradeModal } from "../src/components/ForceUpgradeModal";
import { useEffect, useRef, useState } from "react";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

LogBox.ignoreLogs(["Support for defaultProps will be removed"]);

const origHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((e, fatal) => {
  require("react-native").Alert.alert("Error", `${e?.message}\n\n${e?.stack?.slice(0, 500)}`);
  origHandler?.(e, fatal);
});

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

async function registerForPushNotifications() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus = existing === "granted"
    ? existing
    : (await Notifications.requestPermissionsAsync()).status;
  if (finalStatus !== "granted") return;

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: "7a1b7bfc-3762-4976-bb82-9b805b346e66",
  }).catch(() => null);
  if (!token) return;

  const platform = Platform.OS;
  fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/device-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token.data, platform }),
  }).catch(() => {});
}

function AppShell() {
  const { isDark } = useTheme();
  const { setActiveEvents } = useEvent();
  const [forceUpgrade, setForceUpgrade] = useState(false);
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/config`)
      .then((r) => r.json())
      .then((data) => {
        const current = Application.nativeApplicationVersion ?? "0.0.0";
        const min = data.minVersion ?? "1.0.0";
        if (compareVersions(current, min) < 0) setForceUpgrade(true);
        if (data.activeEvents?.length) setActiveEvents(data.activeEvents);
      })
      .catch(() => {});

    registerForPushNotifications();

    // Handle notification tap — open the article
    notificationListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const postId = response.notification.request.content.data?.postId;
      if (postId) {
        router.push({ pathname: "/", params: { openPostId: String(postId) } });
      }
    });

    // Handle notification received while app is open (already shown by setNotificationHandler)
    return () => {
      notificationListener.current?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} translucent={false} backgroundColor={isDark ? "#1c1c1e" : "#ffffff"} />
      <Stack screenOptions={{ headerShown: false }} />
      <ForceUpgradeModal visible={forceUpgrade} />
    </>
  );
}

export default function RootLayout() {
  return (
    <LangProvider>
      <ThemeProvider>
        <EventProvider>
          <CategoriesProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <AppShell />
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </CategoriesProvider>
        </EventProvider>
      </ThemeProvider>
    </LangProvider>
  );
}
