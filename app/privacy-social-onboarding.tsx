import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../App";
import {
  ProfileVisibilityPreference,
  SocialTogglePreference,
  useStore,
} from "../store";
import { AppColors, radius, space, useAppTheme } from "./ui/theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Step = 0 | 1 | 2;

const visibilityOptions: { label: string; value: ProfileVisibilityPreference }[] = [
  { label: "Just me", value: "private" },
  { label: "Everyone", value: "public" },
  { label: "I'll decide later", value: "undecided" },
];

const communityOptions: { label: string; value: SocialTogglePreference }[] = [
  { label: "Show me community outfits", value: true },
  { label: "Just focus on me", value: false },
  { label: "I'll decide later", value: "undecided" },
];

const leaderboardOptions: { label: string; value: SocialTogglePreference }[] = [
  { label: "Yes, let's compete", value: true },
  { label: "No, keep it personal", value: false },
  { label: "I'll decide later", value: "undecided" },
];

export default function PrivacySocialOnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const { updatePrivacySocialPreferences } = useStore();
  const [step, setStep] = useState<Step>(0);
  const [visibility, setVisibility] = useState<ProfileVisibilityPreference | null>(null);
  const [community, setCommunity] = useState<SocialTogglePreference | null>(null);
  const [leaderboard, setLeaderboard] = useState<SocialTogglePreference | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const screens = [
    {
      title: "Who should be able to see your outfits?",
      value: visibility,
      options: visibilityOptions,
      select: (value: ProfileVisibilityPreference | SocialTogglePreference) =>
        setVisibility(value as ProfileVisibilityPreference),
    },
    {
      title: "Want to see what everyone else is wearing?",
      value: community,
      options: communityOptions,
      select: (value: ProfileVisibilityPreference | SocialTogglePreference) =>
        setCommunity(value as SocialTogglePreference),
    },
    {
      title: "Want to compete on the leaderboard?",
      value: leaderboard,
      options: leaderboardOptions,
      select: (value: ProfileVisibilityPreference | SocialTogglePreference) =>
        setLeaderboard(value as SocialTogglePreference),
    },
  ] as const;
  const current = screens[step];

  const continueFlow = async () => {
    if (current.value === null || saving) return;
    setError(null);
    if (step < 2) {
      setStep((step + 1) as Step);
      return;
    }
    if (visibility === null || community === null || leaderboard === null) return;
    setSaving(true);
    try {
      await updatePrivacySocialPreferences({
        profileVisibility: visibility,
        communityFeedEnabled: community,
        leaderboardEnabled: leaderboard,
        onboardingCompleted: true,
      });
      navigation.reset({ index: 0, routes: [{ name: "ValueProposition" }] });
    } catch {
      setError("We couldn't save your choices. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.progressHeader}>
          <Text style={styles.eyebrow}>PRIVACY & SOCIAL</Text>
          <Text style={styles.progressText}>{step + 1} of 3</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / 3) * 100}%` }]} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.helper}>You can change this anytime in Profile.</Text>
          <View style={styles.options} accessibilityRole="radiogroup">
            {current.options.map((option) => {
              const selected = current.value === option.value;
              return (
                <Pressable
                  key={`${option.value}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => current.select(option.value)}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          {step > 0 ? (
            <Pressable style={styles.backButton} onPress={() => setStep((step - 1) as Step)} disabled={saving}>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : <View />}
          <Pressable
            style={[styles.continueButton, current.value === null && styles.buttonDisabled]}
            onPress={() => void continueFlow()}
            disabled={current.value === null || saving}
          >
            {saving ? <ActivityIndicator color={theme.colors.limeInk} /> : (
              <Text style={styles.continueText}>{step === 2 ? "Finish" : "Continue"}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.ink },
  page: { flex: 1, width: "100%", maxWidth: 720, alignSelf: "center", padding: space.lg },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16 },
  eyebrow: { color: colors.limeText, fontSize: 13, fontWeight: "900", letterSpacing: 1.4 },
  progressText: { color: colors.textMuted, fontSize: 15, fontWeight: "800" },
  progressTrack: { height: 8, backgroundColor: colors.surfaceSoft, borderRadius: 999, overflow: "hidden", marginTop: 14 },
  progressFill: { height: "100%", backgroundColor: colors.lime, borderRadius: 999 },
  content: { flex: 1, justifyContent: "center", gap: 14, paddingVertical: space.xl },
  title: { color: colors.text, fontSize: 34, lineHeight: 41, fontWeight: "900", letterSpacing: -0.7 },
  helper: { color: colors.textMuted, fontSize: 16, lineHeight: 23, fontWeight: "600" },
  options: { gap: 12, marginTop: 12 },
  option: {
    minHeight: 72,
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  optionSelected: { borderColor: colors.lime, backgroundColor: colors.surfaceRaised },
  optionPressed: { opacity: 0.82 },
  optionText: { flex: 1, color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: "800" },
  optionTextSelected: { color: colors.text },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.textMuted, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: colors.lime },
  radioDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.lime },
  error: { color: colors.danger, fontSize: 15, lineHeight: 21, fontWeight: "700" },
  actions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  backButton: { minHeight: 56, paddingHorizontal: 18, justifyContent: "center" },
  backText: { color: colors.textMuted, fontSize: 16, fontWeight: "800" },
  continueButton: { minWidth: 150, minHeight: 56, borderRadius: radius.md, backgroundColor: colors.lime, paddingHorizontal: 24, alignItems: "center", justifyContent: "center" },
  continueText: { color: colors.limeInk, fontSize: 17, fontWeight: "900" },
  buttonDisabled: { opacity: 0.45 },
});
