import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export const THEME_STORAGE_KEY = "dripmaxx:appearance";

export const themeNames = [
  "dripmaxx", "pure", "cream", "midnight", "charcoal", "stone",
  "silver", "taupe", "slate", "parchment", "blush",
] as const;
export type ThemeName = (typeof themeNames)[number];

type ThemeSeed = {
  name: ThemeName;
  label: string;
  symbol: string;
  vibe: string;
  background: string;
  card: string;
  text: string;
  accent: string;
  dark: boolean;
};

export type AppColors = {
  ink: string;
  surface: string;
  surfaceRaised: string;
  surfaceSoft: string;
  line: string;
  text: string;
  textMuted: string;
  textSoft: string;
  lime: string;
  limeInk: string;
  cream: string;
  coral: string;
  gold: string;
  success: string;
  danger: string;
};

const seeds: ThemeSeed[] = [
  { name: "dripmaxx", label: "DripMaxx", symbol: "●", vibe: "Clean, energetic, sporty, modern.", background: "#F7F7F5", card: "#FFFFFF", text: "#111111", accent: "#B6FF00", dark: false },
  { name: "pure", label: "Pure", symbol: "○", vibe: "Extremely clean, techy, minimal.", background: "#FFFFFF", card: "#F7F7F7", text: "#111111", accent: "#2979FF", dark: false },
  { name: "cream", label: "Cream", symbol: "◐", vibe: "Warm, sophisticated, vintage fashion magazine.", background: "#FAF7F0", card: "#FFFFFF", text: "#171513", accent: "#C86B4A", dark: false },
  { name: "midnight", label: "Midnight", symbol: "◒", vibe: "Aggressive, premium, nightlife streetwear.", background: "#090909", card: "#151515", text: "#F5F5F5", accent: "#B6FF00", dark: true },
  { name: "charcoal", label: "Charcoal", symbol: "◆", vibe: "Premium and futuristic.", background: "#171717", card: "#222222", text: "#F5F5F5", accent: "#A970FF", dark: true },
  { name: "stone", label: "Stone", symbol: "◇", vibe: "Earthy, mature, understated.", background: "#E9E7E2", card: "#F7F6F2", text: "#181817", accent: "#3F7D58", dark: false },
  { name: "silver", label: "Silver", symbol: "◈", vibe: "Sleek, futuristic, quietly polished.", background: "#F1F2F3", card: "#FFFFFF", text: "#17191C", accent: "#3155D9", dark: false },
  { name: "taupe", label: "Taupe", symbol: "◉", vibe: "Luxury fashion and designer boutique.", background: "#E8DED4", card: "#F5EEE8", text: "#211C19", accent: "#8F3043", dark: false },
  { name: "slate", label: "Slate", symbol: "◫", vibe: "Cool, modern, digital.", background: "#E9EEF2", card: "#F8FAFB", text: "#151A1F", accent: "#00A9C7", dark: false },
  { name: "parchment", label: "Parchment", symbol: "▤", vibe: "Editorial, artistic, old-school fashion.", background: "#F2EBDD", card: "#FAF7EF", text: "#29251F", accent: "#B95732", dark: false },
  { name: "blush", label: "Blush", symbol: "✿", vibe: "Playful, trendy, social-media-friendly.", background: "#F8EFF0", card: "#FFF9FA", text: "#211B1D", accent: "#F0448A", dark: false },
];

const toColors = (seed: ThemeSeed): AppColors => ({
  ink: seed.background,
  surface: seed.card,
  surfaceRaised: seed.card,
  surfaceSoft: seed.dark ? "#2B2B2B" : "#E8E8E6",
  line: seed.dark ? "#383838" : "#D9D9D5",
  text: seed.text,
  textMuted: seed.dark ? "#B7B7B7" : "#62625F",
  textSoft: seed.dark ? "#8D8D8D" : "#777773",
  lime: seed.accent,
  limeInk: seed.dark && seed.accent === "#B6FF00" ? "#111111" : "#FFFFFF",
  cream: seed.text,
  coral: "#FF7A66",
  gold: "#F0C66A",
  success: "#3F9B58",
  danger: "#D84A4A",
});

export const themes = Object.fromEntries(
  seeds.map((seed) => [seed.name, { ...seed, colors: toColors(seed) }])
) as Record<ThemeName, ThemeSeed & { colors: AppColors }>;

// Legacy export. New and migrated components should use useAppTheme() so changes are live.
export const colors = themes.dripmaxx.colors;

type ThemeContextValue = {
  themeName: ThemeName;
  theme: (typeof themes)[ThemeName];
  setThemeName: (name: ThemeName) => void;
  hydrated: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>("dripmaxx");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((saved) => {
        if (saved && themeNames.includes(saved as ThemeName)) setThemeNameState(saved as ThemeName);
      })
      .finally(() => setHydrated(true));
  }, []);

  const setThemeName = (name: ThemeName) => {
    setThemeNameState(name);
    AsyncStorage.setItem(THEME_STORAGE_KEY, name).catch(() => {});
  };

  const value = useMemo(() => ({ themeName, theme: themes[themeName], setThemeName, hydrated }), [themeName, hydrated]);
  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAppTheme must be used within AppThemeProvider");
  return value;
}

export const radius = { sm: 12, md: 18, lg: 26, pill: 999 } as const;
export const space = { xs: 6, sm: 10, md: 16, lg: 22, xl: 30 } as const;
export const type = {
  eyebrow: { fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.4 },
  title: { fontSize: 34, lineHeight: 39, fontWeight: "900" as const, letterSpacing: -1.1 },
  section: { fontSize: 20, lineHeight: 25, fontWeight: "800" as const, letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 17 },
} as const;
