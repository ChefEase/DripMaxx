import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView, Alert, ScrollView, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { apiFetch, apiJsonHeaders } from "../lib/api";
import { logWarn } from "../lib/logger";
import { ensureRevenueCatConfigured, hasRevenueCatEntitlement } from "../lib/revenueCat";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import AppTabBar from "./components/AppTabBar";
import { AppColors, colors, themes, themeNames, useAppTheme, useThemedStyles } from "./ui/theme";
import { bodyTypeLabel, genderStyleLabel } from "../lib/profileEnums";
import RankingsCard from "./components/RankingsCard";
import RemoteImage from "./components/RemoteImage";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const styles = useThemedStyles(baseStyles);
  const nav = useNavigation<Nav>();
  const { theme, themeName, setThemeName } = useAppTheme();
  const colors = theme.colors;
  const themed = useMemo(() => makeThemedStyles(colors), [colors]);
  const {
    userId,
    userEmail,
    displayName,
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
  const [scoreCards, setScoreCards] = useState<any[]>([]);
  const [dna, setDna] = useState<{ label: string; description: string; tags: string[] } | null>(null);
  const [profileVisibility, setProfileVisibility] = useState<"public" | "friends_only" | "private">("public");
  const [billingStatus, setBillingStatus] = useState<null | { plan: string; used: number; remaining: number; limit_type: string }>(null);
  const [rewards, setRewards] = useState<null | {
    xp: number;
    scan_credits: number;
    xp_per_scan_reward: number;
    xp_until_next_reward: number;
    badges?: {
      id: string;
      label: string;
      rank: number;
      scope: string;
      category: string;
    }[];
  }>(null);

  const fetchBillingStatus = React.useCallback(async () => {
    if (!userId) return;
    try {
      const billingRes = await apiFetch(`/v1/billing/status?user_id=${encodeURIComponent(userId)}`);
      if (billingRes.ok) setBillingStatus(await billingRes.json());
    } catch (err) {
      logWarn("billing status fetch failed", err);
    }

    if (Platform.OS !== "web") {
      try {
        const purchases = await ensureRevenueCatConfigured(userId);
        const customerInfo = await purchases.getCustomerInfo();
        if (hasRevenueCatEntitlement(customerInfo)) {
          setBillingStatus((current) => ({
            plan: "monthly",
            used: current?.used ?? 0,
            remaining: current?.remaining ?? 0,
            limit_type: current?.limit_type ?? "unlimited",
          }));
        }
      } catch (err) {
        logWarn("RevenueCat billing status fetch failed", err);
      }
    }
  }, [userId]);

  useFocusEffect(React.useCallback(() => { void fetchBillingStatus(); }, [fetchBillingStatus]));

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userId) return;

      try {
        const historyRes = await apiFetch(`/v1/profile/history?user_id=${encodeURIComponent(userId)}`);
        if (historyRes.ok) {
          const data = await historyRes.json();
          setRecent(data.recent_outfits || []);
          setHistory(data.history || []);
          setScoreCards(data.score_cards || []);
          if (data.profile_visibility) setProfileVisibility(data.profile_visibility);
        }
      } catch (err) {
        logWarn("history fetch failed", err);
      }

      try {
        const dnaRes = await apiFetch(`/v1/profile/style_dna?user_id=${encodeURIComponent(userId)}`);
        if (dnaRes.ok) {
          const data = await dnaRes.json();
          setDna(data);
        }
      } catch (err) {
        logWarn("dna fetch failed", err);
      }


      try {
        const rewardsRes = await apiFetch(`/v1/rewards/me?user_id=${encodeURIComponent(userId)}`);
        if (rewardsRes.ok) {
          setRewards(await rewardsRes.json());
        }
      } catch (err) {
        logWarn("rewards fetch failed", err);
      }
    };

    void fetchProfileData();
  }, [userId]);

  const clearLocalUserState = async () => {
    await AsyncStorage.multiRemove([
      "dripmaxx:userId",
      "dripmaxx:userEmail",
      "dripmaxx:username",
      "dripmaxx:displayName",
      "dripmaxx:avatarUrl",
    ]).catch(() => {});
    setUserEmail(null);
    setUsername(null);
    setUserId(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await clearLocalUserState();
    nav.navigate("Auth");
  };

  const handleDeleteAccount = () => {
    if (!userId) {
      Alert.alert("Not signed in", "Sign in to delete your account.");
      return;
    }

    const runDelete = async () => {
      try {
        const res = await apiFetch("/v1/profile/delete-account", {
          method: "POST",
          headers: apiJsonHeaders(),
          body: JSON.stringify({ user_id: userId }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Delete failed");
        }

        await supabase.auth.signOut();
        await clearLocalUserState();

        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.alert("Your account has been deleted.");
        } else {
          Alert.alert("Account deleted", "Your account has been deleted.");
        }
        nav.navigate("Auth");
      } catch (err: any) {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.alert(err?.message || "Delete failed. Try again.");
        } else {
          Alert.alert("Delete failed", err?.message || "Try again.");
        }
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const confirmed = window.confirm("Are you sure you want to delete your account?");
      if (confirmed) {
        void runDelete();
      }
      return;
    }

    Alert.alert("Delete account", "Are you sure you want to delete your account?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: () => {
          void runDelete();
        },
      },
    ]);
  };

  const handleBack = () => nav.goBack();
  const trendCards =
    scoreCards.length > 0
      ? scoreCards
      : recent
          .filter((item) => item?.image_url || item?.drip_score != null)
          .map((item) => ({
            outfit_id: item.id,
            image_url: item.image_url,
            scanned_at: item.scanned_at,
            drip_score: item.drip_score,
            breakdown: null,
          }));

  return (
    <SafeAreaView style={[styles.safeArea, themed.safeArea]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, themed.accentText]}>YOUR STYLE</Text>
        <Text style={[styles.title, themed.text]}>Progress, preferences and looks</Text>
        <View style={[styles.card, themed.card]}>
          <Text style={[styles.label, themed.muted]}>User</Text>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(displayName || userEmail || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.value, themed.text]}>{displayName || "Not signed in"}</Text>
              <Text style={[styles.muted, themed.muted]}>{userEmail || "No email"}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.card, themed.card]}>
          <Text style={[styles.label, themed.muted]}>Appearance</Text>
          <Text style={[styles.value, themed.text]}>Make DripMaxx feel like yours</Text>
          <Text style={[styles.muted, themed.muted]}>
            Color changes only. The logo, type, icons, layout and scoring stay unmistakably DripMaxx.
          </Text>
          <View style={styles.themeGrid}>
            {themeNames.map((name) => {
              const option = themes[name];
              const selected = name === themeName;
              return (
                <Pressable
                  key={name}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${option.label} theme. ${option.vibe}`}
                  onPress={() => setThemeName(name)}
                  style={[
                    styles.themeOption,
                    { backgroundColor: option.background, borderColor: selected ? option.accent : option.dark ? "#383838" : "#D4D4D0" },
                    selected && styles.themeOptionSelected,
                  ]}
                >
                  <View style={[styles.themePreviewCard, { backgroundColor: option.card }]}>
                    <View style={styles.themePreviewHeader}>
                      <View style={[styles.themePreviewAvatar, { backgroundColor: option.accent }]} />
                      <View style={styles.themePreviewLines}>
                        <View style={[styles.themePreviewLine, { backgroundColor: option.text }]} />
                        <View style={[styles.themePreviewLineShort, { backgroundColor: option.text, opacity: 0.35 }]} />
                      </View>
                    </View>
                    <View style={[styles.themePreviewButton, { backgroundColor: option.accent }]} />
                  </View>
                  <View style={styles.themeOptionFooter}>
                    <Text style={[styles.themeOptionName, { color: option.text }]}>{option.symbol} {option.label}</Text>
                    {selected && <Text style={[styles.themeCheck, { color: option.accent }]}>✓</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.themeVibe, themed.muted]}>{theme.vibe}</Text>
        </View>
        <View style={[styles.card, themed.card]}>
          <Text style={[styles.label, themed.muted]}>Plan</Text>
          <Text style={[styles.value, themed.text]}>{billingStatus?.plan === "monthly" ? "Premium" : "Free"}</Text>
          <Text style={[styles.muted, themed.muted]}>
            {billingStatus?.plan === "monthly"
              ? "Unlimited scans are enabled on this account."
              : "Free plan: 5 scans to start, then 1 free scan every 3 days."}
          </Text>
          <Pressable
            style={[styles.upgradeButton, billingStatus?.plan === "monthly" && styles.upgradeButtonDisabled]}
            onPress={() => nav.navigate("Paywall")}
          >
            <Text style={styles.upgradeButtonText}>
              {billingStatus?.plan === "monthly" ? "Premium Active" : "Upgrade to Premium"}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.card, themed.card]}>
          <Text style={[styles.label, themed.muted]}>XP & Rewards</Text>
          <Text style={[styles.value, themed.text]}>{rewards?.xp ?? 0} XP</Text>
          <Text style={[styles.muted, themed.muted]}>
            {(rewards?.xp_until_next_reward ?? 500)} XP until 10 free scans
          </Text>
          <View style={styles.rewardMeter}>
            <View
              style={[
                styles.rewardMeterFill,
                {
                  width: `${Math.min(
                    100,
                    Math.round(((rewards?.xp ?? 0) / (rewards?.xp_per_scan_reward || 500)) * 100)
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.value, themed.text]}>{rewards?.scan_credits ?? 0} earned scan credits</Text>
          {!!rewards?.badges?.length && (
            <View style={styles.tagRow}>
              {rewards.badges.map((badge) => (
                <View key={badge.id} style={styles.tag}>
                  <Text style={styles.tagText}>
                    {badge.rank === 1 ? "Gold" : badge.rank === 2 ? "Silver" : "Bronze"} {badge.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={[styles.card, themed.card]}>
          <Text style={[styles.label, themed.muted]}>Profile visibility</Text>
          <Text style={[styles.muted, themed.muted]}>Who can see your outfits when viewing your profile from the leaderboard</Text>
          <View style={styles.visibilityRow}>
            {(["public", "friends_only", "private"] as const).map((v) => (
              <Pressable
                key={v}
                style={[styles.visibilityChip, profileVisibility === v && styles.visibilityChipActive]}
                onPress={() => {
                  setProfileVisibility(v);
                  apiFetch("/v1/profile/sync", {
                    method: "POST",
                    headers: apiJsonHeaders(),
                    body: JSON.stringify({ user_id: userId, profile_visibility: v }),
                  }).catch((e) => logWarn("visibility sync failed", e));
                }}
              >
                <Text style={[styles.visibilityChipText, profileVisibility === v && styles.visibilityChipTextActive]}>
                  {v === "public" ? "Public" : v === "friends_only" ? "Friends only" : "Private"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={[styles.card, themed.card]}>
          <Text style={styles.label}>Style Preferences</Text>
          <Text style={styles.value}>{stylePreferences.join(", ") || "None"}</Text>
          <Text style={styles.label}>Inspirations</Text>
          <Text style={styles.value}>{styleInspirations.join(", ") || "None"}</Text>
          <Text style={styles.label}>Height</Text>
          <Text style={styles.value}>{userHeight || "n/a"}</Text>
          <Text style={styles.label}>Body Type</Text>
          <Text style={styles.value}>{bodyTypeLabel(userBodyType)}</Text>
          <Text style={styles.label}>Gender Style</Text>
          <Text style={styles.value}>{genderStyleLabel(genderStylePreference)}</Text>
        </View>

        <Pressable style={styles.primary} onPress={() => nav.navigate("Scan")}>
          <Text style={styles.primaryText}>Back to Scan</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => nav.navigate("Challenge")}>
          <Text style={styles.secondaryText}>
            {(userEmail || "").toLowerCase() === "onyiakamsy74@gmail.com"
              ? "Challenge Admin & Voting"
              : "Challenge Voting"}
          </Text>
        </Pressable>
        {(userEmail || "").toLowerCase() === "onyiakamsy74@gmail.com" && (
          <Pressable style={styles.secondary} onPress={() => nav.navigate("FeatureSubmissions")}>
            <Text style={styles.secondaryText}>Feature Submissions</Text>
          </Pressable>
        )}
        <Pressable style={styles.secondary} onPress={handleLogout}>
          <Text style={styles.secondaryText}>Log out</Text>
        </Pressable>
        <Pressable style={styles.dangerButton} onPress={handleDeleteAccount}>
          <Text style={styles.dangerButtonText}>Delete Account</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={handleBack}>
          <Text style={styles.linkText}>Back</Text>
        </Pressable>

        <RankingsCard userId={userId} />
        <View style={[styles.card, themed.card]}>
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

        <View style={[styles.card, themed.card]}>
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

        <View style={[styles.card, themed.card]}>
          <Text style={styles.label}>Drip score trend</Text>
          <Text style={styles.trendSubtitle}>
            Swipe through your scans, compare score cards, and see what actually moved each rating.
          </Text>
          {trendCards.length === 0 ? (
            <Text style={styles.muted}>No scored outfit photos yet. Scan an outfit to build your score cards.</Text>
          ) : (
            <View style={styles.scoreCardViewport}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={trendCards.length > 1}
                contentContainerStyle={styles.scoreCardRow}
              >
                {trendCards.map((item, idx) => {
                  const breakdown = item.breakdown || {};
                  const metrics = [
                    { label: "Color", value: breakdown.color_match },
                    { label: "Fit", value: breakdown.fit_quality },
                    { label: "Trend", value: breakdown.trend_score },
                    { label: "Body", value: breakdown.body_compatibility },
                    { label: "Style", value: breakdown.style_match },
                  ].filter((metric) => metric.value != null);
                  const score = item.drip_score ?? 0;

                  return (
                    <View key={item.outfit_id || idx} style={styles.scoreTrendCard}>
                      <View style={styles.scoreTrendImageWrap}>
                        {item.image_url ? (
                          <RemoteImage uri={item.image_url} style={styles.scoreTrendImage} />
                        ) : (
                          <View style={styles.scoreTrendImageFallback}>
                            <Text style={styles.scoreTrendImageFallbackText}>No photo</Text>
                          </View>
                        )}
                        <View style={styles.scoreTrendBadge}>
                          <Text style={styles.scoreTrendBadgeText}>{Number(score).toFixed(1)}</Text>
                        </View>
                      </View>
                      <View style={styles.scoreTrendBody}>
                        <View style={styles.scoreTrendHeader}>
                          <View>
                            <Text style={styles.scoreTrendTitle}>Score card #{trendCards.length - idx}</Text>
                            <Text style={styles.scoreTrendDate}>{item.scanned_at?.slice(0, 10) || "Recent scan"}</Text>
                          </View>
                          <Text style={styles.scoreTrendTier}>
                            {score >= 8.5 ? "Elite" : score >= 7 ? "Strong" : score >= 5.5 ? "Solid" : "Build"}
                          </Text>
                        </View>
                        <View style={styles.scoreTrendMeterTrack}>
                          <View
                            style={[
                              styles.scoreTrendMeterFill,
                              { width: `${Math.max(4, Math.min(100, Math.round(score * 10)))}%` },
                            ]}
                          />
                        </View>
                        {metrics.length > 0 ? (
                          <View style={styles.scoreTrendMetrics}>
                            {metrics.map((metric) => (
                              <View key={metric.label} style={styles.scoreTrendMetricRow}>
                                <Text style={styles.scoreTrendMetricLabel}>{metric.label}</Text>
                                <View style={styles.scoreTrendMetricTrack}>
                                  <View
                                    style={[
                                      styles.scoreTrendMetricFill,
                                      {
                                        width: `${Math.max(
                                          4,
                                          Math.min(100, Math.round(Number(metric.value) * 10))
                                        )}%`,
                                      },
                                    ]}
                                  />
                                </View>
                                <Text style={styles.scoreTrendMetricValue}>
                                  {Number(metric.value).toFixed(1)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.scoreTrendFallbackText}>
                            Full breakdown appears after the backend score-card update is live.
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
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
      <View style={styles.tabDock}><AppTabBar active="profile" /></View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.ink },
  tabDock: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, backgroundColor: "#020617" },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 48, gap: 14 },
  eyebrow: { color: colors.lime, fontSize: 10, fontWeight: "900", letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 32, lineHeight: 37, fontWeight: "900", letterSpacing: -0.8 },
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
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: { color: colors.limeInk, fontWeight: "800", fontSize: 15 },
  upgradeButton: {
    marginTop: 10,
    backgroundColor: colors.lime,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  upgradeButtonText: { color: colors.limeInk, fontWeight: "800", fontSize: 14 },
  upgradeButtonDisabled: { backgroundColor: "#64748B", opacity: 0.75 },
  secondary: {
    borderWidth: 1,
    borderColor: "#374151",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryText: { color: "#E5E7EB", fontWeight: "700" },
  dangerButton: {
    borderWidth: 1,
    borderColor: "#7F1D1D",
    backgroundColor: "#2F1212",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  dangerButtonText: { color: "#FCA5A5", fontWeight: "800" },
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
  chartViewport: {
    marginTop: 4,
    borderRadius: 10,
    overflow: "hidden",
  },
  trendSubtitle: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  scoreCardViewport: {
    marginTop: 8,
  },
  scoreCardRow: {
    gap: 12,
    paddingVertical: 8,
    paddingRight: 10,
  },
  scoreTrendCard: {
    width: 280,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  scoreTrendImageWrap: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#020617",
    position: "relative",
  },
  scoreTrendImage: {
    width: "100%",
    height: "100%",
  },
  scoreTrendImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
  },
  scoreTrendImageFallbackText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "800",
  },
  scoreTrendBadge: {
    position: "absolute",
    right: 12,
    bottom: 12,
    minWidth: 58,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.lime,
    alignItems: "center",
  },
  scoreTrendBadgeText: {
    color: colors.limeInk,
    fontSize: 17,
    fontWeight: "900",
  },
  scoreTrendBody: {
    padding: 12,
    gap: 10,
  },
  scoreTrendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  },
  scoreTrendTitle: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
  },
  scoreTrendDate: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
  scoreTrendTier: {
    color: "#111827",
    backgroundColor: "#F59E0B",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "900",
  },
  scoreTrendMeterTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.surfaceSoft,
  },
  scoreTrendMeterFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.lime,
  },
  scoreTrendMetrics: {
    gap: 8,
  },
  scoreTrendMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scoreTrendMetricLabel: {
    width: 42,
    color: "#D1FAE5",
    fontSize: 11,
    fontWeight: "900",
  },
  scoreTrendMetricTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#0F172A",
    overflow: "hidden",
  },
  scoreTrendMetricFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#38BDF8",
  },
  scoreTrendMetricValue: {
    width: 30,
    color: "#F8FAFC",
    fontSize: 11,
    textAlign: "right",
    fontWeight: "900",
  },
  scoreTrendFallbackText: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
  },
  barColumn: {
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    width: 32,
  },
  bar: {
    width: 12,
    backgroundColor: colors.lime,
    borderRadius: 6,
  },
  barLabel: {
    color: "#6B7280",
    fontSize: 10,
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
  visibilityChipActive: { backgroundColor: colors.lime },
  visibilityChipText: { color: "#9CA3AF", fontSize: 13, fontWeight: "600" },
  visibilityChipTextActive: { color: colors.limeInk, fontWeight: "700" },
  footerLinks: { paddingBottom: 6 },
  rewardMeter: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#111827",
    overflow: "hidden",
    marginVertical: 4,
  },
  rewardMeterFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.lime,
  },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  themeOption: {
    width: "48%",
    minWidth: 132,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 9,
    gap: 8,
  },
  themeOptionSelected: { borderWidth: 3, padding: 7 },
  themePreviewCard: { borderRadius: 10, padding: 9, gap: 10 },
  themePreviewHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  themePreviewAvatar: { width: 18, height: 18, borderRadius: 9 },
  themePreviewLines: { flex: 1, gap: 4 },
  themePreviewLine: { height: 4, width: "76%", borderRadius: 4 },
  themePreviewLineShort: { height: 3, width: "50%", borderRadius: 4 },
  themePreviewButton: { height: 8, width: "100%", borderRadius: 5 },
  themeOptionFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  themeOptionName: { fontSize: 12, fontWeight: "900" },
  themeCheck: { fontSize: 16, fontWeight: "900" },
  themeVibe: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});

const makeThemedStyles = (themeColors: AppColors) => StyleSheet.create({
  safeArea: { backgroundColor: themeColors.ink },
  card: { backgroundColor: themeColors.surface, borderColor: themeColors.line },
  text: { color: themeColors.text },
  muted: { color: themeColors.textMuted },
  accentText: { color: themeColors.lime },
});
