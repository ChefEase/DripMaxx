import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import * as Linking from "expo-linking";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { useThemedStyles } from "./ui/theme";
import { apiFetch, apiJsonHeaders } from "../lib/api";
import { logWarn } from "../lib/logger";
import { trackEvent } from "../lib/analytics";
import { startOAuthSignIn, type OAuthProvider } from "../lib/oauth";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SignUpScreen() {
  const styles = useThemedStyles(baseStyles);
  const nav = useNavigation<Nav>();
  const { setUserId, setUserEmail, setUsername, setDisplayName } = useStore();
  const [username, setUsernameInput] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

  const handleSignUp = async () => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedUsername || !normalizedEmail || !password) {
      Alert.alert("Missing info", "Enter username, email and password.");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      Alert.alert("Invalid username", "Use 3-20 chars: lowercase letters, numbers, underscore.");
      return;
    }

    setLoading(true);
    void trackEvent("signup_started", { method: "email" });
    try {
      const emailRedirectTo = Linking.createURL("home", { isTripleSlashed: true });
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { username: normalizedUsername },
          emailRedirectTo,
        },
      });

      if (error) {
        const message = String(error.message || "").toLowerCase();
        if (message.includes("already registered") || message.includes("already been registered")) {
          Alert.alert("Account exists", "Account has already been created, sign in.");
          return;
        }
        throw error;
      }

      const identities = Array.isArray(data.user?.identities) ? data.user.identities : [];
      if (data.user && identities.length === 0) {
        Alert.alert("Account exists", "Account has already been created, sign in.");
        return;
      }

      const userId = data.user?.id;
      if (!userId) throw new Error("No user returned");

      if (!data.session) {
        Alert.alert("Please confirm your email", "Check your email, then sign in after confirming your account.", [
          { text: "OK", onPress: () => nav.navigate("Auth") },
        ]);
        return;
      }

      setUserId(userId);
      setUserEmail(normalizedEmail);
      setUsername(normalizedUsername);
      setDisplayName(normalizedUsername);
      void trackEvent("signup_completed", { method: "email" }, userId);

      try {
        await apiFetch("/v1/profile/sync", {
          method: "POST",
          headers: apiJsonHeaders(),
          body: JSON.stringify({
            user_id: userId,
            username: normalizedUsername,
            email: normalizedEmail,
            display_name: normalizedUsername,
          }),
        });
      } catch (e) {
        logWarn("profile sync on sign-up failed", e);
      }

      Alert.alert("Account created", "Check your email to confirm.", [
        { text: "OK", onPress: () => nav.navigate("ValueProposition", { celebrate: true }) },
      ]);
    } catch (err: any) {
      void trackEvent("signup_failed", { method: "email", reason: "provider_error" });
      Alert.alert("Sign up failed", err.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setOauthLoading(provider);
    void trackEvent("signup_started", { method: provider });
    try {
      await startOAuthSignIn(provider);
    } catch (err: any) {
      void trackEvent("signup_failed", { method: provider, reason: "provider_error" });
      Alert.alert("Sign up failed", err.message || "Try again.");
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
        <View style={styles.brandPanel}>
          <Text style={styles.brandKicker}>Join DripMaxx</Text>
          <Text style={styles.title}>Start leveling up your fits.</Text>
          <Text style={styles.subtitle}>
            Create your profile, scan outfits, earn XP, and compete in weekly challenges.
          </Text>
          <View style={styles.previewStrip}>
            <View style={styles.previewTile}>
              <Text style={styles.previewValue}>AI</Text>
              <Text style={styles.previewLabel}>Scans</Text>
            </View>
            <View style={styles.previewTile}>
              <Text style={styles.previewValue}>XP</Text>
              <Text style={styles.previewLabel}>Rewards</Text>
            </View>
            <View style={styles.previewTile}>
              <Text style={styles.previewValue}>Top</Text>
              <Text style={styles.previewLabel}>Ranks</Text>
            </View>
          </View>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Username (e.g. dripking_21)"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsernameInput}
        />
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
        <Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Working..." : "Create account"}</Text>
        </Pressable>
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
        <Pressable
          style={[styles.socialButton, oauthLoading === "google" && { opacity: 0.7 }]}
          onPress={() => handleOAuth("google")}
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
            onPress={() => handleOAuth("apple")}
            disabled={!!oauthLoading}
          >
            <Text style={styles.appleIcon}>A</Text>
            <Text style={styles.appleText}>
              {oauthLoading === "apple" ? "Opening Apple..." : "Continue with Apple"}
            </Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.linkButton} onPress={() => nav.navigate("Auth")}>
          <Text style={styles.linkText}>Back to sign in</Text>
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
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
  container: { flexGrow: 1, padding: 24, gap: 14, justifyContent: "center" },
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
});
