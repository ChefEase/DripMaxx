import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Pressable, Alert } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../App";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PaywallScreen() {
  const nav = useNavigation<Nav>();
  const { userId } = useStore();

  const handleBuy = () => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in before upgrading.");
      nav.navigate("Auth");
      return;
    }
    Alert.alert(
      "Premium Checkout",
      "In-app premium checkout still needs to be wired to the app-store billing flow for this build."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.kicker}>Upgrade Plan</Text>
          <Text style={styles.title}>DripMaxx Monthly</Text>
          <Text style={styles.subtitle}>
            Free users get 3 scans in their first 24 hours, then 1 scan every 24 hours.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plan details</Text>
          <Text style={styles.bullet}>- $12.99 per month</Text>
          <Text style={styles.bullet}>- Unlimited scans</Text>
          <Text style={styles.bullet}>- AI score breakdown + suggestions</Text>
          <Text style={styles.bullet}>- Save and compare outfits</Text>
        </View>

        <Pressable style={styles.primary} onPress={handleBuy}>
          <Text style={styles.primaryText}>Upgrade to Premium</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => nav.navigate("Scan")}>
          <Text style={styles.secondaryText}>Back to Scan</Text>
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
