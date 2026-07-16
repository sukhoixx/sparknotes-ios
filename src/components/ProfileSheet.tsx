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
  PanResponder,
  Animated,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { saveProfile, deleteAccount } from "../api";
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

const ROW_HEIGHT = 46;

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

function DragList({ items, selectedCats, onToggle, onReorder, onDragStateChange, getLabel, lang, colors }: DragListProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const makePanResponder = useCallback((index: number) => {
    let startY = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (_, gs) => {
        startY = 0;
        dragY.setValue(0);
        setDraggingIndex(index);
        setHoverIndex(index);
        onDragStateChange(true);
      },
      onPanResponderMove: (_, gs) => {
        dragY.setValue(gs.dy);
        const raw = index + Math.round(gs.dy / ROW_HEIGHT);
        const clamped = Math.max(0, Math.min(itemsRef.current.length - 1, raw));
        setHoverIndex(clamped);
      },
      onPanResponderRelease: (_, gs) => {
        const raw = index + Math.round(gs.dy / ROW_HEIGHT);
        const to = Math.max(0, Math.min(itemsRef.current.length - 1, raw));
        if (to !== index) {
          const next = [...itemsRef.current];
          const [moved] = next.splice(index, 1);
          next.splice(to, 0, moved);
          onReorder(next);
        }
        dragY.setValue(0);
        setDraggingIndex(null);
        setHoverIndex(null);
        onDragStateChange(false);
      },
      onPanResponderTerminate: () => {
        dragY.setValue(0);
        setDraggingIndex(null);
        setHoverIndex(null);
        onDragStateChange(false);
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const panResponders = useMemo(
    () => items.map((_, i) => makePanResponder(i)),
    // remake when item count changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.length]
  );

  const styles = useMemo(() => StyleSheet.create({
    list: { borderRadius: 14, overflow: "hidden", marginBottom: 8, width: "67%", alignSelf: "center" as const },
    row: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, backgroundColor: colors.surfaceAlt, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 2, height: ROW_HEIGHT },
    rowActive: { backgroundColor: colors.border, zIndex: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
    check: { fontSize: 16, width: 24, color: colors.textMuted },
    checkActive: { color: colors.brand },
    label: { flex: 1, fontSize: 14, fontWeight: "500" as const, color: colors.text, marginLeft: 8 },
    labelActive: { color: colors.brand, fontWeight: "600" as const },
    handle: { fontSize: 18, color: colors.textMuted, paddingLeft: 8 },
  }), [colors]);

  return (
    <View style={styles.list}>
      {items.map((item, i) => {
        const on = selectedCats.has(item.id);
        const isDragging = draggingIndex === i;
        const isHover = hoverIndex === i && draggingIndex !== null && draggingIndex !== i;

        const rowStyle = [styles.row, (isDragging || isHover) && styles.rowActive];

        const inner = (
          <TouchableOpacity
            onPress={() => draggingIndex === null && onToggle(item.id)}
            activeOpacity={0.7}
            style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
          >
            <Text style={[styles.check, on && styles.checkActive]}>{on ? "✓" : "○"}</Text>
            <Text style={[styles.label, on && styles.labelActive]}>{getLabel(item.id, lang)}</Text>
          </TouchableOpacity>
        );

        if (isDragging) {
          return (
            <Animated.View key={item.id} style={[rowStyle, { transform: [{ translateY: dragY }] }]}>
              {inner}
              <View {...panResponders[i].panHandlers}>
                <Text style={styles.handle}>☰</Text>
              </View>
            </Animated.View>
          );
        }

        return (
          <View key={item.id} style={rowStyle}>
            {inner}
            <View {...panResponders[i].panHandlers}>
              <Text style={styles.handle}>☰</Text>
            </View>
          </View>
        );
      })}
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
