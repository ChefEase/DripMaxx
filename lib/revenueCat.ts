import { Platform } from "react-native";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

export const REVENUECAT_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || "DripMaxx Pro";

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
  return Boolean(customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_ID]);
}
