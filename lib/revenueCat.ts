import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

export const REVENUECAT_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID?.trim() || "DripMaxx Pro";

const ENTITLEMENT_ALIASES = [REVENUECAT_ENTITLEMENT_ID, "DripMaxx Pro", "pro"];
const normalizeEntitlementId = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const platformApiKey = () =>
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export async function ensureRevenueCatConfigured(appUserId: string) {
  if (Platform.OS === "web") throw new Error("RevenueCat billing is mobile only.");
  const apiKey = platformApiKey()?.trim();
  if (!apiKey) {
    throw new Error(
      Platform.OS === "ios"
        ? "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY is missing."
        : "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY is missing."
    );
  }

  await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
  if (!(await Purchases.isConfigured())) {
    Purchases.configure({ apiKey, appUserID: appUserId });
  } else if ((await Purchases.getAppUserID()) !== appUserId) {
    await Purchases.logIn(appUserId);
  }
  return Purchases;
}

export function hasRevenueCatEntitlement(customerInfo: any) {
  const active = customerInfo?.entitlements?.active || {};
  const expected = new Set(ENTITLEMENT_ALIASES.map(normalizeEntitlementId));
  return Object.keys(active).some((identifier) => expected.has(normalizeEntitlementId(identifier)));
}

export function getActiveRevenueCatEntitlementIds(customerInfo: any): string[] {
  return Object.keys(customerInfo?.entitlements?.active || {});
}
