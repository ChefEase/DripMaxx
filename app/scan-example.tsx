import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const exampleBreakdown = [
  { label: "Color Match", value: "8.8" },
  { label: "Fit Quality", value: "8.2" },
  { label: "Trend Score", value: "7.9" },
  { label: "Body Compatibility", value: "8.5" },
  { label: "Style Match", value: "8.7" },
];

const exampleSuggestions = [
  {
    type: "Upgrade",
    title: "Sharpen the silhouette",
    description: "A slightly more structured outer layer would make the outfit feel cleaner and more intentional.",
  },
  {
    type: "Balance",
    title: "Reduce visual competition",
    description: "Keep one statement piece and let the rest stay simpler so the fit reads stronger on first glance.",
  },
  {
    type: "Finish",
    title: "Match the footwear energy",
    description: "A sleeker shoe would connect better with the rest of the look and lift the final score.",
  },
];

export default function ScanExampleScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Example Result</Text>
          <Text style={styles.title}>This is what a scanned outfit result looks like.</Text>
          <Text style={styles.subtitle}>
            This page is only a preview. Use Get Started when you want to run a real scan.
          </Text>
        </View>

        <View style={styles.resultCard}>
          <View style={styles.resultTopRow}>
            <View>
              <Text style={styles.resultLabel}>Drip Score</Text>
              <Text style={styles.resultValue}>8.4/10</Text>
            </View>
            <View style={styles.thumbnailBox}>
              <View style={styles.outfitPlaceholder}>
                <Text style={styles.outfitPlaceholderText}>Sample Outfit</Text>
              </View>
            </View>
          </View>

          <View style={styles.breakdown}>
            {exampleBreakdown.map((item) => (
              <View key={item.label} style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
                <Text style={styles.breakdownValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.suggestions}>
            {exampleSuggestions.map((tip) => (
              <View key={tip.title} style={styles.suggestionCard}>
                <Text style={styles.suggestionTag}>{tip.type}</Text>
                <Text style={styles.suggestionTitle}>{tip.title}</Text>
                <Text style={styles.suggestionText}>{tip.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("StylePreference")}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
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
    paddingBottom: 48,
    gap: 18,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#0B1224",
    padding: 18,
    gap: 8,
  },
  eyebrow: {
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    color: "#F9FAFB",
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: "#9CA3AF",
    fontSize: 14,
    lineHeight: 20,
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 16,
    backgroundColor: "#0B1224",
    gap: 12,
  },
  resultTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  resultLabel: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "600",
  },
  resultValue: {
    color: "#F9FAFB",
    fontSize: 28,
    fontWeight: "800",
  },
  thumbnailBox: {
    width: 118,
  },
  outfitPlaceholder: {
    aspectRatio: 3 / 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  outfitPlaceholderText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
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
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 14,
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
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "600",
  },
});
