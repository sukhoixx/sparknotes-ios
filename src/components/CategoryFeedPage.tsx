import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ScrollView,
} from "react-native";
import { VirtualizedMasonryList } from "./VirtualizedMasonryList";
import { Card } from "./Card";
import { AdCard } from "./AdCard";
import { fetchPosts } from "../api";
import { CATEGORY_GRADIENTS } from "../categories";
import { useTheme } from "../theme";
import { useLang } from "../lang";
import { t } from "../i18n";
import type { Post, PageData } from "../types";

type FlatItem = Post | "ad";

function estimateCardHeight(item: FlatItem, hideBadge: boolean): number {
  if (item === "ad") return 250;
  const post = item as Post;
  const badgeH = hideBadge ? 0 : 21;
  const imageH = post.imageUrl ? 120 : 0;
  const charPerLine = 22;
  const titleLines = Math.min(5, Math.ceil((post.title?.length ?? 30) / charPerLine));
  const contentH = Math.max(80, 8 + titleLines * 19 + 10 + 14 + 10);
  return badgeH + imageH + contentH + 4;
}

interface CardCellProps {
  item: FlatItem;
  index: number;
  reaction: string | null;
  onReact: (post: Post, emoji: string | null) => void;
  onOpenPost: (post: Post) => void;
  hideBadge: boolean;
  overrideGradient?: string;
  columnWidth?: number;
}

const CardCell = React.memo(function CardCell({ item, index, reaction, onReact, onOpenPost, hideBadge, overrideGradient, columnWidth }: CardCellProps) {
  if (item === "ad") return <View style={[styles.cell, styles.adCell]}><AdCard width={columnWidth != null ? columnWidth - 4 : undefined} /></View>;
  return (
    <View style={styles.cell}>
      <Card
        post={item as Post}
        reaction={reaction}
        onReact={onReact}
        onPress={onOpenPost}
        hideBadge={hideBadge}
        overrideGradient={overrideGradient}
        animationIndex={index}
      />
    </View>
  );
});

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

export const CategoryFeedPage = React.memo(function CategoryFeedPage({
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
  const listRef = useRef<ScrollView>(null);

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
      listRef.current?.scrollTo({ y: 0, animated: true });
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
  const hideBadge = category !== "all" || !!eventSlug;

  const flatItems = useMemo<FlatItem[]>(() => {
    const AD_EVERY = 12;
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

  const estimateHeight = useCallback((item: FlatItem, _index: number) => {
    return estimateCardHeight(item, hideBadge);
  }, [hideBadge]);

  const renderItem = useCallback(({ item, index, columnWidth }: { item: FlatItem; index: number; columnWidth: number }) => {
    const reaction = item === "ad" ? null : (reactions[(item as Post).id] ?? null);
    return (
      <CardCell
        item={item}
        index={index}
        reaction={reaction}
        onReact={onReact}
        onOpenPost={onOpenPost}
        hideBadge={hideBadge}
        overrideGradient={overrideGradient}
        columnWidth={columnWidth}
      />
    );
  }, [reactions, onReact, onOpenPost, hideBadge, overrideGradient]);

  if (posts.length === 0 && !loadCompleted) {
    return (
      <View style={styles.initialLoader}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <VirtualizedMasonryList
      data={flatItems}
      numColumns={2}
      estimateHeight={estimateHeight}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      scrollRef={listRef}
      contentContainerStyle={styles.scrollContent}
      columnGap={0}
      rowGap={0}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.brand} />
      }
      ListEmptyComponent={
        loadCompleted ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t("noPostsYet", lang)}</Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        loading ? <ActivityIndicator color={colors.brand} style={{ marginVertical: 20 }} /> : null
      }
    />
  );
});

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  cell: {
    padding: 2,
  },
  adCell: {
    minHeight: 250,
    paddingBottom: 8,
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
