import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { apiFetch, apiJsonHeaders } from "../lib/api";
import {
  ActiveChallenge,
  ChallengeSubmission,
  fetchActiveChallenge,
  fetchChallengeResults,
} from "../lib/challenges";
import { logWarn } from "../lib/logger";
import { useStore } from "../store";
import RemoteImage from "./components/RemoteImage";
import AppTabBar from "./components/AppTabBar";
import { colors } from "./ui/theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ADMIN_EMAIL = "onyiakamsy74@gmail.com";

const formatTimeLeft = (endsAt: string) => {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h left`;
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m left`;
};

export default function ChallengeScreen() {
  const nav = useNavigation<Nav>();
  const { userEmail } = useStore();
  const isAdmin = (userEmail || "").trim().toLowerCase() === ADMIN_EMAIL;
  const [challenge, setChallenge] = useState<ActiveChallenge | null>(null);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [winnerSubmissionId, setWinnerSubmissionId] = useState<string | null>(null);
  const [winnerSelectedAt, setWinnerSelectedAt] = useState<string | null>(null);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [adminRanks, setAdminRanks] = useState<Record<1 | 2 | 3, string | null>>({
    1: null,
    2: null,
    3: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const rankedSubmissions = useMemo(
    () => [...submissions].sort((a, b) => b.final_points - a.final_points),
    [submissions]
  );
  const winnerSubmission = useMemo(
    () => submissions.find((item) => item.id === winnerSubmissionId) || null,
    [submissions, winnerSubmissionId]
  );

  const load = async () => {
    setLoading(true);
    try {
      const active = await fetchActiveChallenge();
      const current = active?.challenge || null;
      setChallenge(current);
      if (current) {
        const results = await fetchChallengeResults(current.id);
        const rows = results.submissions;
        setSubmissions(rows);
        setWinnerSubmissionId(results.winner_submission_id || current.winner_submission_id || null);
        setWinnerSelectedAt(results.winner_selected_at || current.winner_selected_at || null);
        setSelectedVote(results.viewer_vote_submission_id || null);
        setAdminRanks({
          1: rows.find((row) => row.admin_rank === 1)?.id || null,
          2: rows.find((row) => row.admin_rank === 2)?.id || null,
          3: rows.find((row) => row.admin_rank === 3)?.id || null,
        });
      } else {
        setSubmissions([]);
        setWinnerSubmissionId(null);
        setWinnerSelectedAt(null);
      }
    } catch (error) {
      logWarn("[Challenge] load failed", error);
      Alert.alert("Challenge unavailable", "Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const vote = async (submissionId: string) => {
    if (!challenge) return;
    if (winnerSubmissionId) {
      Alert.alert("Voting closed", "The winner has already been chosen.");
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch(`/v1/challenges/${challenge.id}/votes`, {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify({ submission_id: submissionId }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Vote failed ${response.status}`);
      }
      setSelectedVote(submissionId);
      await load();
    } catch (error: any) {
      Alert.alert("Vote failed", error?.message || "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const setRank = (rank: 1 | 2 | 3, submissionId: string) => {
    setAdminRanks((current) => {
      const next = { ...current };
      ([1, 2, 3] as const).forEach((slot) => {
        if (next[slot] === submissionId) next[slot] = null;
      });
      next[rank] = submissionId;
      return next;
    });
  };

  const saveAdminRanks = async () => {
    if (!challenge || !adminRanks[1] || !adminRanks[2] || !adminRanks[3]) {
      Alert.alert("Pick top 3", "Select first, second, and third place before saving.");
      return;
    }
    setSaving(true);
    try {
      const response = await apiFetch(`/v1/challenges/${challenge.id}/admin-ranks`, {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify({
          first_submission_id: adminRanks[1],
          second_submission_id: adminRanks[2],
          third_submission_id: adminRanks[3],
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Admin rank failed ${response.status}`);
      }
      await load();
    } catch (error: any) {
      Alert.alert("Could not save top 3", error?.message || "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectWinner = async (submissionId: string) => {
    if (!challenge) return;
    const chosen = submissions.find((item) => item.id === submissionId);
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Select winner",
        `Award the prize to ${chosen?.display_name || "this user"}?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Award Prize", onPress: () => resolve(true) },
        ]
      );
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      const response = await apiFetch(`/v1/challenges/${challenge.id}/winner`, {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify({ submission_id: submissionId }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Winner failed ${response.status}`);
      }
      Alert.alert("Winner selected", "Prize scans and XP were awarded.");
      await load();
    } catch (error: any) {
      Alert.alert("Could not select winner", error?.message || "Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => nav.goBack()}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          {isAdmin ? <Text style={styles.adminBadge}>Admin</Text> : null}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.lime} />
            <Text style={styles.muted}>Loading challenge...</Text>
          </View>
        ) : !challenge ? (
          <View style={styles.card}>
            <Text style={styles.title}>No active challenge</Text>
            <Text style={styles.muted}>
              {isAdmin
                ? "Create one in the backend/database to open voting."
                : "There isn't an active challenge right now. Check back soon to enter and vote."}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>{winnerSubmission ? "Winner Announced" : "Today's Challenge"}</Text>
              <Text style={styles.title}>{challenge.title}</Text>
              {challenge.description ? <Text style={styles.subtitle}>{challenge.description}</Text> : null}
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {winnerSubmission ? "Challenge complete" : formatTimeLeft(challenge.ends_at)}
                </Text>
                <Text style={styles.metaText}>
                  {challenge.reward_scans} scans + {challenge.reward_xp} XP
                </Text>
              </View>
            </View>

            {winnerSubmission ? (
              <View style={styles.winnerCard}>
                <Text style={styles.winnerEyebrow}>Winner</Text>
                <Text style={styles.winnerName}>{winnerSubmission.display_name || "User"}</Text>
                <Text style={styles.winnerMeta}>
                  Final {winnerSubmission.final_points.toFixed(1)} | Admin{" "}
                  {winnerSubmission.admin_points.toFixed(1)} | Users{" "}
                  {winnerSubmission.user_vote_points.toFixed(1)}
                </Text>
                {winnerSubmission.image_url ? (
                  <RemoteImage uri={winnerSubmission.image_url} style={styles.winnerImage} />
                ) : null}
                <Text style={styles.winnerCopy}>
                  Prize awarded: {challenge.reward_scans} scans + {challenge.reward_xp} XP.
                  {winnerSelectedAt ? ` Chosen ${new Date(winnerSelectedAt).toLocaleDateString()}.` : ""}
                </Text>
              </View>
            ) : null}

            {isAdmin ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Admin Top 3</Text>
                <Text style={styles.muted}>
                  Your picks control the 60% admin side. Save top 3, then select the winner.
                </Text>
                <View style={styles.adminSlots}>
                  {([1, 2, 3] as const).map((rank) => (
                    <View key={rank} style={styles.slot}>
                      <Text style={styles.slotLabel}>{rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}</Text>
                      <Text style={styles.slotValue}>
                        {adminRanks[rank]
                          ? submissions.find((item) => item.id === adminRanks[rank])?.display_name || "Selected"
                          : "Not selected"}
                      </Text>
                    </View>
                  ))}
                </View>
                <Pressable style={styles.primaryButton} onPress={saveAdminRanks} disabled={saving}>
                  <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save Admin Top 3"}</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Entries</Text>
              {rankedSubmissions.length === 0 ? (
                <View style={styles.emptyLooks}>
                  <Text style={styles.muted}>No submissions yet. Here is the level of styling to aim for.</Text>
                  <View style={styles.exampleLooksRow}>
                    <View style={styles.exampleLook}><Image source={require("../assets/editorial/challenge-look-01.jpg")} style={styles.exampleLookImage} resizeMode="cover" /><Text style={styles.exampleLookLabel}>STYLE REFERENCE 01</Text></View>
                    <View style={styles.exampleLook}><Image source={require("../assets/editorial/challenge-look-02.jpg")} style={styles.exampleLookImage} resizeMode="cover" /><Text style={styles.exampleLookLabel}>STYLE REFERENCE 02</Text></View>
                  </View>
                </View>
              ) : (
                rankedSubmissions.map((item, index) => (
                  <View key={item.id} style={styles.entry}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.rankText}>#{index + 1}</Text>
                      <View style={styles.entryTitleWrap}>
                        <Text style={styles.entryName}>{item.display_name || "User"}</Text>
                        <Text style={styles.scoreLine}>
                          Final {item.final_points.toFixed(1)} | Admin {item.admin_points.toFixed(1)} | Users{" "}
                          {item.user_vote_points.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    {item.image_url ? <RemoteImage uri={item.image_url} style={styles.entryImage} /> : null}
                    <View style={styles.actionRow}>
                      <Pressable
                        style={[
                          styles.voteButton,
                          selectedVote === item.id && styles.voteButtonActive,
                          winnerSubmissionId && styles.voteButtonDisabled,
                        ]}
                        onPress={() => vote(item.id)}
                        disabled={saving || Boolean(winnerSubmissionId)}
                      >
                        <Text
                          style={[
                            styles.voteButtonText,
                            selectedVote === item.id && styles.voteButtonTextActive,
                          ]}
                        >
                          {winnerSubmissionId ? "Closed" : selectedVote === item.id ? "Voted" : "Vote"}
                        </Text>
                      </Pressable>
                      {isAdmin ? (
                        <>
                          {([1, 2, 3] as const).map((rank) => (
                            <Pressable
                              key={rank}
                              style={[
                                styles.rankButton,
                                adminRanks[rank] === item.id && styles.rankButtonActive,
                              ]}
                              onPress={() => setRank(rank, item.id)}
                            >
                              <Text
                                style={[
                                  styles.rankButtonText,
                                  adminRanks[rank] === item.id && styles.rankButtonTextActive,
                                ]}
                              >
                                {rank}
                              </Text>
                            </Pressable>
                          ))}
                          <Pressable
                            style={styles.winnerButton}
                            onPress={() => selectWinner(item.id)}
                            disabled={saving || Boolean(winnerSubmissionId)}
                          >
                            <Text style={styles.winnerButtonText}>
                              {winnerSubmissionId === item.id ? "Winner" : "Winner"}
                            </Text>
                          </Pressable>
                        </>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
      <View style={styles.tabDock}><AppTabBar active="challenge" /></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  tabDock: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, backgroundColor: "#020617" },
  content: { padding: 24, paddingBottom: 48, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backButton: {
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  backButtonText: { color: "#E5E7EB", fontWeight: "700" },
  adminBadge: {
    color: colors.limeInk,
    backgroundColor: colors.lime,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontWeight: "900",
  },
  loadingBox: { alignItems: "center", gap: 10, paddingVertical: 40 },
  hero: {
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  eyebrow: { color: colors.lime, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: "#F9FAFB", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#CBD5E1", fontSize: 14, lineHeight: 20 },
  muted: { color: "#9CA3AF", fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  metaText: {
    color: "#E5E7EB",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "800",
  },
  sectionTitle: { color: "#F9FAFB", fontSize: 18, fontWeight: "900" },
  adminSlots: { gap: 8 },
  slot: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    paddingBottom: 8,
  },
  slotLabel: { color: colors.lime, fontWeight: "900" },
  slotValue: { color: "#E5E7EB", fontWeight: "700" },
  primaryButton: { backgroundColor: colors.lime, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  primaryButtonText: { color: colors.limeInk, fontWeight: "900" },
  entry: {
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 8,
    backgroundColor: "#0B1220",
    padding: 12,
    gap: 10,
  },
  entryHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
  rankText: { color: colors.lime, fontSize: 18, fontWeight: "900", minWidth: 38 },
  entryTitleWrap: { flex: 1 },
  entryName: { color: "#F9FAFB", fontSize: 15, fontWeight: "900" },
  scoreLine: { color: "#9CA3AF", fontSize: 12, marginTop: 2 },
  entryImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#111827",
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  voteButton: {
    backgroundColor: colors.lime,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  voteButtonActive: { backgroundColor: colors.lime },
  voteButtonDisabled: { opacity: 0.55 },
  voteButtonText: { color: colors.limeInk, fontWeight: "900" },
  voteButtonTextActive: { color: colors.limeInk },
  rankButton: {
    width: 40,
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rankButtonActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  rankButtonText: { color: "#E5E7EB", fontWeight: "900" },
  rankButtonTextActive: { color: colors.limeInk },
  winnerButton: {
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  winnerButtonText: { color: "#FCD34D", fontWeight: "900" },
  winnerCard: {
    backgroundColor: "#102014",
    borderWidth: 1,
    borderColor: colors.lime,
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  winnerEyebrow: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  winnerName: {
    color: "#F9FAFB",
    fontSize: 22,
    fontWeight: "900",
  },
  winnerMeta: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: "800",
  },
  winnerImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#111827",
  },
  winnerCopy: {
    color: "#E5E7EB",
    fontSize: 13,
    lineHeight: 19,
  },
  emptyLooks: { gap: 12 },
  exampleLooksRow: { flexDirection: "row", gap: 8 },
  exampleLook: { flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: colors.surfaceSoft, position: "relative" },
  exampleLookImage: { width: "100%", aspectRatio: 4 / 5 },
  exampleLookLabel: { position: "absolute", left: 6, right: 6, bottom: 6, color: colors.text, backgroundColor: "rgba(8,10,12,0.78)", borderRadius: 999, textAlign: "center", paddingVertical: 5, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
});
