import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { apiFetch } from "../lib/api";
import { logWarn } from "../lib/logger";
import RemoteImage from "./components/RemoteImage";
import type { EvolutionSession } from "./scan";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function OutfitEvolutionsScreen() {
  const navigation = useNavigation<Nav>();
  const [sessions, setSessions] = useState<EvolutionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/v1/outfits/evolutions");
      if (!response.ok) throw new Error("Could not load saved outfits.");
      const data = await response.json();
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (cause) {
      logWarn("saved evolutions fetch failed", cause);
      setError("Your saved outfits could not be loaded right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back to new scan</Text>
        </Pressable>
        <Text style={styles.eyebrow}>UPGRADE MODE</Text>
        <Text style={styles.title}>Rerate a saved outfit</Text>
        <Text style={styles.subtitle}>Pick one outfit journey. Your next photo will be compared with its original scan and unfinished recommendations.</Text>

        <View style={styles.divider}><Text style={styles.dividerText}>SAVED OUTFIT JOURNEYS</Text></View>
        {loading ? <ActivityIndicator color="#C7FF4A" size="large" /> : null}
        {error ? <View style={styles.messageCard}><Text style={styles.messageTitle}>Couldn’t load outfits</Text><Text style={styles.messageText}>{error}</Text><Pressable onPress={load}><Text style={styles.retry}>Try again</Text></Pressable></View> : null}
        {!loading && !error && !sessions.length ? (
          <View style={styles.messageCard}>
            <Text style={styles.emptyIcon}>↻</Text>
            <Text style={styles.messageTitle}>No saved upgrade journeys yet</Text>
            <Text style={styles.messageText}>Rate a new outfit first. Its score and recommendations will be saved here.</Text>
            <Pressable style={styles.primary} onPress={() => navigation.navigate("Scan")}><Text style={styles.primaryText}>Rate a new outfit</Text></Pressable>
          </View>
        ) : null}
        {sessions.map((session) => {
          const completed = session.latest_revision?.completed_count || 0;
          return (
            <Pressable key={session.session_id} style={styles.sessionCard} onPress={() => navigation.navigate("UpgradeScan", { sessionId: session.session_id })}>
              {session.original_image_url ? <RemoteImage uri={session.original_image_url} style={styles.image} /> : <View style={styles.imagePlaceholder}><Text style={styles.emptyIcon}>DM</Text></View>}
              <View style={styles.cardCopy}>
                <Text style={styles.cardEyebrow}>OUTFIT EVOLUTION</Text>
                <Text style={styles.score}>{session.current_score.toFixed(1)} <Text style={styles.scorePotential}>/ {session.potential_score.toFixed(1)} potential</Text></Text>
                <Text style={styles.meta}>{completed}/{session.recommendations.length} upgrades complete · {session.revisions.length} rerate{session.revisions.length === 1 ? "" : "s"}</Text>
                <Text style={styles.action}>Continue this outfit →</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  container: { padding: 24, paddingBottom: 48, gap: 16 },
  backButton: { alignSelf: "flex-start", paddingVertical: 8 },
  backText: { color: "#E2E8F0", fontSize: 14, fontWeight: "800" },
  eyebrow: { color: "#C7FF4A", fontSize: 12, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: "#F8FAFC", fontSize: 32, lineHeight: 38, fontWeight: "900" },
  subtitle: { color: "#CBD5E1", fontSize: 15, lineHeight: 22 },
  divider: { marginTop: 8, paddingTop: 18, borderTopWidth: 2, borderTopColor: "#334155" },
  dividerText: { color: "#E2E8F0", fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  sessionCard: { flexDirection: "row", gap: 14, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: "#3F6212", backgroundColor: "#0F1B12" },
  image: { width: 92, height: 122, borderRadius: 12, backgroundColor: "#1E293B" },
  imagePlaceholder: { width: 92, height: 122, borderRadius: 12, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, justifyContent: "center", gap: 7 },
  cardEyebrow: { color: "#C7FF4A", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  score: { color: "#F8FAFC", fontSize: 24, fontWeight: "900" },
  scorePotential: { color: "#D1FAE5", fontSize: 12, fontWeight: "700" },
  meta: { color: "#CBD5E1", fontSize: 12, lineHeight: 17 },
  action: { color: "#C7FF4A", fontSize: 13, fontWeight: "900" },
  messageCard: { padding: 22, borderRadius: 18, borderWidth: 1, borderColor: "#334155", backgroundColor: "#0F172A", gap: 10, alignItems: "center" },
  emptyIcon: { color: "#C7FF4A", fontSize: 30, fontWeight: "900" },
  messageTitle: { color: "#F8FAFC", fontSize: 18, fontWeight: "900", textAlign: "center" },
  messageText: { color: "#CBD5E1", fontSize: 14, lineHeight: 20, textAlign: "center" },
  retry: { color: "#C7FF4A", fontWeight: "900", padding: 8 },
  primary: { marginTop: 5, backgroundColor: "#C7FF4A", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  primaryText: { color: "#142000", fontWeight: "900" },
});
