import React, { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

const AD_UNIT_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : "ca-app-pub-2618352557321545/6335999163";

export function AdCard() {
  const { width } = useWindowDimensions();
  const columnWidth = Math.floor(width / 2) - 8;
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={{ width: columnWidth, minHeight: loaded ? undefined : 0 }}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={`${columnWidth}x250`}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
      />
    </View>
  );
}
