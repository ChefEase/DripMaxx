export const colors = {
  ink: "#080A0C",
  surface: "#111418",
  surfaceRaised: "#181C21",
  surfaceSoft: "#20252B",
  line: "#2A3037",
  text: "#F7F5F0",
  textMuted: "#A7ABB1",
  textSoft: "#737982",
  lime: "#C7FF4A",
  limeInk: "#172100",
  cream: "#EEE8DC",
  coral: "#FF7A66",
  gold: "#F0C66A",
  success: "#87D89A",
  danger: "#FF8C8C",
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
} as const;

export const type = {
  eyebrow: { fontSize: 11, fontWeight: "800" as const, letterSpacing: 1.4 },
  title: { fontSize: 34, lineHeight: 39, fontWeight: "900" as const, letterSpacing: -1.1 },
  section: { fontSize: 20, lineHeight: 25, fontWeight: "800" as const, letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 12, lineHeight: 17 },
} as const;
