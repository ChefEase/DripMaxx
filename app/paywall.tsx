import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Pressable } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PaywallScreen() {
  const nav = useNavigation<Nav>();

  const handleBuy = () => {
    // No backend yet; allow bypass
    nav.navigate("Scan");
  };

  const handleMaybeLater = () => {
    nav.navigate("Scan");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.kicker}>Unlock Full Access</Text>
          <Text style={styles.title}>7-day free trial</Text>
          <Text style={styles.subtitle}>
            See your full Drip Scores, AI suggestions, and history. Cancel anytime.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What you get</Text>
          <Text style={styles.bullet}>• Unlimited scans with AI scoring</Text>
          <Text style={styles.bullet}>• 15 tailored suggestions per outfit</Text>
          <Text style={styles.bullet}>• Save & revisit your outfits</Text>
          <Text style={styles.bullet}>• Early access to Style DNA</Text>
          <Text style={styles.note}>Card required • Cancel anytime</Text>
        </View>

        <Pressable style={styles.primary} onPress={handleBuy}>
          <Text style={styles.primaryText}>Start free trial</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={handleMaybeLater}>
          <Text style={styles.secondaryText}>Maybe later</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  container: { flex: 1, padding: 24, gap: 16 },
  kicker: { color: "#A5B4FC", fontSize: 13, fontWeight: "700" },
  title: { color: "#F9FAFB", fontSize: 26, fontWeight: "800", marginTop: 4 },
  subtitle: { color: "#9CA3AF", fontSize: 14, marginTop: 4 },
  card: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  cardTitle: { color: "#E5E7EB", fontSize: 15, fontWeight: "800" },
  bullet: { color: "#E5E7EB", fontSize: 14 },
  note: { color: "#FCD34D", fontSize: 12, marginTop: 6 },
  primary: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryText: { color: "#022C22", fontSize: 15, fontWeight: "800" },
  secondary: {
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryText: { color: "#9CA3AF", fontSize: 14, fontWeight: "700" },
});
