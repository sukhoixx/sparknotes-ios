import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { NativeAd, NativeAdView, NativeAsset, NativeAssetType, NativeMediaView, TestIds } from "react-native-google-mobile-ads";
import { useTheme } from "../theme";
import type { Colors } from "../theme";

const AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : "ca-app-pub-2618352557321545/3769161130";

export function AdCard() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const adRef = useRef<NativeAd | null>(null);

  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    NativeAd.createForAdRequest(AD_UNIT_ID, { requestNonPersonalizedAdsOnly: true }).then((ad) => {
      if (cancelled) { ad.destroy(); return; }
      adRef.current = ad;
      setNativeAd(ad);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }).catch(() => {});
    return () => {
      cancelled = true;
      adRef.current?.destroy();
      adRef.current = null;
    };
  }, []);

  if (!nativeAd) return <View style={{ height: 200 }} />;

  return (
    <Animated.View style={{ opacity }}>
      <NativeAdView nativeAd={nativeAd} style={styles.container}>
        <NativeMediaView style={styles.media} resizeMode="cover" />
        <View style={styles.overlay}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.title} numberOfLines={1}>{nativeAd.headline}</Text>
          </NativeAsset>
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>Ad</Text>
          </View>
        </View>
      </NativeAdView>
    </Animated.View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      height: 200,
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 4,
      backgroundColor: c.surface,
    },
    media: {
      width: "100%",
      height: "100%",
    },
    overlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    title: {
      flex: 1,
      fontSize: 12,
      fontWeight: "600",
      color: "#fff",
      marginRight: 8,
    },
    adBadge: {
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.6)",
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    adBadgeText: {
      fontSize: 9,
      fontWeight: "600",
      color: "rgba(255,255,255,0.8)",
    },
  });
}
