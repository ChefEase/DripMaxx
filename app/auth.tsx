import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { apiFetch, apiJsonHeaders } from "../lib/api";
import { syncAuthenticatedUser } from "../lib/authProfile";
import { startOAuthSignIn, type OAuthProvider } from "../lib/oauth";
import { logWarn } from "../lib/logger";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";
import { colors, useThemedStyles } from "./ui/theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AuthScreen() {
  const styles = useThemedStyles(baseStyles);
  const nav = useNavigation<Nav>();
  const { setUserId, setUserEmail, setUsername, setDisplayName, setAvatarUrl } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active || !data.session?.user) return;
        await syncAuthenticatedUser(data.session.user, {
          setUserId,
          setUserEmail,
          setUsername,
          setDisplayName,
          setAvatarUrl,
        });
        if (active) {
          nav.navigate("ValueProposition", { celebrate: true });
        }
      })
      .catch((e) => logWarn("auth screen session check failed", e));

    return () => {
      active = false;
    };
  }, [nav, setAvatarUrl, setDisplayName, setUserEmail, setUserId, setUsername]);

  const doSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Enter email and password.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        const message = String(error.message || "").toLowerCase();
        if (message.includes("email not confirmed") || message.includes("confirm")) {
          Alert.alert("Please confirm your email", "Check your email, then sign in after confirming your account.");
          return;
        }
        throw error;
      }

      const userId = data.user?.id;
      if (!userId) throw new Error("No user returned");

      const usernameFromMeta = String(data.user?.user_metadata?.username || "")
        .trim()
        .toLowerCase();
      const fallbackName = normalizedEmail.split("@")[0] || "user";
      const resolvedUsername = usernameFromMeta || fallbackName;

      setUserId(userId);
      setUserEmail(normalizedEmail);
      setUsername(resolvedUsername);
      setDisplayName(resolvedUsername);

      try {
        await apiFetch("/v1/profile/sync", {
          method: "POST",
          headers: apiJsonHeaders(),
          body: JSON.stringify({
            user_id: userId,
            username: resolvedUsername,
            email: normalizedEmail,
            display_name: resolvedUsername,
          }),
        });
      } catch (e) {
        logWarn("profile sync on login failed", e);
      }

      nav.navigate("ValueProposition", { celebrate: true });
    } catch (err: any) {
      Alert.alert("Auth error", err.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  const doOAuthSignIn = async (provider: OAuthProvider) => {
    setOauthLoading(provider);
    try {
      await startOAuthSignIn(provider);
    } catch (err: any) {
      Alert.alert("Sign in failed", err.message || "Try again.");
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.authGlow} pointerEvents="none" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.onboardingVisual}>
          <Image source={require("../assets/editorial/hero-onboarding.jpg")} style={styles.onboardingImage} resizeMode="cover" />
          <View style={styles.onboardingShade} />
          <Text style={styles.onboardingLabel}>YOUR STYLE, MADE CLEAR</Text>
        </View>
        <View style={styles.brandPanel}>
          <Text style={styles.brandKicker}>DripMaxx</Text>
          <Text style={styles.title}>Step into your style lab.</Text>
          <Text style={styles.subtitle}>
            Save scans, build XP, enter challenges, and track your best outfits.
          </Text>
          <View style={styles.previewStrip}>
            <View style={styles.previewTile}>
              <Text style={styles.previewValue}>92</Text>
              <Text style={styles.previewLabel}>Score</Text>
            </View>
            <View style={styles.previewTile}>
              <Text style={styles.previewValue}>+10</Text>
              <Text style={styles.previewLabel}>XP</Text>
            </View>
            <View style={styles.previewTile}>
              <Text style={styles.previewValue}>Top</Text>
              <Text style={styles.previewLabel}>Fit</Text>
            </View>
          </View>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6B7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <Pressable
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={doSignIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Working..." : "Sign In"}
          </Text>
        </Pressable>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
        <Pressable
          style={[styles.socialButton, oauthLoading === "google" && { opacity: 0.7 }]}
          onPress={() => doOAuthSignIn("google")}
          disabled={!!oauthLoading}
        >
          <Text style={styles.socialIcon}>G</Text>
          <Text style={styles.socialText}>
            {oauthLoading === "google" ? "Opening Google..." : "Continue with Google"}
          </Text>
        </Pressable>
        {Platform.OS === "ios" ? (
          <Pressable
            style={[styles.appleButton, oauthLoading === "apple" && { opacity: 0.7 }]}
            onPress={() => doOAuthSignIn("apple")}
            disabled={!!oauthLoading}
          >
            <Text style={styles.appleIcon}>A</Text>
            <Text style={styles.appleText}>
              {oauthLoading === "apple" ? "Opening Apple..." : "Continue with Apple"}
            </Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.linkButton} onPress={() => nav.navigate("SignUp")}>
          <Text style={styles.linkText}>Create account</Text>
        </Pressable>
        <Pressable style={styles.linkButton} onPress={() => nav.navigate("ForgotPassword")}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>
        <Pressable style={styles.linkButton} onPress={() => nav.navigate("ResetPassword")}>
          <Text style={styles.linkText}>Have a reset link? Update password</Text>
        </Pressable>
        <View style={styles.legalRow}>
          <Pressable style={styles.legalLink} onPress={() => nav.navigate("Legal", { doc: "terms" })}>
            <Text style={styles.legalText}>Terms of Service</Text>
          </Pressable>
          <Pressable style={styles.legalLink} onPress={() => nav.navigate("Legal", { doc: "privacy" })}>
            <Text style={styles.legalText}>Privacy Policy</Text>
          </Pressable>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.ink },
  keyboardView: { flex: 1 },
  authGlow: {
    position: "absolute",
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#14532D",
    opacity: 0.7,
  },
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 14,
    justifyContent: "center",
  },
  onboardingVisual: { width: "100%", height: 260, borderRadius: 28, overflow: "hidden", position: "relative", backgroundColor: colors.surface },
  onboardingImage: { width: "100%", height: "100%" },
  onboardingShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,10,12,0.34)" },
  onboardingLabel: { position: "absolute", left: 14, bottom: 14, color: "#FEFEFE", backgroundColor: "rgba(8,10,12,0.84)", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  brandPanel: {
    borderWidth: 1,
    borderColor: "#204B3A",
    borderRadius: 22,
    backgroundColor: "#061A14",
    padding: 18,
    gap: 12,
    marginBottom: 4,
  },
  brandKicker: {
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: { color: "#F9FAFB", fontSize: 28, fontWeight: "900", lineHeight: 33 },
  subtitle: { color: "#D1FAE5", fontSize: 14, lineHeight: 20, fontWeight: "600" },
  previewStrip: { flexDirection: "row", gap: 8 },
  previewTile: {
    flex: 1,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#123027",
    borderRadius: 14,
    padding: 10,
    gap: 3,
  },
  previewValue: { color: "#F8FAFC", fontSize: 18, fontWeight: "900" },
  previewLabel: { color: "#86EFAC", fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  input: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    color: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  button: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#022C22", fontWeight: "800", fontSize: 15 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#1F2937" },
  dividerText: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  socialButton: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  socialIcon: { color: "#111827", fontWeight: "900", fontSize: 16 },
  socialText: { color: "#111827", fontWeight: "800", fontSize: 15 },
  appleButton: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  appleIcon: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  appleText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  linkButton: { alignItems: "center", paddingVertical: 8 },
  linkText: { color: "#A5B4FC", fontWeight: "700" },
  legalRow: { marginTop: 8, flexDirection: "row", justifyContent: "center", gap: 18 },
  legalLink: { paddingVertical: 8 },
  legalText: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
});
