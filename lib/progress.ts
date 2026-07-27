import { apiFetch } from "./api";
import { logWarn } from "./logger";

export type StyleProgress = {
  style: string;
  scans: number;
  average_score: number;
  improvement_points: number;
};

export type ProgressInsights = {
  outfits_scanned: number;
  current_streak_days: number;
  average_score: number;
  improvement_points: number;
  better_than_percent: number;
  style_progress: StyleProgress[];
};

export const fetchProgressInsights = async (
  userId?: string | null
): Promise<ProgressInsights | null> => {
  if (!userId) return null;
  try {
    const response = await apiFetch(
      `/v1/profile/progress-insights?user_id=${encodeURIComponent(userId)}`
    );
    if (!response.ok) {
      logWarn("[progress] insights fetch failed", response.status);
      return null;
    }
    return (await response.json()) as ProgressInsights;
  } catch (error) {
    logWarn("[progress] insights fetch error", error);
    return null;
  }
};
