import React, { useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ScanStubScreen() {
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    console.log("[ScanStubScreen] mounted");
    return () => {
      console.log("[ScanStubScreen] unmounted");
    };
  }, []);

  const handleStartScan = () => {
    console.log("[ScanStubScreen] Start Scan pressed");
    // Camera integration + real scan logic will be added in a later task.
  };

  const handleBackToStart = () => {
    console.log("[ScanStubScreen] Back to Start pressed");
    navigation.navigate("ValueProposition");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.stepLabel}>Core Experience</Text>
          <Text style={styles.title}>Scan your outfit</Text>
          <Text style={styles.subtitle}>
            This is the core scan screen. We&apos;ll wire up the camera and AI
            rating in later phases.
          </Text>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Camera preview / image picker will live here.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.backButton} onPress={handleBackToStart}>
            <Text style={styles.backButtonText}>Back to Start</Text>
          </Pressable>

          <Pressable style={styles.scanButton} onPress={handleStartScan}>
            <Text style={styles.scanButtonText}>Start Drip Scan</Text>
          </Pressable>
        </View>
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
  stepLabel: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  placeholder: {
    flex: 1,
    marginVertical: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  placeholderText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#374151",
  },
  backButtonText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "500",
  },
  scanButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonText: {
    color: "#022C22",
    fontSize: 15,
    fontWeight: "700",
  },
});

