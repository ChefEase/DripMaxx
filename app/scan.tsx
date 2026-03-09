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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import * as ImagePicker from "expo-image-picker";
import { useStore } from "./store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trackEvent } from "./lib/analytics";
import { ActivityIndicator } from "react-native";

type Nav = NativeStackNavigationProp<RootStackParamList>;

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
  } = useStore();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<
    | null
    | {
        dripScore: number;
        categories: { label: string; value: number }[];
        suggestions: { title: string; type: string; description: string }[];
        warnings: string[];
      }
  >(null);
  const API_BASE =
    process.env.EXPO_PUBLIC_API_BASE?.trim() || "http://127.0.0.1:8000";

  useEffect(() => {
    console.log("[ScanStubScreen] mounted");
    return () => {
      console.log("[ScanStubScreen] unmounted");
    };
  }, []);

  const handleStartScan = () => {
    console.log("[ScanStubScreen] Start Scan pressed");
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
    console.log("[ScanStubScreen] Back to Start pressed");
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
    try {
      const form = new FormData();
      form.append("image", {
        uri: imageUri,
        name: "upload.jpg",
        type: "image/jpeg",
      } as any);
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

      const resp = await fetch(`${API_BASE}/v1/outfits/score`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: form,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`API ${resp.status}: ${text}`);
      }

      const data = await resp.json();
      // Sync profile to backend
      try {
        const profileResp = await fetch(`${API_BASE}/v1/profile/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            style_preferences: stylePreferences,
            style_inspirations: styleInspirations,
            user_height: userHeight || null,
            user_body_type: userBodyType,
            gender_style_preference: genderStylePreference,
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
        console.warn("profile sync failed", e);
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
      trackEvent(
        "score_viewed",
        { drip_score: data.drip_score, suggestion_count: data.suggestions?.length || 0 },
        userId
      );
    } catch (err: any) {
      console.error("score failed", err);
      Alert.alert("Scoring failed", err?.message || "Try again in a moment.");
    } finally {
      setIsScoring(false);
    }
  };

  const handleRescan = () => {
    setImageUri(null);
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
          </View>
        </View>

        {imageUri ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
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
              </View>
            )}
            <View style={styles.resultHeader}>
              <Text style={styles.resultLabel}>Drip Score</Text>
              <Text style={styles.resultValue}>{result.dripScore}/10</Text>
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
    marginBottom: -10,
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
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
});
