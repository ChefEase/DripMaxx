import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ValuePropositionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute();
  const { displayName, userEmail } = useStore();
  const [showRocket, setShowRocket] = useState(Boolean((route.params as any)?.celebrate));
  const rocketOpacity = useRef(new Animated.Value(0)).current;
  const rocketY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    console.log("[ValuePropositionScreen] mounted");
    return () => {
      console.log("[ValuePropositionScreen] unmounted");
    };
  }, []);

  useEffect(() => {
    if (showRocket) {
      Animated.parallel([
        Animated.timing(rocketOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(rocketY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(rocketOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
            setShowRocket(false)
          );
        }, 1200);
      });
    }
  }, [showRocket, rocketOpacity, rocketY]);

  const handleGetStarted = () => {
    console.log("[ValuePropositionScreen] Get Started pressed");
    navigation.navigate("StylePreference");
  };

  const handleSeeExample = () => {
    console.log("[ValuePropositionScreen] See Example pressed");
    navigation.navigate("ScanExample");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <View style={styles.headerRow}>
            <Pressable style={styles.avatar} onPress={() => navigation.navigate("Profile")}>
              <Text style={styles.avatarText}>
                {(displayName || userEmail || "U").charAt(0).toUpperCase()}
              </Text>
            </Pressable>
            <View>
              <Text style={styles.userName}>{displayName || "Welcome"}</Text>
              <Text style={styles.userEmail}>{userEmail || "Tap to view profile"}</Text>
            </View>
          </View>
          <Text style={styles.logo}>DripMaxx</Text>
          <Text style={styles.title}>Rate Your Outfit Instantly With AI</Text>
          <Text style={styles.subtitle}>
            Scan your outfit and get a Drip Score, style feedback, and
            improvement suggestions.
          </Text>
          {showRocket ? (
            <Animated.View
              style={[
                styles.rocketCard,
                { opacity: rocketOpacity, transform: [{ translateY: rocketY }] },
              ]}
            >
              <Text style={styles.rocket}>🚀</Text>
              <Text style={styles.rocketText}>You’re in! Let’s launch your first scan.</Text>
            </Animated.View>
          ) : null}
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
          Get Started is where real outfit scans begin.
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
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  avatarText: { color: "#F9FAFB", fontSize: 18, fontWeight: "800" },
  userName: { color: "#E5E7EB", fontSize: 15, fontWeight: "800" },
  userEmail: { color: "#9CA3AF", fontSize: 12 },
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
  rocketCard: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  rocket: { fontSize: 24 },
  rocketText: { color: "#E5E7EB", fontWeight: "700", fontSize: 14 },
});
