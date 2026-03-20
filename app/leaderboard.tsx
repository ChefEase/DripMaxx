import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Share,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string | null;
  avg_drip_score: number;
  rating_count: number;
};

const STYLE_OPTIONS = ["Streetwear", "Minimal", "Vintage", "Luxury", "Y2K", "Casual"];

const SCOPES = (country: string | null) => [
  { id: "global", label: "All Time" },
  { id: "yearly", label: "Year" },
  { id: "monthly", label: "Month" },
  { id: "weekly", label: "Week" },
  { id: "daily", label: "Today" },
  ...(country ? [{ id: "country", label: country }] : []),
  ...STYLE_OPTIONS.map((s) => ({ id: `style:${s}`, label: s })),
];

export default function LeaderboardScreen() {
  const nav = useNavigation<Nav>();
  const { country, userId } = useStore();
  const [scope, setScope] = useState("global");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<{ id: string; name: string; code: string; is_owner: boolean }[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const base = process.env.EXPO_PUBLIC_API_BASE || "http://127.0.0.1:8000";
    const [actualScope, styleParam] = scope.startsWith("style:") ? ["style", scope.replace("style:", "")] : [scope, null];
    let url = `${base}/v1/rankings/leaderboard?scope=${actualScope}&limit=30`;
    if (actualScope === "country" && country) url += `&country=${encodeURIComponent(country)}`;
    if (actualScope === "style" && styleParam) url += `&style=${encodeURIComponent(styleParam)}`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Leaderboard ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (!cancelled) {
          setEntries(d.entries || []);
          console.log("[Leaderboard] loaded scope=%s count=%d", scope, d.entries?.length ?? 0);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || "Failed to load");
          setEntries([]);
          console.warn("[Leaderboard] fetch failed", e);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [scope, country]);

  useEffect(() => {
    if (!userId) {
      setGroups([]);
      return;
    }
    let cancelled = false;
    setGroupLoading(true);
    const base = process.env.EXPO_PUBLIC_API_BASE || "http://127.0.0.1:8000";
    fetch(`${base}/v1/rankings/groups?user_id=${encodeURIComponent(userId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (!cancelled) setGroups(d || []);
      })
      .catch((e) => console.warn("[Leaderboard] groups fetch failed", e))
      .finally(() => {
        if (!cancelled) setGroupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleDeleteGroup = async (groupId: string) => {
    const base = process.env.EXPO_PUBLIC_API_BASE || "http://127.0.0.1:8000";
    try {
      await fetch(`${base}/v1/rankings/groups/${groupId}?user_id=${encodeURIComponent(userId || "")}`, {
        method: "DELETE",
      });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
    } catch (e) {
      console.warn("delete group failed", e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Leaderboard</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scopeRow}
        contentContainerStyle={styles.scopeRowContent}
      >
        {SCOPES(country).map((s: { id: string; label: string }) => (
          <Pressable
            key={s.id}
            style={[styles.scopeChip, scope === s.id && styles.scopeChipActive]}
            onPress={() => setScope(s.id)}
          >
            <Text style={[styles.scopeChipText, scope === s.id && styles.scopeChipTextActive]}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <Text style={styles.titleSm}>Your groups</Text>
            <Pressable onPress={() => nav.navigate("RankingGroups")}>
              <Text style={styles.link}>Create / Join</Text>
            </Pressable>
          </View>
          {groupLoading ? (
            <ActivityIndicator size="small" color="#22C55E" />
          ) : groups.length === 0 ? (
            <Text style={styles.muted}>No groups yet. Create one to share a code.</Text>
          ) : (
            groups.map((g) => (
              <View key={g.id} style={styles.groupRow}>
                <View style={{ flex: 1 }}>
                  <Pressable onPress={() => nav.navigate("GroupLeaderboard", { groupId: g.id, groupName: g.name })}>
                    <Text style={styles.groupNameLink}>{g.name}</Text>
                  </Pressable>
                  <Text style={styles.code}>Code: {g.code}</Text>
                </View>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() =>
                    Share.share({ message: `Join my DripMaxx group "${g.name}"! Code: ${g.code}` })
                  }
                >
                  <Text style={styles.smallBtnText}>Share</Text>
                </Pressable>
                {g.is_owner && (
                  <Pressable style={[styles.smallBtn, styles.dangerBtn]} onPress={() => handleDeleteGroup(g.id)}>
                    <Text style={styles.dangerText}>Delete</Text>
                  </Pressable>
                )}
              </View>
            ))
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#22C55E" />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : entries.length === 0 ? (
          <Text style={styles.muted}>
            No public rows are available for this scope right now. If your position card shows a rank, you may be outside the visible list or the leaderboard data needs a refresh.
          </Text>
        ) : (
          entries.map((e) => (
            <Pressable
              key={e.user_id}
              style={styles.row}
              onPress={() => nav.navigate("UserProfile", { userId: e.user_id })}
            >
              <Text style={styles.rank}>#{e.rank}</Text>
              <View style={styles.userInfo}>
                <Text style={styles.name}>{e.display_name || "Anonymous"}</Text>
                <Text style={styles.muted}>{e.rating_count} ratings</Text>
              </View>
              <Text style={styles.score}>{e.avg_drip_score.toFixed(1)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
      <Pressable
        style={styles.footer}
        onPress={() => nav.navigate("RankingGroups")}
      >
        <Text style={styles.footerText}>Create or join private groups →</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  backBtn: { marginBottom: 8 },
  backText: { color: "#A5B4FC", fontSize: 15, fontWeight: "600" },
  title: { color: "#F9FAFB", fontSize: 24, fontWeight: "800" },
  scopeRow: { maxHeight: 44 },
  scopeRowContent: { paddingHorizontal: 24, gap: 8, paddingBottom: 12 },
  scopeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#1F2937",
  },
  scopeChipActive: { backgroundColor: "#22C55E" },
  scopeChipText: { color: "#9CA3AF", fontSize: 14, fontWeight: "600" },
  scopeChipTextActive: { color: "#022C22", fontWeight: "700" },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 80 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    gap: 12,
  },
  rank: { color: "#22C55E", fontSize: 16, fontWeight: "800", minWidth: 36 },
  userInfo: { flex: 1 },
  name: { color: "#F9FAFB", fontSize: 15, fontWeight: "700" },
  score: { color: "#BBF7D0", fontSize: 16, fontWeight: "800" },
  muted: { color: "#6B7280", fontSize: 14 },
  error: { color: "#F87171", fontSize: 14 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    alignItems: "center",
    backgroundColor: "#020617",
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
  },
  footerText: { color: "#22C55E", fontSize: 14, fontWeight: "700" },
  groupCard: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleSm: { color: "#F9FAFB", fontSize: 16, fontWeight: "700" },
  link: { color: "#A5B4FC", fontSize: 14, fontWeight: "700" },
  groupRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  code: { color: "#9CA3AF", fontSize: 13 },
  groupNameLink: { color: "#86EFAC", fontSize: 15, fontWeight: "700", textDecorationLine: "underline" },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#1F2937",
  },
  smallBtnText: { color: "#E5E7EB", fontWeight: "700", fontSize: 12 },
  dangerBtn: { backgroundColor: "#2F1F1F" },
  dangerText: { color: "#FCA5A5", fontWeight: "800", fontSize: 12 },
});
