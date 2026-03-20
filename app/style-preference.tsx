import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function StylePreferenceScreen() {
  const navigation = useNavigation<Nav>();
  const {
    stylePreferences,
    setStylePreferences,
    customStyle,
    setCustomStyle,
    favoriteCelebrityStyle,
    setFavoriteCelebrityStyle,
  } = useStore();
  const [showCustomInput, setShowCustomInput] = useState(false);

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
    console.log(
      "[StylePreferenceScreen] favorite celebrity style:",
      favoriteCelebrityStyle
    );
    navigation.navigate("StyleInspiration");
  };

  const handleBack = () => {
    console.log("[StylePreferenceScreen] Back pressed");
    navigation.goBack();
  };

  const handleSkip = () => {
    console.log("[StylePreferenceScreen] Skip pressed");
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
          <Text style={styles.stepLabel}>Step 2 of 5</Text>
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

        <View style={styles.customBox}>
          <View style={styles.customHeader}>
            <Text style={styles.customTitle}>
              Favorite celebrity style (optional)
            </Text>
            <Pressable
              onPress={() => setShowCustomInput((s) => !s)}
              style={styles.customButton}
            >
              <Text style={styles.customButtonText}>
                {showCustomInput ? "Hide" : "Add"}
              </Text>
            </Pressable>
          </View>
          {showCustomInput ? (
            <TextInput
              placeholder="Type the celebrity whose style you love most"
              placeholderTextColor="#6B7280"
              value={favoriteCelebrityStyle}
              onChangeText={setFavoriteCelebrityStyle}
              style={styles.customInput}
            />
          ) : null}
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
  customBox: {
    borderWidth: 1,
    borderColor: "#1F2937",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#0B1224",
    gap: 10,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customTitle: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "700",
  },
  customButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#22C55E",
  },
  customButtonText: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "700",
  },
  customInput: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#273042",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#E5E7EB",
    fontSize: 14,
  },
});

const cardStyles = StyleSheet.create({
  list: {
    paddingVertical: 20,
    gap: 12,
  },
  card: {
    backgroundColor: "#0B1224",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1F2937",
    padding: 16,
  },
  cardSelected: {
    borderColor: "#22C55E",
    backgroundColor: "#0F1A2F",
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
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "700",
  },
  cardHint: {
    color: "#6B7280",
    fontSize: 12,
  },
  cardPill: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "700",
  },
  cardDescription: {
    color: "#9CA3AF",
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

