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

export default function CameraPermissionScreen() {
  const navigation = useNavigation<Nav>();

  useEffect(() => {
    console.log("[CameraPermissionScreen] mounted");
    return () => {
      console.log("[CameraPermissionScreen] unmounted");
    };
  }, []);

  const handleAllow = () => {
    console.log("[CameraPermissionScreen] Allow Camera pressed");
    // Camera permission + actual camera wiring will be implemented later.
    navigation.navigate("Scan");
  };

  const handleNotNow = () => {
    console.log("[CameraPermissionScreen] Not Now pressed");
    navigation.navigate("Scan");
  };

  const handleBack = () => {
    console.log("[CameraPermissionScreen] Back pressed");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.stepLabel}>Step 5 of 5</Text>
          <Text style={styles.title}>Allow camera access to scan your outfit</Text>
          <Text style={styles.subtitle}>
            We only use your camera to analyze outfits and improve your Drip
            Score. You can change this later in settings.
          </Text>
        </View>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            System permission prompt will appear after tapping &quot;Allow
            Camera&quot;. This screen explains the why before we ask.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>

          <Pressable style={styles.notNowButton} onPress={handleNotNow}>
            <Text style={styles.notNowButtonText}>Not Now</Text>
          </Pressable>

          <Pressable style={styles.allowButton} onPress={handleAllow}>
            <Text style={styles.allowButtonText}>Allow Camera</Text>
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
  notNowButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  notNowButtonText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  allowButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  allowButtonText: {
    color: "#022C22",
    fontSize: 15,
    fontWeight: "700",
  },
});

