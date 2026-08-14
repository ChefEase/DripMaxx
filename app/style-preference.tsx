import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { colors, useThemedStyles } from "./ui/theme";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STYLE_IMAGES: Record<string, any> = {
  Streetwear: require("../assets/editorial/style-streetwear.jpg"),
  Minimal: require("../assets/editorial/style-minimal.jpg"),
  Vintage: require("../assets/editorial/style-vintage.jpg"),
  Luxury: require("../assets/editorial/style-luxury.jpg"),
  Y2K: require("../assets/editorial/style-y2k.jpg"),
  Casual: require("../assets/editorial/style-casual.jpg"),
};

export default function StylePreferenceScreen() {
  const styles = useThemedStyles(baseStyles);
  const navigation = useNavigation<Nav>();
  const {
    stylePreferences,
    setStylePreferences,
    customStyle,
    setCustomStyle,
  } = useStore();

  const stylesData = useMemo(
    () => [
      { key: "Streetwear", description: "Oversized, sneakers, graphic tees" },
      { key: "Minimal", description: "Clean lines, neutral palettes" },
      { key: "Vintage", description: "Retro silhouettes, heritage vibes" },
      { key: "Luxury", description: "Tailored fits, premium materials" },
      { key: "Y2K", description: "Bold colors, playful accessories" },
      { key: "Casual", description: "Everyday basics, comfy layers" },
      { key: "Custom", description: "Type your own vibe" },
    ],
    []
  );

  useEffect(() => {
    console.log("[StylePreferenceScreen] mounted");
    return () => {
      console.log("[StylePreferenceScreen] unmounted");
    };
  }, []);

  const handleNext = () => {
    console.log("[StylePreferenceScreen] Next pressed");
    console.log("[StylePreferenceScreen] styles:", stylePreferences);
    console.log("[StylePreferenceScreen] custom style:", customStyle);
    navigation.navigate("StyleInspiration");
  };

  const handleBack = () => {
    console.log("[StylePreferenceScreen] Back pressed");
    navigation.goBack();
  };

  const handleSkip = () => {
    console.log("[StylePreferenceScreen] Skip pressed");
    setStylePreferences([]);
    setCustomStyle("");
    navigation.navigate("StyleInspiration");
  };

  const toggleStyle = (styleKey: string) => {
    setStylePreferences((prev) => {
      const exists = prev.includes(styleKey);
      if (exists) return prev.filter((s) => s !== styleKey);
      if (prev.length >= 3) return prev; // cap at 3
      return [...prev, styleKey];
    });
  };

  const renderCard = ({ item }: { item: (typeof stylesData)[number] }) => {
    const isSelected = stylePreferences.includes(item.key);
    return (
      <Pressable
        onPress={() => toggleStyle(item.key)}
        style={[
          cardStyles.card,
          isSelected && cardStyles.cardSelected,
          item.key === "Custom" && cardStyles.cardCustom,
        ]}
      >
        {STYLE_IMAGES[item.key] ? (
          <Image source={STYLE_IMAGES[item.key]} style={cardStyles.cardImage} resizeMode="cover" />
        ) : null}
        <View style={cardStyles.cardShade} />
        <View style={cardStyles.cardHeader}>
          <Text style={cardStyles.cardTitle}>{item.key}</Text>
          {isSelected ? (
            <Text style={cardStyles.cardPill}>Selected</Text>
          ) : (
            <Text style={cardStyles.cardHint}>Tap to choose</Text>
          )}
        </View>
        <Text style={cardStyles.cardDescription}>{item.description}</Text>
        {item.key === "Custom" && isSelected ? (
          <TextInput
            placeholder="e.g. Techwear, Coastal Grandma"
            placeholderTextColor="#6B7280"
            value={customStyle}
            onChangeText={setCustomStyle}
            style={cardStyles.input}
          />
        ) : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View>
          <Text style={styles.stepLabel}>YOUR STYLE · 01</Text>
          <Text style={styles.title}>What style do you like?</Text>
          <Text style={styles.subtitle}>
            We&apos;ll use this to personalize your Drip Score and suggestions.
          </Text>
          <Text style={styles.counter}>
            Select up to 3 styles (chosen {stylePreferences.length}/3)
          </Text>
        </View>

        <FlatList
          data={stylesData}
          keyExtractor={(item) => item.key}
          renderItem={renderCard}
          contentContainerStyle={cardStyles.list}
          style={{ flex: 1 }}
          numColumns={1}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
        />

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

const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "space-between",
  },
  stepLabel: {
    fontSize: 13,
    color: colors.lime,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  counter: {
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
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

const cardStyles = StyleSheet.create({
  list: {
    paddingVertical: 20,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    minHeight: 150,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  cardImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  cardShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,10,12,0.42)" },
  cardSelected: {
    borderColor: colors.lime,
    borderWidth: 2,
  },
  cardCustom: {
    borderStyle: "dashed",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  cardHint: {
    color: "#6B7280",
    fontSize: 12,
  },
  cardPill: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "700",
  },
  cardDescription: {
    color: colors.cream,
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    marginTop: 10,
    backgroundColor: "#0B1424",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#E5E7EB",
    fontSize: 14,
  },
});

