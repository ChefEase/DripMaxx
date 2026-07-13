import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { apiFetch, apiJsonHeaders } from "../lib/api";
import { logWarn } from "../lib/logger";
import {
  ensureRevenueCatConfigured,
  hasRevenueCatEntitlement,
  REVENUECAT_ENTITLEMENT_ID,
} from "../lib/revenueCat";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PRODUCT_ID = Platform.OS === "ios"
  ? process.env.EXPO_PUBLIC_IOS_PREMIUM_PRODUCT_ID || "dripmaxx_premium_monthly"
  : process.env.EXPO_PUBLIC_ANDROID_PREMIUM_PRODUCT_ID || "dripmaxx_premium_monthly";

function PaywallShell({ priceLabel, metaText, diagnostics, onBuy, onRestore, busy }: {
  priceLabel: string;
  metaText: string;
  diagnostics: string[];
  onBuy: () => void;
  onRestore: () => void;
  busy: boolean;
}) {
  const nav = useNavigation<Nav>();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.kicker}>Upgrade Plan</Text>
          <Text style={styles.title}>DripMaxx Monthly</Text>
          <Text style={styles.subtitle}>Free users get 5 scans to start, then 1 free scan every 3 days.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plan details</Text>
          <Text style={styles.bullet}>- {priceLabel} per month</Text>
          <Text style={styles.bullet}>- Unlimited scans</Text>
          <Text style={styles.bullet}>- AI score breakdown + suggestions</Text>
          <Text style={styles.bullet}>- Save and compare outfits</Text>
          <Text style={styles.meta}>{metaText}</Text>
          <View style={styles.diagnosticsBox}>
            {diagnostics.map((line) => <Text key={line} style={styles.diagnosticsText}>{line}</Text>)}
          </View>
        </View>
        <Pressable style={[styles.primary, busy && styles.primaryDisabled]} onPress={onBuy} disabled={busy}>
          {busy ? <ActivityIndicator color="#022C22" /> : <Text style={styles.primaryText}>Upgrade to Premium</Text>}
        </Pressable>
        <Pressable style={styles.secondary} onPress={onRestore} disabled={busy}>
          <Text style={styles.secondaryText}>Restore Purchases</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => nav.navigate("Scan")}>
          <Text style={styles.secondaryText}>Back to Scan</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function WebPaywall() {
  return <PaywallShell priceLabel="$3.99" metaText="RevenueCat purchases require an iOS or Android build."
    diagnostics={["provider=RevenueCat", "platform=web", "billing=unavailable"]}
    onBuy={() => Alert.alert("Mobile only", "Use the iOS or Android app to subscribe.")}
    onRestore={() => Alert.alert("Mobile only", "Use the iOS or Android app to restore purchases.")} busy={false} />;
}

