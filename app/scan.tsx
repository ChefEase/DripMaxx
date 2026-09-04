import React, { useEffect, useRef, useState } from "react";
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
  Animated,
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
const AI_CONSENT_KEY = "dripmaxx:replicateAiConsent:v1";

type EvolutionRecommendation = {
  id: string;
  title: string;
  type: string;
  description: string;
  current_state?: string | null;
  recommended_change?: string | null;
  reason?: string | null;
  importance: "high" | "medium" | "low";
  target_state?: string | null;
  impact: number;
};

type EvolutionRevision = {
  revision_number: number;
  previous_score: number;
  current_score: number;
  score_change: number;
  completed_count: number;
  total_recommendations: number;
  recommendations: { id: string; status: "completed" | "partial" | "remaining" | "regressed"; confidence: number; evidence: string }[];
  new_issues: string[];
  summary: string;
  confidence: number;
};

export type EvolutionSession = {
  session_id: string;
  original_outfit_id: string;
  original_image_url?: string | null;
  original_score: number;
  current_score: number;
  potential_score: number;
  target_image_url?: string | null;
  target_generation_status: "pending" | "queued" | "generating" | "complete" | "failed";
  target_generation_error?: string | null;
  recommendations: EvolutionRecommendation[];
  revisions: EvolutionRevision[];
  latest_revision?: EvolutionRevision | null;
};

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

