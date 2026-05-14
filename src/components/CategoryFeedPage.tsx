import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { MasonryFlashList } from "@shopify/flash-list";
import { Card } from "./Card";
import { AdCard } from "./AdCard";
import { fetchPosts } from "../api";
import { CATEGORY_GRADIENTS } from "../categories";
import { useTheme } from "../theme";
import { useLang } from "../lang";
import { t } from "../i18n";
import type { Post, PageData } from "../types";

type FlatItem = Post | "ad";

interface Props {
  category: string;
  isVisible: boolean;
  isActive: boolean;
  profileCats?: string;
  searchQuery: string;
  reloadKey: number;
  scrollToTopTrigger: number;
  liked: Set<number>;
  likeCounts: Record<number, number>;
  onLike: (post: Post) => void;
  onOpenPost: (post: Post) => void;
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
  liked,
  likeCounts,
  onLike,
  onOpenPost,
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
  const listRef = useRef<MasonryFlashList<FlatItem>>(null);

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
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
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

  function handleEndReached() {
    if (!hasMoreRef.current || loadingRef.current) return;
    const cats = category === "all" && profileCats ? profileCats : undefined;
    const q = searchQuery || undefined;
    doLoad(cursorRef.current, false, cats, q, eventSlug);
  }

  function getLikeCount(post: Post) {
    return likeCounts[post.id] ?? post.likes;
  }

  const overrideGradient = category !== "all" ? CATEGORY_GRADIENTS[category] : undefined;

  const flatItems = useMemo<FlatItem[]>(() => {
    const AD_EVERY = 24;
    const result: FlatItem[] = [];
    posts.forEach((post, i) => {
      if (i > 0 && i % AD_EVERY === 0) result.push("ad");
      result.push(post);
    });
    return result;
  }, [posts]);

  const keyExtractor = useCallback((item: FlatItem, index: number) => {
    if (item === "ad") return `ad-${index}`;
    return `post-${(item as Post).id}`;
  }, []);

  const renderItem = useCallback(({ item, index }: { item: FlatItem; index: number }) => {
    if (item === "ad") return <View style={styles.cell}><AdCard /></View>;
    return (
      <View style={styles.cell}>
        <Card
          post={item as Post}
          liked={liked.has((item as Post).id)}
          likeCount={getLikeCount(item as Post)}
          onLike={onLike}
          onPress={onOpenPost}
          hideBadge={category !== "all"}
          overrideGradient={overrideGradient}
          animationIndex={index}
        />
      </View>
    );
  }, [liked, likeCounts, onLike, onOpenPost, category, overrideGradient]);

  if (posts.length === 0 && !loadCompleted) {
    return (
      <View style={styles.initialLoader}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <MasonryFlashList
      ref={listRef}
      key={reloadKey}
      data={flatItems}
      numColumns={2}
      optimizeItemArrangement={false}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      estimatedItemSize={250}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.brand}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("noPostsYet", lang)}
          </Text>
        </View>
      }
      ListFooterComponent={
        loading
          ? <ActivityIndicator color={colors.brand} style={{ marginVertical: 20 }} />
          : null
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
