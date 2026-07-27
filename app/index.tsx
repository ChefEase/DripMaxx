import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Pressable, Animated, ScrollView, Modal } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { useStore } from "../store";
import { ActiveChallengePayload, fetchActiveChallenge } from "../lib/challenges";
import { RewardsSummary, fetchRewardsSummary } from "../lib/rewards";
import { apiFetch } from "../lib/api";
import { logWarn } from "../lib/logger";
import RemoteImage from "./components/RemoteImage";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type NewsItem = {
  id: string;
  kind: string;
  scope: string;
  category: string;
  eyebrow: string;
  title: string;
  caption: string;
  image_url: string | null;
  liked: boolean;
  like_count: number;
  content: {
    podium?: { rank: number; username: string; score: number }[];
    strengths?: string[];
    before_image_url?: string;
    after_image_url?: string;
    before_score?: number;
    after_score?: number;
  };
};

export default function ValuePropositionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const { displayName, userEmail, userId } = useStore();
  const [showToast, setShowToast] = useState(Boolean((route.params as any)?.celebrate));
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallengePayload | null>(null);
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [dismissingNews, setDismissingNews] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastY = useRef(new Animated.Value(10)).current;
  const heroScale = useRef(new Animated.Value(0.96)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchActiveChallenge().then(setActiveChallenge);
  }, []);

  useEffect(() => {
    fetchRewardsSummary(userId).then(setRewards);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setNewsItems([]);
      return;
    }
    apiFetch("/v1/news/feed")
      .then(async (response) => {
        if (!response.ok) throw new Error(`News ${response.status}`);
        const body = await response.json();
        setNewsItems(body?.items || []);
      })
      .catch((error) => logWarn("[CommunityNews] feed failed", error));
  }, [userId]);

  const dismissCurrentNews = async () => {
    const current = newsItems[0];
    if (!current || dismissingNews) return;
    setDismissingNews(true);
    try {
      const response = await apiFetch(`/v1/news/${encodeURIComponent(current.id)}/dismiss`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`Dismiss ${response.status}`);
      setNewsItems((items) => items.slice(1));
    } catch (error) {
      logWarn("[CommunityNews] dismiss failed", error);
    } finally {
      setDismissingNews(false);
    }
  };

  const toggleCurrentNewsLike = async () => {
    const current = newsItems[0];
    if (!current) return;
    try {
      const response = await apiFetch(`/v1/news/${encodeURIComponent(current.id)}/like`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`Like ${response.status}`);
      const body = await response.json();
      setNewsItems((items) =>
        items.map((item, index) =>
          index === 0 ? { ...item, liked: body.liked, like_count: body.like_count } : item
        )
      );
    } catch (error) {
      logWarn("[CommunityNews] like failed", error);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heroScale, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, [heroScale, pulse]);

  useEffect(() => {
    if (!showToast) return;
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(toastY, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(toastOpacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(() =>
          setShowToast(false)
        );
      }, 1200);
    });
  }, [showToast, toastOpacity, toastY]);

  const rewardProgress = rewards
    ? Math.min(100, Math.round((rewards.xp / Math.max(rewards.xp_per_scan_reward, 1)) * 100))
    : 0;
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.55] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.backgroundLayer} pointerEvents="none">
          <Animated.View
            style={[
              styles.glowPanel,
              { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
            ]}
          />
        </View>

        <View style={styles.topBar}>
          <View style={styles.headerRow}>
            <Pressable style={styles.avatar} onPress={() => navigation.navigate("Profile")}>
              <Text style={styles.avatarText}>
                {(displayName || userEmail || "U").charAt(0).toUpperCase()}
              </Text>
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.userName}>{displayName ? `Ready, ${displayName}` : "Ready to level up"}</Text>
              <Text style={styles.userEmail}>{userEmail || "Tap to view profile"}</Text>
            </View>
          </View>
          <Pressable style={styles.profilePill} onPress={() => navigation.navigate("Profile")}>
            <Text style={styles.profilePillText}>Profile</Text>
          </Pressable>
        </View>

        <Animated.View style={[styles.heroCard, { transform: [{ scale: heroScale }] }]}>
          <Text style={styles.logo}>DripMaxx</Text>
          <Text style={styles.title}>Your outfit rating room.</Text>
          <Text style={styles.subtitle}>
            Scan once. Get a score, strengths, fixes, XP, and your next style move.
          </Text>
          <View style={styles.heroPreview}>
            <View style={styles.heroScoreRing}>
              <Text style={styles.heroScore}>92</Text>
              <Text style={styles.heroScoreLabel}>Target</Text>
            </View>
            <View style={styles.heroMetricList}>
              {["Color", "Fit", "Streetwear"].map((label, index) => (
                <View key={label} style={styles.heroMetricRow}>
                  <Text style={styles.heroMetricLabel}>{label}</Text>
                  <View style={styles.heroMetricTrack}>
                    <View style={[styles.heroMetricFill, { width: `${92 - index * 12}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {rewards ? (
          <Pressable style={styles.rewardsCard} onPress={() => navigation.navigate("Profile")}>
            <View style={styles.rewardsTopRow}>
              <View>
                <Text style={styles.rewardsLabel}>XP & Rewards</Text>
                <Text style={styles.rewardsMeta}>{rewards.xp_until_next_reward} XP to 10 free scans</Text>
              </View>
              <Text style={styles.rewardsValue}>{rewards.xp} XP</Text>
            </View>
            <View style={styles.rewardsTrack}>
              <View style={[styles.rewardsFill, { width: `${rewardProgress}%` }]} />
            </View>
            <View style={styles.rewardStatsRow}>
              <Text style={styles.rewardStat}>{rewards.scan_credits} scan credits</Text>
              <Text style={styles.rewardStat}>{rewardProgress}% complete</Text>
            </View>
          </Pressable>
        ) : null}

        {activeChallenge?.announcement || activeChallenge?.challenge ? (
          <View style={styles.challengeCard}>
            <View style={styles.challengeHeaderRow}>
              <Text style={styles.challengeEyebrow}>Today's Challenge</Text>
              <Text style={styles.challengeChip}>Live</Text>
            </View>
            <Text style={styles.challengeTitle}>
              {activeChallenge.challenge?.title || activeChallenge.announcement?.title}
            </Text>
            {activeChallenge.announcement?.body || activeChallenge.challenge?.description ? (
              <Text style={styles.challengeBody}>
                {activeChallenge.announcement?.body || activeChallenge.challenge?.description}
              </Text>
            ) : null}
            {activeChallenge.challenge ? (
              <Text style={styles.challengeReward}>
                Reward: {activeChallenge.challenge.reward_scans} scans + {activeChallenge.challenge.reward_xp} XP
              </Text>
            ) : null}
            <Pressable style={styles.challengeButton} onPress={() => navigation.navigate("Challenge")}>
              <Text style={styles.challengeButtonText}>View Entries & Vote</Text>
            </Pressable>
          </View>
        ) : null}

        {showToast ? (
          <Animated.View style={[styles.toastCard, { opacity: toastOpacity, transform: [{ translateY: toastY }] }]}>
            <Text style={styles.toastIcon}>GO</Text>
            <Text style={styles.toastText}>You are in. Launch your first scan.</Text>
          </Animated.View>
        ) : null}

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("StylePreference")}>
            <Text style={styles.primaryButtonText}>Start a drip scan</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("ScanExample")}>
            <Text style={styles.secondaryButtonText}>Preview results</Text>
          </Pressable>
        </View>

        <View style={styles.bottomNav}>
          <Pressable style={styles.navItem} onPress={() => navigation.navigate("Scan")}>
            <Text style={styles.navIcon}>S</Text>
            <Text style={styles.navText}>Scan</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => navigation.navigate("Leaderboard")}>
            <Text style={styles.navIcon}>L</Text>
            <Text style={styles.navText}>Ranks</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => navigation.navigate("Challenge")}>
            <Text style={styles.navIcon}>C</Text>
            <Text style={styles.navText}>Challenge</Text>
          </Pressable>
          <Pressable style={styles.navItem} onPress={() => navigation.navigate("Profile")}>
            <Text style={styles.navIcon}>P</Text>
            <Text style={styles.navText}>Profile</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Modal
        transparent
        visible={newsItems.length > 0}
        animationType="fade"
        onRequestClose={() => void dismissCurrentNews()}
      >
        <View style={styles.newsOverlay}>
          <View style={styles.newsCard}>
            <View style={styles.newsHeader}>
              <Text style={styles.newsEyebrow}>{newsItems[0]?.eyebrow}</Text>
              <Text style={styles.newsCount}>
                1 / {newsItems.length}
              </Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {newsItems[0]?.kind === "glow_up" &&
              newsItems[0]?.content?.before_image_url &&
              newsItems[0]?.content?.after_image_url ? (
                <View style={styles.glowUpImages}>
                  <View style={styles.glowUpImageWrap}>
                    <RemoteImage uri={newsItems[0].content.before_image_url} style={styles.glowUpImage} />
                    <Text style={styles.glowUpLabel}>BEFORE · {newsItems[0].content.before_score}/100</Text>
                  </View>
                  <View style={styles.glowUpImageWrap}>
                    <RemoteImage uri={newsItems[0].content.after_image_url} style={styles.glowUpImage} />
                    <Text style={styles.glowUpLabel}>AFTER · {newsItems[0].content.after_score}/100</Text>
                  </View>
                </View>
              ) : !!newsItems[0]?.image_url ? (
                <RemoteImage uri={newsItems[0].image_url!} style={styles.newsImage} />
              ) : null}
              <View style={styles.newsBody}>
                <Text style={styles.newsTitle}>{newsItems[0]?.title}</Text>
                {!!newsItems[0]?.content?.podium?.length && (
                  <View style={styles.podium}>
                    {newsItems[0].content.podium.map((entry) => (
                      <View key={`${entry.rank}-${entry.username}`} style={styles.podiumRow}>
                        <Text style={styles.podiumRank}>
                          {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                        </Text>
                        <Text style={styles.podiumName}>@{entry.username}</Text>
                        <Text style={styles.podiumScore}>{entry.score}/100</Text>
                      </View>
                    ))}
                  </View>
                )}
                <Text style={styles.newsCaption}>{newsItems[0]?.caption}</Text>
              </View>
            </ScrollView>
            <View style={styles.newsActions}>
              <Pressable style={styles.newsLike} onPress={() => void toggleCurrentNewsLike()}>
                <Text style={styles.newsLikeText}>
                  {newsItems[0]?.liked ? "♥ Liked" : "♡ Like"} · {newsItems[0]?.like_count || 0}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.newsClose, dismissingNews && styles.newsCloseDisabled]}
                onPress={() => void dismissCurrentNews()}
                disabled={dismissingNews}
              >
                <Text style={styles.newsCloseText}>
                  {dismissingNews
                    ? "Saving..."
                    : newsItems.length > 1
                      ? "Next story"
                      : "Close — don’t show again"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 16,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  glowPanel: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#22C55E",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerCopy: { flex: 1 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#263449",
  },
  avatarText: { color: "#F9FAFB", fontSize: 18, fontWeight: "900" },
  userName: { color: "#E5E7EB", fontSize: 15, fontWeight: "900" },
  userEmail: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  profilePill: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#0F172A",
  },
  profilePillText: { color: "#E5E7EB", fontSize: 12, fontWeight: "900" },
  heroCard: {
    borderWidth: 1,
    borderColor: "#204B3A",
    borderRadius: 24,
    padding: 20,
    backgroundColor: "#061A14",
    gap: 14,
  },
  logo: {
    fontSize: 13,
    fontWeight: "900",
    color: "#86EFAC",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#F9FAFB",
    letterSpacing: 0,
    lineHeight: 39,
  },
  subtitle: {
    fontSize: 15,
    color: "#D1FAE5",
    lineHeight: 22,
  },
  heroPreview: {
    marginTop: 4,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  heroScoreRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    borderColor: "#22C55E",
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
  },
  heroScore: { color: "#F8FAFC", fontSize: 28, fontWeight: "900" },
  heroScoreLabel: { color: "#86EFAC", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  heroMetricList: { flex: 1, gap: 10 },
  heroMetricRow: { gap: 5 },
  heroMetricLabel: { color: "#D1FAE5", fontSize: 12, fontWeight: "800" },
  heroMetricTrack: {
    height: 9,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#123027",
  },
  heroMetricFill: { height: "100%", borderRadius: 999, backgroundColor: "#38BDF8" },
  rewardsCard: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  rewardsTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  rewardsLabel: { color: "#C4B5FD", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  rewardsValue: { color: "#F9FAFB", fontSize: 18, fontWeight: "900" },
  rewardsTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#111827",
    overflow: "hidden",
  },
  rewardsFill: { height: "100%", borderRadius: 999, backgroundColor: "#A78BFA" },
  rewardsMeta: { color: "#CBD5E1", fontSize: 12, fontWeight: "700", marginTop: 4 },
  rewardStatsRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  rewardStat: { color: "#94A3B8", fontSize: 12, fontWeight: "800" },
  challengeCard: {
    backgroundColor: "#0B1220",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#243247",
    gap: 8,
  },
  challengeHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  challengeEyebrow: { color: "#38BDF8", fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  challengeChip: {
    color: "#022C22",
    backgroundColor: "#22C55E",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "900",
  },
  challengeTitle: { color: "#F9FAFB", fontSize: 19, fontWeight: "900" },
  challengeBody: { color: "#CBD5E1", fontSize: 13, lineHeight: 19 },
  challengeReward: { color: "#E5E7EB", fontSize: 13, fontWeight: "800" },
  challengeButton: {
    marginTop: 4,
    backgroundColor: "#22C55E",
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
  },
  challengeButtonText: { color: "#022C22", fontSize: 14, fontWeight: "900" },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#22C55E",
    color: "#022C22",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
  },
  toastText: { color: "#E5E7EB", fontWeight: "800", fontSize: 14, flex: 1 },
  actions: { gap: 10 },
  primaryButton: {
    backgroundColor: "#22C55E",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#022C22", fontSize: 16, fontWeight: "900" },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0F172A",
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: { color: "#E5E7EB", fontSize: 15, fontWeight: "900" },
  bottomNav: {
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#07111F",
    borderRadius: 18,
    padding: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 12,
  },
  navIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: "#111827",
    color: "#A5B4FC",
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "900",
  },
  navText: { color: "#CBD5E1", fontSize: 11, fontWeight: "900" },
  newsOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.88)",
    justifyContent: "center",
    padding: 20,
  },
  newsCard: {
    maxHeight: "88%",
    backgroundColor: "#07111F",
    borderWidth: 1,
    borderColor: "#22C55E",
    borderRadius: 24,
    overflow: "hidden",
  },
  newsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#061A14",
  },
  newsEyebrow: { color: "#86EFAC", fontSize: 12, fontWeight: "900", letterSpacing: 0.8 },
  newsCount: { color: "#94A3B8", fontSize: 12, fontWeight: "800" },
  newsImage: { width: "100%", aspectRatio: 4 / 3, backgroundColor: "#0F172A" },
  glowUpImages: { flexDirection: "row", gap: 2, backgroundColor: "#020617" },
  glowUpImageWrap: { flex: 1, position: "relative" },
  glowUpImage: { width: "100%", aspectRatio: 3 / 4, backgroundColor: "#0F172A" },
  glowUpLabel: {
    position: "absolute",
    left: 6,
    right: 6,
    bottom: 7,
    color: "#F8FAFC",
    backgroundColor: "rgba(2, 6, 23, 0.82)",
    paddingVertical: 5,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "900",
  },
  newsBody: { padding: 18, gap: 14 },
  newsTitle: { color: "#F8FAFC", fontSize: 25, lineHeight: 30, fontWeight: "900" },
  podium: { gap: 8 },
  podiumRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 11,
    gap: 9,
  },
  podiumRank: { fontSize: 19 },
  podiumName: { flex: 1, color: "#F8FAFC", fontSize: 14, fontWeight: "800" },
  podiumScore: { color: "#86EFAC", fontSize: 14, fontWeight: "900" },
  newsCaption: { color: "#CBD5E1", fontSize: 14, lineHeight: 21 },
  newsActions: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#1E293B" },
  newsLike: { paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", backgroundColor: "#0F172A" },
  newsLikeText: { color: "#FCA5A5", fontSize: 13, fontWeight: "900" },
  newsClose: { flex: 1, backgroundColor: "#22C55E", paddingVertical: 14, alignItems: "center" },
  newsCloseDisabled: { opacity: 0.6 },
  newsCloseText: { color: "#052E16", fontSize: 14, fontWeight: "900" },
});
