import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Modal,
  Platform,
  Share,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import * as ImagePicker from "expo-image-picker";
import { useStore } from "../store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RankingsCard from "./components/RankingsCard";
import AnimatedNumber from "./components/AnimatedNumber";
import RemoteImage from "./components/RemoteImage";
import AppTabBar from "./components/AppTabBar";
import { colors, useThemedStyles } from "./ui/theme";
import { apiFetch, apiJsonHeaders } from "../lib/api";
import { trackEvent } from "../lib/analytics";
import { logWarn } from "../lib/logger";
import { ActiveChallengePayload, fetchActiveChallenge } from "../lib/challenges";
import { RewardsSummary, fetchRewardsSummary } from "../lib/rewards";
import { ProgressInsights, fetchProgressInsights } from "../lib/progress";
import {
  normalizeBodyTypeValue,
  normalizeGenderStyleValue,
} from "../lib/profileEnums";
import { ActivityIndicator } from "react-native";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ANALYSIS_STEPS = [
  {
    label: "Uploading fit",
    detail: "Sending your photo into the rating pipeline.",
    progress: 0.18,
  },
  {
    label: "Reading colors and silhouette",
    detail: "Checking color balance, shape, and overall structure.",
    progress: 0.42,
  },
  {
    label: "Scoring the outfit",
    detail: "Calculating your drip score across core categories.",
    progress: 0.68,
  },
  {
    label: "Building improvements",
    detail: "Generating targeted suggestions to level the fit up.",
    progress: 0.9,
  },
];

const categoryIcon = (label: string) => {
  if (label.includes("Color")) return "C";
  if (label.includes("Fit")) return "F";
  if (label.includes("Trend")) return "T";
  if (label.includes("Body")) return "B";
  return "S";
};

const scoreTone = (value: number) => {
  if (value >= 8.5) return "Elite";
  if (value >= 7) return "Strong";
  if (value >= 5.5) return "Solid";
  return "Needs work";
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10)));

const scanErrorMessage = (statusCode: number, bodyText: string) => {
  let detail = bodyText;
  try {
    const parsed = JSON.parse(bodyText);
    detail = typeof parsed?.detail === "string" ? parsed.detail : JSON.stringify(parsed?.detail || parsed);
  } catch {
    detail = bodyText;
  }

  const lowered = detail.toLowerCase();
  if (lowered.includes("resolution too low")) {
    return "That photo is too low resolution. Use a clearer full-body photo.";
  }
  if (lowered.includes("exactly one person")) {
    return "Use a full-body photo with only one clearly visible person.";
  }
  if (lowered.includes("too far away")) {
    return "You are too far from the camera. Move closer while keeping your full outfit visible.";
  }
  if (lowered.includes("full body")) {
    return "Make sure your full body is visible from head to shoes.";
  }
  if (lowered.includes("unclear")) {
    return "The photo is too unclear. Try brighter lighting and a steadier shot.";
  }
  if (lowered.includes("no outfit")) {
    return "No clear outfit was detected. Retake the photo with your outfit fully visible.";
  }
  if (statusCode === 502 || statusCode === 503) {
    return "The AI scan service is busy right now. Try again in a moment.";
  }
  return detail || "Scan failed. Try another clear full-body photo.";
};

