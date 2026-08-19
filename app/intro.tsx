import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Animated, Easing, Pressable, Image } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../App";
import { supabase } from "../lib/supabase";
import { colors, useThemedStyles } from "./ui/theme";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function IntroScreen() {
  const styles = useThemedStyles(baseStyles);
  const nav = useNavigation<Nav>();
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const [wordIdx, setWordIdx] = useState(0);
  const words = ["See your look clearly.", "Build your style intentionally."];

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const interval = setInterval(() => {
      setWordIdx((prev) => (prev + 1) % words.length);
    }, 700);
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      nav.navigate(data.session?.user ? "ValueProposition" : "Auth");
    }, 2600);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [nav, opacity, slide, words.length]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>AI STYLE COACH</Text>
        <Animated.View style={[styles.logoWrap, { opacity, transform: [{ translateY: slide }] }]}>
          <Text style={styles.logo}>DripMaxx</Text>
          <Text style={styles.sub}>{words[wordIdx]}</Text>
        </Animated.View>
        <View style={styles.art}>
          <Image
            source={require("../assets/editorial/hero-onboarding.jpg")}
            style={styles.artImage}
            resizeMode="cover"
            accessibilityLabel="A fashion-forward full-body outfit"
          />
          <View style={styles.artShade} />
          <View style={styles.artBadge}><Text style={styles.artBadgeText}>YOUR NEXT LOOK STARTS HERE</Text></View>
        </View>
        <Pressable style={styles.cta} onPress={() => nav.navigate("Auth")}>
          <Text style={styles.ctaText}>Find my style</Text><Text style={styles.ctaArrow}>→</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: 24,
    gap: 24,
  },
  eyebrow: { color: colors.lime, fontSize: 11, fontWeight: "900", letterSpacing: 2, marginTop: 12 },
  logoWrap: { alignItems: "flex-start" },
  logo: { color: colors.text, fontSize: 48, fontWeight: "900", letterSpacing: -2 },
  sub: { color: colors.textMuted, fontSize: 18, fontWeight: "600", marginTop: 8 },
  art: { height: 330, borderRadius: 34, backgroundColor: "#252921", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  artImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  artShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8,10,12,0.36)" },
  artRing: { position: "absolute", width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: "#C7FF4A55" },
  artType: { color: "#F7F5F018", fontSize: 150, fontWeight: "900", letterSpacing: -14 },
  artBadge: { position: "absolute", left: 18, bottom: 18, backgroundColor: "rgba(8,10,12,0.86)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  artBadgeText: { color: "#FEFEFE", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  cta: {
    marginTop: 16,
    backgroundColor: colors.lime,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaText: { color: colors.limeInk, fontSize: 16, fontWeight: "900" },
  ctaArrow: { color: colors.limeInk, fontSize: 24 },
});
