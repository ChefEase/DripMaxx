import AsyncStorage from "@react-native-async-storage/async-storage";

export type AttributionTouch = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  creator?: string;
  captured_at: string;
};

export type StoredAttribution = {
  first_touch: AttributionTouch;
  last_touch: AttributionTouch;
};

const ATTRIBUTION_KEY = "dripmaxx:growth_attribution:v1";
const ANONYMOUS_ID_KEY = "dripmaxx:anonymous_id:v1";
const SYNCED_USER_KEY = "dripmaxx:attribution_synced_user:v1";
const MAX_VALUE_LENGTH = 120;

const clean = (value: string | null) => {
  const normalized = value?.trim().slice(0, MAX_VALUE_LENGTH);
  return normalized || undefined;
};

const readStored = async (): Promise<StoredAttribution | null> => {
  const raw = await AsyncStorage.getItem(ATTRIBUTION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAttribution;
  } catch {
    return null;
  }
};

export const getAnonymousId = async () => {
  const existing = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing) return existing;
  const generated = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(ANONYMOUS_ID_KEY, generated);
  return generated;
};

export const getAttribution = readStored;

export const captureAttributionFromUrl = async (url: string | null) => {
  if (!url) return null;
  try {
    const [beforeHash, hash = ""] = url.split("#");
    const query = beforeHash.includes("?") ? beforeHash.split("?").slice(1).join("?") : "";
    const params = new URLSearchParams(query);
    new URLSearchParams(hash).forEach((value, key) => params.set(key, value));
    const touch: AttributionTouch = {
      source: clean(params.get("utm_source") || params.get("source")),
      medium: clean(params.get("utm_medium") || params.get("medium")),
      campaign: clean(params.get("utm_campaign") || params.get("campaign") || params.get("ct")),
      content: clean(params.get("utm_content") || params.get("content")),
      term: clean(params.get("utm_term") || params.get("term")),
      creator: clean(params.get("creator") || params.get("ref") || params.get("referral_code")),
      captured_at: new Date().toISOString(),
    };
    if (!touch.source && !touch.medium && !touch.campaign && !touch.content && !touch.term && !touch.creator) {
      return readStored();
    }
    const existing = await readStored();
    const stored = { first_touch: existing?.first_touch || touch, last_touch: touch };
    await AsyncStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(stored));
    return stored;
  } catch {
    return readStored();
  }
};

export const shouldSyncAttributionForUser = async (userId: string) => {
  const syncedUser = await AsyncStorage.getItem(SYNCED_USER_KEY);
  return syncedUser !== userId;
};

export const markAttributionSynced = (userId: string) =>
  AsyncStorage.setItem(SYNCED_USER_KEY, userId);
