import React, { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, StyleSheet } from "react-native";
import { fetchHeadlines } from "../api";
import { useTheme } from "../theme";
import { useLang } from "../lang";
import type { Colors } from "../theme";

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    list: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 32,
      gap: 0,
    },
    item: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 12,
    },
    number: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.brand,
      width: 20,
      marginTop: 2,
      textAlign: "right",
    },
    headline: {
      flex: 1,
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      lineHeight: 22,
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 80,
      gap: 8,
    },
    emptyEmoji: {
      fontSize: 40,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      paddingHorizontal: 32,
      lineHeight: 20,
    },
  });
}

interface Props {
  isActive: boolean;
}

export function HeadlinesPage({ isActive }: Props) {
  const { colors } = useTheme();
  const { lang } = useLang();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [headlines, setHeadlines] = useState<string[]>([]);
  const [headlinesZh, setHeadlinesZh] = useState<string[]>([]);
  const [headlinesCn, setHeadlinesCn] = useState<string[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    const data = await fetchHeadlines();
    setHeadlines(data.headlines as string[]);
    setHeadlinesZh(data.headlinesZh as string[]);
    setHeadlinesCn(data.headlinesCn as string[]);
    setGeneratedAt(data.generatedAt);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (isActive) load();
  }, [isActive, load]);

  const displayHeadlines = lang === "zh-TW" ? (headlinesZh.length ? headlinesZh : headlines)
    : lang === "zh-CN" ? (headlinesCn.length ? headlinesCn : headlines)
    : headlines;

  const pageTitle = lang === "zh-TW" ? "今日頭條" : lang === "zh-CN" ? "今日头条" : "Today's Headlines";

  const updatedLabel = generatedAt
    ? `Updated ${new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : null;

  if (loading) {
    return (
      <View style={[styles.container, styles.empty]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={displayHeadlines.length === 0 ? { flex: 1 } : styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.brand} />
      }
    >
      {headlines.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📰</Text>
          <Text style={styles.emptyText}>Headlines are generated every 2 hours. Check back soon.</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>{pageTitle}</Text>
            {updatedLabel && <Text style={styles.subtitle}>{updatedLabel}</Text>}
          </View>
          {displayHeadlines.map((h, i) => (
            <View key={i} style={styles.item}>
              <Text style={styles.number}>{i + 1}</Text>
              <Text style={styles.headline}>{h}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}
