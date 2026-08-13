import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { VirtualizedMasonryList } from "./VirtualizedMasonryList";
import { Card, REACTIONS, PICKER_WIDTH, makePickerStyles } from "./Card";
import { AdCard } from "./AdCard";
import { fetchPosts } from "../api";
import { CATEGORY_GRADIENTS } from "../categories";
import { remoteConfig } from "../config";
import { useTheme } from "../theme";
import { useLang } from "../lang";
import { t } from "../i18n";
import type { Post, PageData } from "../types";
import type { Colors } from "../theme";
import type { LangMode } from "../lang";

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
  onReactPress: (post: Post, buttonRef: React.RefObject<View>) => void;
  onTapHandled: () => void;
  hideBadge: boolean;
  overrideGradient?: string;
  columnWidth?: number;
  colors: Colors;
  lang: LangMode;
}

const CardCell = React.memo(function CardCell({ item, index, reaction, onReact, onOpenPost, onReactPress, onTapHandled, hideBadge, overrideGradient, columnWidth, colors, lang }: CardCellProps) {
  if (item === "ad") return <View style={styles.cell}><AdCard /></View>;
  return (
    <View style={styles.cell}>
      <Card
        post={item as Post}
        reaction={reaction}
        onReact={onReact}
        onPress={onOpenPost}
        onReactPress={onReactPress}
        onTapHandled={onTapHandled}
        hideBadge={hideBadge}
        colors={colors}
        lang={lang}
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
  const pickerStyles = useMemo(() => makePickerStyles(colors), [colors]);

  // Shared emoji picker state — single Modal for all cards in this feed
  const [pickerPost, setPickerPost] = useState<Post | null>(null);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });
  const pickerAnim = useRef(new Animated.Value(0)).current;

  // Ref that cards set when they handle a tap — prevents the ScrollView fallback from also firing
  const tapHandledRef = useRef(false);
  // Ref set by VirtualizedMasonryList when a touch is stopping momentum scroll
  const scrollStoppingRef = useRef(false);

  const handleReactPress = useCallback((post: Post, buttonRef: React.RefObject<View>) => {
    tapHandledRef.current = true; // mark tap as handled so fallback doesn't fire
    buttonRef.current?.measureInWindow((x, y, w) => {
      const screenW = Dimensions.get("window").width;
      const centeredX = x + w / 2 - PICKER_WIDTH / 2;
      const clampedX = Math.min(Math.max(8, centeredX), screenW - PICKER_WIDTH - 8);
      setPickerPos({ x: clampedX, y: y - 60 });
      setPickerPost(post);
      pickerAnim.setValue(0);
      Animated.spring(pickerAnim, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 18 }).start();
    });
  }, [pickerAnim]);

  const hidePicker = useCallback(() => {
    Animated.timing(pickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setPickerPost(null));
  }, [pickerAnim]);

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
    const AD_EVERY = remoteConfig.adFrequency;
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

  const reactionsRef = useRef(reactions);
  reactionsRef.current = reactions;

  // Wrap onOpenPost to prevent opening when user tapped to stop momentum scroll
  const handleOpenPost = useCallback((post: Post) => {
    if (scrollStoppingRef.current) return;
    onOpenPost(post);
  }, [onOpenPost]);

  const renderItem = useCallback(({ item, index, columnWidth }: { item: FlatItem; index: number; columnWidth: number }) => {
    const reaction = item === "ad" ? null : (reactionsRef.current[(item as Post).id] ?? null);
    return (
      <CardCell
        item={item}
        index={index}
        reaction={reaction}
        onReact={onReact}
        onOpenPost={handleOpenPost}
        onReactPress={handleReactPress}
        onTapHandled={() => { tapHandledRef.current = true; }}
        hideBadge={hideBadge}
        overrideGradient={overrideGradient}
        columnWidth={columnWidth}
        colors={colors}
        lang={lang}
      />
    );
  }, [onReact, onOpenPost, handleReactPress, hideBadge, overrideGradient, colors, lang]);

  if (posts.length === 0 && !loadCompleted) {
    return (
      <View style={styles.initialLoader}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const pickerReaction = pickerPost ? (reactions[pickerPost.id] ?? null) : null;

  return (
    <>
    <Modal visible={!!pickerPost} transparent animationType="none" onRequestClose={hidePicker}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={hidePicker}>
        <Animated.View
          style={[
            pickerStyles.pickerRow,
            {
              position: "absolute",
              left: pickerPos.x,
              top: pickerPos.y,
              opacity: pickerAnim,
              transform: [{ scale: pickerAnim }],
            },
          ]}
        >
          {REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => {
                if (pickerPost) onReact(pickerPost, pickerReaction === emoji ? null : emoji);
                hidePicker();
              }}
              style={[pickerStyles.pickerEmoji, pickerReaction === emoji && pickerStyles.pickerEmojiActive]}
            >
              <Text style={pickerStyles.pickerEmojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
    <VirtualizedMasonryList
      data={flatItems}
      numColumns={2}
      estimateHeight={estimateHeight}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      scrollRef={listRef}
      onTapFallback={(item) => {
        if (item !== "ad") handleOpenPost(item as Post);
      }}
      tapHandledRef={tapHandledRef}
      scrollStoppingRef={scrollStoppingRef}
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
    </>
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
