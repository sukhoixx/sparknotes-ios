import React from "react";
import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native";

const TABS = [
  { id: "all", label: "✨ For You" },
  { id: "news", label: "📰 News" },
  { id: "us", label: "🇺🇸 US" },
  { id: "world", label: "🌍 World" },
  { id: "politics", label: "🏛️ Politics" },
  { id: "military", label: "🪖 Military" },
  { id: "science", label: "🔬 Science" },
  { id: "technology", label: "💻 Technology" },
  { id: "entertainment", label: "🎬 Entertainment" },
  { id: "celebrity", label: "⭐ Celebrity" },
  { id: "sports", label: "🏅 Sports" },
  { id: "business", label: "💼 Business" },
  { id: "gaming", label: "🎮 Gaming" },
  { id: "travel", label: "✈️ Travel" },
  { id: "animals", label: "🐾 Animals" },
  { id: "inventions", label: "💡 Inventions" },
  { id: "finance", label: "💰 Finance" },
  { id: "health", label: "💊 Health" },
  { id: "beauty", label: "💄 Beauty" },
];

interface Props {
  active: string;
  onChange: (id: string) => void;
}

export function CategoryTabs({ active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          onPress={() => onChange(tab.id)}
          style={[styles.tab, active === tab.id && styles.tabActive]}
        >
          <Text style={[styles.label, active === tab.id && styles.labelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    backgroundColor: "#ffffff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: "#ff2442",
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9ca3af",
  },
  labelActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
