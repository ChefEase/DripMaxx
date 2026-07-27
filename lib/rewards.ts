import { apiFetch } from "./api";
import { logWarn } from "./logger";

export type RewardsSummary = {
  xp: number;
  scan_credits: number;
  xp_per_scan_reward: number;
  xp_until_next_reward: number;
  badges?: {
    id: string;
    badge_key: string;
    label: string;
    rank: number;
    scope: string;
    category: string;
    earned_at: string | null;
  }[];
};

export const fetchRewardsSummary = async (userId?: string | null): Promise<RewardsSummary | null> => {
  if (!userId) return null;
  try {
    const response = await apiFetch(`/v1/rewards/me?user_id=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      logWarn("[rewards] fetch failed", response.status);
      return null;
    }
    return (await response.json()) as RewardsSummary;
  } catch (error) {
    logWarn("[rewards] fetch error", error);
    return null;
  }
};
