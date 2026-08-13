import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../App";
import { AppColors, radius, useAppTheme } from "../ui/theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = "home" | "scan" | "challenge" | "ranks" | "profile";

const tabs: { key: Tab; label: string; symbol: string; route: keyof RootStackParamList }[] = [
  { key: "home", label: "Home", symbol: "⌂", route: "ValueProposition" },
  { key: "ranks", label: "Ranks", symbol: "♛", route: "Leaderboard" },
  { key: "scan", label: "Quick scan", symbol: "◎", route: "Scan" },
  { key: "challenge", label: "Compete", symbol: "◇", route: "Challenge" },
  { key: "profile", label: "You", symbol: "◉", route: "Profile" },
];

export default function AppTabBar({ active }: { active: Tab }) {
  const navigation = useNavigation<Nav>();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  return (
    <View style={styles.shell} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        const isScan = tab.key === "scan";
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            hitSlop={6}
            style={[styles.tab, isScan && styles.scanTab]}
            onPress={() => navigation.navigate(tab.route as any)}
          >
            <View style={[styles.icon, selected && styles.iconActive, isScan && styles.scanIcon]}>
              <Text style={[styles.symbol, selected && styles.symbolActive, isScan && styles.scanSymbol]}>{tab.symbol}</Text>
            </View>
            <Text style={[styles.label, selected && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  shell: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingHorizontal: 7,
    paddingTop: 8,
    paddingBottom: 7,
  },
  tab: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "flex-end", gap: 3 },
  scanTab: { marginTop: -22 },
  icon: { width: 30, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  iconActive: { backgroundColor: colors.surfaceSoft },
  scanIcon: { width: 54, height: 54, borderRadius: 20, backgroundColor: colors.lime },
  symbol: { color: colors.textSoft, fontSize: 19, fontWeight: "800" },
  symbolActive: { color: colors.text },
  scanSymbol: { color: colors.limeInk, fontSize: 29 },
  label: { color: colors.textSoft, fontSize: 10, fontWeight: "700" },
  labelActive: { color: colors.text },
});
