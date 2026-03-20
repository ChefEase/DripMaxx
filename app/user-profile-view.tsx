import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type UserProfileRoute = RouteProp<RootStackParamList, "UserProfile">;

type TopOutfit = { id: string; image_url: string; drip_score: number; scanned_at: string | null };

const scopeLabel = (scope: string) => {
  if (scope.startsWith("style:")) return scope.replace("style:", "");
  if (scope === "global") return "Global";
  if (scope === "yearly") return "Year";
  if (scope === "monthly") return "Month";
  if (scope === "weekly") return "Week";
  if (scope === "daily") return "Today";
  if (scope === "country") return "Country";
  return scope;
};

export default function UserProfileViewScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<UserProfileRoute>();
  const userId = route.params?.userId;
  const { userId: viewerUserId } = useStore();
  const [data, setData] = useState<{
    display_name: string;
    avatar_url: string | null;
    avg_drip_score: number | null;
    rating_count: number;
    profile_visibility: string;
    rankings?: { scope: string; rank: number | null; total_eligible: number }[];
    top_outfits: TopOutfit[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      nav.goBack();
      return;
    }
    let cancelled = false;
    setLoading(true);
    const base = process.env.EXPO_PUBLIC_API_BASE || "http://127.0.0.1:8000";
    const viewerQuery = viewerUserId ? `?viewer_user_id=${encodeURIComponent(viewerUserId)}` : "";
    fetch(`${base}/v1/users/${encodeURIComponent(userId)}/public-profile${viewerQuery}`)
      .then((r) => {
        if (!r.ok) throw new Error("User not found");
        return r.json();
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          console.log("[UserProfileView] loaded", d);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || "Failed to load");
          console.warn("[UserProfileView] fetch failed", e);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId, viewerUserId, nav]);

  if (!userId) return null;
  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.muted}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (error || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.error}>{error || "User not found"}</Text>
      </SafeAreaView>
    );
  }

  const showOutfits = data.profile_visibility !== "private";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(data.display_name || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.name}>{data.display_name || "Anonymous"}</Text>
              <Text style={styles.avgScore}>
                Avg {data.avg_drip_score?.toFixed(1) ?? "--"}/10 · {data.rating_count} ratings
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Leaderboard ranks</Text>
          {(data.rankings || []).length === 0 ? (
            <Text style={styles.muted}>No leaderboard rankings yet.</Text>
          ) : (
            (data.rankings || []).map((r) => (
              <View key={r.scope} style={styles.rankRow}>
                <Text style={styles.scopeLabel}>{scopeLabel(r.scope)}</Text>
                <Text style={styles.rankValue}>
                  {r.rank ? `#${r.rank}` : "--"} / {r.total_eligible}
                </Text>
              </View>
            ))
          )}
        </View>
        {showOutfits && data.top_outfits.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.label}>🔥 Best Looks</Text>
            {data.top_outfits.map((o, idx) => (
              <View key={o.id} style={styles.outfitRow}>
                <Text style={styles.outfitRank}>{idx + 1}️⃣</Text>
                {o.image_url && !o.image_url.startsWith("uploaded://") ? (
                  <Pressable onPress={() => setPreviewUrl(o.image_url)} style={styles.thumbPressable}>
                    <Image source={{ uri: o.image_url }} style={styles.thumb} />
                  </Pressable>
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={styles.thumbText}>?</Text>
                  </View>
                )}
                <View style={styles.outfitInfo}>
                  <Text style={styles.outfitScore}>{o.drip_score?.toFixed(1) ?? "--"} rating</Text>
                  {o.scanned_at && (
                    <Text style={styles.muted}>{o.scanned_at.slice(0, 10)}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : data.profile_visibility === "private" ? (
          <View style={styles.card}>
            <Text style={styles.muted}>This user has set their profile to private. Outfits are hidden.</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal transparent visible={!!previewUrl} animationType="fade">
        <Pressable style={styles.previewOverlay} onPress={() => setPreviewUrl(null)}>
          <View style={styles.previewModal}>
            {previewUrl ? (
              <Image source={{ uri: previewUrl }} style={styles.previewImage} />
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 48, gap: 14 },
  backBtn: { marginBottom: 8 },
  backText: { color: "#A5B4FC", fontSize: 15, fontWeight: "600" },
  title: { color: "#F9FAFB", fontSize: 22, fontWeight: "800" },
  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#F9FAFB", fontSize: 22, fontWeight: "800" },
  name: { color: "#F9FAFB", fontSize: 18, fontWeight: "700" },
  avgScore: { color: "#22C55E", fontSize: 14, fontWeight: "600" },
  label: { color: "#9CA3AF", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  rankRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  scopeLabel: { color: "#E5E7EB", fontSize: 14, textTransform: "capitalize" },
  rankValue: { color: "#22C55E", fontSize: 14, fontWeight: "700" },
  outfitRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1F2937" },
  outfitRank: { color: "#22C55E", fontSize: 16, fontWeight: "700", minWidth: 28 },
  thumbPressable: { borderRadius: 8, overflow: "hidden" },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#1F2937" },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbText: { color: "#6B7280", fontSize: 18 },
  outfitInfo: { flex: 1 },
  outfitScore: { color: "#E5E7EB", fontSize: 14, fontWeight: "700" },
  muted: { color: "#6B7280", fontSize: 12 },
  error: { color: "#F87171", fontSize: 14, padding: 24 },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  previewModal: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#0B1224",
    padding: 12,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: "#111827",
  },
});
