import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Post } from "../types";
import { parseGradient } from "../gradients";
import { getLightGradient } from "../categories";

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
}

export function Card({ post, liked, likeCount, onLike, onPress, hideBadge, overrideGradient }: Props) {
  const lightCss = overrideGradient ?? getLightGradient(post.category, post.gradient);
  const { colors, start, end } = parseGradient(lightCss);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.container}>
      {!!post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.image} resizeMode="cover" />
      )}
      <LinearGradient colors={[...colors]} start={start} end={end} style={styles.gradient}>
        {!hideBadge && (
          <View style={styles.badgeWrap}>
            <Text style={styles.badge}>{post.badge}</Text>
          </View>
        )}
        <Text style={styles.title} numberOfLines={5}>
          {post.title}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.comments} numberOfLines={1}>
            {post._count.comments > 0
              ? `${post._count.comments} comment${post._count.comments === 1 ? "" : "s"}`
              : ""}
          </Text>
          <TouchableOpacity
            onPress={onLike}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.like}>
              {liked ? "❤️" : "🤍"} {formatNum(likeCount)}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 8,
  },
  image: {
    width: "100%",
    height: 120,
  },
  gradient: {
    paddingHorizontal: 10,
    paddingTop: 30,
    paddingBottom: 10,
    minHeight: 110,
  },
  badgeWrap: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badge: {
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(0,0,0,0.65)",
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1a1a1a",
    lineHeight: 18,
    marginBottom: 10,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  comments: {
    fontSize: 10,
    color: "rgba(0,0,0,0.45)",
    flex: 1,
    marginRight: 4,
  },
  like: {
    fontSize: 10,
    color: "rgba(0,0,0,0.45)",
  },
});
