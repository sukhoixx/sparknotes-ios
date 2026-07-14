import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { FlashList, FlashListRef } from "@shopify/flash-list";
import { Card } from "./Card";
import { AdCard } from "./AdCard";
import { fetchPosts } from "../api";
import { CATEGORY_GRADIENTS } from "../categories";
import { useTheme } from "../theme";
import { useLang } from "../lang";
import { t } from "../i18n";
import type { Post, PageData } from "../types";

type FlatItem = Post | "ad";
type Row = [FlatItem, FlatItem | null];

interface Props {
  category: string;
  isVisible: boolean;
  isActive: boolean;
  profileCats?: string;
  searchQuery: string;
  reloadKey: number;
  scrollToTopTrigger: number;
  reactions: Record<number, string>;
  onReact: (post: Post, emoji: string | null) => void;
  onOpenPost: (post: Post) => void;
  onPostsLoaded?: (posts: Post[]) => void;
  onRegisterPatch?: (fn: (post: Post) => void) => void;
  eventSlug?: string;
}

export function CategoryFeedPage({
  category,
  isVisible,
  isActive,
  profileCats,
  searchQuery,
  reloadKey,
  scrollToTopTrigger,
  reactions,
  onReact,
  onOpenPost,
  onPostsLoaded,
  onRegisterPatch,
  eventSlug,
}: Props) {
  const { colors } = useTheme();
  const { lang } = useLang();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadCompleted, setLoadCompleted] = useState(false);

  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const loadedForKeyRef = useRef(-1);
  const loadDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlashListRef<Row>>(null);

  useEffect(() => {
    onRegisterPatch?.((updated) => {
      setPosts((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    });
  }, [onRegisterPatch]);

  async function doLoad(
    nextCursor: string | null,
    reset: boolean,
    cats: string | undefined,
    q: string | undefined,
    slug?: string
  ) {
    if (!reset && loadingRef.current) return;
    if (reset) loadingRef.current = false;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data: PageData = await fetchPosts(category, nextCursor, cats, q, slug);
      setPosts((prev) => {
        if (reset) return data.posts;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.posts.filter((p) => !seen.has(p.id))];
      });
      onPostsLoaded?.(data.posts);
      cursorRef.current = data.nextCursor;
      hasMoreRef.current = !!data.nextCursor;
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setLoadCompleted(true);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isVisible) {
      if (loadDelayRef.current) { clearTimeout(loadDelayRef.current); loadDelayRef.current = null; }
      setPosts([]);
      setLoadCompleted(false);
      cursorRef.current = null;
      hasMoreRef.current = true;
      loadedForKeyRef.current = -1;
      return;
    }
    if (loadedForKeyRef.current === reloadKey) return;
    loadedForKeyRef.current = reloadKey;
    cursorRef.current = null;
    hasMoreRef.current = true;
    const cats = category === "all" && profileCats ? profileCats : undefined;
    const q = searchQuery || undefined;
    if (loadDelayRef.current) clearTimeout(loadDelayRef.current);
    loadDelayRef.current = setTimeout(() => {
      loadDelayRef.current = null;
      doLoad(null, true, cats, q, eventSlug);
    }, 80);
  }, [isVisible, reloadKey]);

  useEffect(() => {
    if (scrollToTopTrigger > 0) {
      listRef.current?.scrollToIndex({ index: 0, animated: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToTopTrigger]);

  async function handleRefresh() {
    setRefreshing(true);
    loadingRef.current = false;
    cursorRef.current = null;
    hasMoreRef.current = true;
    const cats = category === "all" && profileCats ? profileCats : undefined;
    const q = searchQuery || undefined;
    await doLoad(null, true, cats, q, eventSlug);
    setRefreshing(false);
  }

  const handleEndReached = useCallback(() => {
    if (!hasMoreRef.current || loadingRef.current) return;
    const cats = category === "all" && profileCats ? profileCats : undefined;
    const q = searchQuery || undefined;
    doLoad(cursorRef.current, false, cats, q, eventSlug);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, profileCats, searchQuery, eventSlug]);

const overrideGradient = category !== "all" ? CATEGORY_GRADIENTS[category] : undefined;

  const rows = useMemo<Row[]>(() => {
    const AD_EVERY = 12;
    const items: FlatItem[] = [];
    posts.forEach((post, i) => {
      if (i > 0 && i % AD_EVERY === 0) items.push("ad");
      items.push(post);
    });
    const result: Row[] = [];
    for (let i = 0; i < items.length; i += 2) {
      result.push([items[i], items[i + 1] ?? null]);
    }
    return result;
  }, [posts]);

  const keyExtractor = useCallback((row: Row, index: number) => {
    const left = row[0];
    return left === "ad" ? `ad-${index}` : `post-${(left as Post).id}`;
  }, []);

  const renderCell = useCallback((item: FlatItem, index: number) => {
    if (item === "ad") return <View style={styles.cell}><AdCard /></View>;
    return (
      <View style={styles.cell}>
        <Card
          post={item as Post}
          reaction={reactions[(item as Post).id] ?? null}
          onReact={onReact}
          onPress={onOpenPost}
          hideBadge={category !== "all" || !!eventSlug}
          overrideGradient={overrideGradient}
          animationIndex={index}
        />
      </View>
    );
  }, [reactions, onReact, onOpenPost, category, overrideGradient, eventSlug]);

  const renderItem = useCallback(({ item, index }: { item: Row; index: number }) => {
    const [left, right] = item;
    return (
      <View style={styles.row}>
        <View style={styles.col}>{renderCell(left, index * 2)}</View>
        <View style={styles.col}>{right ? renderCell(right, index * 2 + 1) : null}</View>
      </View>
    );
  }, [renderCell]);

  if (posts.length === 0 && !loadCompleted) {
    return (
      <View style={styles.initialLoader}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <FlashList
      ref={listRef}
      data={rows}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.brand}
        />
      }
      ListEmptyComponent={
        loadCompleted ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t("noPostsYet", lang)}
            </Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        loading ? <ActivityIndicator color={colors.brand} style={{ marginVertical: 20 }} /> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  col: {
    flex: 1,
  },
  cell: {
    padding: 2,
  },
  initialLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 120,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: 14 },
});
