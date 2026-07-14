import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, View, Text, TouchableOpacity, Pressable, StyleSheet, Modal, Dimensions } from "react-native";
import { useTheme } from "../theme";
import { useLang, toSimplified } from "../lang";
import { t } from "../i18n";
import type { Colors } from "../theme";
import type { Post } from "../types";

function formatNum(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}

const REACTIONS = ["😮", "❤️", "😂", "😢", "😡", "👍"] as const;
const PICKER_WIDTH = REACTIONS.length * 48 + 16;

interface Props {
  post: Post;
  reaction: string | null;
  onReact: (post: Post, emoji: string | null) => void;
  onPress: (post: Post) => void;
  hideBadge?: boolean;
  overrideGradient?: string;
  animationIndex?: number;
}

export const Card = React.memo(function Card({ post, reaction, onReact, onPress, hideBadge, animationIndex = 0 }: Props) {
  const { colors } = useTheme();
  const { lang } = useLang();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const reactionEntries = useMemo(() => {
    const r = { ...(post.reactions ?? {}) };
    if (reaction && !r[reaction]) r[reaction] = 1;
    return Object.entries(r).filter(([, n]) => n > 0);
  }, [post.reactions, reaction]);

  const displayTitle = (lang !== "en" && post.zhTitle
    ? (lang === "zh-CN" ? (post.zhTitleCn ?? toSimplified(post.zhTitle)) : post.zhTitle)
    : post.title).trim();

  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const imgOpacity = useRef(new Animated.Value(0)).current;
  const pickerAnim = useRef(new Animated.Value(0)).current;

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<View>(null);

  useEffect(() => {
    // Start visible — onLoad may not fire for cached images on remount
    imgOpacity.setValue(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.imageUrl]);


  function showPicker() {
    buttonRef.current?.measureInWindow((x, y, w) => {
      const screenW = Dimensions.get("window").width;
      const centeredX = x + w / 2 - PICKER_WIDTH / 2;
      const clampedX = Math.min(Math.max(8, centeredX), screenW - PICKER_WIDTH - 8);
      setPickerPos({ x: clampedX, y: y - 60 });
      setPickerVisible(true);
      pickerAnim.setValue(0);
      Animated.spring(pickerAnim, { toValue: 1, useNativeDriver: true, bounciness: 10, speed: 18 }).start();
    });
  }

  function hidePicker() {
    Animated.timing(pickerAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setPickerVisible(false));
  }

  function handleSelect(emoji: string) {
    onReact(post, reaction === emoji ? null : emoji);
    hidePicker();
  }

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
    <TouchableOpacity
      onPress={() => onPress(post)}
      activeOpacity={0.88}
      style={styles.container}
    >
      {!hideBadge && (
        <View style={styles.badgeWrap}>
          <Text style={styles.badge}>{t(`cat_${post.category}`, lang)}</Text>
        </View>
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
              onPress={(e) => { e.stopPropagation(); showPicker(); }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.likeRow}>
                {reactionEntries.length > 0
                  ? reactionEntries.map(([emoji, count]) => (
                      <React.Fragment key={emoji}>
                        <Text style={styles.likeEmoji}>{emoji}</Text>
                        <Text style={styles.like}>{count}</Text>
                      </React.Fragment>
                    ))
                  : <Text style={[styles.likeEmoji, styles.likeEmojiDim]}>😮</Text>
                }
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </TouchableOpacity>

    <Modal visible={pickerVisible} transparent animationType="none" onRequestClose={hidePicker}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={hidePicker}>
        <Animated.View
          style={[
            styles.pickerRow,
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
              onPress={() => handleSelect(emoji)}
              style={[styles.pickerEmoji, reaction === emoji && styles.pickerEmojiActive]}
            >
              <Text style={styles.pickerEmojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
    </Animated.View>
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
