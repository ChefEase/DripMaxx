/**
 * Get device country code for rankings. Uses expo-localization.
 * Returns e.g. "CA", "US", or null if unavailable. A known country-specific
 * timezone takes priority because many people keep a different language region.
 */
import * as Localization from "expo-localization";

export function getDeviceCountry(): string | null {
  try {
    const timeZone = Localization.getCalendars()[0]?.timeZone;
    const canadianTimeZones = new Set([
      "America/St_Johns",
      "America/Halifax",
      "America/Glace_Bay",
      "America/Moncton",
      "America/Goose_Bay",
      "America/Blanc-Sablon",
      "America/Toronto",
      "America/Nipigon",
      "America/Thunder_Bay",
      "America/Iqaluit",
      "America/Pangnirtung",
      "America/Atikokan",
      "America/Winnipeg",
      "America/Rainy_River",
      "America/Resolute",
      "America/Rankin_Inlet",
      "America/Regina",
      "America/Swift_Current",
      "America/Edmonton",
      "America/Cambridge_Bay",
      "America/Yellowknife",
      "America/Inuvik",
      "America/Creston",
      "America/Dawson_Creek",
      "America/Fort_Nelson",
      "America/Vancouver",
      "America/Whitehorse",
      "America/Dawson",
    ]);
    if (timeZone && canadianTimeZones.has(timeZone)) return "CA";

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
