import { useLocalSearchParams, router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function PostDeepLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useEffect(() => {
    router.replace({ pathname: "/", params: { openPostId: id } });
  }, [id]);
  return <View />;
}
