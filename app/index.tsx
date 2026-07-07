import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useStore } from "../store";
import { ActiveChallengePayload, fetchActiveChallenge } from "../lib/challenges";
import { RewardsSummary, fetchRewardsSummary } from "../lib/rewards";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ValuePropositionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const { displayName, userEmail, userId } = useStore();
  const [showRocket, setShowRocket] = useState(Boolean((route.params as any)?.celebrate));
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallengePayload | null>(null);
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const rocketOpacity = useRef(new Animated.Value(0)).current;
  const rocketY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    console.log("[ValuePropositionScreen] mounted");
    fetchActiveChallenge().then(setActiveChallenge);
    return () => {
      console.log("[ValuePropositionScreen] unmounted");
    };
  }, []);

  useEffect(() => {
    fetchRewardsSummary(userId).then(setRewards);
  }, [userId]);

  useEffect(() => {
    if (showRocket) {
      Animated.parallel([
        Animated.timing(rocketOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(rocketY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(rocketOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
            setShowRocket(false)
          );
        }, 1200);
      });
    }
  }, [showRocket, rocketOpacity, rocketY]);

  const handleGetStarted = () => {
    console.log("[ValuePropositionScreen] Get Started pressed");
    navigation.navigate("StylePreference");
  };

  const handleSeeExample = () => {
    console.log("[ValuePropositionScreen] See Example pressed");
    navigation.navigate("ScanExample");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <View style={styles.headerRow}>
            <Pressable style={styles.avatar} onPress={() => navigation.navigate("Profile")}>
              <Text style={styles.avatarText}>
                {(displayName || userEmail || "U").charAt(0).toUpperCase()}
              </Text>
            </Pressable>
            <View>
              <Text style={styles.userName}>{displayName || "Welcome"}</Text>
              <Text style={styles.userEmail}>{userEmail || "Tap to view profile"}</Text>
            </View>
          </View>
          {rewards ? (
            <Pressable style={styles.rewardsCard} onPress={() => navigation.navigate("Profile")}>
              <View style={styles.rewardsTopRow}>
                <Text style={styles.rewardsLabel}>XP & Rewards</Text>
                <Text style={styles.rewardsValue}>{rewards.xp} XP</Text>
              </View>
              <View style={styles.rewardsTrack}>
                <View
                  style={[
                    styles.rewardsFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.round((rewards.xp / Math.max(rewards.xp_per_scan_reward, 1)) * 100)
                      )}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.rewardsMeta}>
                {rewards.xp_until_next_reward} XP to 10 free scans | {rewards.scan_credits} scan credits
              </Text>
            </Pressable>
          ) : null}
          <Text style={styles.logo}>DripMaxx</Text>
          <Text style={styles.title}>Rate Your Outfit Instantly With AI</Text>
          <Text style={styles.subtitle}>
            Scan your outfit and get a Drip Score, style feedback, and
            improvement suggestions.
          </Text>
          {activeChallenge?.announcement || activeChallenge?.challenge ? (
            <View style={styles.challengeCard}>
              <Text style={styles.challengeEyebrow}>Today's Challenge</Text>
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
                  Reward: {activeChallenge.challenge.reward_scans} scans +{" "}
                  {activeChallenge.challenge.reward_xp} XP
                </Text>
              ) : null}
              <Pressable style={styles.challengeButton} onPress={() => navigation.navigate("Challenge")}>
                <Text style={styles.challengeButtonText}>View Entries & Vote</Text>
              </Pressable>
            </View>
          ) : null}
          {showRocket ? (
            <Animated.View
              style={[
                styles.rocketCard,
                { opacity: rocketOpacity, transform: [{ translateY: rocketY }] },
              ]}
            >
              <Text style={styles.rocket}>🚀</Text>
              <Text style={styles.rocketText}>You’re in! Let’s launch your first scan.</Text>
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={handleGetStarted}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleSeeExample}>
            <Text style={styles.secondaryButtonText}>See Example</Text>
          </Pressable>
        </View>

        <Text style={styles.helperText}>
          Get Started is where real outfit scans begin.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "space-between",
  },
  logo: {
    fontSize: 22,
    fontWeight: "700",
    color: "#22C55E",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  avatarText: { color: "#F9FAFB", fontSize: 18, fontWeight: "800" },
  userName: { color: "#E5E7EB", fontSize: 15, fontWeight: "800" },
  userEmail: { color: "#9CA3AF", fontSize: 12 },
  rewardsCard: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  rewardsTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rewardsLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  rewardsValue: {
    color: "#BBF7D0",
    fontSize: 14,
    fontWeight: "900",
  },
  rewardsTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#111827",
    overflow: "hidden",
  },
  rewardsFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#22C55E",
  },
  rewardsMeta: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F9FAFB",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#9CA3AF",
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#022C22",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#4B5563",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  rocketCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  rocket: { fontSize: 24 },
  rocketText: { color: "#E5E7EB", fontWeight: "700", fontSize: 14 },
  challengeCard: {
    marginTop: 16,
    backgroundColor: "#0B1220",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  challengeEyebrow: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  challengeTitle: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "800",
  },
  challengeBody: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  challengeReward: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  challengeButton: {
    marginTop: 12,
    backgroundColor: "#22C55E",
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  challengeButtonText: {
    color: "#022C22",
    fontSize: 14,
    fontWeight: "800",
  },
});
