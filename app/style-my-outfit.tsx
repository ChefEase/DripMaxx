import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import { apiFetch } from "../lib/api";
import {
  Coordinates,
  CurrentWeather,
  fetchCurrentWeather,
  getCurrentCoordinates,
} from "../lib/currentWeather";
import RemoteImage from "./components/RemoteImage";
import { AppColors, radius, space, useAppTheme } from "./ui/theme";
import { trackEvent } from "../lib/analytics";
import { useStore } from "../store";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Occasion = "casual" | "school" | "work" | "date_night_out" | "party" | "other";
type Advice = { title: string; description: string };
type StylingResult = {
  occasion: Occasion;
  weather: CurrentWeather;
  framing: string;
  summary: string;
  aesthetic_recommendations: Advice[];
  weather_recommendations: Advice[];
  occasion_note: string;
};

const occasions: { label: string; value: Occasion }[] = [
  { label: "Casual", value: "casual" },
  { label: "School", value: "school" },
  { label: "Work", value: "work" },
  { label: "Date / Night Out", value: "date_night_out" },
  { label: "Party", value: "party" },
  { label: "Other", value: "other" },
];

const responseError = async (response: Response) => {
  const body = await response.json().catch(() => null);
  return typeof body?.detail === "string" ? body.detail : "Styling advice is unavailable. Please try again.";
};

