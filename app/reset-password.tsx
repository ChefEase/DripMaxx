import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useNavigation } from "@react-navigation/native";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ResetPasswordScreen() {
  const nav = useNavigation<Nav>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!password || !confirm) {
      Alert.alert("Missing info", "Enter and confirm your new password.");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords do not match", "Please re-enter.");
      return;
    }
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        throw new Error(
          "Reset link not active. Open the reset link from your email, then return to this screen."
        );
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      Alert.alert("Password updated", "Sign in with your new password.", [
        { text: "OK", onPress: () => nav.navigate("Auth") },
      ]);
    } catch (err: any) {
      Alert.alert("Update failed", err.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.subtitle}>
          Enter your new password. If you came from the email reset link, keep this app open to finish.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="New password"
          placeholderTextColor="#6B7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          placeholderTextColor="#6B7280"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />
        <Pressable
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleUpdate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Updating..." : "Update password"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#020617" },
  container: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  title: { color: "#F9FAFB", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#9CA3AF", fontSize: 14, marginBottom: 8, lineHeight: 20 },
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
});
