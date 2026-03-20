/**
 * Get device country code for rankings. Uses expo-localization.
 * Returns e.g. "US", "GB", or null if unavailable.
 */
import * as Localization from "expo-localization";

export function getDeviceCountry(): string | null {
  try {
    const locales = Localization.getLocales();
    const regionCode = locales[0]?.regionCode;
    if (regionCode && regionCode.length === 2) {
      return regionCode;
    }
    // Fallback: parse languageTag "en-US" -> "US"
    const tag = locales[0]?.languageTag;
    if (tag && tag.includes("-")) {
      const parts = tag.split("-");
      const region = parts[parts.length - 1];
      if (region && region.length === 2) return region.toUpperCase();
    }
    return null;
  } catch (e) {
    console.warn("[deviceLocale] getDeviceCountry failed", e);
    return null;
  }
}

export function getDeviceLocale(): string | null {
  try {
    return Localization.getLocales()[0]?.languageTag ?? null;
  } catch {
    return null;
  }
}