export default function StyleMyOutfitScreen() {
  const navigation = useNavigation<Nav>();
  const { userId } = useStore();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<StylingResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadWeather = async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const nextCoordinates = await getCurrentCoordinates();
      const nextWeather = await fetchCurrentWeather(nextCoordinates);
      setCoordinates(nextCoordinates);
      setWeather(nextWeather);
      void trackEvent("style_weather_loaded", { condition: nextWeather.condition }, userId);
    } catch (error: any) {
      setCoordinates(null);
      setWeather(null);
      setWeatherError(error?.message || "Current weather is unavailable.");
      void trackEvent("style_weather_failed", { reason: "weather_unavailable" }, userId);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => { void loadWeather(); }, []);

  const acceptImage = (uri?: string) => {
    if (!uri) return;
    setImageUri(uri);
    setResult(null);
    setSubmitError(null);
    void trackEvent("style_photo_selected", {}, userId);
  };

  const capture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
      Alert.alert("Camera access needed", "Allow camera access to photograph an outfit.");
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      base64: false,
      exif: false,
    });
    if (!picked.canceled) acceptImage(picked.assets[0]?.uri);
  };

  const pick = async () => {
    // Browsers require the file picker to be launched directly from the
    // user's click. Awaiting a permission request first breaks that gesture.
    if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== ImagePicker.PermissionStatus.GRANTED) {
        Alert.alert("Gallery access needed", "Allow gallery access to choose an outfit photo.");
        return;
      }
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
      exif: false,
    });
    if (!picked.canceled) acceptImage(picked.assets[0]?.uri);
  };

  const choosePhoto = () => {
    // React Native Web does not support native multi-button Alert callbacks.
    // Open the laptop/desktop file picker directly instead.
    if (Platform.OS === "web") {
      void pick();
      return;
    }
    Alert.alert("Add an outfit photo", "Take a new photo or choose one to test.", [
      { text: "Camera", onPress: () => void capture() },
      { text: "Gallery", onPress: () => void pick() },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const submit = async () => {
    if (!occasion || !imageUri || !coordinates || !weather) return;
    setSubmitting(true);
    void trackEvent("style_started", { occasion }, userId);
    setSubmitError(null);
    setResult(null);
    try {
      const form = new FormData();
      if (Platform.OS === "web") {
        const imageResponse = await fetch(imageUri);
        const blob = await imageResponse.blob();
        form.append("image", new File([blob], "outfit.jpg", { type: blob.type || "image/jpeg" }) as any);
      } else {
        form.append("image", { uri: imageUri, name: "outfit.jpg", type: "image/jpeg" } as any);
      }
      form.append("occasion", occasion);
      form.append("latitude", String(coordinates.latitude));
      form.append("longitude", String(coordinates.longitude));
      // Reuse the conditions already displayed to the user so one styling
      // action does not perform a second provider request.
      form.append("weather_json", JSON.stringify(weather));
      const response = await apiFetch("/v1/styling/advice", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: form,
      });
      if (!response.ok) throw new Error(await responseError(response));
      setResult(await response.json());
      void trackEvent("style_completed", { occasion, weather_condition: weather.condition }, userId);
    } catch (error: any) {
      setSubmitError(error?.message || "Styling advice is unavailable. Please try again.");
      void trackEvent("style_failed", { occasion, reason: "request_failed" }, userId);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = Boolean(occasion && imageUri && coordinates && weather && !submitting);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.backText}>← Home</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>STYLE MY OUTFIT</Text>
          <Text style={styles.title}>Adapt your look for right now.</Text>
          <Text style={styles.subtitle}>
            Get styling and practical suggestions for an occasion and today’s local weather. No score.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionNumber}>01</Text>
          <Text style={styles.sectionTitle}>What’s the occasion?</Text>
          <View style={styles.occasionGrid} accessibilityRole="radiogroup">
            {occasions.map((option) => {
              const selected = occasion === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => { setOccasion(option.value); setResult(null); }}
                  style={[styles.occasion, selected && styles.occasionSelected]}
                >
                  <Text style={[styles.occasionText, selected && styles.occasionTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionNumber}>02</Text>
          <Text style={styles.sectionTitle}>Add an outfit photo</Text>
          <Text style={styles.sectionCopy}>A current or older photo is fine—we’ll only use today’s weather to suggest adaptations.</Text>
          {imageUri ? (
            <View style={styles.previewWrap}>
              <RemoteImage uri={imageUri} style={styles.preview} />
              <Pressable style={styles.changePhoto} onPress={choosePhoto}>
                <Text style={styles.changePhotoText}>Change photo</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.photoButton} onPress={choosePhoto}>
              <Text style={styles.photoButtonTitle}>Camera or Gallery</Text>
              <Text style={styles.photoButtonCopy}>Use a clear photo showing the full outfit.</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionNumber}>03</Text>
          <Text style={styles.sectionTitle}>Today’s local weather</Text>
          {weatherLoading ? (
            <View style={styles.statusRow}><ActivityIndicator color={theme.colors.limeText} /><Text style={styles.statusText}>Checking current conditions…</Text></View>
          ) : weather ? (
            <View style={styles.weatherPanel}>
              <Text style={styles.weatherTemp}>{Math.round(weather.temperature_c)}°C</Text>
              <View style={styles.weatherCopy}>
                <Text style={styles.weatherCondition}>{weather.condition}</Text>
                <Text style={styles.weatherMeta}>Feels like {Math.round(weather.apparent_temperature_c)}°C{weather.rain_mm > 0 ? ` · ${weather.rain_mm} mm rain` : ""}{weather.snowfall_cm > 0 ? ` · ${weather.snowfall_cm} cm snow` : ""}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.errorPanel}>
              <Text style={styles.errorText}>{weatherError}</Text>
              <Pressable style={styles.retry} onPress={() => void loadWeather()}><Text style={styles.retryText}>Try location again</Text></Pressable>
            </View>
          )}
          <Text style={styles.privacyCopy}>Your coordinates are used only to retrieve current weather for this request. Weather data by Open-Meteo or MET Norway.</Text>
        </View>

        {submitError ? <Text style={styles.submitError} accessibilityRole="alert">{submitError}</Text> : null}
        <Pressable style={[styles.primary, !canSubmit && styles.primaryDisabled]} disabled={!canSubmit} onPress={() => void submit()}>
          {submitting ? <ActivityIndicator color={theme.colors.limeInk} /> : <Text style={styles.primaryText}>Style this outfit</Text>}
        </Pressable>

        {result ? (
          <View style={styles.results}>
            <View style={styles.resultIntro}>
              <Text style={styles.resultEyebrow}>YOUR ADAPTATION</Text>
              <Text style={styles.resultTitle}>{result.framing}</Text>
              <Text style={styles.resultSummary}>{result.summary}</Text>
              <Text style={styles.occasionNote}>{result.occasion_note}</Text>
            </View>
            <AdviceSection title="Style upgrades" items={result.aesthetic_recommendations} styles={styles} />
            <AdviceSection title="Weather-ready changes" items={result.weather_recommendations} styles={styles} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function AdviceSection({ title, items, styles }: { title: string; items: Advice[]; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.adviceSection}>
      <Text style={styles.adviceHeading}>{title}</Text>
      {items.map((item, index) => (
        <View key={`${title}-${item.title}-${index}`} style={styles.adviceCard}>
          <Text style={styles.adviceIndex}>{String(index + 1).padStart(2, "0")}</Text>
          <View style={styles.adviceCopy}><Text style={styles.adviceTitle}>{item.title}</Text><Text style={styles.adviceDescription}>{item.description}</Text></View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.ink },
  page: { width: "100%", maxWidth: 760, alignSelf: "center", padding: space.lg, paddingBottom: 48, gap: 16 },
  back: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingRight: 16 },
  backText: { color: colors.limeText, fontSize: 16, fontWeight: "800" },
  header: { gap: 8, paddingVertical: 8 },
  eyebrow: { color: colors.limeText, fontSize: 13, fontWeight: "900", letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 36, lineHeight: 42, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 17, lineHeight: 25, fontWeight: "600" },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, padding: 18, gap: 10 },
  sectionNumber: { color: colors.limeText, fontSize: 13, fontWeight: "900", letterSpacing: 1.2 },
  sectionTitle: { color: colors.text, fontSize: 21, lineHeight: 27, fontWeight: "900" },
  sectionCopy: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
  occasionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  occasion: { minHeight: 52, minWidth: "30%", flexGrow: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSoft },
  occasionSelected: { backgroundColor: colors.lime, borderColor: colors.lime },
  occasionText: { color: colors.text, fontSize: 15, fontWeight: "800", textAlign: "center" },
  occasionTextSelected: { color: colors.limeInk },
  photoButton: { minHeight: 150, borderWidth: 2, borderStyle: "dashed", borderColor: colors.line, borderRadius: radius.md, alignItems: "center", justifyContent: "center", padding: 20, gap: 6, backgroundColor: colors.surfaceSoft },
  photoButtonTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  photoButtonCopy: { color: colors.textMuted, fontSize: 15, textAlign: "center" },
  previewWrap: { borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surfaceSoft },
  preview: { width: "100%", aspectRatio: 4 / 5 },
  changePhoto: { minHeight: 50, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceSoft },
  changePhotoText: { color: colors.limeText, fontSize: 15, fontWeight: "900" },
  statusRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12 },
  statusText: { color: colors.textMuted, fontSize: 16, fontWeight: "700" },
  weatherPanel: { flexDirection: "row", alignItems: "center", gap: 16, padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceSoft },
  weatherTemp: { color: colors.text, fontSize: 34, fontWeight: "900" },
  weatherCopy: { flex: 1, gap: 3 },
  weatherCondition: { color: colors.text, fontSize: 17, fontWeight: "900" },
  weatherMeta: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  privacyCopy: { color: colors.textSoft, fontSize: 13, lineHeight: 19 },
  errorPanel: { gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceSoft },
  errorText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  retry: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  retryText: { color: colors.limeText, fontSize: 15, fontWeight: "900" },
  submitError: { color: colors.danger, fontSize: 15, lineHeight: 21, fontWeight: "700" },
  primary: { minHeight: 58, borderRadius: radius.md, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  primaryDisabled: { opacity: 0.42 },
  primaryText: { color: colors.limeInk, fontSize: 17, fontWeight: "900" },
  results: { gap: 16, marginTop: 8 },
  resultIntro: { padding: 20, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, gap: 9 },
  resultEyebrow: { color: colors.limeText, fontSize: 13, fontWeight: "900", letterSpacing: 1.2 },
  resultTitle: { color: colors.text, fontSize: 25, lineHeight: 32, fontWeight: "900" },
  resultSummary: { color: colors.textMuted, fontSize: 16, lineHeight: 24 },
  occasionNote: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: "700" },
  adviceSection: { gap: 10 },
  adviceHeading: { color: colors.text, fontSize: 21, fontWeight: "900" },
  adviceCard: { flexDirection: "row", gap: 12, padding: 16, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  adviceIndex: { color: colors.limeText, fontSize: 14, fontWeight: "900" },
  adviceCopy: { flex: 1, gap: 4 },
  adviceTitle: { color: colors.text, fontSize: 17, lineHeight: 23, fontWeight: "900" },
  adviceDescription: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
});
