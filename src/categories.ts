export const CATEGORY_GRADIENTS: Record<string, string> = {
  news:          "linear-gradient(135deg,#d4eef7,#ddd8f5)",
  us:            "linear-gradient(135deg,#fde8e8,#dde4f5)",
  world:         "linear-gradient(135deg,#d6e4f7,#e8d6f7)",
  politics:      "linear-gradient(135deg,#dce8f5,#d8eae8)",
  military:      "linear-gradient(135deg,#d8dce8,#d6e4f7)",
  science:       "linear-gradient(135deg,#d4f5e9,#eafcd2)",
  technology:    "linear-gradient(135deg,#e5dcf7,#d6eaff)",
  entertainment: "linear-gradient(135deg,#ffe4f0,#ffd6eb)",
  sports:        "linear-gradient(135deg,#fff3b3,#ffe0a0)",
  business:      "linear-gradient(135deg,#d8f5eb,#d4eef0)",
  gaming:        "linear-gradient(135deg,#f0dcea,#ead6ff)",
  travel:        "linear-gradient(135deg,#feeee0,#fffde0)",
  animals:       "linear-gradient(135deg,#dcf5e5,#d0f0e0)",
  celebrity:     "linear-gradient(135deg,#f0d6f7,#ffd6d8)",
  inventions:    "linear-gradient(135deg,#fff8c0,#fde8cc)",
  finance:       "linear-gradient(135deg,#d4f0d4,#f7e8c0)",
  health:        "linear-gradient(135deg,#d8f5d8,#eafcd4)",
  beauty:        "linear-gradient(135deg,#ffe4e8,#ffd6f0)",
};

export function getLightGradient(category: string, fallback: string): string {
  return CATEGORY_GRADIENTS[category] ?? fallback;
}
