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
import * as ImagePicker from "expo-image-picker";
import { trackEvent } from "./lib/analytics";
import { useStore } from "./store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function CameraPermissionScreen() {
  const navigation = useNavigation<Nav>();
  const { userId } = useStore();

  useEffect(() => {
    console.log("[CameraPermissionScreen] mounted");
    return () => {
      console.log("[CameraPermissionScreen] unmounted");
    };
  }, []);

  const handleAllow = async () => {
    console.log("[CameraPermissionScreen] Allow Camera pressed");
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      console.log("[CameraPermissionScreen] camera permission denied");
      return;
    }
    trackEvent("onboard_completed", { camera: "granted" }, userId);
    navigation.navigate("Paywall");
  };

  const handleNotNow = () => {
    console.log("[CameraPermissionScreen] Not Now pressed");
    trackEvent("onboard_completed", { camera: "skipped" }, userId);
    navigation.navigate("Paywall");
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

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.bullet} />
            <Text style={styles.cardText}>No photos are stored without consent.</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.bullet} />
            <Text style={styles.cardText}>Used only to score your current outfit.</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.bullet} />
            <Text style={styles.cardText}>
              You can pick from gallery instead if you prefer.
            </Text>
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>If you tap &quot;Not Now&quot;</Text>
            <Text style={styles.noticeCopy}>
              Scanning will be limited until camera access is granted in settings.
            </Text>
          </View>
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
  card: {
    flex: 1,
    marginVertical: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 16,
    gap: 12,
    backgroundColor: "#0B1224",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#22C55E",
  },
  cardText: {
    color: "#E5E7EB",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  notice: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1F2937",
    gap: 4,
  },
  noticeTitle: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "700",
  },
  noticeCopy: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 18,
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

