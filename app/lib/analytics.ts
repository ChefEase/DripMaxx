export const trackEvent = async (
  name: string,
  payload: Record<string, any> = {},
  userId?: string | null
) => {
  try {
    const base = process.env.EXPO_PUBLIC_API_BASE?.trim() || "http://127.0.0.1:8000";
    await fetch(`${base}/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, payload, user_id: userId || null }),
    });
  } catch (err) {
    console.warn("trackEvent failed", name, err);
  }
};
