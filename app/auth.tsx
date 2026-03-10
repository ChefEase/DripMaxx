import React, { useState, useEffect } from "react"; // <-- add useEffect
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { supabase } from "./lib/supabase";
import { useStore } from "./store";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AuthScreen() {
  const nav = useNavigation<Nav>();
  const { setUserId, setUserEmail, setUsername, setDisplayName } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Test Supabase session on mount
  useEffect(() => {
    const testSupabase = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        console.log("Supabase session test:", data, error);
        if (error) console.warn("Supabase test error:", error.message);
      } catch (err) {
        console.error("Supabase test failed:", err);
      }
    };

    testSupabase();
  }, []);

  const doSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Missing info", "Enter email and password.");
      return;
    }
  
    setLoading(true);
  
    try {
      console.log("Attempting sign in", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
  
      console.log("Supabase response:", data, error);
  
      if (error) throw error;
  
      const userId = data.user?.id;
      if (!userId) throw new Error("No user returned");
      const usernameFromMeta = String(data.user?.user_metadata?.username || "").trim().toLowerCase();
      const fallbackName = email?.split("@")[0] || "user";
      const resolvedUsername = usernameFromMeta || fallbackName;

      setUserId(userId);
      setUserEmail(email);
      setUsername(resolvedUsername);
      setDisplayName(resolvedUsername);
      // sync to backend users table
      try {
        const base = process.env.EXPO_PUBLIC_API_BASE?.trim() || "http://127.0.0.1:8000";
        await fetch(`${base}/v1/profile/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, username: resolvedUsername, email, display_name: resolvedUsername }),
        });
      } catch (e) {
        console.warn("profile sync on login failed", e);
      }
      nav.navigate("ValueProposition", { celebrate: true });

    } catch (err: any) {
      console.error("Auth error:", err);
      Alert.alert("Auth error", err.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    nav.navigate("ForgotPassword");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Sign in to DripMaxx</Text>
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
        <Pressable
          style={styles.linkButton}
          onPress={() => nav.navigate("SignUp")}
        >
          <Text style={styles.linkText}>Create account</Text>
        </Pressable>
        <Pressable style={styles.linkButton} onPress={() => nav.navigate("ForgotPassword")}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Pressable>
        <Pressable style={styles.linkButton} onPress={() => nav.navigate("ResetPassword")}>
          <Text style={styles.linkText}>Have a reset link? Update password</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  container: {
    flex: 1,
    padding: 24,
    gap: 14,
    justifyContent: "center",
  },
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
