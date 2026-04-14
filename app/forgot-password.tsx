import React, { useState } from "react";
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import * as Linking from "expo-linking";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ForgotPasswordScreen() {
  const nav = useNavigation<Nav>();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const sendReset = async () => {
    if (!email) {
      Alert.alert("Enter email", "We need your email to send a reset link.");
      return;
    }
    setLoading(true);
    try {
      const redirect = Linking.createURL("reset-password", { isTripleSlashed: true });
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });
      if (error) throw error;
      Alert.alert("Check your email", "We sent a password reset link.", [
        { text: "OK", onPress: () => nav.navigate("Auth") },
      ]);
    } catch (err: any) {
      Alert.alert("Reset failed", err.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>Enter your email and we’ll send you a reset link.</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Pressable style={[styles.button, loading && { opacity: 0.7 }]} onPress={sendReset} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Sending..." : "Send reset link"}</Text>
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
  subtitle: { color: "#9CA3AF", fontSize: 14 },
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
