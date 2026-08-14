import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { useThemedStyles } from "./ui/theme";
import { apiFetch } from "../lib/api";
import { useStore } from "../store";
import RemoteImage from "./components/RemoteImage";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Submission = {
  id: string;
  image_url: string;
  drip_score: number;
  account_email: string | null;
  account_username: string | null;
  feature_username: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  display_consent: boolean;
  status: string;
  consented_at: string;
};

const DEVELOPER_EMAIL = "onyiakamsy74@gmail.com";

export default function FeatureSubmissionsScreen() {
  const styles = useThemedStyles(baseStyles);
  const navigation = useNavigation<Nav>();
  const { userEmail } = useStore();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDeveloper = (userEmail || "").trim().toLowerCase() === DEVELOPER_EMAIL;

  const load = useCallback(async () => {
    if (!isDeveloper) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const response = await apiFetch("/v1/features/submissions");
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail || "Could not load submissions.");
      setSubmissions(body?.submissions || []);
    } catch (err: any) {
      setError(err?.message || "Could not load submissions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isDeveloper]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor="#22C55E"
          />
        }
      >
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Feature submissions</Text>
        <Text style={styles.subtitle}>Outfits whose owners explicitly agreed to be featured.</Text>

        {!isDeveloper ? (
          <View style={styles.messageCard}>
            <Text style={styles.error}>Developer access required.</Text>
          </View>
        ) : loading ? (
          <ActivityIndicator color="#22C55E" size="large" />
        ) : error ? (
          <View style={styles.messageCard}>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.retry} onPress={() => void load()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : submissions.length === 0 ? (
          <View style={styles.messageCard}>
            <Text style={styles.empty}>No feature submissions yet.</Text>
          </View>
        ) : (
          submissions.map((item) => (
            <View key={item.id} style={styles.card}>
              <RemoteImage uri={item.image_url} style={styles.image} />
              <View style={styles.cardBody}>
                <View style={styles.row}>
                  <Text style={styles.score}>{item.drip_score.toFixed(1)}/10</Text>
                  <Text style={styles.status}>{item.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.name}>
                  {item.feature_username || item.account_username || "No display username"}
                </Text>
                <Text style={styles.meta}>{item.account_email || "No account email"}</Text>
                <Text style={styles.consent}>
                  ✓ Permission recorded {new Date(item.consented_at).toLocaleString()}
                </Text>
                {!!item.instagram_url && (
                  <Pressable onPress={() => Linking.openURL(item.instagram_url!)}>
                    <Text style={styles.link}>Open Instagram ↗</Text>
                  </Pressable>
                )}
                {!!item.tiktok_url && (
                  <Pressable onPress={() => Linking.openURL(item.tiktok_url!)}>
                    <Text style={styles.link}>Open TikTok ↗</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 24, paddingBottom: 48, gap: 16 },
  back: { color: "#A5B4FC", fontSize: 16, fontWeight: "800" },
  title: { color: "#F8FAFC", fontSize: 27, fontWeight: "900" },
  subtitle: { color: "#94A3B8", fontSize: 14, lineHeight: 20 },
  card: { backgroundColor: "#0F172A", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#1E293B" },
  image: { width: "100%", aspectRatio: 3 / 4, backgroundColor: "#111827" },
  cardBody: { padding: 16, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  score: { color: "#86EFAC", fontSize: 22, fontWeight: "900" },
  status: { color: "#FDE68A", backgroundColor: "#422006", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, fontSize: 11, fontWeight: "900" },
  name: { color: "#F8FAFC", fontSize: 17, fontWeight: "800" },
  meta: { color: "#94A3B8", fontSize: 13 },
  consent: { color: "#86EFAC", fontSize: 12, fontWeight: "700" },
  link: { color: "#A5B4FC", fontSize: 14, fontWeight: "800", paddingVertical: 3 },
  messageCard: { backgroundColor: "#0F172A", borderRadius: 14, padding: 18, gap: 12 },
  empty: { color: "#CBD5E1", textAlign: "center" },
  error: { color: "#FCA5A5", textAlign: "center" },
  retry: { backgroundColor: "#22C55E", borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  retryText: { color: "#052E16", fontWeight: "900" },
});
