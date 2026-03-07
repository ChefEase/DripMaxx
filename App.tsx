import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LogBox, Platform } from "react-native";

import ValuePropositionScreen from "./app/index";
import StylePreferenceScreen from "./app/style-preference";
import StyleInspirationScreen from "./app/style-inspiration";
import BodyFitScreen from "./app/body-fit";
import CameraPermissionScreen from "./app/camera-permission";
import ScanStubScreen from "./app/scan";
import { StoreProvider } from "./app/store";

export type RootStackParamList = {
  ValueProposition: undefined;
  StylePreference: undefined;
  StyleInspiration: undefined;
  BodyFit: undefined;
  CameraPermission: undefined;
  Scan: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    console.log("[App] mounted on", Platform.OS);
    LogBox.ignoreLogs([
      "SafeAreaView has been deprecated", // reduce noise in dev
    ]);
    return () => {
      console.log("[App] unmounted");
    };
  }, []);

  return (
    <StoreProvider>
      <NavigationContainer
        onReady={() => {
          console.log("[NavigationContainer] ready");
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#020617" },
          }}
        >
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
          <Stack.Screen name="Scan" component={ScanStubScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </StoreProvider>
  );
}

