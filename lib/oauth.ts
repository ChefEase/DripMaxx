import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "./supabase";

export type OAuthProvider = "google" | "apple";

WebBrowser.maybeCompleteAuthSession();

export const getOAuthRedirectUrl = () => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  return "acme://auth/callback";
};

export const startOAuthSignIn = async (provider: OAuthProvider) => {
  const redirectTo = getOAuthRedirectUrl();
  if (Platform.OS === "web") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data.url) throw new Error("Could not start sign in.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === "success") {
    const [beforeHash, hash = ""] = result.url.split("#");
    const query = beforeHash.includes("?") ? beforeHash.split("?").slice(1).join("?") : "";
    const params = new URLSearchParams(hash || query);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const code = params.get("code");

    const { error: sessionError } =
      accessToken && refreshToken
        ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        : code
          ? await supabase.auth.exchangeCodeForSession(code)
          : { error: new Error("Google did not return a session to the app.") };
    if (sessionError) throw sessionError;
    return;
  }

  if (result.type === "cancel") {
    throw new Error("Sign in was cancelled.");
  }

  throw new Error("Sign in did not complete.");
};
