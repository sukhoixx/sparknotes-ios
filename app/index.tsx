import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
} from "react-native";
import PagerView from "react-native-pager-view";
import type { CategoryTabsHandle } from "../src/components/CategoryTabs";
import { CategoryTabs, CATEGORY_IDS } from "../src/components/CategoryTabs";
import { CategoryFeedPage } from "../src/components/CategoryFeedPage";
import { ArticleSheet } from "../src/components/ArticleSheet";
import { SignInSheet } from "../src/components/SignInSheet";
import { ProfileSheet } from "../src/components/ProfileSheet";
import { fetchMyLikes, getJwt, fetchProfile, toggleLike, fetchPost } from "../src/api";
import { useTheme } from "../src/theme";
import type { Post, UserProfile } from "../src/types";

export default function FeedScreen() {
  const { openPostId } = useLocalSearchParams<{ openPostId?: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const pagerRef = useRef<PagerView>(null);
  const tabsRef = useRef<CategoryTabsHandle>(null);
  const [activePageIndex, setActivePageIndex] = useState(0);

  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});

  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [signInVisible, setSignInVisible] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);

  const [searchText, setSearchText] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeSearch, setActiveSearch] = useState("");

  // reloadKey: bumped when search or profile categories change — pages reload lazily
  const [reloadKey, setReloadKey] = useState(0);
  const profileCatsStr = profile?.categories?.length ? profile.categories.join(",") : "";
  const prevProfileCatsRef = useRef("");
  const prevActiveSearchRef = useRef("");

  useEffect(() => {
    const profileChanged = profileCatsStr !== prevProfileCatsRef.current;
    const searchChanged = activeSearch !== prevActiveSearchRef.current;
    if (profileChanged || searchChanged) {
      prevProfileCatsRef.current = profileCatsStr;
      prevActiveSearchRef.current = activeSearch;
      setReloadKey((k) => k + 1);
    }
  }, [profileCatsStr, activeSearch]);

  // Auth init
  useEffect(() => {
    getJwt().then((jwt) => {
      if (!jwt) return;
      setIsAuthenticated(true);
      fetchProfile().then((p) => { if (p) setProfile(p); });
      fetchMyLikes().then((ids) => setLiked(new Set(ids)));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deep link via route param
  useEffect(() => {
    if (!openPostId) return;
    fetchPost(parseInt(openPostId)).then((post) => { if (post) setOpenPost(post); });
  }, [openPostId]);

  // Deep link via URL scheme
  function handleDeepLink(url: string | null) {
    if (!url) return;
    const match = url.match(/\/posts\/(\d+)/);
    if (!match) return;
    fetchPost(parseInt(match[1])).then((post) => { if (post) setOpenPost(post); });
  }

  useEffect(() => {
    Linking.getInitialURL().then(handleDeepLink);
    const sub = Linking.addEventListener("url", ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function handleSearchChange(text: string) {
    setSearchText(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setActiveSearch(text.trim());
    }, 400);
  }

  function getLikeCount(post: Post) {
    return likeCounts[post.id] ?? post.likes;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          setSearchText("");
          setActiveSearch("");
          pagerRef.current?.setPage(0);
        }}>
          <Text style={styles.logo}>📰 NewsBlock</Text>
        </TouchableOpacity>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder="Search articles…"
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            autoCorrect={false}
          />
          {!!searchText && (
            <TouchableOpacity
              onPress={() => { setSearchText(""); setActiveSearch(""); }}
              style={styles.searchClear}
            >
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => isAuthenticated ? setProfileVisible(true) : setSignInVisible(true)}
          style={[styles.profileBtn, profile ? styles.profileBtnActive : null]}
        >
          {profile ? (
            <Text style={styles.profileInitial}>{profile.screenName[0].toUpperCase()}</Text>
          ) : (
            <Text style={styles.profileIcon}>👤</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Category tabs */}
      <CategoryTabs
        ref={tabsRef}
        active={CATEGORY_IDS[activePageIndex]}
        onChange={(id) => {
          const idx = CATEGORY_IDS.indexOf(id);
          if (idx >= 0) pagerRef.current?.setPage(idx);
        }}
      />

      {/* Paged feed — one page per category */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        offscreenPageLimit={1}
        onPageScroll={(e) => {
          const { position, offset } = e.nativeEvent;
          tabsRef.current?.scrollToProgress(position, offset);
        }}
        onPageSelected={(e) => {
          const pos = e.nativeEvent.position;
          setActivePageIndex(pos);
          tabsRef.current?.snapToPage(pos);
        }}
      >
        {CATEGORY_IDS.map((cat, idx) => (
          <View key={cat} style={{ flex: 1 }}>
            <CategoryFeedPage
              category={cat}
              isVisible={Math.abs(idx - activePageIndex) <= 1}
              profileCats={cat === "all" ? (profileCatsStr || undefined) : undefined}
              searchQuery={activeSearch}
              reloadKey={reloadKey}
              liked={liked}
              likeCounts={likeCounts}
              onLike={handleLike}
              onOpenPost={setOpenPost}
            />
          </View>
        ))}
      </PagerView>

      <ArticleSheet
        post={openPost}
        liked={openPost ? liked.has(openPost.id) : false}
        likeCount={openPost ? getLikeCount(openPost) : 0}
        onClose={() => setOpenPost(null)}
        onLike={() => openPost && handleLike(openPost)}
        isAuthenticated={isAuthenticated}
        onSignInRequired={() => setSignInVisible(true)}
      />

      <SignInSheet
        visible={signInVisible}
        onClose={() => setSignInVisible(false)}
        onSignedIn={handleSignedIn}
      />

      <ProfileSheet
        visible={profileVisible}
        profile={profile}
        onClose={() => setProfileVisible(false)}
        onSaved={(p) => {
          setProfile(p);
          pagerRef.current?.setPage(0);
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

function makeStyles(c: ReturnType<typeof import("../src/theme").useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: c.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    logo: {
      fontSize: 17,
      fontWeight: "800",
      color: c.brand,
    },
    profileBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    profileBtnActive: {
      backgroundColor: c.brand,
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
      backgroundColor: c.surfaceAlt,
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
      color: c.text,
      paddingVertical: 0,
    },
    searchClear: {
      padding: 4,
    },
    searchClearText: {
      fontSize: 12,
      color: c.textMuted,
    },
  });
}
