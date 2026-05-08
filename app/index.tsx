import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  NativeSyntheticEvent,
  NativeScrollEvent,
  AppState,
} from "react-native";
import { Card } from "../src/components/Card";
import { ArticleSheet } from "../src/components/ArticleSheet";
import { CategoryTabs } from "../src/components/CategoryTabs";
import { SignInSheet } from "../src/components/SignInSheet";
import { ProfileSheet } from "../src/components/ProfileSheet";
import { fetchPosts, fetchMyLikes, getJwt, fetchProfile, toggleLike } from "../src/api";
import { CATEGORY_GRADIENTS } from "../src/categories";
import type { Post, UserProfile, PageData } from "../src/types";

export default function FeedScreen() {
  const [category, setCategory] = useState("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadingRef = useRef(false);
  const forYouCache = useRef<{ posts: Post[]; cursor: string | null; hasMore: boolean } | null>(null);

  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});

  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [signInVisible, setSignInVisible] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);

  const [searchText, setSearchText] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getJwt().then((jwt) => {
      if (!jwt) return;
      setIsAuthenticated(true);
      fetchProfile().then((p) => {
        setProfile(p);
        if (p?.categories?.length) {
          forYouCache.current = null;
          const cats = (p.categories as string[]).join(",");
          setPosts([]);
          setCursor(null);
          setHasMore(true);
          loadPosts("all", null, true, "", cats);
        }
      });
      fetchMyLikes().then((ids) => setLiked(new Set(ids)));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadPosts("all", null, true);
      }
    });
    return () => sub.remove();
  }, [loadPosts]);

  function getLikeCount(post: Post) {
    return likeCounts[post.id] ?? post.likes;
  }

  const [activeSearch, setActiveSearch] = useState("");

  const loadPosts = useCallback(
    async (cat: string, nextCursor: string | null, reset = false, q = "", catsOverride?: string) => {
      // Reset loads always proceed; append loads skip if already loading
      if (!reset && loadingRef.current) return;
      if (reset) loadingRef.current = false;
      loadingRef.current = true;
      setLoading(true);
      try {
        const cats =
          catsOverride !== undefined
            ? (catsOverride || undefined)
            : (!q && cat === "all" && profile?.categories?.length
                ? profile.categories.join(",")
                : undefined);
        const data: PageData = await fetchPosts(cat, nextCursor, cats, q || undefined);
        setPosts((prev) => {
          if (reset) return data.posts;
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...data.posts.filter((p) => !seen.has(p.id))];
        });
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [profile]
  );

  // Keep For You cache in sync as posts/cursor/hasMore change
  useEffect(() => {
    if (category === "all" && !activeSearch && posts.length > 0) {
      forYouCache.current = { posts, cursor, hasMore };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, cursor, hasMore]);

  useEffect(() => {
    // Switching back to For You: restore cache instead of reloading
    if (category === "all" && !activeSearch && forYouCache.current) {
      setPosts(forYouCache.current.posts);
      setCursor(forYouCache.current.cursor);
      setHasMore(forYouCache.current.hasMore);
      return;
    }
    setPosts([]);
    setCursor(null);
    setHasMore(true);
    loadPosts(category, null, true, activeSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, activeSearch]);

  function handleSearchChange(text: string) {
    setSearchText(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setActiveSearch(text.trim());
    }, 400);
  }

  function handleLike(post: Post) {
    if (!isAuthenticated) {
      setSignInVisible(true);
      return;
    }
    const wasLiked = liked.has(post.id);
    setLiked((prev) => {
      const next = new Set(prev);
      wasLiked ? next.delete(post.id) : next.add(post.id);
      return next;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [post.id]: (prev[post.id] ?? post.likes) + (wasLiked ? -1 : 1),
    }));
    toggleLike(post.id, wasLiked).catch(() => {});
  }

  function handleSignedIn() {
    setIsAuthenticated(true);
    fetchProfile().then((p) => setProfile(p));
    fetchMyLikes().then((ids) => setLiked(new Set(ids)));
  }

  async function handleRefresh() {
    if (category === "all") forYouCache.current = null;
    setRefreshing(true);
    loadingRef.current = false;
    await loadPosts(category, null, true, activeSearch);
    setRefreshing(false);
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const nearBottom =
      contentOffset.y + layoutMeasurement.height >= contentSize.height - 500;
    if (nearBottom && hasMore && !loadingRef.current) {
      loadPosts(category, cursor, false, activeSearch);
    }
  }

  // Independent columns for true masonry — no shared row height
  const leftPosts = posts.filter((_, i) => i % 2 === 0);
  const rightPosts = posts.filter((_, i) => i % 2 === 1);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCategory("all")}>
          <TouchableOpacity onPress={() => {
          forYouCache.current = null;
          setSearchText("");
          setActiveSearch("");
          setCategory("all");
          setPosts([]);
          setCursor(null);
          setHasMore(true);
          loadPosts("all", null, true, "");
        }}>
          <Text style={styles.logo}>📰 NewsBlock</Text>
        </TouchableOpacity>
        </TouchableOpacity>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder="Search articles…"
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>
        <TouchableOpacity
          onPress={() => isAuthenticated ? setProfileVisible(true) : setSignInVisible(true)}
          style={[styles.profileBtn, profile ? styles.profileBtnActive : null]}
        >
          {profile ? (
            <Text style={styles.profileInitial}>
              {profile.screenName[0].toUpperCase()}
            </Text>
          ) : (
            <Text style={styles.profileIcon}>👤</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Category tabs */}
      <CategoryTabs active={category} onChange={setCategory} />

      {/* Masonry feed — two independent columns in a ScrollView */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={200}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#ff2442"
          />
        }
      >
        {posts.length === 0 && loading ? (
          <View style={styles.initialLoader}>
            <ActivityIndicator size="large" color="#ff2442" />
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No posts yet — check back soon!</Text>
          </View>
        ) : (
          <View style={styles.columns}>
            <View style={styles.col}>
              {leftPosts.map((post) => (
                <Card
                  key={post.id}
                  post={post}
                  liked={liked.has(post.id)}
                  likeCount={getLikeCount(post)}
                  onLike={() => handleLike(post)}
                  onPress={() => setOpenPost(post)}
                  hideBadge={category !== "all"}
                  overrideGradient={category !== "all" ? CATEGORY_GRADIENTS[category] : undefined}
                />
              ))}
            </View>
            <View style={styles.col}>
              {rightPosts.map((post) => (
                <Card
                  key={post.id}
                  post={post}
                  liked={liked.has(post.id)}
                  likeCount={getLikeCount(post)}
                  onLike={() => handleLike(post)}
                  onPress={() => setOpenPost(post)}
                  hideBadge={category !== "all"}
                  overrideGradient={category !== "all" ? CATEGORY_GRADIENTS[category] : undefined}
                />
              ))}
            </View>
          </View>
        )}

        {loading && (
          <ActivityIndicator color="#ff2442" style={{ marginVertical: 20 }} />
        )}
      </ScrollView>

      {/* Article detail */}
      <ArticleSheet
        post={openPost}
        liked={openPost ? liked.has(openPost.id) : false}
        likeCount={openPost ? getLikeCount(openPost) : 0}
        onClose={() => setOpenPost(null)}
        onLike={() => openPost && handleLike(openPost)}
        isAuthenticated={isAuthenticated}
        onSignInRequired={() => setSignInVisible(true)}
      />

      {/* Sign in */}
      <SignInSheet
        visible={signInVisible}
        onClose={() => setSignInVisible(false)}
        onSignedIn={handleSignedIn}
      />

      {/* Profile */}
      <ProfileSheet
        visible={profileVisible}
        profile={profile}
        onClose={() => setProfileVisible(false)}
        onSaved={(p) => {
          setProfile(p);
          setCategory("all");
          setPosts([]);
          setCursor(null);
          setHasMore(true);
          const cats = p?.categories?.length ? (p.categories as string[]).join(",") : "";
          loadPosts("all", null, true, "", cats);
        }}
        onSignedOut={() => {
          setIsAuthenticated(false);
          setProfile(null);
          setLiked(new Set());
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  logo: {
    fontSize: 17,
    fontWeight: "800",
    color: "#ff2442",
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  profileBtnActive: {
    backgroundColor: "#ff2442",
  },
  profileInitial: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  profileIcon: {
    fontSize: 18,
  },
  searchRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    marginHorizontal: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  searchIcon: {
    fontSize: 13,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111111",
    paddingVertical: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 8,
    paddingBottom: 40,
  },
  columns: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  col: {
    flex: 1,
  },
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 14,
  },
});
