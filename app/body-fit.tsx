import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function BodyFitScreen() {
  const navigation = useNavigation<Nav>();
  const {
    userHeight,
    setUserHeight,
    userBodyType,
    setUserBodyType,
    genderStylePreference,
    setGenderStylePreference,
  } = useStore();
  const [height, setHeight] = useState(userHeight);
  const [bodyType, setBodyType] = useState<string | null>(userBodyType);
  const [genderStyle, setGenderStyle] = useState<string | null>(
    genderStylePreference
  );

  useEffect(() => {
    console.log("[BodyFitScreen] mounted");
    return () => {
      console.log("[BodyFitScreen] unmounted");
    };
  }, []);

  const handleNext = () => {
    console.log("[BodyFitScreen] Next pressed");
    setUserHeight(height);
    setUserBodyType(bodyType);
    setGenderStylePreference(genderStyle);
    navigation.navigate("CameraPermission");
  };

  const handleBack = () => {
    console.log("[BodyFitScreen] Back pressed");
    navigation.goBack();
  };

  const handleSkip = () => {
    console.log("[BodyFitScreen] Skip pressed");
    navigation.navigate("CameraPermission");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.stepLabel}>Step 4 of 5</Text>
          <Text style={styles.title}>Body & Fit Setup (Optional)</Text>
          <Text style={styles.subtitle}>
            Share your height and body type so fit and compatibility scores are
            more accurate.
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.form}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.field}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              keyboardType="numeric"
              placeholder="e.g. 180"
              placeholderTextColor="#6B7280"
              value={height}
              onChangeText={setHeight}
              style={styles.input}
            />
            <Text style={styles.supportText}>
              Helps us score fit and proportions more accurately.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Body type</Text>
            <View style={styles.pillWrap}>
              {["Slim", "Athletic", "Average", "Broad", "Plus Size"].map(
                (type) => {
                  const active = bodyType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setBodyType(type)}
                      style={[pillStyles.pill, active && pillStyles.pillActive]}
                    >
                      <Text
                        style={[
                          pillStyles.pillText,
                          active && pillStyles.pillTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Gender style lens (optional)</Text>
            <View style={styles.pillWrap}>
              {["Menswear", "Womenswear", "Neutral"].map((option) => {
                const active = genderStyle === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setGenderStyle(option)}
                    style={[pillStyles.pill, active && pillStyles.pillActive]}
                  >
                    <Text
                      style={[
                        pillStyles.pillText,
                        active && pillStyles.pillTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.supportText}>
              This only guides recommendations; it isn&apos;t about identity.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>

          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </Pressable>

          <Pressable style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
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
  form: {
    gap: 16,
    paddingVertical: 16,
  },
  field: {
    backgroundColor: "#0B1224",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 14,
    gap: 10,
  },
  label: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#0F172A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#273042",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#E5E7EB",
    fontSize: 15,
  },
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  supportText: {
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 16,
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
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  nextButton: {
    flex: 1,
    backgroundColor: "#22C55E",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: "#022C22",
    fontSize: 15,
    fontWeight: "700",
  },
});

const pillStyles = StyleSheet.create({
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#273042",
    backgroundColor: "#0B1224",
  },
  pillActive: {
    borderColor: "#22C55E",
    backgroundColor: "#112030",
  },
  pillText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#BBF7D0",
  },
});

