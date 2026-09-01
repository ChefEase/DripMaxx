import { apiFetch, apiJsonHeaders } from "./api";
import { Platform } from "react-native";
import { getAnonymousId, getAttribution } from "./attribution";
import { logWarn } from "./logger";

export const trackEvent = async (
  name: string,
  payload: Record<string, any> = {},
  userId?: string | null
) => {
  try {
    const [anonymousId, attribution] = await Promise.all([
      getAnonymousId(),
      getAttribution(),
    ]);
    const response = await apiFetch("/v1/events", {
      auth: "optional",
      method: "POST",
      headers: apiJsonHeaders(),
      body: JSON.stringify({
        name,
        anonymous_id: anonymousId,
        payload: {
          ...payload,
          platform: Platform.OS,
          ...(attribution ? { attribution } : {}),
        },
      }),
    });
    if (!response.ok) throw new Error(`analytics request failed with ${response.status}`);
    return true;
  } catch (err) {
    logWarn("trackEvent failed", name, err);
    return false;
  }
};
