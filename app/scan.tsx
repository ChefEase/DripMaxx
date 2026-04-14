import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ScrollView,
  Modal,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import * as ImagePicker from "expo-image-picker";
import { useStore } from "../store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RankingsCard from "./components/RankingsCard";
import { apiFetch, apiJsonHeaders } from "../lib/api";
import { trackEvent } from "../lib/analytics";
import { logWarn } from "../lib/logger";
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

export default function ScanStubScreen() {
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
  } = useStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [bestOutfit, setBestOutfit] = useState<null | { imageUrl: string | null; dripScore: number | null }>(null);
  const [result, setResult] = useState<
    | null
    | {
        dripScore: number;
        categories: { label: string; value: number }[];
        suggestions: { title: string; type: string; description: string }[];
        warnings: string[];
      }
  >(null);
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
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0]?.uri;
      if (uri) {
        setImageUri(uri);
        setResult(null);
        setSaved(false);
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
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0]?.uri;
      if (uri) {
        setImageUri(uri);
        setResult(null);
        setSaved(false);
      }
    }
  };

  const handleContinue = async () => {
    if (!imageUri) {
      Alert.alert("Add a photo first", "Pick an outfit photo to score.");
      return;
    }
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
          style_preferences: stylePreferences.length ? stylePreferences : ["unspecified"],
          style_inspirations: styleInspirations.length ? styleInspirations : [],
          user_height: userHeight || "n/a",
          user_body_type: userBodyType || "n/a",
          gender_style_preference: genderStylePreference || "n/a",
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
        throw new Error(`API ${resp.status}: ${text}`);
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
            user_body_type: userBodyType,
            gender_style_preference: genderStylePreference,
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
      const categories = [
        { label: "Color Match", value: data.breakdown.color_match },
        { label: "Fit Quality", value: data.breakdown.fit_quality },
        { label: "Trend Score", value: data.breakdown.trend_score },
        { label: "Body Compatibility", value: data.breakdown.body_compatibility },
        { label: "Style Match", value: data.breakdown.style_match },
      ];
      setResult({
        dripScore: data.drip_score,
        categories,
        suggestions: data.suggestions,
        warnings: data.warnings || [],
      });
      setAnalysisProgress(1);
      setBestOutfit(bestBeforeScan);
      trackEvent(
        "score_viewed",
        { drip_score: data.drip_score, suggestion_count: data.suggestions?.length || 0 },
        userId
      );
    } catch (err: any) {
      Alert.alert("Scoring failed", err?.message || "Try again in a moment.");
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.stepLabel}>Core Experience</Text>
          <Text style={styles.title}>Scan your outfit</Text>
          <Text style={styles.subtitle}>
            This is the core scan screen. We&apos;ll wire up the camera and AI
            rating in later phases.
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
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
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
                <ActivityIndicator size="large" color="#22C55E" />
                <Text style={styles.loadingOverlayText}>
                  Finalizing your drip score...
                </Text>
              </View>
            )}
            <View style={styles.resultBody}>
              <View style={styles.resultTopRow}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultLabel}>Drip Score</Text>
                  <Text style={styles.resultValue}>{result.dripScore}/10</Text>
                </View>
                {imageUri ? (
                  <Pressable
                    style={styles.thumbnailBox}
                    onPress={() => setPreviewUrl(imageUri)}
                  >
                    <Image source={{ uri: imageUri }} style={styles.thumbnailImage} />
                    <Text style={styles.thumbnailHint}>Tap to expand</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.breakdown}>
                {result.categories.map((c) => (
                  <View key={c.label} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{c.label}</Text>
                    <Text style={styles.breakdownValue}>{c.value}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.suggestions}>
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
                        <Image source={{ uri: imageUri || undefined }} style={styles.compareImage} />
                      </Pressable>
                      <Text style={styles.compareScore}>{result.dripScore.toFixed(1)}/10</Text>
                    </View>
                    <View style={styles.compareColumn}>
                      <Text style={styles.compareLabel}>Best</Text>
                      <Pressable
                        onPress={() => setPreviewUrl(bestOutfit.imageUrl)}
                        style={styles.compareImageWrap}
                      >
                        <Image source={{ uri: bestOutfit.imageUrl }} style={styles.compareImage} />
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
                <Text style={styles.secondaryButtonText}>Rescan</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryButton,
                  saved && { backgroundColor: "#16A34A" },
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
            <Text style={styles.scanButtonText}>Start Drip Scan</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal transparent visible={!!previewUrl} animationType="fade">
        <Pressable style={styles.previewOverlay} onPress={() => setPreviewUrl(null)}>
          <View style={styles.previewModal}>
            {previewUrl ? (
              <Image source={{ uri: previewUrl }} style={styles.previewModalImage} />
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 18,
    paddingBottom: 48,
  },
  stepLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F9FAFB",
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
    color: "#86EFAC",
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
    color: "#BBF7D0",
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
    backgroundColor: "#22C55E",
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
    borderColor: "#22C55E",
    backgroundColor: "#14532D",
  },
  stepDotComplete: {
    borderColor: "#22C55E",
    backgroundColor: "#22C55E",
  },
  stepDotText: {
    color: "#052E16",
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
    color: "#BBF7D0",
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
  primaryButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#022C22",
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
    gap: 2,
  },
  resultTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  resultLabel: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
  },
  resultValue: {
    color: "#F9FAFB",
    fontSize: 24,
    fontWeight: "800",
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
    gap: 6,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  breakdownLabel: {
    color: "#E5E7EB",
    fontSize: 13,
  },
  breakdownValue: {
    color: "#BBF7D0",
    fontSize: 13,
    fontWeight: "700",
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
    color: "#22C55E",
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
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonText: {
    color: "#022C22",
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
});
