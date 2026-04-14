import { apiFetch, apiJsonHeaders } from "./api";
import { logWarn } from "./logger";

export const trackEvent = async (
  name: string,
  payload: Record<string, any> = {},
  userId?: string | null
) => {
  try {
    await apiFetch("/v1/events", {
      auth: "optional",
      method: "POST",
      headers: apiJsonHeaders(),
      body: JSON.stringify({ name, payload, user_id: userId || null }),
    });
  } catch (err) {
    logWarn("trackEvent failed", name, err);
  }
};
