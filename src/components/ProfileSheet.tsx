import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  Linking,
} from "react-native";
import { FlatList } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { saveProfile, deleteAccount, fetchRewards } from "../api";
import type { DailyReward } from "../api";
import { signOut } from "../auth";
import { useTheme } from "../theme";
import { useLang } from "../lang";
import { useCategories } from "../categoriesContext";
import type { CategoryItem } from "../api";
import { t } from "../i18n";
import type { Colors, ThemeMode } from "../theme";
import type { LangMode } from "../lang";
import type { UserProfile } from "../types";

const THEME_OPTION_IDS: ThemeMode[] = ["light", "dark", "auto"];

const BADGE_META: Record<string, { emoji: string; label: string; color: string }> = {
  bronze:  { emoji: "🥉", label: "Bronze",  color: "#cd7f32" },
  silver:  { emoji: "🥈", label: "Silver",  color: "#9e9e9e" },
  gold:    { emoji: "🥇", label: "Gold",    color: "#ffc107" },
  diamond: { emoji: "💎", label: "Diamond", color: "#00b4d8" },
};

const BADGE_THRESHOLDS: { badge: string; min: number }[] = [
  { badge: "bronze", min: 10 },
  { badge: "silver", min: 20 },
  { badge: "gold",   min: 30 },
  { badge: "diamond", min: 40 },
];

function RewardsTab({ isAuthenticated, onSignIn, colors }: { isAuthenticated: boolean; onSignIn?: () => void; colors: Colors }) {
  const [rewards, setRewards] = useState<DailyReward[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    fetchRewards().then((d) => {
      setRewards(d.rewards ?? []);
      setStreak(d.streak ?? 0);
    }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 48 }}>🏆</Text>
        <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text, marginTop: 12, marginBottom: 8 }}>Earn Reading Rewards</Text>
        <Text style={{ fontSize: 13, color: colors.textSub, textAlign: "center", lineHeight: 20, marginBottom: 20 }}>
          Sign in to track your daily reading and earn points, badges, and streak multipliers.
        </Text>
        {onSignIn && (
          <TouchableOpacity onPress={onSignIn} style={{ backgroundColor: colors.brand, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 12 }}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Sign in</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (loading) {
    return <ActivityIndicator color={colors.brand} style={{ marginVertical: 40 }} />;
  }

  const today = rewards[0];
  const multiplier = today?.multiplier ?? 1;
  const multiplierLabel = multiplier >= 2 ? "2× (14-day streak!)" : multiplier >= 1.5 ? "1.5× (7-day streak!)" : "1×";
  const todayBadge = today?.badge ? BADGE_META[today.badge] : null;
  const totalPoints = rewards.reduce((s, r) => s + r.pointsEarned, 0);

  // 30-slot grid, oldest→newest
  const slots: (DailyReward | null)[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return rewards.find((r) => r.date.slice(0, 10) === key) ?? null;
  });

  const maxPts = Math.max(...slots.map((s) => s?.pointsEarned ?? 0), 1);
  const BAR_MAX_HEIGHT = 48;

  return (
    <View style={{ gap: 12 }}>
      {/* Streak banner */}
      <View style={{ borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#6c47ff" }}>
        <Text style={{ fontSize: 36 }}>🔥</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 20, lineHeight: 24 }}>{streak}-day streak</Text>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>
            Multiplier: <Text style={{ color: "#fff", fontWeight: "700" }}>{multiplierLabel}</Text>
          </Text>
        </View>
      </View>

      {/* Today */}
      <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>Today</Text>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 2 }}>
            {today?.articlesRead ?? 0} <Text style={{ fontSize: 14, fontWeight: "400", color: colors.textMuted }}>articles</Text>
          </Text>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.brand, marginTop: 2 }}>
            {today ? today.pointsEarned.toFixed(1) : "0"} pts earned
          </Text>
        </View>
        {todayBadge ? (
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 40 }}>{todayBadge.emoji}</Text>
            <Text style={{ fontSize: 11, fontWeight: "700", color: todayBadge.color }}>{todayBadge.label}</Text>
          </View>
        ) : (
          <View style={{ alignItems: "center", gap: 4, opacity: 0.3 }}>
            <Text style={{ fontSize: 40 }}>🥉</Text>
            <Text style={{ fontSize: 10, color: colors.textMuted }}>Read 10 to earn</Text>
          </View>
        )}
      </View>

      {/* Badge legend */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {BADGE_THRESHOLDS.map(({ badge, min }) => {
          const meta = BADGE_META[badge];
          return (
            <View key={badge} style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 12, alignItems: "center", paddingVertical: 10, gap: 2 }}>
              <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
              <Text style={{ fontSize: 10, fontWeight: "700", color: meta.color }}>{meta.label}</Text>
              <Text style={{ fontSize: 10, color: colors.textMuted }}>{min}+ articles</Text>
            </View>
          );
        })}
      </View>

      {/* 30-day bar chart */}
      <View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>Last 30 days</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{totalPoints.toFixed(1)} total pts</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: BAR_MAX_HEIGHT, gap: 2 }}>
          {slots.map((slot, i) => {
            const pts = slot?.pointsEarned ?? 0;
            const barH = pts > 0 ? Math.max(4, (pts / maxPts) * BAR_MAX_HEIGHT) : 3;
            const badge = slot?.badge;
            const barColor = badge ? BADGE_META[badge].color : colors.brand;
            const isToday = i === 29;
            return (
              <View key={i} style={{ flex: 1, height: BAR_MAX_HEIGHT, justifyContent: "flex-end" }}>
                <View style={{
                  height: barH,
                  borderRadius: 3,
                  backgroundColor: pts > 0 ? barColor : colors.border,
                  opacity: isToday ? 1 : 0.7,
                  borderWidth: isToday ? 1.5 : 0,
                  borderColor: isToday ? colors.brand : "transparent",
                }} />
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>30d ago</Text>
          <Text style={{ fontSize: 10, color: colors.textMuted }}>Today</Text>
        </View>
      </View>

      {/* Multiplier guide */}
      <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSub }}>Streak multipliers</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>7-day streak</Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#6c47ff" }}>1.5× points</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 12, color: colors.textMuted }}>14-day streak</Text>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.brand }}>2× points</Text>
        </View>
      </View>
    </View>
  );
}

