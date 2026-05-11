import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { NativeAd, NativeAdView, NativeAsset, NativeAssetType, TestIds } from "react-native-google-mobile-ads";
import { useTheme } from "../theme";
import type { Colors } from "../theme";

// Replace with your real AdMob native ad unit ID from admob.google.com
const AD_UNIT_ID = __DEV__
  ? TestIds.NATIVE
  : "ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX";

export function AdCard() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const adRef = useRef<NativeAd | null>(null);

  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    NativeAd.createForAdRequest(AD_UNIT_ID).then((ad) => {
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

  // Render nothing while loading — no placeholder jump
  if (!nativeAd) return null;

  const imageUrl = nativeAd.images?.[0]?.url ?? nativeAd.icon?.url ?? null;

  return (
    <Animated.View style={{ opacity }}>
      <NativeAdView nativeAd={nativeAd} style={styles.container}>
        {imageUrl && (
          <NativeAsset assetType={NativeAssetType.IMAGE}>
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          </NativeAsset>
        )}
        <View style={styles.content}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.title} numberOfLines={3}>{nativeAd.headline}</Text>
          </NativeAsset>
          {!!nativeAd.body && (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={styles.body} numberOfLines={2}>{nativeAd.body}</Text>
            </NativeAsset>
          )}
          <View style={styles.footer}>
            {!!nativeAd.callToAction && (
              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8}>
                  <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
                </TouchableOpacity>
              </NativeAsset>
            )}
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>Ad</Text>
            </View>
          </View>
        </View>
      </NativeAdView>
    </Animated.View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 4,
      backgroundColor: c.surface,
    },
    image: {
      width: "100%",
      height: 120,
    },
    content: {
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 10,
      minHeight: 80,
    },
    title: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
      lineHeight: 19,
      marginBottom: 6,
    },
    body: {
      fontSize: 12,
      color: c.textMuted,
      lineHeight: 17,
      marginBottom: 8,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 4,
    },
    ctaButton: {
      backgroundColor: c.brand,
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    ctaText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#fff",
    },
    adBadge: {
      borderWidth: 1,
      borderColor: c.textFaint,
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 1,
    },
    adBadgeText: {
      fontSize: 9,
      fontWeight: "600",
      color: c.textFaint,
    },
  });
}
