import React, { useState } from "react";
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import * as Linking from "expo-linking";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { apiFetch, apiJsonHeaders } from "../lib/api";
import { logWarn } from "../lib/logger";
import { supabase } from "../lib/supabase";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SignUpScreen() {
  const nav = useNavigation<Nav>();
  const { setUserId, setUserEmail, setUsername, setDisplayName } = useStore();
  const [username, setUsernameInput] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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

      setUserId(userId);
      setUserEmail(normalizedEmail);
      setUsername(normalizedUsername);
      setDisplayName(normalizedUsername);

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
      Alert.alert("Sign up failed", err.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Create your account</Text>
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
        <Pressable style={styles.linkButton} onPress={() => nav.navigate("Auth")}>
          <Text style={styles.linkText}>Back to sign in</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  container: { flex: 1, padding: 24, gap: 14, justifyContent: "center" },
  title: { color: "#F9FAFB", fontSize: 22, fontWeight: "800" },
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
  linkButton: { alignItems: "center", paddingVertical: 8 },
  linkText: { color: "#A5B4FC", fontWeight: "700" },
});
