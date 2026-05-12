import React, { useEffect, useMemo, useRef } from "react";
import { Animated, View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { useLang, toSimplified } from "../lang";
import { t } from "../i18n";
import type { Colors } from "../theme";
import type { Post } from "../types";

function formatNum(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}

interface Props {
  post: Post;
  liked: boolean;
  likeCount: number;
  onLike: () => void;
  onPress: () => void;
  hideBadge?: boolean;
  overrideGradient?: string;
  animationIndex?: number;
}

export function Card({ post, liked, likeCount, onLike, onPress, hideBadge, animationIndex = 0 }: Props) {
  const { colors } = useTheme();
  const { lang } = useLang();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const displayTitle = lang !== "en" && post.zhTitle
    ? (lang === "zh-CN" ? toSimplified(post.zhTitle) : post.zhTitle)
    : post.title;
  const pressStartX = useRef(0);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const delay = Math.min(animationIndex, 7) * 25;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, delay, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
    <TouchableOpacity
      onPressIn={(e) => { pressStartX.current = e.nativeEvent.pageX; }}
      onPress={(e) => {
        if (Math.abs(e.nativeEvent.pageX - pressStartX.current) > 10) return;
        onPress();
      }}
      activeOpacity={0.88}
      style={styles.container}
    >
      {!hideBadge && (
        <View style={styles.badgeWrap}>
          <Text style={styles.badge}>{post.badge}</Text>
        </View>
      )}
      {!!post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.image} resizeMode="cover" />
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={5}>
          {displayTitle}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.comments} numberOfLines={1}>
            {post._count.comments > 0
              ? lang === "en"
                ? `${post._count.comments} ${post._count.comments === 1 ? t("comment", lang) : t("commentPlural", lang)}`
                : `${post._count.comments} ${t("commentPlural", lang)}`
              : ""}
          </Text>
          <TouchableOpacity
            onPress={onLike}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.likeRow}>
              <Ionicons
                name={liked ? "heart" : "heart-outline"}
                size={12}
                color={liked ? "#e03" : colors.textFaint}
              />
              <Text style={styles.like}> {formatNum(likeCount)}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 4,
      backgroundColor: c.surface,
    },
    badgeWrap: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: c.surface,
    },
    badge: {
      fontSize: 9,
      fontWeight: "600",
      color: c.textFaint,
    },
    image: {
      width: "100%",
      height: 120,
    },
    content: {
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 10,
      minHeight: 80,
    },
    title: {
      fontSize: 14,
      fontWeight: "700",
      color: c.text,
      lineHeight: 19,
      marginBottom: 10,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    comments: {
      fontSize: 10,
      color: c.textFaint,
      flex: 1,
      marginRight: 4,
    },
    likeRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    like: {
      fontSize: 10,
      color: c.textFaint,
    },
  });
}
