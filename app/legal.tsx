import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";

import type { RootStackParamList } from "../App";
import { useThemedStyles } from "./ui/theme";

type LegalRoute = RouteProp<RootStackParamList, "Legal">;

const TERMS_SECTIONS = [
  {
    title: "Acceptance of Terms",
    body:
      "By creating an account, uploading images, or using DripMaxx, you agree to these Terms. If you do not agree, do not use the app.",
  },
  {
    title: "Eligibility and Accounts",
    body:
      "You must provide accurate account information and keep your login credentials secure. You are responsible for activity that happens through your account.",
  },
  {
    title: "What the Service Does",
    body:
      "DripMaxx lets you upload outfit photos, receive AI-generated ratings and suggestions, save outfit history, and access premium features if subscribed.",
  },
  {
    title: "User Content",
    body:
      "You keep ownership of the photos and content you upload. You grant DripMaxx only the rights needed to host, process, analyze, store, and display that content for the features you request, account history, safety, and support. Outfit photos are not licensed for advertising or facial-recognition use.",
  },
  {
    title: "Acceptable Use",
    body:
      "You may not upload unlawful, harmful, infringing, or deceptive content; attempt to game scores, rankings, or scan limits; reverse engineer the app; or interfere with billing, security, or service availability.",
  },
  {
    title: "AI Output and No Guarantee",
    body:
      "Ratings, style labels, suggestions, and summaries are automated outputs and may be incomplete or wrong. They are provided for entertainment and style guidance only, not professional, legal, or medical advice.",
  },
  {
    title: "Subscriptions and Billing",
    body:
      "Premium subscriptions are billed through the app store linked to your device. Subscription pricing, renewal timing, cancellation, refunds, and payment methods are governed by the applicable app-store billing terms.",
  },
  {
    title: "Termination",
    body:
      "DripMaxx may suspend or terminate accounts, limit features, or revoke rewards if it detects abuse, fraud, security risks, policy violations, or nonpayment.",
  },
  {
    title: "Changes to the Service",
    body:
      "Features, scan limits, premium offerings, and ranking systems may change over time. Continued use after updates means you accept the revised Terms.",
  },
  {
    title: "Contact",
    body:
      "For legal, billing, or privacy questions about DripMaxx, contact mangaficustomercare@gmail.com.",
  },
];

const PRIVACY_SECTIONS = [
  {
    title: "Information We Collect",
    body:
      "DripMaxx collects account details such as email, username, and display name; onboarding data such as style preferences, inspirations, height, body type, country, and gender-style preference; outfit photos you upload; scan results including scores, breakdowns, suggestions, and history; event logs; and subscription status needed to manage premium access.",
  },
  {
    title: "Permissions and Device Data",
    body:
      "If you grant permission, DripMaxx accesses your camera and photo library so you can capture or upload outfit images. The app may also store limited device and locale information needed for app operation, fraud prevention, and localization.",
  },
  {
    title: "How We Use Information",
    body:
      "We use your data to authenticate your account, provide the outfit analysis and target-look features you request, maintain your scan history, enforce plan limits, support sharing features you choose, investigate abuse, and operate the service. We do not use outfit photos for advertising or facial recognition.",
  },
  {
    title: "Replicate AI Processing",
    body:
      "With your explicit permission, DripMaxx sends the outfit photo you select—which may incidentally contain your face—to Replicate, a third-party AI provider. Replicate runs the models used for outfit scoring, recommendations, revision comparison, styling advice, and automatic Target Look generation after an original scan. We also send only the selected style and body-profile context needed for those results. DripMaxx does not perform facial recognition, biometric identification, identity matching, or create face embeddings.",
  },
  {
    title: "Photo Storage and Access",
    body:
      "Original scans, revision scans, and generated Target Look images are stored in a private Supabase Storage bucket. DripMaxx stores private object references rather than public image links. Short-lived signed links are created for an authenticated display request or a specific Replicate operation and expire quickly. Photos are not submitted to community challenges or feature review unless you separately choose and consent to that sharing.",
  },
  {
    title: "Payments and Subscriptions",
    body:
      "DripMaxx does not need to store your full card number when subscriptions are handled through the app store. Subscription status, purchase state, and renewal information may be stored to unlock premium features and enforce entitlements.",
  },
  {
    title: "Retention",
    body:
      "DripMaxx keeps successful original scans, revisions, generated Target Looks, and their results until you delete your account. A photo uploaded for a failed scan is deleted from DripMaxx storage. Account deletion removes original scans, revisions, generated Target Looks, and related database records. Replicate controls its own temporary processing retention; according to its API documentation, API prediction inputs, outputs, files, and logs are removed after one hour by default. Contact us if you need assistance with deletion.",
  },
  {
    title: "Your Choices",
    body:
      "You can update certain profile data, control whether you upload photos, and cancel premium subscriptions through the app store tied to your device. You may also request account-related support by contacting mangaficustomercare@gmail.com.",
  },
  {
    title: "Security",
    body:
      "DripMaxx uses reasonable administrative, technical, and organizational measures to protect data, but no system can guarantee absolute security.",
  },
  {
    title: "Children",
    body:
      "DripMaxx is not intended for children under 13, and users who must be older under local law should not use the app unless legally permitted.",
  },
  {
    title: "Policy Changes",
    body:
      "We may update this Privacy Policy when the app, its providers, or legal requirements change. Continued use after an update means the revised policy applies.",
  },
  {
    title: "Contact",
    body:
      "For privacy questions, requests, or support related to DripMaxx, contact mangaficustomercare@gmail.com.",
  },
];

export default function LegalScreen() {
  const styles = useThemedStyles(baseStyles);
  const route = useRoute<LegalRoute>();
  const isTerms = route.params.doc === "terms";
  const title = isTerms ? "Terms of Service" : "Privacy Policy";
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>Legal</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.updated}>Last updated: September 4, 2026</Text>
        {sections.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.cardTitle}>{section.title}</Text>
            <Text style={styles.cardBody}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 24, gap: 14, paddingBottom: 40 },
  kicker: { color: "#A5B4FC", fontSize: 13, fontWeight: "700" },
  title: { color: "#F8FAFC", fontSize: 26, fontWeight: "800" },
  updated: { color: "#94A3B8", fontSize: 13 },
  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  cardTitle: { color: "#E2E8F0", fontSize: 15, fontWeight: "800" },
  cardBody: { color: "#CBD5E1", fontSize: 14, lineHeight: 20 },
});
