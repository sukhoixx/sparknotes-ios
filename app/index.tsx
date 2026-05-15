import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import PagerView from "react-native-pager-view";
import type { CategoryTabsHandle } from "../src/components/CategoryTabs";
import { CategoryTabs, CATEGORY_IDS } from "../src/components/CategoryTabs";
import { CategoryFeedPage } from "../src/components/CategoryFeedPage";
import { ArticleSheet } from "../src/components/ArticleSheet";
import { SignInSheet } from "../src/components/SignInSheet";
import { ProfileSheet } from "../src/components/ProfileSheet";
import { fetchMyLikes, getJwt, fetchProfile, toggleLike, fetchPost } from "../src/api";
import { useTheme } from "../src/theme";
import { useLang, toTraditional, toSimplified } from "../src/lang";
import { useEvent } from "../src/event";
import { t } from "../src/i18n";
import type { LangMode } from "../src/lang";
import type { Post, UserProfile } from "../src/types";

export default function FeedScreen() {
  const { openPostId } = useLocalSearchParams<{ openPostId?: string }>();
  const { colors } = useTheme();
  const { lang, setLang } = useLang();
  const { activeEvents } = useEvent();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const eventTabs = useMemo(() =>
    activeEvents.map((event) => ({
      id: event.slug,
      label: `🔴 ${lang === "zh-CN" && event.labelZh ? toSimplified(event.labelZh) : lang === "zh-TW" && event.labelZh ? toTraditional(event.labelZh) : event.label}`,
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeEvents, lang]
  );
  // Event tabs sit after "For You" so the app always lands on For You
  const allPageIds = useMemo(
    () => eventTabs.length > 0 ? [CATEGORY_IDS[0], ...eventTabs.map((t) => t.id), ...CATEGORY_IDS.slice(1)] : CATEGORY_IDS,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventTabs.map((t) => t.id).join(",")]
  );

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
  const [scrollToTopTrigger, setScrollToTopTrigger] = useState(0);

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
      fetchProfile().then((p) => {
        if (p) {
          setProfile(p);
          if (p.lang === "zh-TW" || p.lang === "zh-CN" || p.lang === "en") setLang(p.lang as LangMode);
        }
      });
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

  const handleLike = useCallback((post: Post) => {
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
  }, [isAuthenticated, liked]);

  function handleSignedIn() {
    setIsAuthenticated(true);
    fetchProfile().then((p) => {
      if (p) {
        setProfile(p);
        if (p.lang === "zh-TW" || p.lang === "zh-CN" || p.lang === "en") setLang(p.lang as LangMode);
      }
    });
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
          Keyboard.dismiss();
          setSearchText("");
          setActiveSearch("");
          pagerRef.current?.setPage(0);
          setScrollToTopTrigger((k) => k + 1);
        }}>
          <Text style={styles.logo}>📰 NewsBlock</Text>
        </TouchableOpacity>
        <View style={styles.searchRow}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder={t("searchPlaceholder", lang)}
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
          onPress={() => { Keyboard.dismiss(); isAuthenticated ? setProfileVisible(true) : setSignInVisible(true); }}
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
        active={allPageIds[activePageIndex]}
        leadingTabs={eventTabs}
        onChange={(id) => {
          const idx = allPageIds.indexOf(id);
          if (idx < 0) return;
          if (idx === activePageIndex) {
            setScrollToTopTrigger((k) => k + 1);
          } else {
            setSearchText("");
            setActiveSearch("");
            pagerRef.current?.setPage(idx);
          }
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
          if (pos !== activePageIndex) {
            setSearchText("");
            setActiveSearch("");
          }
          setActivePageIndex(pos);
          tabsRef.current?.snapToPage(pos);
        }}
      >
        {allPageIds.map((pageId, idx) => {
          const eventForPage = activeEvents.find((e) => e.slug === pageId);
          return (
            <View key={pageId} style={{ flex: 1 }}>
              <CategoryFeedPage
                category={eventForPage ? "all" : pageId}
                eventSlug={eventForPage ? pageId : undefined}
                isVisible={idx === activePageIndex}
                isActive={idx === activePageIndex}
                profileCats={pageId === "all" ? (profileCatsStr || undefined) : undefined}
                searchQuery={lang === "zh-CN" && activeSearch ? toTraditional(activeSearch) : activeSearch}
                reloadKey={reloadKey}
                scrollToTopTrigger={scrollToTopTrigger}
                liked={liked}
                likeCounts={likeCounts}
                onLike={handleLike}
                onOpenPost={(post) => { Keyboard.dismiss(); setOpenPost(post); }}
              />
            </View>
          );
        })}
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
