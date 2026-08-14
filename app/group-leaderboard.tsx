import React, { useEffect, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { useThemedStyles } from "./ui/theme";
import { apiFetch } from "../lib/api";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type GroupRoute = RouteProp<RootStackParamList, "GroupLeaderboard">;

type GroupMember = {
  rank: number;
  user_id: string;
  display_name: string | null;
  avg_drip_score: number | null;
  rating_count: number;
};

export default function GroupLeaderboardScreen() {
  const styles = useThemedStyles(baseStyles);
  const nav = useNavigation<Nav>();
  const route = useRoute<GroupRoute>();
  const { groupId, groupName } = route.params;
  const [name, setName] = useState(groupName || "Group");
  const [code, setCode] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/v1/rankings/groups/${encodeURIComponent(groupId)}/details`)
      .then((r) => {
        if (!r.ok) throw new Error(`Group ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        setName(d.name || "Group");
        setCode(d.code || "");
        setMembers(d.members || []);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || "Failed to load group");
          setMembers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()}>
          <Text style={styles.back}>Back</Text>
        </Pressable>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.code}>Code: {code || "--"}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#22C55E" />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : members.length === 0 ? (
          <Text style={styles.muted}>No members found.</Text>
        ) : (
          members.map((m) => (
            <Pressable key={m.user_id} style={styles.row} onPress={() => nav.navigate("UserProfile", { userId: m.user_id })}>
              <Text style={styles.rank}>#{m.rank}</Text>
              <View style={styles.userCol}>
                <Text style={styles.name}>{m.display_name || "Anonymous"}</Text>
                <Text style={styles.muted}>{m.rating_count} ratings</Text>
              </View>
              <Text style={styles.score}>{m.avg_drip_score != null ? m.avg_drip_score.toFixed(1) : "--"}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  header: { padding: 24, gap: 6 },
  back: { color: "#A5B4FC", fontWeight: "700", fontSize: 14 },
  title: { color: "#F9FAFB", fontWeight: "800", fontSize: 24 },
  code: { color: "#9CA3AF", fontSize: 13 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingTop: 0, paddingBottom: 36 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    paddingVertical: 12,
  },
  rank: { color: "#22C55E", fontSize: 16, fontWeight: "800", minWidth: 36 },
  userCol: { flex: 1 },
  name: { color: "#F9FAFB", fontSize: 15, fontWeight: "700" },
  score: { color: "#BBF7D0", fontSize: 16, fontWeight: "800" },
  muted: { color: "#6B7280", fontSize: 13 },
  error: { color: "#F87171", fontSize: 14 },
});
