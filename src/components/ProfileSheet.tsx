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
} from "react-native";
import { saveProfile, deleteAccount } from "../api";
import { signOut } from "../auth";
import { useTheme } from "../theme";
import { useLang } from "../lang";
import { t } from "../i18n";
import type { Colors, ThemeMode } from "../theme";
import type { LangMode } from "../lang";
import type { UserProfile } from "../types";

const CATEGORY_IDS = ["news","us","world","politics","military","science","technology","entertainment","celebrity","sports","business","gaming","travel","animals","inventions","finance","health","beauty"];

const THEME_OPTION_IDS: ThemeMode[] = ["light", "dark", "auto"];

const LANG_OPTIONS: { id: LangMode; label: string }[] = [
  { id: "en",    label: "EN" },
  { id: "zh-TW", label: "繁中" },
  { id: "zh-CN", label: "简中" },
];

interface Props {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onSaved: (profile: UserProfile) => void;
  onSignedOut: () => void;
}

export function ProfileSheet({ visible, profile, onClose, onSaved, onSignedOut }: Props) {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { lang, setLang } = useLang();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const categories = CATEGORY_IDS.map((id) => ({ id, label: t(`cat_${id}`, lang) }));
  const themeOptions = THEME_OPTION_IDS.map((id) => ({ id, label: t(`theme${id.charAt(0).toUpperCase() + id.slice(1)}`, lang) }));

  const [name, setName] = useState(profile?.screenName ?? "");
  const [selectedCats, setSelectedCats] = useState<Set<string>>(
    new Set(profile?.categories ?? [])
  );
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(profile ? true : null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const canSave =
    name.trim().length >= 2 &&
    nameAvailable === true &&
    selectedCats.size >= 3 &&
    !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const updated = await saveProfile(name.trim(), Array.from(selectedCats), lang);
    setSaving(false);
    if (updated) {
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
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{isFirstTime ? t("setUpProfile", lang) : t("yourProfile", lang)}</Text>
          {!isFirstTime && (
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }} style={styles.closeBtn}>
              <Text style={styles.closeLabel}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isFirstTime && (
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
                checkName(v);
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

          {/* Categories */}
          <Text style={[styles.label, { marginTop: 20 }]}>
            {t("interests", lang)}{" "}
            <Text style={styles.labelSub}>{t("interestsMin", lang)}</Text>
          </Text>
          <View style={styles.cats}>
            {categories.map((cat) => {
              const on = selectedCats.has(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => toggleCat(cat.id)}
                  style={[styles.catChip, on && styles.catChipActive]}
                >
                  <Text style={[styles.catLabel, on && styles.catLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

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

          {/* Sign out */}
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <Text style={styles.signOutLabel}>{t("signOut", lang)}</Text>
          </TouchableOpacity>

          {/* Delete account */}
          <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteBtn}>
            <Text style={styles.deleteLabel}>{t("deleteAccount", lang)}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
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
    cats: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
    },
    catChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.surfaceAlt,
    },
    catChipActive: {
      backgroundColor: c.brand,
    },
    catLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: c.textTertiary,
    },
    catLabelActive: {
      color: "#ffffff",
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
