import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { apiFetch, apiJsonHeaders } from "../lib/api";
import { logWarn } from "../lib/logger";
import {
  ensureRevenueCatConfigured,
  getActiveRevenueCatEntitlementIds,
  hasRevenueCatEntitlement,
  REVENUECAT_ENTITLEMENT_ID,
} from "../lib/revenueCat";
import { useStore } from "../store";
import { colors, useAppTheme, useThemedStyles } from "./ui/theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PRODUCT_ID = Platform.OS === "ios"
  ? process.env.EXPO_PUBLIC_IOS_PREMIUM_PRODUCT_ID || "dripmaxx_premium_monthly"
  : process.env.EXPO_PUBLIC_ANDROID_PREMIUM_PRODUCT_ID || "dripmaxx_premium_monthly";

function PaywallShell({ priceLabel, metaText, diagnostics, onBuy, onRestore, busy, premiumActive = false }: {
  priceLabel: string;
  metaText: string;
  diagnostics: string[];
  onBuy: () => void;
  onRestore: () => void;
  busy: boolean;
  premiumActive?: boolean;
}) {
  const nav = useNavigation<Nav>();
  const styles = useThemedStyles(baseStyles);
  const { theme } = useAppTheme();
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.kicker}>DRIPMAXX+</Text>
          <Text style={styles.title}>More looks. More progress.</Text>
          <Text style={styles.subtitle}>Keep improving without waiting for your next free scan.</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.price}>{priceLabel}<Text style={styles.priceUnit}> / month</Text></Text>
          <Text style={styles.cardTitle}>Everything you need to level up</Text>
          <Text style={styles.bullet}>✓ Unlimited outfit scans</Text>
          <Text style={styles.bullet}>✓ Full score breakdown and priority fixes</Text>
          <Text style={styles.bullet}>✓ Save, compare and track your best looks</Text>
          <Text style={styles.meta}>{metaText}</Text>
        </View>
        <Pressable style={[styles.primary, (busy || premiumActive) && styles.primaryDisabled]} onPress={onBuy} disabled={busy || premiumActive}>
          {busy ? <ActivityIndicator color={theme.colors.limeInk} /> : <Text style={styles.primaryText}>{premiumActive ? "Premium Active" : "Upgrade to Premium"}</Text>}
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
  const [activeEntitlementIds, setActiveEntitlementIds] = useState<string[]>([]);

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
      setActiveEntitlementIds(getActiveRevenueCatEntitlementIds(customerInfo));
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
    const activeIds = getActiveRevenueCatEntitlementIds(customerInfo);
    setActiveEntitlementIds(activeIds);
    if (!hasRevenueCatEntitlement(customerInfo)) {
      throw new Error(`${REVENUECAT_ENTITLEMENT_ID} is not active after ${action}. Active entitlement IDs: ${activeIds.join(", ") || "none"}.`);
    }
    setEntitlementActive(true);
    await syncBackend();
    Alert.alert(
      action === "restore" ? "Purchase restored" : "Premium unlocked",
      "Your RevenueCat subscription is active on this account.",
      [{ text: "OK", onPress: () => nav.navigate("Profile") }],
    );
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
      const restoredCustomerInfo = await purchases.restorePurchases();
      const activeIds = getActiveRevenueCatEntitlementIds(restoredCustomerInfo);
      setActiveEntitlementIds(activeIds);
      if (!hasRevenueCatEntitlement(restoredCustomerInfo)) {
        setEntitlementActive(false);
        const message = "No active DripMaxx Premium purchase was found for this App Store or Google Play account. A cancelled subscription can only be restored while its paid period is still active; after it expires, subscribe again to regain Premium.";
        setLastError(message);
        Alert.alert("No active purchase found", message);
        return;
      }
      await unlock(restoredCustomerInfo, "restore");
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
    `activeEntitlements=${activeEntitlementIds.join(",") || "none"}`,
    `entitlementActive=${String(entitlementActive)}`,
    ...(lastError ? [`lastError=${lastError}`] : []),
  ], [activeEntitlementIds, configured, entitlementActive, lastError, offeringId, purchasePackage]);

  return <PaywallShell
    priceLabel={purchasePackage?.product?.priceString || "$3.99"}
    metaText={loading ? "Loading RevenueCat offering..." : entitlementActive ? "RevenueCat entitlement is active." : purchasePackage ? "RevenueCat is ready." : "RevenueCat configuration needs attention."}
    diagnostics={diagnostics} onBuy={handleBuy} onRestore={handleRestore} busy={busy || loading} premiumActive={entitlementActive}
  />;
}

export default function PaywallScreen() { return Platform.OS === "web" ? <WebPaywall /> : <NativePaywall />; }

const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.ink }, container: { flex: 1, padding: 24, gap: 18, justifyContent: "center" },
  kicker: { color: colors.lime, fontSize: 11, fontWeight: "900", letterSpacing: 1.6 }, title: { color: colors.text, fontSize: 36, lineHeight: 40, fontWeight: "900", marginTop: 8, letterSpacing: -1 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 8 }, card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 26, padding: 20, gap: 12 },
  price: { color: colors.text, fontSize: 32, fontWeight: "900" }, priceUnit: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
  cardTitle: { color: "#E5E7EB", fontSize: 15, fontWeight: "800" }, bullet: { color: "#E5E7EB", fontSize: 14 }, meta: { color: "#9CA3AF", fontSize: 12, marginTop: 6 },
  diagnosticsBox: { marginTop: 8, borderWidth: 1, borderColor: "#1F2937", borderRadius: 12, backgroundColor: "#07111F", padding: 10, gap: 4 }, diagnosticsText: { color: "#94A3B8", fontSize: 11 },
  primary: { backgroundColor: colors.lime, paddingVertical: 14, borderRadius: 18, alignItems: "center", minHeight: 56, justifyContent: "center" }, primaryDisabled: { opacity: 0.7 },
  primaryText: { color: colors.limeInk, fontSize: 15, fontWeight: "900" }, secondary: { alignItems: "center", paddingVertical: 10 }, secondaryText: { color: colors.textMuted, fontSize: 14, fontWeight: "700" },
});
