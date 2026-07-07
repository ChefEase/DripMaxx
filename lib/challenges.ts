import { apiFetch } from "./api";
import { logWarn } from "./logger";

export type ActiveAnnouncement = {
  id: string;
  title: string;
  body?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type ActiveChallenge = {
  id: string;
  title: string;
  description?: string | null;
  reward_scans: number;
  reward_xp: number;
  participation_xp: number;
  winner_xp: number;
  starts_at: string;
  ends_at: string;
  winner_submission_id?: string | null;
  winner_selected_at?: string | null;
};

export type ActiveChallengePayload = {
  announcement: ActiveAnnouncement | null;
  challenge: ActiveChallenge | null;
};

export type ChallengeSubmission = {
  id: string;
  challenge_id: string;
  user_id: string;
  outfit_id: string;
  image_url?: string | null;
  display_name?: string | null;
  admin_rank?: number | null;
  admin_points: number;
  user_vote_points: number;
  final_points: number;
  created_at: string;
};

export type ChallengeResults = {
  challenge_id: string;
  winner_submission_id?: string | null;
  winner_selected_at?: string | null;
  viewer_vote_submission_id?: string | null;
  submissions: ChallengeSubmission[];
};

export const fetchActiveChallenge = async (): Promise<ActiveChallengePayload | null> => {
  try {
    const response = await apiFetch("/v1/challenges/active", { auth: "none" });
    if (!response.ok) {
      logWarn("[challenges] active fetch failed", response.status);
      return null;
    }
    return (await response.json()) as ActiveChallengePayload;
  } catch (error) {
    logWarn("[challenges] active fetch error", error);
    return null;
  }
};

export const fetchChallengeResults = async (challengeId: string): Promise<ChallengeResults> => {
  const response = await apiFetch(`/v1/challenges/${encodeURIComponent(challengeId)}/results`, {
    auth: "optional",
  });
  if (!response.ok) {
    throw new Error(`Challenge results ${response.status}`);
  }
  const data = await response.json();
  return {
    challenge_id: data.challenge_id || challengeId,
    winner_submission_id: data.winner_submission_id || null,
    winner_selected_at: data.winner_selected_at || null,
    viewer_vote_submission_id: data.viewer_vote_submission_id || null,
    submissions: data.submissions || [],
  };
};
