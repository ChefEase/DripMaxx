import React, { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setError(null);
    }
    try {
      const response = await apiFetch("/v1/outfits/evolutions");
      if (!response.ok) throw new Error("Could not load saved outfits.");
      const data = await response.json();
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (cause) {
      logWarn("saved evolutions fetch failed", cause);
      if (showLoading) setError("Your saved outfits could not be loaded right now.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(true); }, [load]));

  // Target Looks are generated after scoring, so refresh quietly while any image
  // is still processing instead of making the user leave and reopen this screen.
  useEffect(() => {
    if (!sessions.some((session) => ["pending", "queued", "generating"].includes(session.target_generation_status))) return;
    const interval = setInterval(() => { void load(false); }, 3000);
    return () => clearInterval(interval);
  }, [load, sessions]);

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
        {error ? <View style={styles.messageCard}><Text style={styles.messageTitle}>Couldn’t load outfits</Text><Text style={styles.messageText}>{error}</Text><Pressable onPress={() => void load(true)}><Text style={styles.retry}>Try again</Text></Pressable></View> : null}
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
          const statuses = new Map((session.latest_revision?.recommendations || []).map((item) => [item.id, item.status]));
          const remaining = session.recommendations.filter((item) => statuses.get(item.id) !== "completed");
          return (
            <View key={session.session_id} style={styles.sessionCard}>
              <View style={styles.cardHeader}>
                {session.original_image_url ? <RemoteImage uri={session.original_image_url} style={styles.image} /> : <View style={styles.imagePlaceholder}><Text style={styles.emptyIcon}>DM</Text></View>}
                <View style={styles.cardCopy}>
                  <Text style={styles.cardEyebrow}>OUTFIT EVOLUTION</Text>
                  <Text style={styles.score}>{session.current_score.toFixed(1)} <Text style={styles.scorePotential}>current</Text></Text>
                  <Text style={styles.potential}>Potential {session.potential_score.toFixed(1)}/10</Text>
                  <Text style={styles.meta}>{completed}/{session.recommendations.length} upgrades complete · {session.revisions.length} rerate{session.revisions.length === 1 ? "" : "s"}</Text>
                </View>
              </View>

              <View style={styles.targetSection}>
                <Text style={styles.cardEyebrow}>TARGET REFERENCE</Text>
                <Text style={styles.sectionTitle}>Your Target Look</Text>
                {session.target_image_url ? (
                  <RemoteImage uri={session.target_image_url} style={styles.targetImage} />
                ) : ["failed", "complete"].includes(session.target_generation_status) ? (
                  <View style={styles.targetPlaceholder}><Text style={styles.targetStatusTitle}>Target image unavailable</Text><Text style={styles.targetStatusText}>Your written plan is still saved below.</Text></View>
                ) : (
                  <View style={styles.targetPlaceholder}><ActivityIndicator color="#C7FF4A" /><Text style={styles.targetStatusTitle}>Generating your Target Look…</Text><Text style={styles.targetStatusText}>You can use the recommendations now. The image will appear automatically.</Text></View>
                )}
              </View>

              <View style={styles.recommendationSection}>
                <Text style={styles.sectionTitle}>{remaining.length ? "Improvements still to try" : "All improvements completed"}</Text>
                {remaining.map((recommendation, index) => (
                  <View key={recommendation.id} style={styles.recommendationRow}>
                    <View style={styles.numberBadge}><Text style={styles.numberText}>{index + 1}</Text></View>
                    <View style={styles.recommendationCopy}>
                      <View style={styles.recommendationTitleRow}><Text style={styles.recommendationTitle}>{recommendation.title}</Text><Text style={styles.importance}>{recommendation.importance}</Text></View>
                      <Text style={styles.recommendationText}>{recommendation.recommended_change || recommendation.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.flexibleNote}>You don’t have to do everything—choose the upgrades that work for you.</Text>
              <Pressable style={styles.continueButton} onPress={() => navigation.navigate("UpgradeScan", { sessionId: session.session_id })}>
                <Text style={styles.continueText}>Continue this outfit →</Text>
              </Pressable>
            </View>
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
  sessionCard: { gap: 15, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: "#3F6212", backgroundColor: "#0F1B12" },
  cardHeader: { flexDirection: "row", gap: 14 },
  image: { width: 92, height: 122, borderRadius: 12, backgroundColor: "#1E293B" },
  imagePlaceholder: { width: 92, height: 122, borderRadius: 12, backgroundColor: "#1E293B", alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, justifyContent: "center", gap: 7 },
  cardEyebrow: { color: "#C7FF4A", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  score: { color: "#F8FAFC", fontSize: 24, fontWeight: "900" },
  scorePotential: { color: "#D1FAE5", fontSize: 12, fontWeight: "700" },
  potential: { color: "#C7FF4A", fontSize: 15, fontWeight: "900" },
  meta: { color: "#CBD5E1", fontSize: 12, lineHeight: 17 },
  targetSection: { gap: 9, paddingTop: 13, borderTopWidth: 1, borderTopColor: "#334155" },
  sectionTitle: { color: "#F8FAFC", fontSize: 17, fontWeight: "900" },
  targetImage: { width: "100%", height: 360, borderRadius: 14, backgroundColor: "#1E293B" },
  targetPlaceholder: { minHeight: 125, borderRadius: 14, borderWidth: 1, borderColor: "#334155", backgroundColor: "#0F172A", padding: 18, gap: 7, alignItems: "center", justifyContent: "center" },
  targetStatusTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "900", textAlign: "center" },
  targetStatusText: { color: "#CBD5E1", fontSize: 12, lineHeight: 17, textAlign: "center" },
  recommendationSection: { gap: 10 },
  recommendationRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, backgroundColor: "#0F172A", padding: 11 },
  numberBadge: { width: 25, height: 25, borderRadius: 8, backgroundColor: "#C7FF4A", alignItems: "center", justifyContent: "center" },
  numberText: { color: "#142000", fontSize: 12, fontWeight: "900" },
  recommendationCopy: { flex: 1, gap: 5 },
  recommendationTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  recommendationTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "900", flex: 1 },
  recommendationText: { color: "#CBD5E1", fontSize: 13, lineHeight: 18 },
  importance: { color: "#D1FAE5", backgroundColor: "#1F3A24", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3, fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
  flexibleNote: { color: "#D1FAE5", fontSize: 12, lineHeight: 17, textAlign: "center" },
  continueButton: { borderRadius: 13, backgroundColor: "#C7FF4A", paddingVertical: 13, alignItems: "center" },
  continueText: { color: "#142000", fontSize: 14, fontWeight: "900" },
  messageCard: { padding: 22, borderRadius: 18, borderWidth: 1, borderColor: "#334155", backgroundColor: "#0F172A", gap: 10, alignItems: "center" },
  emptyIcon: { color: "#C7FF4A", fontSize: 30, fontWeight: "900" },
  messageTitle: { color: "#F8FAFC", fontSize: 18, fontWeight: "900", textAlign: "center" },
  messageText: { color: "#CBD5E1", fontSize: 14, lineHeight: 20, textAlign: "center" },
  retry: { color: "#C7FF4A", fontWeight: "900", padding: 8 },
  primary: { marginTop: 5, backgroundColor: "#C7FF4A", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20 },
  primaryText: { color: "#142000", fontWeight: "900" },
});
