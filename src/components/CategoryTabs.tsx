import React, { useImperativeHandle, useMemo, useRef } from "react";
import { Animated, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../theme";
import { useLang } from "../lang";
import { t } from "../i18n";
import type { Colors } from "../theme";

export const CATEGORY_IDS = ["all","news","us","world","politics","military","science","technology","entertainment","celebrity","sports","business","gaming","travel","animals","inventions","finance","health","beauty"];

export interface CategoryTabsHandle {
  scrollToProgress: (position: number, offset: number) => void;
  snapToPage: (position: number) => void;
}

interface Props {
  active: string;
  onChange: (id: string) => void;
  leadingTab?: { id: string; label: string };
}

export const CategoryTabs = React.forwardRef<CategoryTabsHandle, Props>(
  function CategoryTabs({ active, onChange, leadingTab }, ref) {
    const scrollRef = useRef<ScrollView>(null);
    const { colors } = useTheme();
    const { lang } = useLang();
    const styles = useMemo(() => makeStyles(colors), [colors]);
    const baseTabs = useMemo(() => CATEGORY_IDS.map((id) => ({ id, label: t(`cat_${id}`, lang) })), [lang]);
    const allTabs = useMemo(() => leadingTab ? [leadingTab, ...baseTabs] : baseTabs, [leadingTab, baseTabs]);

    const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
    const scrollViewWidth = useRef(0);

    const highlightX = useRef(new Animated.Value(0)).current;
    const highlightW = useRef(new Animated.Value(0)).current;
    const pageProgress = useRef(new Animated.Value(0)).current;

    const tabColors = useMemo(
      () =>
        allTabs.map((_, i) =>
          pageProgress.interpolate({
            inputRange: [i - 1, i, i + 1],
            outputRange: [colors.textMuted, colors.brand, colors.textMuted],
            extrapolate: "clamp",
          })
        ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [allTabs.length, colors.textMuted, colors.brand]
    );

    function centeredScrollX(id: string): number {
      const layout = tabLayouts.current[id];
      if (!layout || !scrollViewWidth.current) return 0;
      return Math.max(0, layout.x - scrollViewWidth.current / 2 + layout.width / 2);
    }

    useImperativeHandle(ref, () => ({
      scrollToProgress(position: number, offset: number) {
        const idA = allTabs[position]?.id;
        const idB = allTabs[Math.min(position + 1, allTabs.length - 1)]?.id;
        if (!idA) return;
        const layoutA = tabLayouts.current[idA];
        const layoutB = (idB ? tabLayouts.current[idB] : null) ?? layoutA;
        if (!layoutA) return;
        highlightX.setValue(layoutA.x + (layoutB.x - layoutA.x) * offset);
        highlightW.setValue(layoutA.width + (layoutB.width - layoutA.width) * offset);
        pageProgress.setValue(position + offset);
        const targetX = centeredScrollX(idA) + (centeredScrollX(idB ?? idA) - centeredScrollX(idA)) * offset;
        scrollRef.current?.scrollTo({ x: targetX, animated: false });
      },

      snapToPage(position: number) {
        const id = allTabs[position]?.id;
        if (!id) return;
        const layout = tabLayouts.current[id];
        if (!layout) return;
        scrollRef.current?.scrollTo({ x: centeredScrollX(id), animated: true });
        Animated.parallel([
          Animated.spring(highlightX, { toValue: layout.x, useNativeDriver: false, speed: 40, bounciness: 0 }),
          Animated.spring(highlightW, { toValue: layout.width, useNativeDriver: false, speed: 40, bounciness: 0 }),
          Animated.spring(pageProgress, { toValue: position, useNativeDriver: false, speed: 40, bounciness: 0 }),
        ]).start();
      },
    }), [allTabs]);

    return (
      <ScrollView
        ref={scrollRef}
        horizontal
        scrollsToTop={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        style={styles.scroll}
        onLayout={(e) => { scrollViewWidth.current = e.nativeEvent.layout.width; }}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.highlight, { transform: [{ translateX: highlightX }], width: highlightW }]}
        />

        {allTabs.map((tab, idx) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={styles.tab}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              tabLayouts.current[tab.id] = { x, width };
              if (tab.id === active) {
                highlightX.setValue(x);
                highlightW.setValue(width);
                pageProgress.setValue(idx);
              }
            }}
          >
            <Animated.Text style={[styles.label, { color: tabColors[idx] }]}>
              {tab.label}
            </Animated.Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }
);

function makeStyles(c: Colors) {
  return StyleSheet.create({
    scroll: {
      flexGrow: 0,
      backgroundColor: c.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    container: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 4,
    },
    highlight: {
      position: "absolute",
      bottom: 0,
      height: 2,
      borderRadius: 1,
      backgroundColor: c.brand,
    },
    tab: {
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    label: {
      fontSize: 13,
      fontWeight: "500",
    },
  });
}
