import React, { useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Text,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import type { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { Card } from "./Card";
import { AdCard } from "./AdCard";
import { fetchPosts } from "../api";
import { CATEGORY_GRADIENTS } from "../categories";
import { useTheme } from "../theme";
import type { Post, PageData } from "../types";

interface Props {
  category: string;
  isVisible: boolean;
  profileCats?: string;
  searchQuery: string;
  reloadKey: number;
  liked: Set<number>;
  likeCounts: Record<number, number>;
  onLike: (post: Post) => void;
  onOpenPost: (post: Post) => void;
}

export function CategoryFeedPage({
  category,
  isVisible,
  profileCats,
  searchQuery,
  reloadKey,
  liked,
  likeCounts,
  onLike,
  onOpenPost,
}: Props) {
  const { colors } = useTheme();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const loadedForKeyRef = useRef(-1);
  const loadDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loadCompleted, setLoadCompleted] = useState(false);


  async function doLoad(
    nextCursor: string | null,
    reset: boolean,
    cats: string | undefined,
    q: string | undefined
  ) {
    if (!reset && loadingRef.current) return;
    if (reset) loadingRef.current = false;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data: PageData = await fetchPosts(category, nextCursor, cats, q);
      setPosts((prev) => {
        if (reset) return data.posts;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.posts.filter((p) => !seen.has(p.id))];
      });
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
      doLoad(null, true, cats, q);
    }, 80);
  }, [isVisible, reloadKey]);

  async function handleRefresh() {
    setRefreshing(true);
    loadingRef.current = false;
    cursorRef.current = null;
    hasMoreRef.current = true;
    const cats = category === "all" && profileCats ? profileCats : undefined;
    const q = searchQuery || undefined;
    await doLoad(null, true, cats, q);
    setRefreshing(false);
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const nearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 500;
    if (nearBottom && hasMoreRef.current && !loadingRef.current) {
      const cats = category === "all" && profileCats ? profileCats : undefined;
      const q = searchQuery || undefined;
      doLoad(cursorRef.current, false, cats, q);
    }
  }

  function getLikeCount(post: Post) {
    return likeCounts[post.id] ?? post.likes;
  }

  const overrideGradient = category !== "all" ? CATEGORY_GRADIENTS[category] : undefined;

  // Interleave an ad slot every AD_EVERY posts, then pair into 2-column rows
  const AD_EVERY = 8;
  const items: (Post | "ad")[] = [];
  posts.forEach((post, i) => {
    if (i > 0 && i % AD_EVERY === 0) items.push("ad");
    items.push(post);
  });
  const rows: [(Post | "ad"), (Post | "ad") | null][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i], items[i + 1] ?? null]);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand}
          />
        }
      >
        {posts.length === 0 && !loadCompleted ? (
          <View style={styles.initialLoader}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : posts.length === 0 && loadCompleted ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No posts yet — check back soon!
            </Text>
          </View>
        ) : (
          <>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                <View style={styles.col}>
                  {row[0] === "ad" ? (
                    <AdCard />
                  ) : (
                    <Card
                      post={row[0]}
                      liked={liked.has(row[0].id)}
                      likeCount={getLikeCount(row[0])}
                      onLike={() => onLike(row[0] as Post)}
                      onPress={() => onOpenPost(row[0] as Post)}
                      hideBadge={category !== "all"}
                      overrideGradient={overrideGradient}
                      animationIndex={rowIndex * 2}
                    />
                  )}
                </View>
                <View style={styles.col}>
                  {row[1] === "ad" ? (
                    <AdCard />
                  ) : row[1] ? (
                    <Card
                      post={row[1]}
                      liked={liked.has(row[1].id)}
                      likeCount={getLikeCount(row[1])}
                      onLike={() => onLike(row[1] as Post)}
                      onPress={() => onOpenPost(row[1] as Post)}
                      hideBadge={category !== "all"}
                      overrideGradient={overrideGradient}
                      animationIndex={rowIndex * 2 + 1}
                    />
                  ) : null}
                </View>
              </View>
            ))}
            {loading && (
              <ActivityIndicator color={colors.brand} style={{ marginVertical: 20 }} />
            )}
          </>
        )}
      </ScrollView>
    </View>
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
    gap: 4,
    alignItems: "flex-start",
  },
  col: { flex: 1 },
  initialLoader: {
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
