import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView, Alert, ScrollView } from "react-native";
import { supabase } from "../lib/supabase";
import RankingsCard from "./components/RankingsCard";
import { useStore } from "../store";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const {
    userId,
    userEmail,
    displayName,
    avatarUrl,
    stylePreferences,
    styleInspirations,
    userHeight,
    userBodyType,
    genderStylePreference,
    setUserId,
    setUserEmail,
    setUsername,
  } = useStore();
  const [recent, setRecent] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [dna, setDna] = useState<{ label: string; description: string; tags: string[] } | null>(null);
  const [profileVisibility, setProfileVisibility] = useState<"public" | "friends_only" | "private">("public");
  const [billingStatus, setBillingStatus] = useState<null | { plan: string; used: number; remaining: number; limit_type: string }>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!userId) return;
      try {
        const base = process.env.EXPO_PUBLIC_API_BASE || "http://127.0.0.1:8000";
        const res = await fetch(`${base}/v1/profile/history?user_id=${userId}`);
        if (!res.ok) return;
        const data = await res.json();
        setRecent(data.recent_outfits || []);
        setHistory(data.history || []);
        if (data.profile_visibility) setProfileVisibility(data.profile_visibility);
      } catch (err) {
        console.warn("history fetch failed", err);
      }
      try {
        const base = process.env.EXPO_PUBLIC_API_BASE || "http://127.0.0.1:8000";
        const res = await fetch(`${base}/v1/profile/style_dna?user_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setDna(data);
        }
      } catch (err) {
        console.warn("dna fetch failed", err);
      }
      try {
        const base = process.env.EXPO_PUBLIC_API_BASE || "http://127.0.0.1:8000";
        const res = await fetch(`${base}/v1/billing/status?user_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setBillingStatus(data);
        }
      } catch (err) {
        console.warn("billing status fetch failed", err);
      }
    };
    fetchHistory();
  }, [userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    setUsername(null);
    setUserId(null);
    nav.navigate("Auth");
  };

  const handleBack = () => nav.goBack();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Profile</Text>
        <View style={styles.card}>
          <Text style={styles.label}>User</Text>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(displayName || userEmail || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.value}>{displayName || "Not signed in"}</Text>
              <Text style={styles.muted}>{userEmail || "No email"}</Text>
            </View>
          </View>
          <Text style={styles.label}>User ID</Text>
          <Text style={styles.value}>{userId || "Not signed in"}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{userEmail || "Not signed in"}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Plan</Text>
          <Text style={styles.value}>{billingStatus?.plan === "monthly" ? "Premium" : "Free"}</Text>
          <Text style={styles.muted}>
            {billingStatus?.plan === "monthly"
              ? "Unlimited scans are enabled on this account."
              : "Free plan: 5 scans to start, then 1 free scan every 3 days."}
          </Text>
          <Pressable style={styles.upgradeButton} onPress={() => nav.navigate("Paywall")}>
            <Text style={styles.upgradeButtonText}>
              {billingStatus?.plan === "monthly" ? "Manage Premium" : "Upgrade to Premium"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Profile visibility</Text>
          <Text style={styles.muted}>Who can see your outfits when viewing your profile from the leaderboard</Text>
          <View style={styles.visibilityRow}>
            {(["public", "friends_only", "private"] as const).map((v) => (
              <Pressable
                key={v}
                style={[styles.visibilityChip, profileVisibility === v && styles.visibilityChipActive]}
                onPress={() => {
                  setProfileVisibility(v);
                  const base = process.env.EXPO_PUBLIC_API_BASE || "http://127.0.0.1:8000";
                  fetch(`${base}/v1/profile/sync`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: userId, profile_visibility: v }),
                  }).catch((e) => console.warn("visibility sync failed", e));
                }}
              >
                <Text style={[styles.visibilityChipText, profileVisibility === v && styles.visibilityChipTextActive]}>
                  {v === "public" ? "Public" : v === "friends_only" ? "Friends only" : "Private"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Style Preferences</Text>
          <Text style={styles.value}>{stylePreferences.join(", ") || "None"}</Text>
          <Text style={styles.label}>Inspirations</Text>
          <Text style={styles.value}>{styleInspirations.join(", ") || "None"}</Text>
          <Text style={styles.label}>Height</Text>
          <Text style={styles.value}>{userHeight || "n/a"}</Text>
          <Text style={styles.label}>Body Type</Text>
          <Text style={styles.value}>{userBodyType || "n/a"}</Text>
          <Text style={styles.label}>Gender Style</Text>
          <Text style={styles.value}>{genderStylePreference || "n/a"}</Text>
        </View>

        <Pressable style={styles.primary} onPress={() => nav.navigate("Scan")}>
          <Text style={styles.primaryText}>Back to Scan</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={handleLogout}>
          <Text style={styles.secondaryText}>Log out</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={handleBack}>
          <Text style={styles.linkText}>Back</Text>
        </Pressable>

        <RankingsCard userId={userId} />
        <View style={styles.card}>
          <Text style={styles.label}>Your Style DNA</Text>
          <Text style={styles.value}>{dna?.label || "Building..."}</Text>
          <Text style={styles.muted}>{dna?.description || "Scan more outfits to unlock your DNA."}</Text>
          <View style={styles.tagRow}>
            {(dna?.tags || []).map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Recent outfits</Text>
          {recent.length === 0 ? (
            <Text style={styles.muted}>No scans yet.</Text>
          ) : (
            recent.map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <Text style={styles.value}>{item.drip_score ?? "--"}</Text>
                <Text style={styles.muted}>{item.scanned_at?.slice(0, 10) || ""}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Drip score trend</Text>
          {history.length === 0 ? (
            <Text style={styles.muted}>No history yet.</Text>
          ) : (
            <View style={styles.chartRow}>
              {history.map((p, idx) => {
                const height = p.drip_score ? (p.drip_score / 10) * 60 : 4;
                return (
                  <View key={idx} style={[styles.bar, { height }]} />
                );
              })}
            </View>
          )}
        </View>
        <View style={styles.footerLinks}>
          <Pressable style={styles.link} onPress={() => nav.navigate("Legal", { doc: "terms" })}>
            <Text style={styles.linkText}>Terms of Service</Text>
          </Pressable>
          <Pressable style={styles.link} onPress={() => nav.navigate("Legal", { doc: "privacy" })}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 48, gap: 14 },
  title: { color: "#F9FAFB", fontSize: 22, fontWeight: "800" },
  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  label: { color: "#9CA3AF", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  value: { color: "#E5E7EB", fontSize: 14, fontWeight: "700" },
  muted: { color: "#9CA3AF", fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#F9FAFB", fontSize: 18, fontWeight: "800" },
  primary: {
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: { color: "#022C22", fontWeight: "800", fontSize: 15 },
  upgradeButton: {
    marginTop: 10,
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  upgradeButtonText: { color: "#022C22", fontWeight: "800", fontSize: 14 },
  secondary: {
    borderWidth: 1,
    borderColor: "#374151",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: { color: "#E5E7EB", fontWeight: "700" },
  link: { alignItems: "center", paddingVertical: 6 },
  linkText: { color: "#A5B4FC", fontWeight: "700" },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    paddingVertical: 10,
  },
  bar: {
    width: 10,
    backgroundColor: "#22C55E",
    borderRadius: 6,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  tag: {
    backgroundColor: "#111827",
    borderColor: "#1F2937",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { color: "#A5B4FC", fontWeight: "700", fontSize: 12 },
  visibilityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  visibilityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#1F2937",
  },
  visibilityChipActive: { backgroundColor: "#22C55E" },
  visibilityChipText: { color: "#9CA3AF", fontSize: 13, fontWeight: "600" },
  visibilityChipTextActive: { color: "#022C22", fontWeight: "700" },
  footerLinks: { paddingBottom: 6 },
});
