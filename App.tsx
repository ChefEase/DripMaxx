import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LogBox, Platform } from "react-native";
import * as Linking from "expo-linking";

import ValuePropositionScreen from "./app/index";
import StylePreferenceScreen from "./app/style-preference";
import StyleInspirationScreen from "./app/style-inspiration";
import BodyFitScreen from "./app/body-fit";
import CameraPermissionScreen from "./app/camera-permission";
import ScanStubScreen from "./app/scan";
import { StoreProvider } from "./store";
import AuthScreen from "./app/auth";
import ProfileScreen from "./app/profile";
import PaywallScreen from "./app/paywall";
import IntroScreen from "./app/intro";
import ResetPasswordScreen from "./app/reset-password";
import SignUpScreen from "./app/sign-up";
import ForgotPasswordScreen from "./app/forgot-password";
import LeaderboardScreen from "./app/leaderboard";
import RankingGroupsScreen from "./app/ranking-groups";
import UserProfileViewScreen from "./app/user-profile-view";
import GroupLeaderboardScreen from "./app/group-leaderboard";
import LegalScreen from "./app/legal";
import 'react-native-url-polyfill/auto';
import { supabase } from "./lib/supabase";

export type RootStackParamList = {
  ValueProposition: { celebrate?: boolean } | undefined;
  StylePreference: undefined;
  StyleInspiration: undefined;
  BodyFit: undefined;
  CameraPermission: undefined;
  Scan: undefined;
  Auth: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  Profile: undefined;
  Paywall: undefined;
  ResetPassword: undefined;
  Intro: undefined;
  Leaderboard: undefined;
  RankingGroups: undefined;
  GroupLeaderboard: { groupId: string; groupName?: string };
  UserProfile: { userId: string };
  Legal: { doc: "terms" | "privacy" };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const linking = {
    prefixes: [Linking.createURL("/")],
    config: {
      screens: {
        ResetPassword: "reset-password",
        Auth: "auth",
        SignUp: "sign-up",
        ForgotPassword: "forgot-password",
        ValueProposition: "home",
      },
    },
  };

  useEffect(() => {
    console.log("[App] mounted on", Platform.OS);
    LogBox.ignoreLogs([
      "SafeAreaView has been deprecated", // reduce noise in dev
    ]);
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      const parts = url.split("#");
      if (parts.length < 2) return;
      const params = new URLSearchParams(parts[1]);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (access_token && refresh_token) {
        try {
          await supabase.auth.setSession({ access_token, refresh_token });
          console.log("[Linking] session restored from reset link");
        } catch (e) {
          console.warn("[Linking] setSession failed", e);
        }
      }
    };

    const listener = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });
    Linking.getInitialURL().then((url) => handleDeepLink(url));

    return () => {
      console.log("[App] unmounted");
      listener.remove();
    };
  }, []);

  return (
    <StoreProvider>
      <NavigationContainer
        linking={linking}
        onReady={() => {
          console.log("[NavigationContainer] ready");
        }}
      >
        <Stack.Navigator
          id="root-stack"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#020617" },
          }}
          initialRouteName="Intro"
        >
          <Stack.Screen name="Intro" component={IntroScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen
            name="ValueProposition"
            component={ValuePropositionScreen}
          />
          <Stack.Screen
            name="StylePreference"
            component={StylePreferenceScreen}
          />
          <Stack.Screen
            name="StyleInspiration"
            component={StyleInspirationScreen}
          />
          <Stack.Screen name="BodyFit" component={BodyFitScreen} />
          <Stack.Screen
            name="CameraPermission"
            component={CameraPermissionScreen}
          />
          <Stack.Screen name="Paywall" component={PaywallScreen} />
          <Stack.Screen name="Scan" component={ScanStubScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
          <Stack.Screen name="RankingGroups" component={RankingGroupsScreen} />
          <Stack.Screen name="GroupLeaderboard" component={GroupLeaderboardScreen} />
          <Stack.Screen name="UserProfile" component={UserProfileViewScreen} />
          <Stack.Screen name="Legal" component={LegalScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </StoreProvider>
  );
}
