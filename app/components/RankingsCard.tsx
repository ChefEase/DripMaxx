import React, { useEffect, useState } from "react";
import { useThemedStyles } from "../ui/theme";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../App";
import { apiFetch } from "../../lib/api";
import { logWarn } from "../../lib/logger";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type UserRankingSummary = {
  scope: string;
  rank: number | null;
  total_eligible: number;
  avg_drip_score: number | null;
  rating_count: number;
};

type RankingsData = {
  user_id: string;
  ratings_count: number;
  avg_drip_score: number | null;
  eligible_for_leaderboard: boolean;
  rankings: UserRankingSummary[];
};

const SCOPE_LABELS: Record<string, string> = {
  global: "Global",
  yearly: "Year",
  monthly: "Month",
  weekly: "Week",
  daily: "Today",
  country: "Country",
};

const scopeLabel = (scope: string) => {
  if (scope.startsWith("style:")) return scope.replace("style:", "");
  return SCOPE_LABELS[scope] ?? scope;
};

interface RankingsCardProps {
  userId: string | null;
  compact?: boolean;
  refreshTrigger?: number | string;
  onRankingsPress?: () => void;
}

export default function RankingsCard({ userId, compact = false, refreshTrigger, onRankingsPress }: RankingsCardProps) {
  const styles = useThemedStyles(baseStyles);
  const nav = useNavigation<Nav>();
  const [data, setData] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/v1/rankings/me?user_id=${encodeURIComponent(userId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Rankings ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || "Failed to load rankings");
          logWarn("[RankingsCard] fetch failed", e);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, refreshTrigger]);

  const handlePress = () => {
    if (onRankingsPress) {
      onRankingsPress();
    } else {
      nav.navigate("Leaderboard");
    }
  };

  if (!userId) return null;
  if (loading && !data) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color="#22C55E" />
        <Text style={styles.muted}>Loading rankings...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.card}>
        <Text style={styles.muted}>{error}</Text>
      </View>
    );
  }

  const isEligible = data?.eligible_for_leaderboard ?? false;

  if (compact) {
    return (
      <Pressable style={styles.card} onPress={handlePress}>
        <Text style={styles.label}>Your rankings</Text>
        {!isEligible ? (
          <Text style={styles.muted}>You must rate 10 outfits to be ranked.</Text>
        ) : (
          <View style={styles.row}>
            <Text style={styles.avgScore}>Avg {data?.avg_drip_score?.toFixed(1) ?? "--"}/10</Text>
            {data?.rankings?.filter((r) => r.rank != null).slice(0, 2).map((r) => (
              <Text key={r.scope} style={styles.rankBadge}>
                #{r.rank} {scopeLabel(r.scope)}
              </Text>
            ))}
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <Text style={styles.title}>Your rankings</Text>
      {!isEligible ? (
        <Text style={styles.muted}>You must rate 10 outfits to be ranked.</Text>
      ) : (
        <>
          <View style={styles.avgRow}>
            <Text style={styles.avgLabel}>Avg Drip Score</Text>
            <Text style={styles.avgValue}>{data?.avg_drip_score?.toFixed(1) ?? "--"}/10</Text>
          </View>
          <View style={styles.rankGrid}>
            {data?.rankings?.map((r) => (
              <View key={r.scope} style={styles.rankRow}>
                <Text style={styles.scopeLabel}>{scopeLabel(r.scope)}</Text>
                {r.rank != null ? <Text style={styles.rankValue}>#{r.rank}</Text> : <Text style={styles.muted}>--</Text>}
              </View>
            ))}
          </View>
        </>
      )}
      <Text style={styles.link}>View leaderboard</Text>
    </Pressable>
  );
}

const baseStyles = StyleSheet.create({
  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  title: { color: "#F9FAFB", fontSize: 16, fontWeight: "700" },
  label: { color: "#9CA3AF", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  muted: { color: "#6B7280", fontSize: 13 },
  avgRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avgLabel: { color: "#9CA3AF", fontSize: 13 },
  avgValue: { color: "#22C55E", fontSize: 18, fontWeight: "800" },
  avgScore: { color: "#22C55E", fontSize: 14, fontWeight: "700" },
  rankGrid: { gap: 6 },
  rankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scopeLabel: { color: "#E5E7EB", fontSize: 13 },
  rankValue: { color: "#BBF7D0", fontSize: 13, fontWeight: "700" },
  rankBadge: { color: "#22C55E", fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  link: { color: "#22C55E", fontSize: 13, fontWeight: "700", marginTop: 4 },
});
