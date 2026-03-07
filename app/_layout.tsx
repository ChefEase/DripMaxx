import React, { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";

export default function RootLayout() {
  useEffect(() => {
    console.log("[RootLayout] mounted on", Platform.OS);
    return () => {
      console.log("[RootLayout] unmounted");
    };
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#020617" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="style-preference" />
      <Stack.Screen name="style-inspiration" />
      <Stack.Screen name="body-fit" />
      <Stack.Screen name="camera-permission" />
      <Stack.Screen name="scan" />
    </Stack>
  );
}

