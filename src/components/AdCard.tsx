import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

const AD_UNIT_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : "ca-app-pub-2618352557321545/6335999163";

interface Props {
  width?: number;
}

export function AdCard({ width: propWidth }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const columnWidth = propWidth ?? (Math.floor(windowWidth / 2) - 8);
  const [status, setStatus] = useState<"pending" | "loaded" | "failed">("pending");

  if (status === "failed") return null;

  return (
    <View style={{ width: columnWidth, minHeight: status === "loaded" ? undefined : 0 }}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={`${columnWidth}x250`}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => setStatus("loaded")}
        onAdFailedToLoad={() => setStatus("failed")}
      />
    </View>
  );
}
