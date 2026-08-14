import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { colors, useThemedStyles } from "./ui/theme";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const INSPIRATION_PRESETS = [
  "Kanye West",
  "Travis Scott",
  "Hailey Bieber",
  "Timothee Chalamet",
  "Zendaya",
  "ASAP Rocky",
  "Bella Hadid",
  "Pharrell",
];

export default function StyleInspirationScreen() {
  const styles = useThemedStyles(baseStyles);
  const navigation = useNavigation<Nav>();
  const {
    styleInspirations,
    setStyleInspirations,
    favoriteCelebrityStyle,
    setFavoriteCelebrityStyle,
  } = useStore();
  const [selectedInspirations, setSelectedInspirations] = useState<string[]>(
    styleInspirations.filter((name) => INSPIRATION_PRESETS.includes(name))
  );

  const inspirations = useMemo(() => INSPIRATION_PRESETS, []);

  useEffect(() => {
    console.log("[StyleInspirationScreen] mounted");
    return () => {
      console.log("[StyleInspirationScreen] unmounted");
    };
  }, []);

  const handleNext = () => {
    console.log("[StyleInspirationScreen] Next pressed");
    const customInspiration = favoriteCelebrityStyle.trim();
    const inspirationsToSave = customInspiration
      ? [...selectedInspirations, customInspiration]
      : selectedInspirations;
    setStyleInspirations(inspirationsToSave);
    console.log("[StyleInspirationScreen] inspirations:", inspirationsToSave);
    if (customInspiration) {
      console.log(
        "[StyleInspirationScreen] favorite celebrity:",
        favoriteCelebrityStyle
      );
    }
    navigation.navigate("BodyFit");
  };

  const handleBack = () => {
    console.log("[StyleInspirationScreen] Back pressed");
    navigation.goBack();
  };

  const handleSkip = () => {
    console.log("[StyleInspirationScreen] Skip pressed");
    setStyleInspirations([]);
    setFavoriteCelebrityStyle("");
    navigation.navigate("BodyFit");
  };

  const toggleInspiration = (name: string) => {
    setSelectedInspirations((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View style={styles.container}>
        <View>
          <Text style={styles.stepLabel}>YOUR REFERENCES · 02</Text>
          <Text style={styles.title}>Whose style do you like?</Text>
          <Text style={styles.subtitle}>
            Choose a few inspirations so DripMaxx understands your vibe.
          </Text>
        </View>

        <View style={styles.chipArea}>
          <ScrollView
            contentContainerStyle={styles.chipWrap}
            showsVerticalScrollIndicator={false}
          >
            {inspirations.map((name) => {
              const active = selectedInspirations.includes(name);
              return (
                <Pressable
                  key={name}
                  onPress={() => toggleInspiration(name)}
                  style={[
                    chipStyles.chip,
                    active && chipStyles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      chipStyles.chipText,
                      active && chipStyles.chipTextActive,
                    ]}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
            <View style={styles.customInspiration}>
              <Text style={styles.customLabel}>Someone else</Text>
              <Text style={styles.customCopy}>
                Type a celebrity or creator who is not listed above.
              </Text>
              <TextInput
                value={favoriteCelebrityStyle}
                onChangeText={setFavoriteCelebrityStyle}
                placeholder="e.g. Tyler, the Creator"
                placeholderTextColor="#6B7280"
                style={styles.customInput}
                returnKeyType="done"
              />
            </View>
          </ScrollView>

          <View style={styles.helperCard}>
            <Text style={styles.helperTitle}>Tip</Text>
            <Text style={styles.helperCopy}>
              Picking 2-3 inspirations helps the AI match silhouettes, color
              palettes, and accessories you actually like.
            </Text>
          </View>
        </View>

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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  keyboardView: {
    flex: 1,
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
    fontSize: 32,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  chipArea: {
    flex: 1,
    marginVertical: 20,
    gap: 12,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  helperCard: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1F2937",
  },
  helperTitle: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  helperCopy: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 18,
  },
  customInspiration: {
    width: "100%",
    marginTop: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: "#273042",
    borderRadius: 14,
    backgroundColor: "#0B1224",
  },
  customLabel: {
    color: "#F9FAFB",
    fontSize: 15,
    fontWeight: "700",
  },
  customCopy: {
    color: "#9CA3AF",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 10,
  },
  customInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#E5E7EB",
    fontSize: 14,
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
    backgroundColor: colors.lime,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: colors.limeInk,
    fontSize: 15,
    fontWeight: "700",
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#273042",
    backgroundColor: "#0B1224",
  },
  chipActive: {
    borderColor: colors.lime,
    backgroundColor: "#112030",
  },
  chipText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.cream,
  },
});