export default function ScanStubScreen({ route }: { route?: { params?: { sessionId?: string } } }) {
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
    communityFeedEnabled,
    privacyOnboardingCompleted,
  } = useStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [evolution, setEvolution] = useState<EvolutionSession | null>(null);
  const requestedSessionId = route?.params?.sessionId;
  const upgradeOnly = Boolean(requestedSessionId);
  const [isEvolutionLoading, setIsEvolutionLoading] = useState(upgradeOnly);
  const [revisionMode, setRevisionMode] = useState(upgradeOnly);
  // Legacy inline journey carousel is intentionally disabled; saved journeys now
  // live on their own selection screen so new scans remain visually distinct.
  const savedEvolutions: EvolutionSession[] = [];
  const [showTargetLook, setShowTargetLook] = useState(false);
  const [showEvolutionReveal, setShowEvolutionReveal] = useState(false);
  const revealScale = useRef(new Animated.Value(0.92)).current;
  const targetOpacity = useRef(new Animated.Value(0)).current;
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
  const [aiConsentGranted, setAiConsentGranted] = useState(false);
  const [aiConsentHydrated, setAiConsentHydrated] = useState(false);
  const [showAiConsent, setShowAiConsent] = useState(false);
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
        evolution: EvolutionSession | null;
      }
  >(null);
  useEffect(() => {
    if (!userId) {
      setAiConsentGranted(false);
      setAiConsentHydrated(true);
      return;
    }
    AsyncStorage.getItem(`${AI_CONSENT_KEY}:${userId}`).then((value) => {
      const granted = value === "granted";
      setAiConsentGranted(granted);
      setAiConsentHydrated(true);
      if (!granted) setShowAiConsent(true);
    });
  }, [userId]);
  useEffect(() => {
    if (!requestedSessionId) return;
    let mounted = true;
    setIsEvolutionLoading(true);
    setScanError(null);
    void (async () => {
      try {
        const response = await apiFetch(`/v1/outfits/evolution/${encodeURIComponent(requestedSessionId)}`);
        if (!response.ok) throw new Error("Saved outfit could not be loaded.");
        const savedEvolution: EvolutionSession = await response.json();
        if (mounted) {
          setEvolution(savedEvolution);
          setRevisionMode(true);
        }
      } catch (error) {
        logWarn("evolution load failed", error);
        if (mounted) setScanError("This saved outfit could not be loaded. Return to your saved outfits and try again.");
      } finally {
        if (mounted) setIsEvolutionLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [requestedSessionId]);

  useEffect(() => {
    if (!showEvolutionReveal) return;
    revealScale.setValue(0.92);
    Animated.spring(revealScale, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
    const timeout = setTimeout(() => setShowEvolutionReveal(false), 4800);
    return () => clearTimeout(timeout);
  }, [revealScale, showEvolutionReveal]);

  useEffect(() => {
    if (!evolution?.target_image_url) return;
    targetOpacity.setValue(0);
    Animated.timing(targetOpacity, { toValue: 1, duration: 900, useNativeDriver: true }).start();
  }, [evolution?.target_image_url, targetOpacity]);

  useEffect(() => {
    if (!evolution?.session_id || evolution.target_image_url || evolution.target_generation_status === "failed") return;
    const interval = setInterval(async () => {
      try {
        const response = await apiFetch(`/v1/outfits/evolution/${encodeURIComponent(evolution.session_id)}`);
        if (!response.ok) return;
        const updated: EvolutionSession = await response.json();
        if (updated.target_image_url) {
          targetOpacity.setValue(0);
          setEvolution(updated);
          setResult((current) => current ? { ...current, evolution: updated } : current);
          Animated.timing(targetOpacity, { toValue: 1, duration: 900, useNativeDriver: true }).start();
        } else if (updated.target_generation_status === "failed") {
          setEvolution(updated);
        }
      } catch (error) {
        logWarn("target look polling failed", error);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [evolution?.session_id, evolution?.target_image_url, evolution?.target_generation_status, targetOpacity]);

  const retryTargetImage = async () => {
    if (!evolution) return;
    try {
      const response = await apiFetch(`/v1/outfits/evolution/${encodeURIComponent(evolution.session_id)}/target`, { method: "POST" });
      if (response.ok) setEvolution(await response.json());
    } catch (error) {
      logWarn("target look retry failed", error);
    }
  };
  useEffect(() => {
    if (!privacyOnboardingCompleted || communityFeedEnabled !== true) {
      setActiveChallenge(null);
      return;
    }
    fetchActiveChallenge().then(setActiveChallenge);
  }, [communityFeedEnabled, privacyOnboardingCompleted]);

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
    if (!aiConsentGranted) {
      setShowAiConsent(true);
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
      if (revisionMode && evolution?.session_id) {
        form.append("evolution_session_id", evolution.session_id);
      }
      form.append("ai_processing_consent", "true");

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
        evolution: data.evolution || null,
      });
      if (data.evolution) {
        setEvolution(data.evolution);
        if (data.evolution.latest_revision) setShowEvolutionReveal(true);
      }
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
    if (upgradeOnly) {
      navigation.navigate("OutfitEvolutions");
      return;
    }
    setImageUri(null);
    setBestOutfit(null);
    setResult(null);
    setSaved(false);
    setEvolution(null);
    setRevisionMode(false);
  };

  const handleImproveOutfit = () => {
    if (!evolution) return;
    navigation.navigate("UpgradeScan", { sessionId: evolution.session_id });
  };

  const pauseEvolution = () => {
    navigation.navigate("Scan");
  };

  const resumeEvolution = (session: EvolutionSession) => {
    navigation.navigate("UpgradeScan", { sessionId: session.session_id });
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
  const latestEvolutionRevision = evolution?.latest_revision || null;
  const recommendationStatus = new Map(
    (latestEvolutionRevision?.recommendations || []).map((item) => [item.id, item])
  );
  const activeRecommendations = evolution?.recommendations.filter(
    (item) => recommendationStatus.get(item.id)?.status !== "completed"
  ) || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.stepLabel}>{revisionMode ? "UPGRADE SCAN" : "NEW OUTFIT SCAN"}</Text>
          <Text style={styles.title}>{revisionMode ? "Show us what changed." : "Rate the whole fit."}</Text>
          <Text style={styles.subtitle}>
            {revisionMode
              ? "We'll compare this photo with the original outfit, not treat it like a new look."
              : "Your saved style profile is applied automatically—no setup needed."}
          </Text>
          {upgradeOnly && isEvolutionLoading ? (
            <View style={styles.savedJourneyStateCard}>
              <ActivityIndicator color={colors.lime} />
              <Text style={styles.savedPlanItemTitle}>Loading your saved upgrade plan…</Text>
            </View>
          ) : null}
          {upgradeOnly && !isEvolutionLoading && !evolution && scanError ? (
            <View style={styles.savedJourneyStateCard}>
              <Text style={styles.savedPlanItemTitle}>We couldn’t open this outfit</Text>
              <Text style={styles.savedPlanItemText}>{scanError}</Text>
              <Pressable onPress={() => navigation.navigate("OutfitEvolutions")}>
                <Text style={styles.targetRetryText}>Back to saved outfits</Text>
              </Pressable>
            </View>
          ) : null}
          {revisionMode && evolution ? (
            <View style={styles.evolutionModeBanner}>
              <Text style={styles.evolutionModeTitle}>Continuing a saved outfit</Text>
              <Text style={styles.evolutionModeText}>
                Current {evolution.current_score.toFixed(1)} · Potential {evolution.potential_score.toFixed(1)} · Change any upgrades you want.
              </Text>
              <Pressable onPress={pauseEvolution} style={styles.leaveEvolutionButton}>
                <Text style={styles.leaveEvolutionText}>Rate a different outfit</Text>
              </Pressable>
            </View>
          ) : null}
          {revisionMode && evolution && !result ? (
            <View style={styles.savedPlanCard}>
              <View style={styles.savedPlanHeader}>
                <View>
                  <Text style={styles.savedPlanEyebrow}>YOUR SAVED UPGRADE PLAN</Text>
                  <Text style={styles.savedPlanTitle}>Target potential</Text>
                </View>
                <Text style={styles.savedPlanPotential}>{evolution.potential_score.toFixed(1)}<Text style={styles.savedPlanOutOf}>/10</Text></Text>
              </View>
              <Text style={styles.savedPlanProgress}>
                {latestEvolutionRevision?.completed_count || 0}/{evolution.recommendations.length} complete · {activeRecommendations.length} remaining
              </Text>
              {evolution.target_image_url ? (
                <View style={styles.savedTargetWrap}>
                  <RemoteImage uri={evolution.target_image_url} style={styles.savedTargetImage} />
                  <View style={styles.savedTargetBadge}><Text style={styles.savedTargetBadgeText}>TARGET LOOK</Text></View>
                </View>
              ) : evolution.target_generation_status === "failed" ? (
                <View style={styles.savedTargetStatus}>
                  <Text style={styles.savedPlanItemTitle}>Target picture unavailable</Text>
                  <Text style={styles.savedPlanItemText}>Your written upgrade plan is still saved below.</Text>
                  <Pressable onPress={retryTargetImage}><Text style={styles.targetRetryText}>Generate target picture</Text></Pressable>
                </View>
              ) : (
                <View style={styles.savedTargetStatus}>
                  <ActivityIndicator color={colors.lime} />
                  <Text style={styles.savedPlanItemText}>Generating your saved target look…</Text>
                </View>
              )}
              <Text style={styles.savedPlanSectionTitle}>
                {activeRecommendations.length ? "Improvements still to try" : "All original improvements completed"}
              </Text>
              <View style={styles.savedPlanList}>
                {activeRecommendations.map((upgrade, index) => {
                  const state = recommendationStatus.get(upgrade.id);
                  return (
                    <View key={upgrade.id} style={styles.savedPlanItem}>
                      <View style={styles.savedPlanNumber}><Text style={styles.savedPlanNumberText}>{index + 1}</Text></View>
                      <View style={styles.upgradeCopy}>
                        <View style={styles.upgradeTitleRow}>
                          <Text style={styles.savedPlanItemTitle}>{upgrade.title}</Text>
                          <Text style={styles.importanceTag}>{upgrade.importance}</Text>
                        </View>
                        <Text style={styles.savedPlanItemText}>{upgrade.recommended_change || upgrade.description}</Text>
                        {state?.status === "partial" ? <Text style={styles.savedPlanPartial}>Partly completed — keep refining this one.</Text> : null}
                        {state?.status === "regressed" && state.evidence ? <Text style={styles.savedPlanRegressed}>{state.evidence}</Text> : null}
                      </View>
                    </View>
                  );
                })}
              </View>
              <Text style={styles.savedPlanNote}>You do not need to copy everything. The target is a visual guide for this specific outfit.</Text>
            </View>
          ) : null}
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

        {false ? (
          <View style={styles.savedEvolutionSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Continue an outfit</Text>
              <Text style={styles.sectionMeta}>{savedEvolutions.length} saved</Text>
            </View>
            <Text style={styles.previewHint}>Your upgrade journeys stay saved. Return whenever you’re ready.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedEvolutionRow}>
              {savedEvolutions.map((session) => (
                <Pressable key={session.session_id} style={styles.savedEvolutionCard} onPress={() => resumeEvolution(session)}>
                  {session.original_image_url ? <RemoteImage uri={session.original_image_url} style={styles.savedEvolutionImage} /> : null}
                  <Text style={styles.savedEvolutionScore}>{session.current_score.toFixed(1)} / {session.potential_score.toFixed(1)}</Text>
                  <Text style={styles.savedEvolutionMeta}>{session.revisions.length} revision{session.revisions.length === 1 ? "" : "s"}</Text>
                  <Text style={styles.savedEvolutionAction}>Continue →</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!revisionMode && !imageUri && !result ? (
          <Pressable style={styles.continueJourneyCard} onPress={() => navigation.navigate("OutfitEvolutions")}>
            <View style={styles.continueJourneyIcon}><Text style={styles.continueJourneyIconText}>↻</Text></View>
            <View style={styles.continueJourneyCopy}>
              <Text style={[styles.continueJourneyEyebrow, { color: "#C7FF4A" }]}>SEPARATE UPGRADE MODE</Text>
              <Text style={[styles.continueJourneyTitle, { color: "#FFFFFF" }]}>Rerate an already scanned outfit</Text>
              <Text style={[styles.continueJourneyText, { color: "#FFFFFF" }]}>Choose a saved outfit and continue only its unfinished improvements.</Text>
            </View>
            <Text style={[styles.continueJourneyArrow, { color: "#FFFFFF" }]}>›</Text>
          </Pressable>
        ) : null}

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
              {evolution ? (
                <View style={styles.evolutionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <View>
                      <Text style={styles.evolutionEyebrow}>OUTFIT EVOLUTION</Text>
                      <Text style={styles.evolutionTitle}>
                        {latestEvolutionRevision
                          ? `${latestEvolutionRevision.completed_count}/${latestEvolutionRevision.total_recommendations} upgrades complete`
                          : `Potential ${evolution.potential_score.toFixed(1)}/10`}
                      </Text>
                    </View>
                    {latestEvolutionRevision ? (
                      <Text style={latestEvolutionRevision.score_change >= 0 ? styles.deltaPositive : styles.deltaNegative}>
                        {latestEvolutionRevision.score_change >= 0 ? "+" : ""}{latestEvolutionRevision.score_change.toFixed(1)}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.evolutionScoreRow}>
                    <View style={styles.evolutionScoreCell}><Text style={styles.evolutionScoreValue}>{evolution.original_score.toFixed(1)}</Text><Text style={styles.evolutionScoreLabel}>Original</Text></View>
                    <Text style={styles.evolutionArrow}>→</Text>
                    <View style={styles.evolutionScoreCell}><Text style={styles.evolutionScoreValue}>{evolution.current_score.toFixed(1)}</Text><Text style={styles.evolutionScoreLabel}>Current</Text></View>
                    <Text style={styles.evolutionArrow}>→</Text>
                    <View style={styles.evolutionScoreCell}><Text style={[styles.evolutionScoreValue, { color: colors.lime }]}>{evolution.potential_score.toFixed(1)}</Text><Text style={styles.evolutionScoreLabel}>Potential</Text></View>
                  </View>
                  <View style={styles.evolutionTrack}>
                    <View style={[styles.evolutionFill, { width: `${Math.min(100, Math.max(0, (evolution.current_score / evolution.potential_score) * 100))}%` }]} />
                  </View>
                  {evolution.revisions.length ? (
                    <View style={styles.revisionHistory}>
                      <View style={styles.revisionHistoryRow}><Text style={styles.revisionHistoryLabel}>Original</Text><Text style={styles.revisionHistoryScore}>{evolution.original_score.toFixed(1)}</Text></View>
                      {evolution.revisions.slice(-4).map((revision) => (
                        <View key={revision.revision_number} style={styles.revisionHistoryRow}>
                          <Text style={styles.revisionHistoryLabel}>Revision {revision.revision_number}</Text>
                          <Text style={styles.revisionHistoryScore}>{revision.current_score.toFixed(1)} {revision.score_change > 0 ? "↑" : revision.score_change < 0 ? "↓" : "—"}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Text style={styles.evolutionSummary}>
                    {latestEvolutionRevision?.summary || "You don't have to do everything. Pick the changes that work for you."}
                  </Text>
                  <View style={styles.upgradeList}>
                    {activeRecommendations.map((upgrade) => {
                      const state = recommendationStatus.get(upgrade.id);
                      const completed = state?.status === "completed";
                      const partial = state?.status === "partial";
                      return (
                        <View key={upgrade.id} style={styles.upgradeRow}>
                          <View style={[styles.upgradeCheck, completed && styles.upgradeCheckDone, partial && styles.upgradeCheckPartial]}>
                            <Text style={styles.upgradeCheckText}>{completed ? "✓" : partial ? "½" : ""}</Text>
                          </View>
                          <View style={styles.upgradeCopy}>
                            <View style={styles.upgradeTitleRow}>
                              <Text style={styles.upgradeTitle}>{upgrade.title}</Text>
                              <Text style={styles.importanceTag}>{upgrade.importance}</Text>
                            </View>
                            <Text style={styles.upgradeText}>{upgrade.recommended_change || upgrade.description}</Text>
                            {state?.evidence ? <Text style={styles.upgradeEvidence}>{state.evidence}</Text> : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  {evolution.target_image_url ? (
                    <Animated.View style={[styles.targetPreviewCard, { opacity: targetOpacity }]}>
                      <Text style={styles.evolutionEyebrow}>YOUR POTENTIAL LOOK</Text>
                      <RemoteImage uri={evolution.target_image_url} style={styles.targetPreviewImage} />
                      <Text style={styles.evolutionSummary}>A visual reference—use any changes that feel right for you.</Text>
                    </Animated.View>
                  ) : evolution.target_generation_status === "failed" ? (
                    <View style={styles.targetGeneratingCard}>
                      <Text style={styles.upgradeTitle}>Target image unavailable</Text>
                      <Text style={styles.upgradeText}>Your score and recommendations are ready. You can retry the visual separately.</Text>
                      <Pressable onPress={retryTargetImage}><Text style={styles.targetRetryText}>Try image again</Text></Pressable>
                    </View>
                  ) : (
                    <View style={styles.targetGeneratingCard}>
                      <ActivityIndicator color={colors.lime} />
                      <View style={styles.upgradeCopy}><Text style={styles.upgradeTitle}>Generating your potential look…</Text><Text style={styles.upgradeText}>Your score is ready. This image will appear here when finished.</Text></View>
                    </View>
                  )}
                  <View style={styles.previewActions}>
                    <Pressable style={styles.secondaryButton} onPress={() => setShowTargetLook(true)}><Text style={styles.secondaryButtonText}>See Target Look</Text></Pressable>
                    <Pressable style={styles.primaryButton} onPress={handleImproveOutfit}><Text style={styles.primaryButtonText}>{latestEvolutionRevision ? "Keep Improving" : "Improve This Outfit"}</Text></Pressable>
                  </View>
                </View>
              ) : null}
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
                  <Text style={styles.sectionTitle}>What worked</Text>
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

      <Modal transparent visible={aiConsentHydrated && showAiConsent} animationType="fade" onRequestClose={() => setShowAiConsent(false)}>
        <View style={styles.featureOverlay}>
          <View style={styles.featureCard}>
            <Text style={styles.featureTitle}>AI Outfit Analysis</Text>
            <Text style={styles.featureBody}>
              DripMaxx uses third-party AI services to analyze your outfit photo and provide ratings and recommendations.
            </Text>
            <Text style={styles.aiConsentDetail}>
              Your photo—which may include your face—will be sent to Replicate, a third-party AI service, for processing. By continuing, you allow DripMaxx to send your photo and selected style preferences to Replicate for outfit analysis, recommendations, and Target Look generation. DripMaxx does not perform facial recognition, identify you, or create face embeddings.
            </Text>
            <Pressable onPress={() => navigation.navigate("Legal", { doc: "privacy" })}>
              <Text style={styles.targetRetryText}>Read the Privacy Policy</Text>
            </Pressable>
            <Pressable
              style={styles.featurePrimary}
              onPress={() => {
                setAiConsentGranted(true);
                setShowAiConsent(false);
                if (userId) AsyncStorage.setItem(`${AI_CONSENT_KEY}:${userId}`, "granted").catch(() => {});
              }}
            >
              <Text style={styles.featurePrimaryText}>Continue</Text>
            </Pressable>
            <Pressable style={styles.featureSecondary} onPress={() => setShowAiConsent(false)}>
              <Text style={styles.featureSecondaryText}>Cancel</Text>
            </Pressable>
            <Text style={styles.featureHint}>No photo is uploaded or sent to Replicate if you choose Not now.</Text>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showTargetLook} animationType="slide" onRequestClose={() => setShowTargetLook(false)}>
        <View style={styles.featureOverlay}>
          <View style={styles.targetCard}>
            <Text style={styles.evolutionEyebrow}>DRIPMAXX TARGET</Text>
            <Text style={styles.featureTitle}>Your upgrade plan</Text>
            {evolution?.target_image_url ? (
              <RemoteImage uri={evolution.target_image_url} style={styles.targetImage} />
            ) : evolution?.target_generation_status === "failed" ? (
              <View style={styles.targetModalStatus}><Text style={styles.upgradeTitle}>View recommendations</Text><Text style={styles.upgradeText}>The target image could not be generated, but your complete upgrade plan is below.</Text></View>
            ) : evolution?.original_image_url ? (
              <View style={styles.targetModalStatus}><ActivityIndicator color={colors.lime} /><Text style={styles.upgradeTitle}>Generating your potential look…</Text><Text style={styles.upgradeText}>You can close this and keep using your score while it finishes.</Text></View>
            ) : null}
            <Text style={styles.evolutionSummary}>Use these targets as a visual checklist—not a requirement. Apply any changes that fit you.</Text>
            <ScrollView style={styles.targetList}>
              {evolution?.recommendations.map((upgrade) => (
                <View key={`target-${upgrade.id}`} style={styles.targetRow}>
                  <Text style={styles.targetNumber}>✓</Text>
                  <View style={styles.upgradeCopy}>
                    <Text style={styles.upgradeTitle}>{upgrade.title}</Text>
                    <Text style={styles.upgradeText}>{upgrade.target_state || upgrade.recommended_change || upgrade.description}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.featurePrimary} onPress={() => setShowTargetLook(false)}><Text style={styles.featurePrimaryText}>Got it</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showEvolutionReveal} animationType="fade" onRequestClose={() => setShowEvolutionReveal(false)}>
        <Pressable style={styles.revealOverlay} onPress={() => setShowEvolutionReveal(false)}>
          <Animated.View style={[styles.revealCard, { transform: [{ scale: revealScale }] }]}>
            <Text style={styles.revealIcon}>{latestEvolutionRevision?.completed_count === latestEvolutionRevision?.total_recommendations ? "🔥" : latestEvolutionRevision && latestEvolutionRevision.score_change > 0.2 ? "✓" : "↗"}</Text>
            <Text style={styles.evolutionEyebrow}>
              {latestEvolutionRevision?.completed_count === latestEvolutionRevision?.total_recommendations
                ? "OUTFIT EVOLVED"
                : latestEvolutionRevision && latestEvolutionRevision.score_change > 0.2
                  ? "OUTFIT UPGRADED"
                  : latestEvolutionRevision && latestEvolutionRevision.score_change < -0.2
                    ? "KEEP BUILDING"
                    : "NO MAJOR CHANGE"}
            </Text>
            {latestEvolutionRevision ? (
              <>
                <View style={styles.revealScoreRow}>
                  <Text style={styles.revealOldScore}>{latestEvolutionRevision.previous_score.toFixed(1)}</Text>
                  <Text style={styles.evolutionArrow}>→</Text>
                  <AnimatedNumber fromValue={latestEvolutionRevision.previous_score} value={latestEvolutionRevision.current_score} duration={1600} decimals={1} style={styles.revealNewScore} />
                </View>
                <Text style={latestEvolutionRevision.score_change >= 0 ? styles.deltaPositive : styles.deltaNegative}>
                  {latestEvolutionRevision.score_change >= 0 ? "+" : ""}{latestEvolutionRevision.score_change.toFixed(1)} points
                </Text>
                <Text style={styles.revealComplete}>{latestEvolutionRevision.completed_count}/{latestEvolutionRevision.total_recommendations} upgrades complete</Text>
                <Text style={styles.evolutionSummary}>{latestEvolutionRevision.summary}</Text>
              </>
            ) : null}
          </Animated.View>
        </Pressable>
      </Modal>

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
    color: "#CBD5E1",
    fontSize: 14,
  },
  continueJourneyCard: {
    flexDirection: "row", alignItems: "center", gap: 13, padding: 16,
    borderRadius: 18, borderWidth: 2, borderColor: "#C7FF4A",
    backgroundColor: "#10220E", marginBottom: 16,
  },
  continueJourneyIcon: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: "#C7FF4A",
    alignItems: "center", justifyContent: "center",
  },
  continueJourneyIconText: { color: "#142000", fontSize: 27, fontWeight: "900" },
  continueJourneyCopy: { flex: 1, gap: 3 },
  continueJourneyEyebrow: { color: "#C7FF4A", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  continueJourneyTitle: { color: "#F8FAFC", fontSize: 16, fontWeight: "900" },
  continueJourneyText: { color: "#D1FAE5", fontSize: 12, lineHeight: 17 },
  continueJourneyArrow: { color: "#F8FAFC", fontSize: 30, fontWeight: "500" },
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
  evolutionModeBanner: {
    marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: "#C7FF4A66",
    backgroundColor: "#12200D", padding: 13, gap: 4,
  },
  evolutionModeTitle: { color: colors.lime, fontSize: 14, fontWeight: "900" },
  evolutionModeText: { color: "#D1FAE5", fontSize: 13, lineHeight: 18 },
  leaveEvolutionButton: { alignSelf: "flex-start", marginTop: 7, borderWidth: 1, borderColor: "#C7FF4A66", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  leaveEvolutionText: { color: colors.lime, fontSize: 12, fontWeight: "900" },
  savedPlanCard: { marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: "#3F6212", backgroundColor: "#07150B", padding: 15, gap: 13 },
  savedJourneyStateCard: { marginTop: 14, minHeight: 96, borderRadius: 16, borderWidth: 1, borderColor: "#3F6212", backgroundColor: "#07150B", padding: 16, gap: 9, alignItems: "center", justifyContent: "center" },
  savedPlanHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  savedPlanEyebrow: { color: "#C7FF4A", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  savedPlanTitle: { color: "#F8FAFC", fontSize: 19, fontWeight: "900", marginTop: 3 },
  savedPlanPotential: { color: "#C7FF4A", fontSize: 31, fontWeight: "900" },
  savedPlanOutOf: { color: "#D1FAE5", fontSize: 13, fontWeight: "800" },
  savedPlanProgress: { color: "#E2E8F0", fontSize: 13, fontWeight: "800" },
  savedTargetWrap: { position: "relative" },
  savedTargetImage: { width: "100%", height: 340, borderRadius: 14, backgroundColor: "#111827" },
  savedTargetBadge: { position: "absolute", left: 10, bottom: 10, borderRadius: 999, backgroundColor: "#020617DD", paddingHorizontal: 10, paddingVertical: 6 },
  savedTargetBadgeText: { color: "#C7FF4A", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  savedTargetStatus: { minHeight: 100, borderRadius: 14, borderWidth: 1, borderColor: "#334155", backgroundColor: "#0F172A", alignItems: "center", justifyContent: "center", padding: 16, gap: 7 },
  savedPlanSectionTitle: { color: "#F8FAFC", fontSize: 15, fontWeight: "900" },
  savedPlanList: { gap: 10 },
  savedPlanItem: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, backgroundColor: "#0F172A", padding: 11 },
  savedPlanNumber: { width: 25, height: 25, borderRadius: 8, backgroundColor: "#C7FF4A", alignItems: "center", justifyContent: "center" },
  savedPlanNumberText: { color: "#142000", fontSize: 12, fontWeight: "900" },
  savedPlanItemTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "900", flex: 1 },
  savedPlanItemText: { color: "#CBD5E1", fontSize: 13, lineHeight: 18 },
  savedPlanPartial: { color: "#FDE68A", fontSize: 11, lineHeight: 16 },
  savedPlanRegressed: { color: "#FED7AA", fontSize: 11, lineHeight: 16 },
  savedPlanNote: { color: "#D1FAE5", fontSize: 12, lineHeight: 17, textAlign: "center" },
  savedEvolutionSection: { borderRadius: 16, borderWidth: 1, borderColor: "#1F2937", backgroundColor: "#07111F", padding: 14, gap: 9 },
  savedEvolutionRow: { gap: 10, paddingRight: 4 },
  savedEvolutionCard: { width: 142, borderRadius: 13, borderWidth: 1, borderColor: "#263449", backgroundColor: "#0F172A", padding: 8, gap: 5 },
  savedEvolutionImage: { width: "100%", height: 130, borderRadius: 9, backgroundColor: "#111827" },
  savedEvolutionScore: { color: "#F8FAFC", fontSize: 15, fontWeight: "900" },
  savedEvolutionMeta: { color: "#CBD5E1", fontSize: 11, fontWeight: "700" },
  savedEvolutionAction: { color: colors.lime, fontSize: 12, fontWeight: "900" },
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
  aiConsentDetail: { color: "#E2E8F0", fontSize: 13, lineHeight: 19 },
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
    color: "#FEFEFE",
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
  evolutionCard: {
    borderRadius: 18, borderWidth: 1, borderColor: "#C7FF4A55",
    backgroundColor: "#08150D", padding: 15, gap: 14,
  },
  evolutionEyebrow: { color: colors.lime, fontSize: 12, fontWeight: "900", letterSpacing: 1, textAlign: "center" },
  evolutionTitle: { color: "#F8FAFC", fontSize: 19, fontWeight: "900", marginTop: 3 },
  evolutionScoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  evolutionScoreCell: { alignItems: "center", flex: 1 },
  evolutionScoreValue: { color: "#F8FAFC", fontSize: 24, fontWeight: "900" },
  evolutionScoreLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  evolutionArrow: { color: "#64748B", fontSize: 22, fontWeight: "900" },
  evolutionTrack: { height: 11, borderRadius: 999, overflow: "hidden", backgroundColor: "#172033" },
  evolutionFill: { height: "100%", borderRadius: 999, backgroundColor: colors.lime },
  evolutionSummary: { color: "#CBD5E1", fontSize: 13, lineHeight: 19, textAlign: "center" },
  revisionHistory: { borderRadius: 12, backgroundColor: "#0F172A", paddingHorizontal: 11 },
  revisionHistoryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#1F2937" },
  revisionHistoryLabel: { color: "#CBD5E1", fontSize: 12, fontWeight: "700" },
  revisionHistoryScore: { color: "#F8FAFC", fontSize: 12, fontWeight: "900" },
  deltaPositive: { color: colors.lime, fontSize: 20, fontWeight: "900" },
  deltaNegative: { color: "#F59E0B", fontSize: 20, fontWeight: "900" },
  upgradeList: { gap: 11 },
  upgradeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  upgradeCheck: { width: 25, height: 25, borderRadius: 8, borderWidth: 1, borderColor: "#475569", alignItems: "center", justifyContent: "center", marginTop: 1 },
  upgradeCheckDone: { backgroundColor: colors.lime, borderColor: colors.lime },
  upgradeCheckPartial: { backgroundColor: "#A16207", borderColor: "#FACC15" },
  upgradeCheckText: { color: colors.limeInk, fontSize: 13, fontWeight: "900" },
  upgradeCopy: { flex: 1, gap: 3 },
  upgradeTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  upgradeTitle: { color: "#F8FAFC", fontSize: 14, fontWeight: "900", flex: 1 },
  upgradeText: { color: "#CBD5E1", fontSize: 13, lineHeight: 18 },
  upgradeEvidence: { color: "#A7F3D0", fontSize: 11, lineHeight: 16, fontStyle: "italic" },
  importanceTag: { color: "#CBD5E1", fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  targetCard: { width: "100%", maxWidth: 440, maxHeight: "88%", alignSelf: "center", borderRadius: 22, borderWidth: 1, borderColor: "#C7FF4A66", backgroundColor: "#0B1224", padding: 17, gap: 12 },
  targetImage: { width: "100%", height: 220, borderRadius: 14, backgroundColor: "#111827" },
  targetPreviewCard: { gap: 9, borderRadius: 14, padding: 10, backgroundColor: "#0F172A" },
  targetPreviewImage: { width: "100%", height: 300, borderRadius: 12, backgroundColor: "#111827" },
  targetGeneratingCard: { minHeight: 84, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 13, backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#263449" },
  targetModalStatus: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, padding: 20, backgroundColor: "#0F172A" },
  targetRetryText: { color: colors.lime, fontSize: 13, fontWeight: "900", marginTop: 5 },
  originalReferenceWrap: { position: "relative" },
  originalReferenceLabel: { position: "absolute", left: 10, bottom: 10, color: "#F8FAFC", backgroundColor: "#020617CC", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: "900" },
  targetList: { maxHeight: 240 },
  targetRow: { flexDirection: "row", gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1F2937" },
  targetNumber: { color: colors.lime, fontSize: 16, fontWeight: "900" },
  revealOverlay: { flex: 1, backgroundColor: "rgba(2,6,23,0.92)", alignItems: "center", justifyContent: "center", padding: 24 },
  revealCard: { width: "100%", maxWidth: 420, borderRadius: 26, borderWidth: 1, borderColor: "#C7FF4A88", backgroundColor: "#08150D", padding: 24, alignItems: "center", gap: 13 },
  revealIcon: { fontSize: 42 },
  revealScoreRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  revealOldScore: { color: "#64748B", fontSize: 32, fontWeight: "800" },
  revealNewScore: { color: colors.lime, fontSize: 48, fontWeight: "900" },
  revealComplete: { color: "#F8FAFC", fontSize: 16, fontWeight: "900" },
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
