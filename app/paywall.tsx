import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Pressable, ActivityIndicator, Linking, Alert } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../App";
import { useStore } from "./store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function PaywallScreen() {
  const nav = useNavigation<Nav>();
  const { userId, userEmail } = useStore();
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<null | { remaining: number; limit_type: string; plan: string; used: number; limit: number }>(null);
  const API_BASE = process.env.EXPO_PUBLIC_API_BASE?.trim() || "http://127.0.0.1:8000";

  React.useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE}/v1/billing/status?user_id=${encodeURIComponent(userId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStatus(d))
      .catch(() => {});
  }, [userId, API_BASE]);

  const handleBuy = async () => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in before subscribing.");
      nav.navigate("Auth");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/v1/billing/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, email: userEmail }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Checkout failed: ${text}`);
      }
      const data = await resp.json();
      await Linking.openURL(data.checkout_url);
    } catch (e: any) {
      Alert.alert("Payment setup failed", e?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.kicker}>Upgrade Plan</Text>
          <Text style={styles.title}>DripMaxx Monthly</Text>
          <Text style={styles.subtitle}>Free users get 3 scans/day. Paid plan unlocks unlimited scans.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plan details</Text>
          <Text style={styles.bullet}>- $12.99 per month</Text>
          <Text style={styles.bullet}>- Unlimited scans*</Text>
          <Text style={styles.bullet}>- AI score breakdown + suggestions</Text>
          <Text style={styles.bullet}>- Save and compare outfits</Text>
          <Text style={styles.note}>Card required. Cancel anytime.</Text>
          <Text style={styles.note}>*Fair use cap applies (190 scans/month).</Text>
          {status ? (
            <Text style={styles.note}>
              Current usage: {status.used}/{status.limit} ({status.limit_type}, {status.plan})
            </Text>
          ) : null}
        </View>

        <Pressable style={[styles.primary, loading && { opacity: 0.7 }]} onPress={handleBuy} disabled={loading}>
          {loading ? <ActivityIndicator color="#022C22" /> : <Text style={styles.primaryText}>Subscribe for $12.99/month</Text>}
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
