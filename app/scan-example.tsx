import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { colors, useThemedStyles } from "./ui/theme";

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
  const styles = useThemedStyles(baseStyles);
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
          <View style={styles.previewFrame}>
            <Image source={require("../assets/editorial/glowup-01-after.jpg")} style={styles.outfitPlaceholder} resizeMode="cover" />
            <Text style={styles.previewFrameLabel}>OUTFIT PREVIEW</Text>
          </View>
          <View style={styles.resultTopRow}>
            <View>
              <Text style={styles.resultLabel}>Drip Score</Text>
              <Text style={styles.resultValue}>8.4/10</Text>
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

        <View style={styles.transformSection}>
          <Text style={styles.eyebrow}>REAL STYLE MOVES</Text>
          <Text style={styles.sectionTitle}>Small changes. Clearer outfits.</Text>
          <Text style={styles.subtitle}>The goal is not to change who you are—it is to make your intention read faster.</Text>
          <View style={styles.transformCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.transformImages} snapToInterval={272} decelerationRate="fast">
              <View style={styles.transformImageWrap}><Image source={require("../assets/editorial/glowup-01-before.jpg")} style={styles.transformImage} resizeMode="cover" /><Text style={styles.imageLabel}>BEFORE</Text></View>
              <View style={styles.transformImageWrap}><Image source={require("../assets/editorial/glowup-01-after.jpg")} style={styles.transformImage} resizeMode="cover" /><Text style={styles.imageLabel}>AFTER</Text></View>
            </ScrollView>
            <Text style={styles.transformTitle}>Sharper proportions</Text>
            <Text style={styles.transformCopy}>A more intentional silhouette and coordinated finish create a stronger first read.</Text>
          </View>
          <View style={styles.transformCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.transformImages} snapToInterval={272} decelerationRate="fast">
              <View style={styles.transformImageWrap}><Image source={require("../assets/editorial/glowup-02-before.jpg")} style={styles.transformImage} resizeMode="cover" /><Text style={styles.imageLabel}>BEFORE</Text></View>
              <View style={styles.transformImageWrap}><Image source={require("../assets/editorial/glowup-02-after.jpg")} style={styles.transformImage} resizeMode="cover" /><Text style={styles.imageLabel}>AFTER</Text></View>
            </ScrollView>
            <Text style={styles.transformTitle}>Stronger color story</Text>
            <Text style={styles.transformCopy}>Connected tones, footwear and one focal point make the outfit feel considered.</Text>
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

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ink,
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
    color: colors.lime,
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
  previewFrame: { width: "100%", position: "relative", borderRadius: 12, overflow: "hidden", backgroundColor: colors.surfaceRaised },
  outfitPlaceholder: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: "#111827",
  },
  previewFrameLabel: { position: "absolute", left: 10, bottom: 10, color: colors.text, backgroundColor: "rgba(8,10,12,0.8)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
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
    color: colors.cream,
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
    backgroundColor: colors.lime,
    paddingVertical: 14,
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
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "600",
  },
  transformSection: { gap: 12, marginTop: 4 },
  sectionTitle: { color: colors.text, fontSize: 25, lineHeight: 30, fontWeight: "900" },
  transformCard: { borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, padding: 10, gap: 8 },
  transformImages: { gap: 12, paddingRight: 18 },
  transformImageWrap: { width: 260, position: "relative", overflow: "hidden", borderRadius: 16 },
  transformImage: { width: "100%", aspectRatio: 3 / 4, backgroundColor: colors.surfaceSoft },
  imageLabel: { position: "absolute", left: 8, bottom: 8, color: colors.text, backgroundColor: "rgba(8,10,12,0.78)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  transformTitle: { color: colors.text, fontSize: 16, fontWeight: "900", paddingHorizontal: 4 },
  transformCopy: { color: colors.textMuted, fontSize: 13, lineHeight: 19, paddingHorizontal: 4, paddingBottom: 4 },
});
