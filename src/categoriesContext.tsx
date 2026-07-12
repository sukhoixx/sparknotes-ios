import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchCategories, type CategoryItem } from "./api";
import type { LangMode } from "./lang";

const ORDER_KEY = "newsblock_cat_order";

const FALLBACK: CategoryItem[] = [
  { id: "all",           labels: { en: "✨ For You",       "zh-TW": "✨ 為你推薦",  "zh-CN": "✨ 为你推荐" } },
  { id: "news",          labels: { en: "📰 News",          "zh-TW": "📰 新聞",      "zh-CN": "📰 新闻" } },
  { id: "us",            labels: { en: "🇺🇸 US",            "zh-TW": "🇺🇸 美國",    "zh-CN": "🇺🇸 美国" } },
  { id: "world",         labels: { en: "🌍 World",         "zh-TW": "🌍 世界",      "zh-CN": "🌍 世界" } },
  { id: "asia",          labels: { en: "🌏 Asia",          "zh-TW": "🌏 亞洲",      "zh-CN": "🌏 亚洲" } },
  { id: "politics",      labels: { en: "🏛️ Politics",      "zh-TW": "🏛️ 政治",    "zh-CN": "🏛️ 政治" } },
  { id: "military",      labels: { en: "🪖 Military",      "zh-TW": "🪖 軍事",      "zh-CN": "🪖 军事" } },
  { id: "science",       labels: { en: "🔬 Science",       "zh-TW": "🔬 科學",      "zh-CN": "🔬 科学" } },
  { id: "technology",    labels: { en: "💻 Technology",    "zh-TW": "💻 科技",      "zh-CN": "💻 科技" } },
  { id: "entertainment", labels: { en: "🎬 Entertainment", "zh-TW": "🎬 娛樂",      "zh-CN": "🎬 娱乐" } },
  { id: "celebrity",     labels: { en: "⭐ Celebrity",     "zh-TW": "⭐ 名人",      "zh-CN": "⭐ 明星" } },
  { id: "sports",        labels: { en: "🏅 Sports",        "zh-TW": "🏅 體育",      "zh-CN": "🏅 体育" } },
  { id: "business",      labels: { en: "💼 Business",      "zh-TW": "💼 商業",      "zh-CN": "💼 商业" } },
  { id: "gaming",        labels: { en: "🎮 Gaming",        "zh-TW": "🎮 電玩",      "zh-CN": "🎮 游戏" } },
  { id: "travel",        labels: { en: "✈️ Travel",        "zh-TW": "✈️ 旅遊",    "zh-CN": "✈️ 旅游" } },
  { id: "animals",       labels: { en: "🐾 Animals",       "zh-TW": "🐾 動物",      "zh-CN": "🐾 动物" } },
  { id: "inventions",    labels: { en: "💡 Inventions",    "zh-TW": "💡 發明",      "zh-CN": "💡 发明" } },
  { id: "finance",       labels: { en: "💰 Finance",       "zh-TW": "💰 財經",      "zh-CN": "💰 财经" } },
  { id: "health",        labels: { en: "💊 Health",        "zh-TW": "💊 健康",      "zh-CN": "💊 健康" } },
  { id: "beauty",        labels: { en: "💄 Beauty",        "zh-TW": "💄 美妝",      "zh-CN": "💄 美妆" } },
];

function applyOrder(cats: CategoryItem[], savedOrder: string[]): CategoryItem[] {
  if (savedOrder.length === 0) return cats;
  const catMap = new Map(cats.map((c) => [c.id, c]));
  // "all" is always first and not user-reorderable
  const rest = savedOrder.filter((id) => id !== "all" && catMap.has(id)).map((id) => catMap.get(id)!);
  const newCats = cats.filter((c) => c.id !== "all" && !savedOrder.includes(c.id));
  const allCat = catMap.get("all");
  return [...(allCat ? [allCat] : []), ...rest, ...newCats];
}

type CategoriesContextValue = {
  categories: CategoryItem[];
  categoryIds: string[];
  getLabel: (id: string, lang: LangMode) => string;
  reorderCategories: (ordered: CategoryItem[]) => void;
};

const CategoriesContext = createContext<CategoriesContextValue>({
  categories: FALLBACK,
  categoryIds: FALLBACK.map((c) => c.id),
  getLabel: (id, lang) => FALLBACK.find((c) => c.id === id)?.labels[lang] ?? id,
  reorderCategories: () => {},
});

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<CategoryItem[]>(FALLBACK);

  useEffect(() => {
    async function init() {
      const [cats, savedJson] = await Promise.all([
        fetchCategories(),
        AsyncStorage.getItem(ORDER_KEY),
      ]);
      const base = cats.length > 0 ? cats : FALLBACK;
      const savedOrder: string[] = savedJson ? JSON.parse(savedJson) : [];
      setCategories(applyOrder(base, savedOrder));
    }
    init();
  }, []);

  const reorderCategories = useCallback((ordered: CategoryItem[]) => {
    setCategories(ordered);
    const ids = ordered.map((c) => c.id);
    AsyncStorage.setItem(ORDER_KEY, JSON.stringify(ids));
  }, []);

  const value: CategoriesContextValue = {
    categories,
    categoryIds: categories.map((c) => c.id),
    getLabel: (id, lang) => categories.find((c) => c.id === id)?.labels[lang] ?? id,
    reorderCategories,
  };

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  return useContext(CategoriesContext);
}
