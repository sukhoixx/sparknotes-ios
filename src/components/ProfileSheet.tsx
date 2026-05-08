import React, { useCallback, useEffect, useRef, useState } from "react";
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
} from "react-native";
import { saveProfile, deleteAccount } from "../api";
import { signOut } from "../auth";
import type { UserProfile } from "../types";

const CATEGORIES = [
  { id: "news",          label: "📰 News" },
  { id: "us",            label: "🇺🇸 US" },
  { id: "world",         label: "🌍 World" },
  { id: "politics",      label: "🏛️ Politics" },
  { id: "military",      label: "🪖 Military" },
  { id: "science",       label: "🔬 Science" },
  { id: "technology",    label: "💻 Technology" },
  { id: "entertainment", label: "🎬 Entertainment" },
  { id: "celebrity",     label: "⭐ Celebrity" },
  { id: "sports",        label: "🏅 Sports" },
  { id: "business",      label: "💼 Business" },
  { id: "gaming",        label: "🎮 Gaming" },
  { id: "travel",        label: "✈️ Travel" },
  { id: "animals",       label: "🐾 Animals" },
  { id: "inventions",    label: "💡 Inventions" },
  { id: "finance",       label: "💰 Finance" },
  { id: "health",        label: "💊 Health" },
  { id: "beauty",        label: "💄 Beauty" },
];

interface Props {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
  onSaved: (profile: UserProfile) => void;
  onSignedOut: () => void;
}

export function ProfileSheet({ visible, profile, onClose, onSaved, onSignedOut }: Props) {
  const [name, setName] = useState(profile?.screenName ?? "");
  const [selectedCats, setSelectedCats] = useState<Set<string>>(
    new Set(profile?.categories ?? [])
  );
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(profile ? true : null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstTime = !profile;

  // Re-sync form state whenever the sheet opens or the profile changes
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
    const updated = await saveProfile(name.trim(), Array.from(selectedCats));
    setSaving(false);
    if (updated) {
      onSaved(updated);
      onClose();
    } else {
      Alert.alert("Error", "Could not save profile. Please try again.");
    }
  }

  async function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
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
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and all associated data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: async () => {
            const ok = await deleteAccount();
            if (ok) {
              await signOut();
              onSignedOut();
              onClose();
            } else {
              Alert.alert("Error", "Could not delete account. Please try again.");
            }
          },
        },
      ]
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{isFirstTime ? "Set Up Profile" : "Your Profile"}</Text>
          {!isFirstTime && (
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeLabel}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isFirstTime && (
            <View style={styles.noProfileBanner}>
              <Text style={styles.noProfileText}>
                No profile found for this account. Set one up below, or sign out if you used a different account on the web.
              </Text>
            </View>
          )}

          {/* Screen name */}
          <Text style={styles.label}>Screen name</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(v) => {
                setName(v);
                setNameAvailable(null);
                checkName(v);
              }}
              placeholder="e.g. CosmicReader42"
              placeholderTextColor="#9ca3af"
              maxLength={50}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <Text style={styles.inputStatus}>
              {checking ? "⏳" : nameAvailable === true ? "✅" : nameAvailable === false ? "❌" : ""}
            </Text>
          </View>
          {nameAvailable === false && (
            <Text style={styles.errorText}>That name is taken — try another.</Text>
          )}
          {nameAvailable === true && name.trim().length >= 2 && (
            <Text style={styles.successText}>Looks good!</Text>
          )}

          {/* Categories */}
          <Text style={[styles.label, { marginTop: 20 }]}>
            Pick your interests{" "}
            <Text style={styles.labelSub}>(choose at least 3)</Text>
          </Text>
          <View style={styles.cats}>
            {CATEGORIES.map((cat) => {
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
              Select {3 - selectedCats.size} more {3 - selectedCats.size === 1 ? "category" : "categories"}.
            </Text>
          )}

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
                {isFirstTime ? "Create Profile" : "Save Changes"}
              </Text>
            )}
          </TouchableOpacity>

          {/* Sign out */}
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <Text style={styles.signOutLabel}>Sign out</Text>
          </TouchableOpacity>

          {/* Delete account */}
          <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteBtn}>
            <Text style={styles.deleteLabel}>Delete account</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  closeLabel: {
    color: "#374151",
    fontSize: 14,
  },
  content: {
    padding: 20,
    paddingBottom: 48,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  labelSub: {
    fontWeight: "400",
    color: "#9ca3af",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111111",
  },
  inputStatus: {
    fontSize: 16,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#ff2442",
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
    backgroundColor: "#f3f4f6",
  },
  catChipActive: {
    backgroundColor: "#ff2442",
  },
  catLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  catLabelActive: {
    color: "#ffffff",
  },
  saveBtn: {
    backgroundColor: "#ff2442",
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
    color: "#9ca3af",
  },
  deleteBtn: {
    alignItems: "center",
    paddingVertical: 14,
  },
  deleteLabel: {
    fontSize: 14,
    color: "#ff2442",
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