function NativePaywall() {
  const nav = useNavigation<Nav>();
  const { userId } = useStore();
  const [purchasePackage, setPurchasePackage] = useState<any>(null);
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [entitlementActive, setEntitlementActive] = useState(false);

  const summarizeError = (error: any) => {
    const code = error?.code || error?.underlyingErrorMessage || null;
    const message = error?.message || String(error || "unknown");
    return code ? `${code}: ${message}` : message;
  };

  const syncBackend = useCallback(async () => {
    const response = await apiFetch("/v1/billing/sync-revenuecat", {
      method: "POST",
      headers: apiJsonHeaders(),
      body: JSON.stringify({ user_id: userId, platform: Platform.OS }),
    });
    if (!response.ok) throw new Error((await response.text()) || "RevenueCat account sync failed.");
  }, [userId]);

  const loadRevenueCat = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      setLastError("Sign in is required before RevenueCat can load offerings.");
      return;
    }
    setLoading(true);
    setLastError(null);
    try {
      const purchases = await ensureRevenueCatConfigured(userId);
      setConfigured(true);
      const [offerings, customerInfo] = await Promise.all([
        purchases.getOfferings(),
        purchases.getCustomerInfo(),
      ]);
      const current = offerings.current;
      const packages = current?.availablePackages || [];
      const selected = current?.monthly
        || packages.find((item: any) => item.product?.identifier === PRODUCT_ID)
        || packages[0]
        || null;
      const active = hasRevenueCatEntitlement(customerInfo);
      setOfferingId(current?.identifier || null);
      setPurchasePackage(selected);
      setEntitlementActive(active);
      if (active) await syncBackend();
      if (!current) setLastError("RevenueCat has no current offering configured for this app.");
      else if (!selected) setLastError("The current RevenueCat offering has no purchase package.");
    } catch (error: any) {
      setConfigured(false);
      logWarn("[RevenueCat] load failed", error);
      setLastError(summarizeError(error));
    } finally {
      setLoading(false);
    }
  }, [syncBackend, userId]);

  useEffect(() => { void loadRevenueCat(); }, [loadRevenueCat]);

  const unlock = async (customerInfo: any, action: "purchase" | "restore") => {
    if (!hasRevenueCatEntitlement(customerInfo)) {
      throw new Error(`${REVENUECAT_ENTITLEMENT_ID} is not active after ${action}. Check the product-to-entitlement attachment in RevenueCat.`);
    }
    setEntitlementActive(true);
    await syncBackend();
    Alert.alert("Premium unlocked", "Your RevenueCat subscription is active on this account.");
    nav.navigate("Profile");
  };

  const handleBuy = async () => {
    if (!userId) { Alert.alert("Sign in required", "Please sign in before upgrading."); nav.navigate("Auth"); return; }
    if (!purchasePackage) { Alert.alert("RevenueCat not ready", lastError || "No package is available."); return; }
    setBusy(true); setLastError(null);
    try {
      const purchases = await ensureRevenueCatConfigured(userId);
      const result = await purchases.purchasePackage(purchasePackage);
      await unlock(result.customerInfo, "purchase");
    } catch (error: any) {
      if (!error?.userCancelled) {
        const message = summarizeError(error);
        setLastError(message);
        logWarn("[RevenueCat] purchase failed", error);
        Alert.alert("Purchase failed", message);
      }
    } finally { setBusy(false); }
  };

  const handleRestore = async () => {
    if (!userId) { Alert.alert("Sign in required", "Please sign in before restoring."); nav.navigate("Auth"); return; }
    setBusy(true); setLastError(null);
    try {
      const purchases = await ensureRevenueCatConfigured(userId);
      await unlock(await purchases.restorePurchases(), "restore");
    } catch (error: any) {
      const message = summarizeError(error);
      setLastError(message);
      Alert.alert("Restore failed", message);
    } finally { setBusy(false); }
  };

  const diagnostics = useMemo(() => [
    "provider=RevenueCat",
    `platform=${Platform.OS}`,
    `configured=${String(configured)}`,
    `offering=${offeringId || "missing"}`,
    `package=${purchasePackage?.identifier || "missing"}`,
    `product=${purchasePackage?.product?.identifier || PRODUCT_ID}`,
    `entitlement=${REVENUECAT_ENTITLEMENT_ID}`,
    `entitlementActive=${String(entitlementActive)}`,
    ...(lastError ? [`lastError=${lastError}`] : []),
  ], [configured, entitlementActive, lastError, offeringId, purchasePackage]);

  return <PaywallShell
    priceLabel={purchasePackage?.product?.priceString || "$3.99"}
    metaText={loading ? "Loading RevenueCat offering..." : entitlementActive ? "RevenueCat entitlement is active." : purchasePackage ? "RevenueCat is ready." : "RevenueCat configuration needs attention."}
    diagnostics={diagnostics} onBuy={handleBuy} onRestore={handleRestore} busy={busy || loading}
  />;
}

export default function PaywallScreen() { return Platform.OS === "web" ? <WebPaywall /> : <NativePaywall />; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" }, container: { flex: 1, padding: 24, gap: 16 },
  kicker: { color: "#A5B4FC", fontSize: 13, fontWeight: "700" }, title: { color: "#F9FAFB", fontSize: 26, fontWeight: "800", marginTop: 4 },
  subtitle: { color: "#9CA3AF", fontSize: 14, marginTop: 4 }, card: { backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#1F2937", borderRadius: 16, padding: 16, gap: 8 },
  cardTitle: { color: "#E5E7EB", fontSize: 15, fontWeight: "800" }, bullet: { color: "#E5E7EB", fontSize: 14 }, meta: { color: "#9CA3AF", fontSize: 12, marginTop: 6 },
  diagnosticsBox: { marginTop: 8, borderWidth: 1, borderColor: "#1F2937", borderRadius: 12, backgroundColor: "#07111F", padding: 10, gap: 4 }, diagnosticsText: { color: "#94A3B8", fontSize: 11 },
  primary: { backgroundColor: "#22C55E", paddingVertical: 14, borderRadius: 12, alignItems: "center", minHeight: 52, justifyContent: "center" }, primaryDisabled: { opacity: 0.7 },
  primaryText: { color: "#022C22", fontSize: 15, fontWeight: "800" }, secondary: { alignItems: "center", paddingVertical: 10 }, secondaryText: { color: "#9CA3AF", fontSize: 14, fontWeight: "700" },
});
