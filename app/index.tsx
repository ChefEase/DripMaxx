import React, { useEffect } from "react";
import { SafeAreaView, View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ValuePropositionScreen() {
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    console.log("[ValuePropositionScreen] mounted");
    return () => {
      console.log("[ValuePropositionScreen] unmounted");
    };
  }, []);

  const handleGetStarted = () => {
    console.log("[ValuePropositionScreen] Get Started pressed");
    navigation.navigate("StylePreference");
  };

  const handleSeeExample = () => {
    console.log("[ValuePropositionScreen] See Example pressed");
    navigation.navigate("Scan");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.logo}>DripMaxx</Text>
          <Text style={styles.title}>Rate Your Outfit Instantly With AI</Text>
          <Text style={styles.subtitle}>
            Scan your outfit and get a Drip Score, style feedback, and
            improvement suggestions.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={handleGetStarted}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleSeeExample}>
            <Text style={styles.secondaryButtonText}>See Example</Text>
          </Pressable>
        </View>

        <Text style={styles.helperText}>
          First outfit rating within ~60 seconds of opening the app.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#020617",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "space-between",
  },
  logo: {
    fontSize: 22,
    fontWeight: "700",
    color: "#22C55E",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F9FAFB",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#9CA3AF",
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#22C55E",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#022C22",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#4B5563",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#E5E7EB",
    fontSize: 16,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
});

