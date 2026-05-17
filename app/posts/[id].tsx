import { useLocalSearchParams, router, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function PostDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key) return;
    router.replace({ pathname: "/", params: { openPostId: id } });
  }, [navState?.key, id]);

  return <View />;
}
