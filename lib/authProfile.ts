import type { User } from "@supabase/supabase-js";

import { apiFetch, apiJsonHeaders } from "./api";
import { logWarn } from "./logger";

type StoreAuthSetters = {
  setUserId: (value: string | null) => void;
  setUserEmail: (value: string | null) => void;
  setUsername: (value: string | null) => void;
  setDisplayName: (value: string | null) => void;
  setAvatarUrl?: (value: string | null) => void;
};

const cleanUsernamePart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

export const deriveAuthProfile = (user: User) => {
  const email = user.email?.trim().toLowerCase() || null;
  const metadata = user.user_metadata || {};
  const rawName = String(metadata.username || metadata.name || metadata.full_name || "").trim();
  const displayName = rawName || email?.split("@")[0] || "DripMaxx user";
  const base = cleanUsernamePart(String(metadata.username || email?.split("@")[0] || rawName || "user"));
  const suffix = user.id.replace(/-/g, "").slice(0, 6).toLowerCase();
  const usernameBase = base || "user";
  const username = `${usernameBase.slice(0, Math.max(3, 19 - suffix.length))}_${suffix}`.slice(0, 20);
  const avatarUrl = String(metadata.avatar_url || metadata.picture || "").trim() || null;

  return {
    userId: user.id,
    email,
    username,
    displayName,
    avatarUrl,
  };
};

export const syncAuthenticatedUser = async (user: User, setters: StoreAuthSetters) => {
  const profile = deriveAuthProfile(user);

  setters.setUserId(profile.userId);
  setters.setUserEmail(profile.email);
  setters.setUsername(profile.username);
  setters.setDisplayName(profile.displayName);
  setters.setAvatarUrl?.(profile.avatarUrl);

  try {
    await apiFetch("/v1/profile/sync", {
      method: "POST",
      headers: apiJsonHeaders(),
      body: JSON.stringify({
        user_id: profile.userId,
        username: profile.username,
        email: profile.email,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl,
      }),
    });
  } catch (e) {
    logWarn("profile sync on OAuth login failed", e);
  }

  return profile;
};