interface DragListProps {
  items: CategoryItem[];
  selectedCats: Set<string>;
  onToggle: (id: string) => void;
  onReorder: (items: CategoryItem[]) => void;
  onDragStateChange: (dragging: boolean) => void;
  getLabel: (id: string, lang: LangMode) => string;
  lang: LangMode;
  colors: Colors;
}

function DragList({ items, selectedCats, onToggle, onReorder, onDragStateChange: _, getLabel, lang, colors }: DragListProps) {
  const move = useCallback((from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onReorder(next);
  }, [items, onReorder]);

  return (
    <View style={{ borderRadius: 14, overflow: "hidden", marginBottom: 8, width: "67%", alignSelf: "center" }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        extraData={[items, selectedCats]}
        renderItem={({ item, index }) => {
          const on = selectedCats.has(item.id);
          return (
            <TouchableOpacity onPress={() => onToggle(item.id)} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceAlt, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 2 }}>
              <Text style={{ fontSize: 16, width: 24, color: on ? colors.brand : colors.textMuted }}>{on ? "✓" : "○"}</Text>
              <Text style={{ flex: 1, fontSize: 14, fontWeight: on ? "600" : "500", color: on ? colors.brand : colors.text, marginLeft: 8 }}>
                {getLabel(item.id, lang)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const LANG_OPTIONS: { id: LangMode; label: string }[] = [
  { id: "en",    label: "EN" },
  { id: "zh-TW", label: "繁中" },
  { id: "zh-CN", label: "简中" },
];

interface Props {
  visible: boolean;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  onClose: () => void;
  onSaved: (profile: UserProfile) => void;
  onSignedOut: () => void;
  onSignIn?: () => void;
}

export function ProfileSheet({ visible, profile, isAuthenticated, onClose, onSaved, onSignedOut, onSignIn }: Props) {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { lang, setLang } = useLang();
  const { categories: allCats, getLabel, reorderCategories } = useCategories();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState<"profile" | "rewards">("profile");

  useEffect(() => {
    if (visible) setActiveTab("profile");
  }, [visible]);

  // Ordered list of all categories except "all" — drives both tab order and the interest picker
  const [tabOrder, setTabOrder] = useState<CategoryItem[]>(() => allCats.filter((c) => c.id !== "all"));
  useEffect(() => {
    if (visible) setTabOrder(allCats.filter((c) => c.id !== "all"));
  }, [visible, allCats]);
  const themeOptions = THEME_OPTION_IDS.map((id) => ({ id, label: t(`theme${id.charAt(0).toUpperCase() + id.slice(1)}`, lang) }));

  const [name, setName] = useState(profile?.screenName ?? "");
  const [selectedCats, setSelectedCats] = useState<Set<string>>(
    new Set(profile?.categories ?? [])
  );
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(profile ? true : null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDraggingList, setIsDraggingList] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstTime = !profile;

  useEffect(() => {
    if (visible) {
      setName(profile?.screenName ?? "");
      setSelectedCats(new Set(profile?.categories ?? []));
      setNameAvailable(profile ? true : null);
    }
  }, [visible, profile]);

  const checkName = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setNameAvailable(null); return; }
    setChecking(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/profile/check?name=${encodeURIComponent(value.trim())}`
        );
        const d = await res.json();
        setNameAvailable(d.available);
      } catch {
        setNameAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 400);
  }, []);

  function toggleCat(id: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const canSave = isAuthenticated
    ? name.trim().length >= 2 && nameAvailable === true && selectedCats.size >= 3 && !saving
    : name.trim().length >= 2 && selectedCats.size >= 3 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    // Save in tab order — selected cats first in their drag order, then unselected
    const orderedCats = tabOrder.filter((c) => selectedCats.has(c.id)).map((c) => c.id);

    if (!isAuthenticated) {
      onSaved({ screenName: name.trim(), categories: orderedCats, lang });
      setSaving(false);
      onClose();
      return;
    }
    const updated = await saveProfile(name.trim(), orderedCats, lang);
    setSaving(false);
    if (updated) {
      reorderCategories(tabOrder);
      onSaved(updated);
      onClose();
    } else {
      Alert.alert(t("error", lang), t("errorSaveProfile", lang));
    }
  }

  async function handleSignOut() {
    Alert.alert(t("signOutTitle", lang), t("signOutConfirm", lang), [
      { text: t("cancel", lang), style: "cancel" },
      {
        text: t("signOut", lang),
        style: "destructive",
        onPress: async () => {
          await signOut();
          onSignedOut();
          onClose();
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(t("deleteAccountTitle", lang), t("deleteAccountConfirm", lang), [
      { text: t("cancel", lang), style: "cancel" },
      {
        text: t("deleteAccount", lang),
        style: "destructive",
        onPress: async () => {
          const ok = await deleteAccount();
          if (ok) {
            await signOut();
            onSignedOut();
            onClose();
          } else {
            Alert.alert(t("error", lang), t("errorDeleteAccount", lang));
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{isFirstTime ? t("setUpProfile", lang) : t("yourProfile", lang)}</Text>
          <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }} style={styles.closeBtn}>
            <Text style={styles.closeLabel}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tab bar — only shown when profile already exists */}
        {!isFirstTime && (
          <View style={{ flexDirection: "row", margin: 16, marginBottom: 0, backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 3 }}>
            {(["profile", "rewards"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 11,
                  alignItems: "center",
                }, activeTab === tab && { backgroundColor: colors.surface, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }]}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: activeTab === tab ? colors.text : colors.textMuted }}>
                  {tab === "profile" ? "Profile" : "🏆 Rewards"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTab === "rewards" && !isFirstTime ? (
          <ScrollView contentContainerStyle={[styles.content, { paddingTop: 16 }]} showsVerticalScrollIndicator={false}>
            <RewardsTab isAuthenticated={isAuthenticated} onSignIn={onSignIn} colors={colors} />
          </ScrollView>
        ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" nestedScrollEnabled scrollEnabled={!isDraggingList}>
          {isFirstTime && isAuthenticated && (
            <View style={styles.noProfileBanner}>
              <Text style={styles.noProfileText}>{t("noProfileText", lang)}</Text>
            </View>
          )}

          {/* Screen name */}
          <Text style={styles.label}>{t("screenName", lang)}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(v) => {
                setName(v);
                setNameAvailable(null);
                if (isAuthenticated) checkName(v);
              }}
              placeholder={t("namePlaceholder", lang)}
              placeholderTextColor={colors.textMuted}
              maxLength={50}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <Text style={styles.inputStatus}>
              {checking ? "⏳" : nameAvailable === true ? "✅" : nameAvailable === false ? "❌" : ""}
            </Text>
          </View>
          {nameAvailable === false && (
            <Text style={styles.errorText}>{t("nameTaken", lang)}</Text>
          )}
          {nameAvailable === true && name.trim().length >= 2 && (
            <Text style={styles.successText}>{t("nameAvailable", lang)}</Text>
          )}

          {/* Categories — tap to toggle interest, long press to reorder */}
          <Text style={[styles.label, { marginTop: 20 }]}>
            {t("interests", lang)}{" "}
            <Text style={styles.labelSub}>
              {t("interestsMin", lang)}
              {""}
            </Text>
          </Text>
          <DragList
            items={tabOrder}
            selectedCats={selectedCats}
            onToggle={toggleCat}
            onReorder={setTabOrder}
            onDragStateChange={setIsDraggingList}
            getLabel={getLabel}
            lang={lang}
            colors={colors}
          />

          {selectedCats.size > 0 && selectedCats.size < 3 && (
            <Text style={styles.errorText}>
              {lang === "en"
                ? `Select ${3 - selectedCats.size} more ${3 - selectedCats.size === 1 ? "category" : "categories"}.`
                : lang === "zh-TW"
                  ? `還需選 ${3 - selectedCats.size} 個類別。`
                  : `还需选 ${3 - selectedCats.size} 个类别。`}
            </Text>
          )}

          {/* Language */}
          <Text style={[styles.label, { marginTop: 20 }]}>{t("language", lang)}</Text>
          <View style={styles.themeRow}>
            {LANG_OPTIONS.map((opt) => {
              const active = lang === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setLang(opt.id)}
                  style={[styles.themeChip, active && styles.themeChipActive]}
                >
                  <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Theme */}
          <Text style={[styles.label, { marginTop: 20 }]}>{t("appearance", lang)}</Text>
          <View style={styles.themeRow}>
            {themeOptions.map((opt) => {
              const active = themeMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setThemeMode(opt.id)}
                  style={[styles.themeChip, active && styles.themeChipActive]}
                >
                  <Text style={[styles.themeLabel, active && styles.themeLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnLabel}>
                {isFirstTime ? t("createProfile", lang) : t("saveChanges", lang)}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => Linking.openURL("https://sparknotes-production.up.railway.app/support")} style={styles.deleteBtn}>
            <Text style={styles.signOutLabel}>Contact Us</Text>
          </TouchableOpacity>
          {isAuthenticated ? (
            <>
              <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
                <Text style={styles.signOutLabel}>{t("signOut", lang)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteBtn}>
                <Text style={styles.deleteLabel}>{t("deleteAccount", lang)}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={onSignIn} style={styles.signOutBtn}>
              <Text style={styles.signOutLabel}>{t("signIn", lang)}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        )}
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: c.text,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    closeLabel: {
      color: c.textSub,
      fontSize: 14,
    },
    content: {
      padding: 20,
      paddingBottom: 48,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textTertiary,
      marginBottom: 8,
    },
    labelSub: {
      fontWeight: "400",
      color: c.textMuted,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surfaceAlt,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 6,
      width: "67%",
      alignSelf: "center",
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: c.text,
    },
    inputStatus: {
      fontSize: 16,
      marginLeft: 8,
    },
    errorText: {
      fontSize: 12,
      color: c.brand,
      marginBottom: 8,
    },
    successText: {
      fontSize: 12,
      color: "#16a34a",
      marginBottom: 8,
    },
    themeRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 8,
    },
    themeChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: c.surfaceAlt,
      alignItems: "center",
    },
    themeChipActive: {
      backgroundColor: c.brand,
    },
    themeLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textTertiary,
    },
    themeLabelActive: {
      color: "#ffffff",
    },
    saveBtn: {
      backgroundColor: c.brand,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 24,
      width: "67%",
      alignSelf: "center",
    },
    saveBtnDisabled: {
      opacity: 0.4,
    },
    saveBtnLabel: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "700",
    },
    signOutBtn: {
      alignItems: "center",
      paddingVertical: 14,
      marginTop: 8,
    },
    signOutLabel: {
      fontSize: 14,
      color: c.textMuted,
    },
    deleteBtn: {
      alignItems: "center",
      paddingVertical: 14,
    },
    deleteLabel: {
      fontSize: 14,
      color: c.brand,
    },
    dragList: {
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 8,
      width: "67%",
      alignSelf: "center",
    },
    dragRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.surfaceAlt,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 2,
    },
    dragRowActive: {
      backgroundColor: c.border,
    },
    dragCheck: {
      fontSize: 16,
      width: 24,
      color: c.textMuted,
    },
    dragCheckActive: {
      color: c.brand,
    },
    dragLabel: {
      flex: 1,
      fontSize: 14,
      fontWeight: "500",
      color: c.text,
      marginLeft: 8,
    },
    dragLabelActive: {
      color: c.brand,
      fontWeight: "600",
    },
    dragHandle: {
      fontSize: 18,
      color: c.textMuted,
    },
    noProfileBanner: {
      backgroundColor: "#fff7ed",
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: "#f59e0b",
    },
    noProfileText: {
      fontSize: 13,
      color: "#92400e",
      lineHeight: 18,
    },
  });
}
