import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Pressable, Alert, ActivityIndicator, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useIAP } from "expo-iap";

import type { RootStackParamList } from "../App";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PRODUCT_ID =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_IOS_PREMIUM_PRODUCT_ID || "dripmaxx_premium_monthly"
    : process.env.EXPO_PUBLIC_ANDROID_PREMIUM_PRODUCT_ID || "dripmaxx_premium_monthly";

export default function PaywallScreen() {
  const nav = useNavigation<Nav>();
  const { userId } = useStore();
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const base = process.env.EXPO_PUBLIC_API_BASE?.trim() || "http://127.0.0.1:8000";
  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      try {
        if (!userId) {
          throw new Error("Sign in required before purchase verification.");
        }
        const purchaseAny = purchase as any;
        const verifyResp = await fetch(`${base}/v1/billing/verify-purchase`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            platform: Platform.OS,
            product_id: PRODUCT_ID,
            purchase_token:
              purchaseAny.purchaseToken ||
              purchaseAny.purchaseTokenAndroid ||
              purchaseAny.originalJson ||
              null,
            transaction_id:
              purchaseAny.id ||
              purchaseAny.transactionId ||
              purchaseAny.orderId ||
              null,
          }),
        });
        if (!verifyResp.ok) {
          const text = await verifyResp.text();
          throw new Error(text || "Purchase verification failed.");
        }
        await finishTransaction({ purchase, isConsumable: false });
        Alert.alert("Premium unlocked", "Your subscription is active on this account.");
        nav.navigate("Profile");
      } catch (error: any) {
        Alert.alert("Purchase verification failed", error?.message || "Try again.");
      } finally {
        setPurchaseBusy(false);
      }
    },
    onPurchaseError: (error) => {
      setPurchaseBusy(false);
      Alert.alert("Purchase failed", error?.message || "The purchase did not complete.");
    },
  });

  useEffect(() => {
    if (!connected || Platform.OS === "web") return;
    fetchProducts({ skus: [PRODUCT_ID], type: "in-app" }).catch((error) => {
      console.warn("fetchProducts failed", error);
    });
  }, [connected, fetchProducts]);

  const monthlyProduct = useMemo(
    () => products.find((product: any) => product.id === PRODUCT_ID) || null,
    [products]
  );

  const handleBuy = async () => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in before upgrading.");
      nav.navigate("Auth");
      return;
    }
    if (Platform.OS === "web") {
      Alert.alert("Mobile only", "In-app purchases require an iOS or Android development build.");
      return;
    }
    setPurchaseBusy(true);
    try {
      await requestPurchase({
        request: {
          apple: { sku: PRODUCT_ID },
          google: { skus: [PRODUCT_ID] },
        },
      });
    } catch (error: any) {
      setPurchaseBusy(false);
      Alert.alert("Purchase failed", error?.message || "The store did not start the purchase.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.kicker}>Upgrade Plan</Text>
          <Text style={styles.title}>DripMaxx Monthly</Text>
          <Text style={styles.subtitle}>
            Free users get 5 scans to start, then 1 free scan every 3 days.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plan details</Text>
          <Text style={styles.bullet}>- {monthlyProduct?.displayPrice || "$3.99"} per month</Text>
          <Text style={styles.bullet}>- Unlimited scans</Text>
          <Text style={styles.bullet}>- AI score breakdown + suggestions</Text>
          <Text style={styles.bullet}>- Save and compare outfits</Text>
          <Text style={styles.meta}>
            {Platform.OS === "web"
              ? "Use a development build on iPhone or Android to test purchases."
              : connected
                ? `Store connected${monthlyProduct ? "" : " - product still loading"}`
                : "Connecting to the store..."}
          </Text>
        </View>

        <Pressable
          style={[styles.primary, purchaseBusy && styles.primaryDisabled]}
          onPress={handleBuy}
          disabled={purchaseBusy}
        >
          {purchaseBusy ? (
            <ActivityIndicator color="#022C22" />
          ) : (
            <Text style={styles.primaryText}>Upgrade to Premium</Text>
          )}
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
  meta: { color: "#9CA3AF", fontSize: 12, marginTop: 6 },
  primary: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  primaryDisabled: { opacity: 0.7 },
  primaryText: { color: "#022C22", fontSize: 15, fontWeight: "800" },
  secondary: {
    alignItems: "center",
    paddingVertical: 12,
  },
  secondaryText: { color: "#9CA3AF", fontSize: 14, fontWeight: "700" },
});
