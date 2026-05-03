export interface GradientConfig {
  colors: readonly string[];
  start: { x: number; y: number };
  end: { x: number; y: number };
}

const FALLBACK: GradientConfig = {
  colors: ["#1a1a2e", "#0f3460"],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

// Converts "linear-gradient(135deg,#color1,#color2,...)" to LinearGradient props
export function parseGradient(css: string): GradientConfig {
  const match = css.match(/linear-gradient\([^,]+,(.+)\)/);
  if (!match) return FALLBACK;
  const colors = match[1]
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^#[0-9a-fA-F]{3,8}$/.test(s));
  return colors.length >= 2
    ? { colors, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } }
    : FALLBACK;
}
