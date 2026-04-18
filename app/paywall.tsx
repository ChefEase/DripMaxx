import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Pressable, Alert, ActivityIndicator, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { apiFetch, apiJsonHeaders } from "../lib/api";
import { logWarn } from "../lib/logger";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PRODUCT_ID =
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_IOS_PREMIUM_PRODUCT_ID || "dripmaxx_premium_monthly"
    : process.env.EXPO_PUBLIC_ANDROID_PREMIUM_PRODUCT_ID || "dripmaxx_premium_monthly";

function PaywallShell({
  priceLabel,
  metaText,
  onBuy,
  purchaseBusy,
}: {
  priceLabel: string;
  metaText: string;
  onBuy: () => void;
  purchaseBusy: boolean;
}) {
  const nav = useNavigation<Nav>();

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
          <Text style={styles.bullet}>- {priceLabel} per month</Text>
          <Text style={styles.bullet}>- Unlimited scans</Text>
          <Text style={styles.bullet}>- AI score breakdown + suggestions</Text>
          <Text style={styles.bullet}>- Save and compare outfits</Text>
          <Text style={styles.meta}>{metaText}</Text>
        </View>

        <Pressable
          style={[styles.primary, purchaseBusy && styles.primaryDisabled]}
          onPress={onBuy}
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

function WebPaywall() {
  const handleBuy = () => {
    Alert.alert("Mobile only", "In-app purchases require an iOS or Android development build.");
  };

  return (
    <PaywallShell
      priceLabel="$3.99"
      metaText="Use a development build on iPhone or Android to test purchases."
      onBuy={handleBuy}
      purchaseBusy={false}
    />
  );
}

function NativePaywall() {
  const nav = useNavigation<Nav>();
  const { userId } = useStore();
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [storeWaitTimedOut, setStoreWaitTimedOut] = useState(false);
  const expoIap = require("expo-iap");
  const { useIAP } = expoIap;

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase: any) => {
      try {
        if (!userId) {
          throw new Error("Sign in required before purchase verification.");
        }
        const verifyResp = await apiFetch("/v1/billing/verify-purchase", {
          method: "POST",
          headers: apiJsonHeaders(),
          body: JSON.stringify({
            user_id: userId,
            platform: Platform.OS,
            product_id: PRODUCT_ID,
            purchase_token:
              purchase?.purchaseToken ||
              purchase?.purchaseTokenAndroid ||
              purchase?.originalJson ||
              null,
            transaction_id:
              purchase?.id ||
              purchase?.transactionId ||
              purchase?.orderId ||
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
    onPurchaseError: (error: any) => {
      setPurchaseBusy(false);
      Alert.alert("Purchase failed", error?.message || "The purchase did not complete.");
    },
  });

  useEffect(() => {
    if (!connected) return;
    fetchProducts({ skus: [PRODUCT_ID], type: "subs" }).catch((error: any) => {
      logWarn("fetchProducts failed", error);
    });
  }, [connected, fetchProducts]);

  useEffect(() => {
    if (connected) {
      setStoreWaitTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      setStoreWaitTimedOut(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [connected]);

  const monthlyProduct = useMemo(
    () => products.find((product: any) => product.id === PRODUCT_ID) || null,
    [products]
  );
  const androidSubscriptionOffer = useMemo(
    () =>
      Platform.OS === "android"
        ? monthlyProduct?.subscriptionOffers?.find(
            (offer: any) => offer?.offerTokenAndroid && offer?.basePlanIdAndroid === "dripmaxx-premium-monthly-1"
          ) ||
          monthlyProduct?.subscriptionOffers?.find((offer: any) => offer?.offerTokenAndroid) ||
          null
        : null,
    [monthlyProduct]
  );

  const handleBuy = async () => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in before upgrading.");
      nav.navigate("Auth");
      return;
    }
    if (!connected) {
      Alert.alert(
        "Store unavailable",
        "Google Play Billing is not connected. Test on a physical Android device signed into Play, using a Play-distributed build and a licensed tester account."
      );
      return;
    }
    if (Platform.OS === "android" && !androidSubscriptionOffer?.offerTokenAndroid) {
      Alert.alert(
        "Store not ready",
        "The subscription product loaded without an active offer. Check that your Play Console base plan is active and available to your tester track."
      );
      return;
    }
    setPurchaseBusy(true);
    try {
      await requestPurchase({
        request: {
          apple: { sku: PRODUCT_ID },
          google: {
            skus: [PRODUCT_ID],
            subscriptionOffers: androidSubscriptionOffer?.offerTokenAndroid
              ? [{ sku: PRODUCT_ID, offerToken: androidSubscriptionOffer.offerTokenAndroid }]
              : undefined,
          },
        },
        type: "subs",
      });
    } catch (error: any) {
      setPurchaseBusy(false);
      Alert.alert("Purchase failed", error?.message || "The store did not start the purchase.");
    }
  };

  return (
    <PaywallShell
      priceLabel={monthlyProduct?.displayPrice || "$3.99"}
      metaText={
        connected
          ? monthlyProduct
            ? Platform.OS === "android" && !androidSubscriptionOffer?.offerTokenAndroid
              ? `Store connected, but ${PRODUCT_ID} has no active Play offer yet.`
              : `Store connected for ${PRODUCT_ID}.`
            : `Store connected, but ${PRODUCT_ID} was not returned by Google Play yet.`
          : storeWaitTimedOut
            ? "Still not connected to Google Play. Local installs, Expo Go, emulators, unsigned builds, or non-tester accounts usually cannot use billing."
            : "Connecting to Google Play billing..."
      }
      onBuy={handleBuy}
      purchaseBusy={purchaseBusy}
    />
  );
}

export default function PaywallScreen() {
  if (Platform.OS === "web") {
    return <WebPaywall />;
  }
  return <NativePaywall />;
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
