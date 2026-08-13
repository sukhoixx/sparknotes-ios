import React, { useEffect, useRef, useMemo } from "react";
import { Animated, View, Text, TouchableOpacity, Pressable, StyleSheet } from "react-native";
import { toSimplified } from "../lang";
import { t } from "../i18n";
import type { Colors } from "../theme";
import type { LangMode } from "../lang";
import type { Post } from "../types";

const REACTIONS = ["😮", "❤️", "😂", "😢", "😡", "👍"] as const;
export { REACTIONS };
export const PICKER_WIDTH = REACTIONS.length * 48 + 16;

// Style cache keyed by surface color to avoid recreating StyleSheets per render
const styleCache = new Map<string, ReturnType<typeof makeStyles>>();
function getCachedStyles(colors: Colors) {
  const key = colors.surface;
  if (!styleCache.has(key)) styleCache.set(key, makeStyles(colors));
  return styleCache.get(key)!;
}

interface Props {
  post: Post;
  reaction: string | null;
  onReact: (post: Post, emoji: string | null) => void;
  onPress: (post: Post) => void;
  onReactPress: (post: Post, buttonRef: React.RefObject<View>) => void;
  onTapHandled?: () => void; // called when card handles its own tap
  hideBadge?: boolean;
  colors: Colors;
  lang: LangMode;
}

export const Card = React.memo(function Card({ post, reaction, onPress, onReactPress, onTapHandled, hideBadge, colors, lang }: Props) {
  const styles = getCachedStyles(colors);

  const reactionEntries = useMemo(() => {
    const r = { ...(post.reactions ?? {}) };
    if (reaction && !r[reaction]) r[reaction] = 1;
    return Object.entries(r).filter(([, n]) => n > 0);
  }, [post.reactions, reaction]);

  const displayTitle = (lang !== "en" && post.zhTitle
    ? (lang === "zh-CN" ? (post.zhTitleCn ?? toSimplified(post.zhTitle)) : post.zhTitle)
    : post.title).trim();

  const imgOpacity = useRef(new Animated.Value(0)).current;
  const buttonRef = useRef<View>(null);

  useEffect(() => {
    imgOpacity.setValue(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.imageUrl]);

  return (
    <TouchableOpacity
      onPress={() => { onTapHandled?.(); onPress(post); }}
      activeOpacity={0.88}
      style={styles.container}
      shouldRasterizeIOS={true}
      renderToHardwareTextureAndroid={true}
    >
      {!hideBadge && (
        <Text style={styles.badge}>{t(`cat_${post.category}`, lang)}</Text>
      )}
      {!!post.imageUrl && (
        <Animated.Image
          source={{ uri: post.imageUrl }}
          style={[styles.image, { opacity: imgOpacity }]}
          resizeMode="cover"
        />
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
          <View ref={buttonRef} collapsable={false}>
            <Pressable
              onPress={(e) => { e.stopPropagation(); onReactPress(post, buttonRef); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.likeRow}
            >
              {reactionEntries.length > 0
                ? reactionEntries.map(([emoji, count]) => (
                    <React.Fragment key={emoji}>
                      <Text style={styles.likeEmoji}>{emoji}</Text>
                      <Text style={styles.like}>{count}</Text>
                    </React.Fragment>
                  ))
                : <Text style={[styles.likeEmoji, styles.likeEmojiDim]}>😮</Text>
              }
            </Pressable>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 0,
      backgroundColor: c.surface,
    },
    badge: {
      fontSize: 9,
      fontWeight: "600",
      color: c.textFaint,
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: 2,
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
      gap: 2,
    },
    likeEmoji: {
      fontSize: 14,
    },
    likeEmojiDim: {
      opacity: 0.35,
    },
    like: {
      fontSize: 10,
      color: c.textFaint,
    },
  });
}

// Shared picker styles — used by CategoryFeedPage's single Modal
export function makePickerStyles(c: Colors) {
  return StyleSheet.create({
    pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 32,
      paddingHorizontal: 8,
      paddingVertical: 6,
      gap: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 8,
    },
    pickerEmoji: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    pickerEmojiActive: {
      backgroundColor: c.surfaceAlt,
      transform: [{ scale: 1.2 }],
    },
    pickerEmojiText: {
      fontSize: 26,
    },
  });
}
