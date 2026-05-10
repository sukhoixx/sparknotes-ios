import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Animated,
  Linking,
  Share,
  Image,
} from "react-native";
import { PanGestureHandler, TapGestureHandler, State } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RenderHtml from "react-native-render-html";
import { useTheme } from "../theme";
import type { Colors } from "../theme";
import type { Post, Comment } from "../types";
import { fetchComments, postComment, fetchOgImage } from "../api";

function formatNum(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}

interface Props {
  post: Post | null;
  liked: boolean;
  likeCount: number;
  onClose: () => void;
  onLike: () => void;
  isAuthenticated: boolean;
  onSignInRequired: () => void;
}

function HeroImage({ lowRes, highRes, width }: { lowRes?: string; highRes?: string; width: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  function onHighResLoad() {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }

  const imageStyle = { width, height: 200, borderRadius: 12, marginBottom: 16 };

  return (
    <View style={imageStyle}>
      {!!lowRes && (
        <Image source={{ uri: lowRes }} style={[imageStyle, { position: "absolute" }]} resizeMode="cover" />
      )}
      {!!highRes && (
        <Animated.Image
          source={{ uri: highRes }}
          style={[imageStyle, { position: "absolute", opacity: fadeAnim }]}
          resizeMode="cover"
          onLoad={onHighResLoad}
        />
      )}
    </View>
  );
}

export function ArticleSheet({
  post,
  liked,
  likeCount,
  onClose,
  onLike,
  isAuthenticated,
  onSignInRequired,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const htmlTagStyles = useMemo(() => ({
    p: { color: colors.textSub, fontSize: 15, lineHeight: 24, marginBottom: 12 },
    strong: { color: colors.text, fontWeight: "700" as const },
  }), [colors]);

  const bodySource = useMemo(() => ({ html: post?.body ?? "" }), [post?.body]);
  const funFactSource = useMemo(() => ({ html: `<p>${post?.funFact ?? ""}</p>` }), [post?.funFact]);
  const funFactTagStyles = useMemo(() => ({
    p: { color: "#92400e", fontSize: 13, lineHeight: 20, margin: 0 },
    strong: { color: "#92400e", fontWeight: "700" as const },
  }), []);

  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const doubleTapRef = useRef(null);
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  function onDoubleTap({ nativeEvent }: any) {
    if (nativeEvent.state !== State.ACTIVE) return;
    if (!liked) onLike();
    heartScale.setValue(0);
    heartOpacity.setValue(1);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, bounciness: 12 }),
      Animated.delay(350),
      Animated.timing(heartOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  useLayoutEffect(() => {
    if (post) {
      translateX.setValue(0);
      scale.setValue(0.88);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 0, speed: 18 }),
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  }, [post?.id]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  function handleClose() {
    Animated.parallel([
      Animated.timing(scale, { toValue: 0.88, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }

  function onHandlerStateChange({ nativeEvent }: any) {
    if (nativeEvent.state === State.END || nativeEvent.state === State.CANCELLED) {
      const { translationX, velocityX } = nativeEvent;
      if (Math.abs(translationX) > 80 || Math.abs(velocityX) > 600) {
        Animated.timing(translateX, {
          toValue: translationX > 0 ? width : -width,
          duration: 180,
          useNativeDriver: true,
        }).start(() => onClose());
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      }
    }
  }

  const [ogImage, setOgImage] = useState<string | null>(null);

  useEffect(() => {
    if (!post?.sourceUrl) { setOgImage(null); return; }
    setOgImage(null);
    fetchOgImage(post.sourceUrl).then(setOgImage);
  }, [post?.id]);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!post) {
      setComments([]);
      return;
    }
    setCommentsLoading(true);
    fetchComments(post.id).then((c) => {
      setComments(c);
      setCommentsLoading(false);
    });
  }, [post?.id]);

  async function handleComment() {
    if (!post || !commentText.trim() || submitting) return;
    if (!isAuthenticated) { onSignInRequired(); return; }
    setSubmitting(true);
    const comment = await postComment(post.id, commentText.trim());
    if (comment) {
      setComments((prev) => [comment, ...prev]);
      setCommentText("");
      Keyboard.dismiss();
    }
    setSubmitting(false);
  }

  const contentWidth = width - 32;

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      activeOffsetX={[-15, 15]}
      failOffsetY={[-10, 10]}
      enabled={!!post}
    >
      <Animated.View
        style={[
          styles.container,
          { paddingTop: insets.top, opacity, transform: [{ translateX }, { scale }] },
        ]}
        pointerEvents={post ? "auto" : "none"}
      >
        {/* Header bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeLabel}>✕</Text>
          </TouchableOpacity>
          {post && (
            <TouchableOpacity
              onPress={isAuthenticated ? onLike : onSignInRequired}
              style={styles.likeBtn}
            >
              <Text style={styles.likeEmoji}>{liked ? "❤️" : "🤍"}</Text>
              <Text style={styles.likeCount}>{formatNum(likeCount)}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TapGestureHandler
          ref={doubleTapRef}
          numberOfTaps={2}
          onHandlerStateChange={onDoubleTap}
        >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={60}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {post && (
              <>
                {/* Date */}
                <Text style={[styles.dateText, { marginBottom: 12 }]}>
                  {new Date(post.createdAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </Text>

                {/* Title */}
                <Text style={styles.title}>{post.title}</Text>

                {/* Hero image */}
                {!!(ogImage ?? post.imageUrl) && (
                  <HeroImage
                    lowRes={post.imageUrl ?? undefined}
                    highRes={ogImage ?? undefined}
                    width={contentWidth}
                  />
                )}

                {/* Body */}
                <RenderHtml
                  contentWidth={contentWidth}
                  source={bodySource}
                  tagsStyles={htmlTagStyles}
                />

                {/* Fun fact */}
                {!!post.funFact && (
                  <View style={styles.funFact}>
                    <RenderHtml
                      contentWidth={contentWidth - 28}
                      source={funFactSource}
                      tagsStyles={funFactTagStyles}
                    />
                  </View>
                )}

                {/* Tags */}
                {post.tags?.length > 0 && (
                  <View style={styles.tags}>
                    {post.tags.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Source link + share buttons */}
                {!!post.sourceUrl && (
                  <View style={styles.sourceRow}>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(post.sourceUrl!)}
                      style={styles.sourceBtn}
                    >
                      <Text style={styles.sourceBtnLabel}>View Source Article →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => {
                        const appLink = `https://sparknotes-production.up.railway.app/posts/${post.id}`;
                        Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appLink)}`);
                      }}
                    >
                      <Text style={[styles.shareBtnText, { color: "#1877f2" }]}>f</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => {
                        const appLink = `https://sparknotes-production.up.railway.app/posts/${post.id}`;
                        Linking.openURL(`https://twitter.com/intent/tweet?url=${encodeURIComponent(appLink)}&text=${encodeURIComponent(post.title)}`);
                      }}
                    >
                      <Text style={[styles.shareBtnText, { color: "#000000" }]}>𝕏</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => {
                        const appLink = `https://sparknotes-production.up.railway.app/posts/${post.id}`;
                        Share.share({ url: appLink });
                      }}
                    >
                      <Text style={styles.shareBtnText}>🔗</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Comments */}
                <Text style={styles.commentsHeader}>
                  {comments.length} Comment{comments.length === 1 ? "" : "s"}
                </Text>

                {commentsLoading && (
                  <ActivityIndicator color={colors.brand} style={{ marginVertical: 16 }} />
                )}

                {comments.map((c) => (
                  <View key={c.id} style={styles.comment}>
                    <Text style={styles.commentName}>{c.screenName}</Text>
                    <Text style={styles.commentBody}>{c.text}</Text>
                  </View>
                ))}

                <View style={{ height: 80 }} />
              </>
            )}
          </ScrollView>

          {/* Comment input */}
          <View style={[styles.inputRow, { paddingBottom: Math.max(12, insets.bottom) }]}>
            <TextInput
              style={styles.input}
              placeholder={isAuthenticated ? "Add a comment…" : "Sign in to comment…"}
              placeholderTextColor={colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
              onFocus={() => { if (!isAuthenticated) onSignInRequired(); }}
              editable={isAuthenticated && !!post}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleComment}
              disabled={!commentText.trim() || submitting}
              style={[styles.sendBtn, (!commentText.trim() || submitting) && styles.sendBtnDisabled]}
            >
              <Text style={styles.sendLabel}>↑</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        </TapGestureHandler>

        {/* Double-tap heart animation */}
        <Animated.Text
          style={[styles.heartOverlay, { opacity: heartOpacity, transform: [{ scale: heartScale }] }]}
          pointerEvents="none"
        >
          ❤️
        </Animated.Text>
      </Animated.View>
    </PanGestureHandler>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.surface,
      zIndex: 100,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    closeLabel: { color: c.textSub, fontSize: 14 },
    likeBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    likeEmoji: { fontSize: 22 },
    likeCount: { color: c.textSub, fontSize: 14, fontWeight: "600" },
    scroll: { flex: 1 },
    scrollContent: { padding: 16 },
    dateText: { fontSize: 11, color: c.textMuted },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: c.text,
      lineHeight: 28,
      marginBottom: 16,
    },
    funFact: {
      backgroundColor: "#fffbeb",
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: "#f59e0b",
    },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 24 },
    tag: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    tagText: { color: c.textTertiary, fontSize: 12 },
    sourceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 24,
    },
    sourceBtn: {
      borderWidth: 1.5,
      borderColor: c.brand,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 7,
    },
    sourceBtnLabel: { color: c.brand, fontSize: 13, fontWeight: "700" },
    shareBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    shareBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: c.textTertiary,
    },
    commentsHeader: { fontSize: 16, fontWeight: "700", color: c.text, marginBottom: 16 },
    comment: {
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    commentName: { fontSize: 13, fontWeight: "700", color: c.brand, marginBottom: 4 },
    commentBody: { fontSize: 14, color: c.textSub, lineHeight: 20 },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.surface,
      gap: 8,
    },
    input: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: c.text,
      fontSize: 14,
      maxHeight: 100,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.brand,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: { opacity: 0.4 },
    sendLabel: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
    heartOverlay: {
      position: "absolute",
      alignSelf: "center",
      top: "40%",
      fontSize: 80,
      zIndex: 200,
    },
  });
}