export default function ScanStubScreen() {
  const styles = useThemedStyles(baseStyles);
  const navigation = useNavigation<Nav>();
  const {
    stylePreferences,
    styleInspirations,
    userHeight,
    userBodyType,
    genderStylePreference,
    userId,
    setUserId,
    country,
    username,
  } = useStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallengePayload | null>(null);
  const [challengeConsent, setChallengeConsent] = useState(false);
  const [challengeSubmitted, setChallengeSubmitted] = useState(false);
  const [isSubmittingChallenge, setIsSubmittingChallenge] = useState(false);
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const [bestOutfit, setBestOutfit] = useState<null | { imageUrl: string | null; dripScore: number | null }>(null);
  const [progressInsights, setProgressInsights] = useState<ProgressInsights | null>(null);
  const visibleStyleProgress = (progressInsights?.style_progress || []).filter(
    (item) => !["", "unspecified", "none", "null", "n/a", "na"].includes(item.style.trim().toLowerCase())
  );
  const [showProgressPopup, setShowProgressPopup] = useState(false);
  const [showFeaturePrompt, setShowFeaturePrompt] = useState(false);
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [featureUsername, setFeatureUsername] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [featureConsent, setFeatureConsent] = useState(false);
  const [isSubmittingFeature, setIsSubmittingFeature] = useState(false);
  const [result, setResult] = useState<
    | null
    | {
        dripScore: number;
        outfitId: string | null;
        xpAwarded: number;
        categories: { label: string; value: number }[];
        suggestions: { title: string; type: string; description: string }[];
        warnings: string[];
        unavailableMetrics: string[];
      }
  >(null);
  useEffect(() => {
    fetchActiveChallenge().then(setActiveChallenge);
  }, []);

  useEffect(() => {
    fetchRewardsSummary(userId).then(setRewards);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchProgressInsights(userId).then((insights) => {
      if (!insights) return;
      setProgressInsights(insights);
      // Occasionally celebrate progress before a scan without interrupting every visit.
      if (insights.outfits_scanned > 0 && Math.random() < 0.35) {
        setShowProgressPopup(true);
      }
    });
  }, [userId]);

  useEffect(() => {
    if (!isScoring) {
      setAnalysisStep(0);
      setAnalysisProgress(0);
      return;
    }

    setAnalysisStep(0);
    setAnalysisProgress(0.08);

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(0.92, 0.08 + elapsed / 9000);

      setAnalysisProgress((current) =>
        nextProgress > current ? nextProgress : current
      );

      let nextStep = 0;
      for (let i = ANALYSIS_STEPS.length - 1; i >= 0; i -= 1) {
        if (nextProgress >= ANALYSIS_STEPS[i].progress) {
          nextStep = i;
          break;
        }
      }
      setAnalysisStep(nextStep);
    }, 180);

    return () => clearInterval(interval);
  }, [isScoring]);

  const handleStartScan = () => {
    trackEvent("scan_started", {}, userId);
    Alert.alert(
      "Pick an option",
      "Capture with camera or choose from gallery.",
      [
        { text: "Camera", onPress: handleCapture },
        { text: "Gallery", onPress: handlePick },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleBackToStart = () => {
    navigation.navigate("ValueProposition");
  };

  const handleCapture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert("Camera access needed", "Please allow camera to scan.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      base64: false,
      exif: false,
    });
    if (!result.canceled) {
      const uri = result.assets[0]?.uri;
      if (uri) {
        setImageUri(uri);
        setResult(null);
        setSaved(false);
        setScanError(null);
        setChallengeSubmitted(false);
        setChallengeConsent(false);
      }
    }
  };

  const handlePick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert("Gallery access needed", "Please allow gallery access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
      exif: false,
    });
    if (!result.canceled) {
      const uri = result.assets[0]?.uri;
      if (uri) {
        setImageUri(uri);
        setResult(null);
        setSaved(false);
        setScanError(null);
        setChallengeSubmitted(false);
        setChallengeConsent(false);
      }
    }
  };

  const handleContinue = async () => {
    if (!imageUri) {
      Alert.alert("Add a photo first", "Pick an outfit photo to score.");
      return;
    }
    setScanError(null);
    setIsScoring(true);
    setAnalysisProgress(0.1);
    setAnalysisStep(0);
    try {
      let bestBeforeScan: null | { imageUrl: string | null; dripScore: number | null } = null;
      if (userId) {
        try {
          const historyResp = await apiFetch(`/v1/profile/history?user_id=${encodeURIComponent(userId)}`);
          if (historyResp.ok) {
            const historyData = await historyResp.json();
            if (historyData?.best_outfit) {
              bestBeforeScan = {
                imageUrl: historyData.best_outfit.image_url || null,
                dripScore: historyData.best_outfit.drip_score ?? null,
              };
            }
          }
        } catch (e) {
          logWarn("best outfit fetch failed", e);
        }
      }

      const form = new FormData();
      if (Platform.OS === "web") {
        const resp = await fetch(imageUri);
        const blob = await resp.blob();
        const file = new File([blob], "upload.jpg", { type: blob.type || "image/jpeg" });
        form.append("image", file as any);
      } else {
        form.append("image", {
          uri: imageUri,
          name: "upload.jpg",
          type: "image/jpeg",
        } as any);
      }
      form.append(
        "user_context",
        JSON.stringify({
          style_preferences: stylePreferences,
          style_inspirations: styleInspirations.length ? styleInspirations : [],
          user_height: userHeight?.trim() || null,
          user_body_type: normalizeBodyTypeValue(userBodyType),
          gender_style_preference:
            normalizeGenderStyleValue(genderStylePreference),
          user_id: userId || null,
        })
      );

      const resp = await apiFetch("/v1/outfits/score", {
        method: "POST",
        auth: "optional",
        headers: {
          Accept: "application/json",
        },
        body: form,
      });

      if (!resp.ok) {
        const text = await resp.text();
        if (resp.status === 402) {
          navigation.navigate("Paywall");
          return;
        }
        if (resp.status === 401) {
          throw new Error("Please confirm your email");
        }
        throw new Error(scanErrorMessage(resp.status, text));
      }

      const data = await resp.json();
      setAnalysisStep(ANALYSIS_STEPS.length - 1);
      setAnalysisProgress(0.97);
      // Sync profile to backend
      try {
        const profileResp = await apiFetch("/v1/profile/sync", {
          method: "POST",
          headers: apiJsonHeaders(),
          body: JSON.stringify({
            user_id: userId,
            style_preferences: stylePreferences,
            style_inspirations: styleInspirations,
            user_height: userHeight || null,
            user_body_type: normalizeBodyTypeValue(userBodyType),
            gender_style_preference: normalizeGenderStyleValue(genderStylePreference),
            country: country || null,
          }),
        });
        if (profileResp.ok) {
          const pr = await profileResp.json();
          if (pr?.user_id && pr.user_id !== userId) {
            setUserId(pr.user_id);
            AsyncStorage.setItem("dripmaxx:userId", pr.user_id).catch(() => {});
          }
        }
      } catch (e) {
        logWarn("profile sync failed", e);
      }
      const hasStyleTarget = stylePreferences.length > 0;
      const hasBodyProfile = Boolean(
        userHeight?.trim() || userBodyType || genderStylePreference
      );
      const unavailableMetrics: string[] = Array.isArray(data.unavailable_metrics)
        ? data.unavailable_metrics
        : [
            ...(!hasBodyProfile ? ["body_compatibility"] : []),
            ...(!hasStyleTarget ? ["style_match"] : []),
          ];
      // Compatibility guard for a production backend that has not deployed the
      // availability-aware formula yet. The server remains authoritative once
      // it includes unavailable_metrics in its response.
      const dripScore = Array.isArray(data.unavailable_metrics)
        ? data.drip_score
        : Number(
            (
              !hasStyleTarget && !hasBodyProfile
                ? 0.44 * data.breakdown.color_match +
                  0.34 * data.breakdown.fit_quality +
                  0.22 * data.breakdown.trend_score
                : !hasBodyProfile
                  ? 0.36 * data.breakdown.color_match +
                    0.27 * data.breakdown.fit_quality +
                    0.15 * data.breakdown.trend_score +
                    0.22 * data.breakdown.style_match
                  : !hasStyleTarget
                    ? 0.37 * data.breakdown.color_match +
                      0.27 * data.breakdown.fit_quality +
                      0.20 * data.breakdown.body_compatibility +
                      0.16 * data.breakdown.trend_score
                    : data.drip_score
            ).toFixed(1)
          );
      const categories = [
        { label: "Color Match", value: data.breakdown.color_match },
        { label: "Fit Quality", value: data.breakdown.fit_quality },
        { label: "Trend Score", value: data.breakdown.trend_score },
        ...(!unavailableMetrics.includes("body_compatibility")
          ? [{ label: "Body Compatibility", value: data.breakdown.body_compatibility }]
          : []),
        ...(!unavailableMetrics.includes("style_match")
          ? [{ label: "Style Match", value: data.breakdown.style_match }]
          : []),
      ];
      setResult({
        dripScore,
        outfitId: data.outfit_id || null,
        xpAwarded: data.xp_awarded || 0,
        categories,
        suggestions: data.suggestions,
        warnings: data.warnings || [],
        unavailableMetrics,
      });
      if (dripScore >= 7.5 && data.outfit_id) {
        setFeatureUsername(username || "");
        setShowProgressPopup(false);
        setShowFeatureForm(false);
        setFeatureConsent(false);
        setShowFeaturePrompt(true);
      }
      setAnalysisProgress(1);
      setBestOutfit(bestBeforeScan);
      fetchRewardsSummary(userId).then(setRewards);
      fetchProgressInsights(userId).then((insights) => {
        if (!insights) return;
        setProgressInsights(insights);
        if (dripScore < 7.5) setShowProgressPopup(true);
      });
      trackEvent(
        "score_viewed",
        { drip_score: dripScore, suggestion_count: data.suggestions?.length || 0 },
        userId
      );
    } catch (err: any) {
      const message = err?.message || "Try again in a moment.";
      setScanError(message);
      Alert.alert("Scan failed", message);
    } finally {
      setIsScoring(false);
    }
  };

  const handleRescan = () => {
    setImageUri(null);
    setBestOutfit(null);
    setResult(null);
    setSaved(false);
  };

  const handleSaveOutfit = () => {
    setSaved(true);
    trackEvent("outfit_saved", { dripScore: result?.dripScore }, userId);
    Alert.alert("Saved locally", "This outfit was saved for this session.");
  };

  const closeFeaturePrompt = () => {
    setShowFeaturePrompt(false);
    setShowFeatureForm(false);
  };

  const handleSubmitFeature = async () => {
    if (!result?.outfitId) return;
    if (!featureConsent) {
      Alert.alert("Permission required", "Please agree that DripMaxx may feature this outfit.");
      return;
    }
    setIsSubmittingFeature(true);
    try {
      const resp = await apiFetch("/v1/features/submissions", {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify({
          outfit_id: result.outfitId,
          feature_username: featureUsername,
          instagram_url: instagramUrl,
          tiktok_url: tiktokUrl,
          display_consent: true,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        throw new Error(body?.detail || "Could not submit this outfit.");
      }
      trackEvent("feature_submission_created", { outfit_id: result.outfitId }, userId);
      closeFeaturePrompt();
      Alert.alert("Submitted!", "Thanks — your outfit is ready for feature review.");
    } catch (err: any) {
      Alert.alert("Submission failed", err?.message || "Try again in a moment.");
    } finally {
      setIsSubmittingFeature(false);
    }
  };

  const handleShareResult = async () => {
    if (!result) return;
    try {
      await Share.share({
        message: `I scored ${result.dripScore.toFixed(1)}/10 on DripMaxx. Think your outfit can beat mine?`,
      });
      trackEvent("score_shared", { dripScore: result.dripScore }, userId);
    } catch (e) {
      logWarn("share score failed", e);
    }
  };

  const handleSubmitChallenge = async () => {
    if (!activeChallenge?.challenge || !result?.outfitId) {
      Alert.alert("No active challenge", "There is no active challenge for this outfit yet.");
      return;
    }
    if (!challengeConsent) {
      Alert.alert(
        "Consent required",
        "Agree that your submitted outfit and username may be displayed if selected."
      );
      return;
    }
    setIsSubmittingChallenge(true);
    try {
      const resp = await apiFetch("/v1/challenges/active/submissions", {
        method: "POST",
        headers: apiJsonHeaders(),
        body: JSON.stringify({
          outfit_id: result.outfitId,
          display_consent: challengeConsent,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`API ${resp.status}: ${text}`);
      }
      setChallengeSubmitted(true);
      fetchRewardsSummary(userId).then(setRewards);
      trackEvent("challenge_submitted", { challenge_id: activeChallenge.challenge.id }, userId);
      Alert.alert("Submitted", "Your outfit was submitted to today's challenge.");
    } catch (err: any) {
      Alert.alert("Challenge submission failed", err?.message || "Try again in a moment.");
    } finally {
      setIsSubmittingChallenge(false);
    }
  };

  const topCategories = result
    ? [...result.categories].sort((a, b) => b.value - a.value).slice(0, 3)
    : [];
  const improveTips = result?.suggestions.slice(0, 3) || [];
  const confidenceScore = result
    ? Math.max(1, Math.min(10, result.dripScore - result.warnings.length * 0.4))
    : 0;
  const colorValue = result?.categories.find((c) => c.label.includes("Color"))?.value || 0;
  const trendValue = result?.categories.find((c) => c.label.includes("Trend"))?.value || 0;
  const styleValue = result?.categories.find((c) => c.label.includes("Style"))?.value || 0;
  const styleMetricLabel = stylePreferences.length === 1
    ? `${stylePreferences[0]} Match`
    : stylePreferences.length > 1
      ? `Style Match (${stylePreferences.length})`
      : "Style (not selected)";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.stepLabel}>QUICK SCAN</Text>
          <Text style={styles.title}>Rate the whole fit.</Text>
          <Text style={styles.subtitle}>
            Your saved style profile is applied automatically—no setup needed.
          </Text>
          <View style={styles.guidelineCard}>
            <Text style={styles.guidelineTitle}>Best results</Text>
            <Text style={styles.guidelineItem}>• Stand centered with full body in frame.</Text>
            <Text style={styles.guidelineItem}>• Keep a simple, non-busy background.</Text>
            <Text style={styles.guidelineItem}>• Leave some space above head and below feet.</Text>
            <Text style={styles.guidelineItem}>• Keep the app open while your outfit is being rated.</Text>
          </View>
        </View>

        {imageUri ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Preview</Text>
            <RemoteImage uri={imageUri} style={styles.previewImage} />
            {scanError ? (
              <View style={styles.scanErrorCard}>
                <Text style={styles.scanErrorTitle}>Scan needs a better photo</Text>
                <Text style={styles.scanErrorText}>{scanError}</Text>
              </View>
            ) : null}
            <Text style={styles.scoringNote}>
              Keep the app open while we score your outfit. Backgrounding the app can interrupt the scan.
            </Text>
            {isScoring ? (
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <View>
                    <Text style={styles.progressEyebrow}>Analysis in progress</Text>
                    <Text style={styles.progressTitle}>
                      {ANALYSIS_STEPS[analysisStep]?.label}
                    </Text>
                  </View>
                  <Text style={styles.progressPercent}>
                    {Math.round(analysisProgress * 100)}%
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(8, Math.round(analysisProgress * 100))}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressDetail}>
                  {ANALYSIS_STEPS[analysisStep]?.detail}
                </Text>
                <View style={styles.stepList}>
                  {ANALYSIS_STEPS.map((step, index) => {
                    const completed = analysisProgress >= step.progress;
                    const active = index === analysisStep;

                    return (
                      <View key={step.label} style={styles.stepRow}>
                        <View
                          style={[
                            styles.stepDot,
                            completed && styles.stepDotComplete,
                            active && styles.stepDotActive,
                          ]}
                        >
                          {completed ? <Text style={styles.stepDotText}>OK</Text> : null}
                        </View>
                        <View style={styles.stepCopy}>
                          <Text
                            style={[
                              styles.stepLabelText,
                              completed && styles.stepLabelTextComplete,
                            ]}
                          >
                            {step.label}
                          </Text>
                          <Text style={styles.stepDetailText}>{step.detail}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
            <View style={styles.previewActions}>
              <Pressable style={styles.secondaryButton} onPress={handleStartScan}>
                <Text style={styles.secondaryButtonText}>Replace</Text>
              </Pressable>
              <Pressable
                style={styles.primaryButton}
                onPress={handleContinue}
                disabled={isScoring}
              >
                <Text style={styles.primaryButtonText}>
                  {isScoring ? "Scoring..." : "Continue"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Ready to scan</Text>
            <Text style={styles.previewHint}>
              Choose Camera or Gallery to add your outfit photo.
            </Text>
            <View style={styles.previewActions}>
              <Pressable style={styles.secondaryButton} onPress={handlePick}>
                <Text style={styles.secondaryButtonText}>Pick from Gallery</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={handleCapture}>
                <Text style={styles.primaryButtonText}>Open Camera</Text>
              </Pressable>
            </View>
          </View>
        )}

        {result ? (
          <View style={styles.resultCard}>
            {isScoring && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.lime} />
                <Text style={styles.loadingOverlayText}>
                  Finalizing your drip score...
                </Text>
              </View>
            )}
            <View style={styles.resultBody}>
              <View style={styles.resultTopRow}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultEyebrowRow}>
                    <Text style={styles.resultIcon}>DM</Text>
                    <Text style={styles.resultLabel}>Outfit Score</Text>
                  </View>
                  <View style={styles.scoreRevealRow}>
                    <AnimatedNumber
                      value={result.dripScore}
                      decimals={1}
                      suffix="/10"
                      style={styles.resultValue}
                    />
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeText}>{scoreTone(result.dripScore)}</Text>
                    </View>
                  </View>
                  <Text style={styles.xpEarnedText}>+{result.xpAwarded} XP earned</Text>
                </View>
                {imageUri ? (
                  <Pressable
                    style={styles.thumbnailBox}
                    onPress={() => setPreviewUrl(imageUri)}
                  >
                    <RemoteImage uri={imageUri} style={styles.thumbnailImage} />
                    <Text style={styles.thumbnailHint}>Tap to expand</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.scoreMeterCard}>
                <View style={styles.scoreMeterTop}>
                  <Text style={styles.scoreMeterLabel}>Level-up confidence</Text>
                  <Text style={styles.scoreMeterValue}>{clampPercent(confidenceScore)}%</Text>
                </View>
                <View style={styles.scoreMeterTrack}>
                  <View style={[styles.scoreMeterFill, { width: `${clampPercent(confidenceScore)}%` }]} />
                </View>
              </View>
              <View style={styles.visualStatsGrid}>
                {[
                  { label: "Color Harmony", value: colorValue },
                  { label: styleMetricLabel, value: styleValue },
                  { label: "Trend Relevance", value: trendValue },
                ].map((metric) => (
                  <View key={metric.label} style={styles.visualStatCard}>
                    <Text style={styles.visualStatValue}>{clampPercent(metric.value)}%</Text>
                    <Text style={styles.visualStatLabel}>{metric.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.breakdown}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Breakdown</Text>
                  <Text style={styles.sectionMeta}>tap photo to expand</Text>
                </View>
                {result.categories.map((c) => (
                  <View key={c.label} style={styles.breakdownRow}>
                    <View style={styles.breakdownLabelWrap}>
                      <View style={styles.breakdownIcon}>
                        <Text style={styles.breakdownIconText}>{categoryIcon(c.label)}</Text>
                      </View>
                      <Text style={styles.breakdownLabel}>{c.label}</Text>
                    </View>
                    <View style={styles.breakdownMeterWrap}>
                      <View style={styles.breakdownMeterTrack}>
                        <View style={[styles.breakdownMeterFill, { width: `${clampPercent(c.value)}%` }]} />
                      </View>
                      <Text style={styles.breakdownValue}>{c.value.toFixed(1)}</Text>
                    </View>
                  </View>
                ))}
              </View>
              {result.unavailableMetrics.length > 0 ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    Personalized {result.unavailableMetrics.includes("body_compatibility") ? "body compatibility" : ""}
                    {result.unavailableMetrics.length === 2 ? " and " : ""}
                    {result.unavailableMetrics.includes("style_match") ? "style match" : ""} were not scored because those profile choices were skipped.
                  </Text>
                </View>
              ) : null}
              {rewards ? (
                <View style={styles.rewardsCard}>
                  <View style={styles.rewardsTopRow}>
                    <Text style={styles.rewardsLabel}>Reward Progress</Text>
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
                </View>
              ) : null}
              <View style={styles.insightGrid}>
                <View style={styles.insightColumn}>
                  <Text style={styles.sectionTitle}>Strengths</Text>
                  {topCategories.map((item) => (
                    <View key={item.label} style={styles.insightRow}>
                      <Text style={styles.insightBullet}>+</Text>
                      <View style={styles.insightCopy}>
                        <Text style={styles.insightTitle}>{scoreTone(item.value)} {item.label.toLowerCase()}</Text>
                        <Text style={styles.insightText}>{item.value.toFixed(1)}/10 foundation to build on.</Text>
                      </View>
                    </View>
                  ))}
                </View>
                <View style={styles.insightColumn}>
                  <Text style={styles.sectionTitle}>Improve</Text>
                  {improveTips.map((tip, idx) => (
                    <View key={`${tip.title}-improve-${idx}`} style={styles.insightRow}>
                      <Text style={styles.insightBullet}>!</Text>
                      <View style={styles.insightCopy}>
                        <Text style={styles.insightTitle}>{tip.title}</Text>
                        <Text style={styles.insightText}>{tip.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.suggestions}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Style cards</Text>
                  <Text style={styles.sectionMeta}>{result.suggestions.length} tips</Text>
                </View>
                {result.suggestions.map((tip, idx) => (
                  <View key={`${tip.title}-${idx}`} style={styles.suggestionCard}>
                    <Text style={styles.suggestionTag}>{tip.type}</Text>
                    <Text style={styles.suggestionTitle}>{tip.title}</Text>
                    <Text style={styles.suggestionText}>{tip.description}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.warningBox}>
                {result.warnings.map((w) => (
                  <Text key={w} style={styles.warningText}>
                    • {w}
                  </Text>
                ))}
              </View>
              {activeChallenge?.challenge && result.outfitId ? (
                <View style={styles.challengeSubmitCard}>
                  <Text style={styles.challengeSubmitEyebrow}>Today's Challenge</Text>
                  <Text style={styles.challengeSubmitTitle}>{activeChallenge.challenge.title}</Text>
                  <Text style={styles.challengeSubmitReward}>
                    Enter for {activeChallenge.challenge.reward_scans} scans +{" "}
                    {activeChallenge.challenge.reward_xp} XP
                  </Text>
                  <Pressable
                    style={styles.consentRow}
                    onPress={() => setChallengeConsent((current) => !current)}
                  >
                    <View style={[styles.checkbox, challengeConsent && styles.checkboxChecked]}>
                      {challengeConsent ? <Text style={styles.checkboxText}>OK</Text> : null}
                    </View>
                    <Text style={styles.consentText}>
                      I agree my submitted outfit and username may be displayed if selected.
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.challengeSubmitButton,
                      (challengeSubmitted || isSubmittingChallenge) && styles.challengeSubmitButtonDisabled,
                    ]}
                    onPress={handleSubmitChallenge}
                    disabled={challengeSubmitted || isSubmittingChallenge}
                  >
                    <Text style={styles.challengeSubmitButtonText}>
                      {challengeSubmitted
                        ? "Submitted"
                        : isSubmittingChallenge
                          ? "Submitting..."
                          : "Submit to Today's Challenge"}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.challengeVoteLink} onPress={() => navigation.navigate("Challenge")}>
                    <Text style={styles.challengeVoteLinkText}>View entries and vote</Text>
                  </Pressable>
                </View>
              ) : null}
              {bestOutfit?.imageUrl ? (
                <View style={styles.compareCard}>
                  <Text style={styles.compareTitle}>Current vs Best Outfit</Text>
                  <Text style={styles.compareSubtitle}>
                    Compare this scan against your best previous rated outfit.
                  </Text>
                  <View style={styles.compareRow}>
                    <View style={styles.compareColumn}>
                      <Text style={styles.compareLabel}>Current</Text>
                      <Pressable
                        onPress={() => imageUri && setPreviewUrl(imageUri)}
                        style={styles.compareImageWrap}
                      >
                        <RemoteImage uri={imageUri} style={styles.compareImage} />
                      </Pressable>
                      <Text style={styles.compareScore}>{result.dripScore.toFixed(1)}/10</Text>
                    </View>
                    <View style={styles.compareColumn}>
                      <Text style={styles.compareLabel}>Best</Text>
                      <Pressable
                        onPress={() => setPreviewUrl(bestOutfit.imageUrl)}
                        style={styles.compareImageWrap}
                      >
                        <RemoteImage uri={bestOutfit.imageUrl} style={styles.compareImage} />
                      </Pressable>
                      <Text style={styles.compareScore}>
                        {bestOutfit.dripScore != null ? `${bestOutfit.dripScore.toFixed(1)}/10` : "--"}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
            <RankingsCard
              userId={userId}
              compact
              refreshTrigger={result?.dripScore}
            />
            <View style={styles.resultActions}>
              <Pressable style={styles.secondaryButton} onPress={handleRescan}>
                <Text style={styles.secondaryButtonText}>Check another outfit</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={handleShareResult}>
                <Text style={styles.secondaryButtonText}>Share</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryButton,
                  saved && { backgroundColor: colors.success },
                ]}
                onPress={handleSaveOutfit}
              >
                <Text style={styles.primaryButtonText}>
                  {saved ? "Saved" : "Save Outfit"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable style={styles.backButton} onPress={handleBackToStart}>
            <Text style={styles.backButtonText}>Back to Start</Text>
          </Pressable>

          <Pressable style={styles.scanButton} onPress={handleStartScan}>
            <Text style={styles.scanButtonText}>Take or upload a photo</Text>
          </Pressable>
        </View>
      </ScrollView>
      <View style={styles.tabDock}><AppTabBar active="scan" /></View>

      <Modal transparent visible={!!previewUrl} animationType="fade">
        <Pressable style={styles.previewOverlay} onPress={() => setPreviewUrl(null)}>
          <View style={styles.previewModal}>
            {previewUrl ? (
              <RemoteImage uri={previewUrl} style={styles.previewModalImage} />
            ) : null}
          </View>
        </Pressable>
      </Modal>
      <Modal
        transparent
        visible={showFeaturePrompt}
        animationType="fade"
        onRequestClose={closeFeaturePrompt}
      >
        <View style={styles.featureOverlay}>
          <View style={styles.featureCard}>
            <Text style={styles.featureStar}>🌟</Text>
            <Text style={styles.featureTitle}>Great outfit!</Text>
            <Text style={styles.featureBody}>Want to be featured on our Instagram?</Text>
            {showFeatureForm ? (
              <>
                <Text style={styles.featureHint}>These details are optional.</Text>
                <TextInput
                  style={styles.featureInput}
                  value={featureUsername}
                  onChangeText={setFeatureUsername}
                  placeholder="Username"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.featureInput}
                  value={instagramUrl}
                  onChangeText={setInstagramUrl}
                  placeholder="Instagram profile link"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <TextInput
                  style={styles.featureInput}
                  value={tiktokUrl}
                  onChangeText={setTiktokUrl}
                  placeholder="TikTok profile link"
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <Pressable
                  style={styles.featureConsentRow}
                  onPress={() => setFeatureConsent((value) => !value)}
                >
                  <View style={[styles.featureCheckbox, featureConsent && styles.featureCheckboxChecked]}>
                    <Text style={styles.featureCheckmark}>{featureConsent ? "✓" : ""}</Text>
                  </View>
                  <Text style={styles.featureConsentText}>
                    I agree that DripMaxx may feature this outfit and the details I provided.
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.featurePrimary, isSubmittingFeature && styles.disabledButton]}
                  onPress={handleSubmitFeature}
                  disabled={isSubmittingFeature}
                >
                  <Text style={styles.featurePrimaryText}>
                    {isSubmittingFeature ? "Submitting..." : "Submit for review"}
                  </Text>
                </Pressable>
                <Pressable style={styles.featureSecondary} onPress={closeFeaturePrompt}>
                  <Text style={styles.featureSecondaryText}>No thanks</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={styles.featurePrimary} onPress={() => setShowFeatureForm(true)}>
                  <Text style={styles.featurePrimaryText}>Yes, feature my outfit</Text>
                </Pressable>
                <Pressable style={styles.featureSecondary} onPress={closeFeaturePrompt}>
                  <Text style={styles.featureSecondaryText}>No thanks</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        transparent
        visible={showProgressPopup && !!progressInsights}
        animationType="fade"
        onRequestClose={() => setShowProgressPopup(false)}
      >
        <View style={styles.progressPopupOverlay}>
          <View style={styles.progressPopupCard}>
            <Text style={styles.progressPopupEyebrow}>YOUR DRIPMAXX PROGRESS</Text>
            <Text style={styles.progressPopupTitle}>
              You&apos;re dressing better than {progressInsights?.better_than_percent ?? 0}% of users in the app
            </Text>
            <View style={styles.progressPopupStats}>
              <View style={styles.progressPopupStat}>
                <Text style={styles.progressPopupValue}>{progressInsights?.outfits_scanned ?? 0}</Text>
                <Text style={styles.progressPopupLabel}>outfits scanned</Text>
              </View>
              <View style={styles.progressPopupStat}>
                <Text style={styles.progressPopupValue}>{progressInsights?.current_streak_days ?? 0}</Text>
                <Text style={styles.progressPopupLabel}>day streak</Text>
              </View>
              <View style={styles.progressPopupStat}>
                <Text style={styles.progressPopupValue}>
                  {(progressInsights?.average_score ?? 0).toFixed(1)}
                </Text>
                <Text style={styles.progressPopupLabel}>average score</Text>
              </View>
              <View style={styles.progressPopupStat}>
                <Text style={styles.progressPopupValue}>
                  {(progressInsights?.improvement_points ?? 0) >= 0 ? "+" : ""}
                  {(progressInsights?.improvement_points ?? 0).toFixed(1)}
                </Text>
                <Text style={styles.progressPopupLabel}>points since joining</Text>
              </View>
            </View>
            {!!visibleStyleProgress.length && (
              <View style={styles.styleProgressList}>
                <Text style={styles.styleProgressHeading}>Style progress</Text>
                {visibleStyleProgress.map((item) => (
                  <View key={item.style} style={styles.styleProgressRow}>
                    <View style={styles.styleProgressCopy}>
                      <Text style={styles.styleProgressName}>{item.style}</Text>
                      <Text style={styles.styleProgressScans}>
                        {item.scans} {item.scans === 1 ? "scan" : "scans"} · {item.average_score.toFixed(1)} avg
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.styleProgressDelta,
                        item.improvement_points < 0 && styles.styleProgressDeltaDown,
                      ]}
                    >
                      {item.improvement_points >= 0 ? "+" : ""}
                      {item.improvement_points.toFixed(1)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            <Pressable
              style={styles.progressPopupButton}
              onPress={() => setShowProgressPopup(false)}
            >
              <Text style={styles.progressPopupButtonText}>Keep leveling up</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 18,
    paddingBottom: 48,
  },
  stepLabel: {
    fontSize: 13,
    color: colors.lime,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  title: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  guidelineCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 4,
  },
  guidelineTitle: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
  },
  guidelineItem: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  previewCard: {
    marginVertical: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 16,
    backgroundColor: "#0B1224",
    gap: 14,
  },
  previewLabel: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  previewHint: {
    color: "#6B7280",
    fontSize: 14,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#0F172A",
  },
  previewActions: {
    flexDirection: "row",
    gap: 10,
  },
  progressCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#07111F",
    padding: 14,
    gap: 12,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  progressEyebrow: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  progressTitle: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  progressPercent: {
    color: colors.cream,
    fontSize: 18,
    fontWeight: "800",
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#111827",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.lime,
  },
  progressDetail: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 18,
  },
  stepList: {
    gap: 10,
  },
  stepRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepDotActive: {
    borderColor: colors.lime,
    backgroundColor: colors.surfaceSoft,
  },
  stepDotComplete: {
    borderColor: colors.lime,
    backgroundColor: colors.lime,
  },
  stepDotText: {
    color: colors.limeInk,
    fontSize: 11,
    fontWeight: "900",
  },
  stepCopy: {
    flex: 1,
    gap: 2,
  },
  stepLabelText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
  },
  stepLabelTextComplete: {
    color: colors.cream,
  },
  stepDetailText: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
  },
  scoringNote: {
    color: "#FCD34D",
    fontSize: 13,
    lineHeight: 18,
  },
  tabDock: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, backgroundColor: "#020617" },
  featureOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.86)",
    justifyContent: "center",
    padding: 24,
  },
  featureCard: {
    backgroundColor: "#0F172A",
    borderColor: "#F59E0B",
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    gap: 12,
  },
  featureStar: { fontSize: 34, textAlign: "center" },
  featureTitle: { color: "#F8FAFC", fontSize: 24, fontWeight: "900", textAlign: "center" },
  featureBody: { color: "#CBD5E1", fontSize: 16, lineHeight: 22, textAlign: "center" },
  featureHint: { color: "#94A3B8", fontSize: 12, textAlign: "center" },
  featureInput: {
    color: "#F8FAFC",
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  featureConsentRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 4 },
  featureCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#64748B",
    alignItems: "center",
    justifyContent: "center",
  },
  featureCheckboxChecked: { backgroundColor: colors.lime, borderColor: colors.lime },
  featureCheckmark: { color: colors.limeInk, fontWeight: "900" },
  featureConsentText: { color: "#CBD5E1", fontSize: 13, lineHeight: 18, flex: 1 },
  featurePrimary: {
    backgroundColor: colors.lime,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  featurePrimaryText: { color: colors.limeInk, fontSize: 15, fontWeight: "900" },
  featureSecondary: { paddingVertical: 10, alignItems: "center" },
  featureSecondaryText: { color: "#CBD5E1", fontSize: 14, fontWeight: "700" },
  disabledButton: { opacity: 0.55 },
  scanErrorCard: {
    borderWidth: 1,
    borderColor: "#F97316",
    backgroundColor: "#431407",
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  scanErrorTitle: {
    color: "#FDBA74",
    fontSize: 13,
    fontWeight: "900",
  },
  scanErrorText: {
    color: "#FFEDD5",
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: colors.limeInk,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#374151",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "600",
  },
  resultCard: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 16,
    backgroundColor: "#0B1224",
    gap: 12,
    position: "relative",
  },
  resultBody: {
    gap: 12,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0B1224AA",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    zIndex: 2,
    gap: 10,
  },
  loadingOverlayText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
  resultHeader: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
    flex: 1,
  },
  resultTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  resultEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resultIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.lime,
    color: colors.limeInk,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
  },
  resultLabel: {
    color: colors.cream,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  scoreRevealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  resultValue: {
    color: "#F9FAFB",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 0,
  },
  scoreBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  scoreBadgeText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "900",
  },
  xpEarnedText: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  scoreMeterCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 10,
  },
  scoreMeterTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreMeterLabel: {
    color: "#D1FAE5",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scoreMeterValue: {
    color: colors.lime,
    fontSize: 16,
    fontWeight: "900",
  },
  scoreMeterTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
  },
  scoreMeterFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.lime,
  },
  visualStatsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  visualStatCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 12,
    minHeight: 76,
    justifyContent: "space-between",
  },
  visualStatValue: {
    color: "#F9FAFB",
    fontSize: 18,
    fontWeight: "900",
  },
  visualStatLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    lineHeight: 15,
  },
  thumbnailBox: {
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 6,
    alignItems: "center",
    width: 110,
  },
  thumbnailImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 8,
    backgroundColor: "#111827",
  },
  thumbnailHint: {
    marginTop: 6,
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  breakdown: {
    gap: 10,
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    backgroundColor: "#07111F",
    padding: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    color: "#F9FAFB",
    fontSize: 15,
    fontWeight: "900",
  },
  sectionMeta: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  rewardsCard: {
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#07111F",
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
    color: colors.cream,
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
    backgroundColor: colors.lime,
  },
  rewardsMeta: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
  },
  breakdownLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 0.9,
  },
  breakdownIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#263449",
    alignItems: "center",
    justifyContent: "center",
  },
  breakdownIconText: {
    color: colors.lime,
    fontSize: 11,
    fontWeight: "900",
  },
  breakdownLabel: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },
  breakdownMeterWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  breakdownMeterTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  breakdownMeterFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#38BDF8",
  },
  breakdownValue: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: "900",
    width: 34,
    textAlign: "right",
  },
  insightGrid: {
    gap: 10,
  },
  insightColumn: {
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 14,
    backgroundColor: "#0F172A",
    padding: 12,
    gap: 10,
  },
  insightRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  insightBullet: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#172033",
    color: "#C4B5FD",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 14,
    fontWeight: "900",
    overflow: "hidden",
  },
  insightCopy: {
    flex: 1,
    gap: 2,
  },
  insightTitle: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "900",
  },
  insightText: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 17,
  },
  suggestions: {
    gap: 10,
  },
  suggestionCard: {
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#0F172A",
    gap: 6,
  },
  suggestionTag: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "700",
  },
  suggestionTitle: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "700",
  },
  suggestionText: {
    color: "#E5E7EB",
    fontSize: 14,
    lineHeight: 20,
  },
  warningBox: {
    borderWidth: 1,
    borderColor: "#FCD34D33",
    backgroundColor: "#F59E0B22",
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  warningText: {
    color: "#FCD34D",
    fontSize: 13,
    lineHeight: 18,
  },
  challengeSubmitCard: {
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#07111F",
    gap: 8,
  },
  challengeSubmitEyebrow: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  challengeSubmitTitle: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "800",
  },
  challengeSubmitReward: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#4B5563",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  checkboxText: {
    color: colors.limeInk,
    fontSize: 10,
    fontWeight: "900",
  },
  consentText: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 18,
  },
  challengeSubmitButton: {
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  challengeSubmitButtonDisabled: {
    opacity: 0.65,
  },
  challengeSubmitButtonText: {
    color: colors.limeInk,
    fontSize: 14,
    fontWeight: "800",
  },
  challengeVoteLink: {
    alignItems: "center",
    paddingVertical: 4,
  },
  challengeVoteLinkText: {
    color: "#A5B4FC",
    fontSize: 13,
    fontWeight: "800",
  },
  compareCard: {
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#0F172A",
    gap: 10,
  },
  compareTitle: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "700",
  },
  compareSubtitle: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  compareRow: {
    flexDirection: "row",
    gap: 12,
  },
  compareColumn: {
    flex: 1,
    gap: 8,
  },
  compareLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  compareImageWrap: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#111827",
  },
  compareImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: "#111827",
  },
  compareScore: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
  },
  resultActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#374151",
  },
  backButtonText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "500",
  },
  scanButton: {
    flex: 1,
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonText: {
    color: colors.limeInk,
    fontSize: 15,
    fontWeight: "700",
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.9)",
    justifyContent: "center",
    alignItems: "center",
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
  previewModalImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: "#111827",
  },
  progressPopupOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.88)",
    justifyContent: "center",
    padding: 24,
  },
  progressPopupCard: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#C7FF4A66",
    backgroundColor: "#0B1224",
    padding: 20,
    gap: 16,
  },
  progressPopupEyebrow: { color: colors.lime, fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  progressPopupTitle: { color: "#F8FAFC", fontSize: 22, lineHeight: 29, fontWeight: "900" },
  progressPopupStats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  progressPopupStat: {
    width: "47%",
    borderRadius: 14,
    backgroundColor: "#111827",
    padding: 12,
  },
  progressPopupValue: { color: "#F8FAFC", fontSize: 22, fontWeight: "900" },
  progressPopupLabel: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  styleProgressList: { gap: 8 },
  styleProgressHeading: { color: "#CBD5E1", fontSize: 13, fontWeight: "800", textTransform: "uppercase" },
  styleProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
    paddingVertical: 7,
  },
  styleProgressCopy: { flex: 1 },
  styleProgressName: { color: "#F8FAFC", fontSize: 14, fontWeight: "800", textTransform: "capitalize" },
  styleProgressScans: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  styleProgressDelta: { color: colors.lime, fontSize: 16, fontWeight: "900" },
  styleProgressDeltaDown: { color: "#F59E0B" },
  progressPopupButton: {
    backgroundColor: colors.lime,
    borderRadius: 999,
    alignItems: "center",
    paddingVertical: 13,
  },
  progressPopupButtonText: { color: colors.limeInk, fontSize: 14, fontWeight: "900" },
});
