import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Animated, Easing, Pressable } from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { RootStackParamList } from "../App";
import { supabase } from "../lib/supabase";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function IntroScreen() {
  const nav = useNavigation<Nav>();
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const [wordIdx, setWordIdx] = useState(0);
  const words = ["Scan, Score, Level Up", "Dress Better, Feel Confident"];

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
        <Animated.View style={[styles.logoWrap, { opacity, transform: [{ translateY: slide }] }]}>
          <Text style={styles.logo}>DripMaxx</Text>
          <Text style={styles.sub}>{words[wordIdx]}</Text>
        </Animated.View>
        <Pressable style={styles.cta} onPress={() => nav.navigate("Auth")}>
          <Text style={styles.ctaText}>Get started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617" },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 24,
  },
  logoWrap: { alignItems: "center" },
  logo: { color: "#F9FAFB", fontSize: 36, fontWeight: "900", letterSpacing: 1 },
  sub: { color: "#A5B4FC", fontSize: 20, fontWeight: "700", marginTop: 6 },
  cta: {
    marginTop: 16,
    backgroundColor: "#22C55E",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
  },
  ctaText: { color: "#022C22", fontSize: 16, fontWeight: "800" },
});
