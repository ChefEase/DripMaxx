import React, { useCallback, useEffect, useRef, useState } from "react";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppState, LogBox } from "react-native";
import * as Linking from "expo-linking";

import ValuePropositionScreen from "./app/index";
import StylePreferenceScreen from "./app/style-preference";
import StyleInspirationScreen from "./app/style-inspiration";
import BodyFitScreen from "./app/body-fit";
import CameraPermissionScreen from "./app/camera-permission";
import ScanStubScreen from "./app/scan";
import ScanExampleScreen from "./app/scan-example";
import { StoreProvider, useStore } from "./store";
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
import ChallengeScreen from "./app/challenge";
import 'react-native-url-polyfill/auto';
import { syncAuthenticatedUser } from "./lib/authProfile";
import { logWarn } from "./lib/logger";
import { supabase } from "./lib/supabase";
import { trackEvent } from "./lib/analytics";

export type RootStackParamList = {
  ValueProposition: { celebrate?: boolean } | undefined;
  StylePreference: undefined;
  StyleInspiration: undefined;
  BodyFit: undefined;
  CameraPermission: undefined;
  Scan: undefined;
  ScanExample: undefined;
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
  Challenge: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function AppShell() {
  const {
    userId,
    setUserId,
    setUserEmail,
    setUsername,
    setDisplayName,
    setAvatarUrl,
  } = useStore();
  const appState = useRef(AppState.currentState);
  const [pendingHomeNavigation, setPendingHomeNavigation] = useState(false);
  const appUrlPrefix = Linking.createURL("/", { isTripleSlashed: true });
  const linking = {
    prefixes: [appUrlPrefix, "acme://", "acme:///"],
    config: {
      screens: {
        ResetPassword: "reset-password",
        Auth: "auth",
        SignUp: "sign-up",
        ForgotPassword: "forgot-password",
        ValueProposition: "home",
        Challenge: "challenge",
      },
    },
  };
  const syncSession = useCallback(
    async (
      user: Parameters<typeof syncAuthenticatedUser>[0],
      navigateHome = false
    ) => {
      await syncAuthenticatedUser(user, {
        setUserId,
        setUserEmail,
        setUsername,
        setDisplayName,
        setAvatarUrl,
      });
      if (navigateHome) {
        if (navigationRef.isReady()) {
          navigationRef.navigate("ValueProposition", { celebrate: true });
        } else {
          setPendingHomeNavigation(true);
        }
      }
    },
    [setAvatarUrl, setDisplayName, setUserEmail, setUserId, setUsername]
  );

  const handleNavigationReady = useCallback(() => {
    if (pendingHomeNavigation && navigationRef.isReady()) {
      navigationRef.navigate("ValueProposition", { celebrate: true });
      setPendingHomeNavigation(false);
    }
  }, [pendingHomeNavigation]);

  useEffect(() => {
    LogBox.ignoreLogs([
      "SafeAreaView has been deprecated", // reduce noise in dev
    ]);
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      const [beforeHash, hash = ""] = url.split("#");
      const query = beforeHash.includes("?") ? beforeHash.split("?").slice(1).join("?") : "";
      const params = new URLSearchParams(hash || query);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const code = params.get("code");
      if ((access_token && refresh_token) || code) {
        try {
          const { data, error } =
            access_token && refresh_token
              ? await supabase.auth.setSession({ access_token, refresh_token })
              : await supabase.auth.exchangeCodeForSession(code || "");
          if (error) throw error;
          if (data.user) {
            await syncSession(data.user, true);
          }
        } catch (e) {
          logWarn("[Linking] OAuth callback failed", e);
        }
      }
    };

    const listener = Linking.addEventListener("url", (event) => {
      handleDeepLink(event.url);
    });
    Linking.getInitialURL().then((url) => handleDeepLink(url));

    return () => {
      listener.remove();
    };
  }, [syncSession]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        syncSession(session.user).catch((e) => logWarn("[Auth] session sync failed", e));
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [syncSession]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session?.user) {
          return syncSession(data.session.user);
        }
        return undefined;
      })
      .catch((e) => logWarn("[Auth] initial session check failed", e));
  }, [syncSession]);

  useEffect(() => {
    if (!userId) return;

    trackEvent("app_opened", { source: "launch" }, userId);
    const subscription = AppState.addEventListener("change", (nextState) => {
      const returningToForeground =
        appState.current.match(/inactive|background/) && nextState === "active";
      appState.current = nextState;
      if (returningToForeground) {
        trackEvent("app_opened", { source: "foreground" }, userId);
      }
    });

    return () => subscription.remove();
  }, [userId]);

  return (
    <NavigationContainer ref={navigationRef} linking={linking} onReady={handleNavigationReady}>
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
        <Stack.Screen name="ScanExample" component={ScanExampleScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Stack.Screen name="RankingGroups" component={RankingGroupsScreen} />
        <Stack.Screen name="GroupLeaderboard" component={GroupLeaderboardScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileViewScreen} />
        <Stack.Screen name="Legal" component={LegalScreen} />
        <Stack.Screen name="Challenge" component={ChallengeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
