import * as Linking from "expo-linking";
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
    Linking.openURL(result.url);
    return;
  }

  if (result.type === "cancel") {
    throw new Error("Sign in was cancelled.");
  }

  throw new Error("Sign in did not complete.");
};
