import * as Location from "expo-location";

import { apiFetch } from "./api";

export type Coordinates = { latitude: number; longitude: number };
export type CurrentWeather = {
  temperature_c: number;
  apparent_temperature_c: number;
  precipitation_mm: number;
  rain_mm: number;
  snowfall_cm: number;
  weather_code: number;
  condition: string;
  is_day: boolean;
};

export async function getCurrentCoordinates(): Promise<Coordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error("Location access is needed to tailor advice to your current weather.");
  }
  const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000, requiredAccuracy: 5000 });
  const location = lastKnown || await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export async function fetchCurrentWeather(coordinates: Coordinates): Promise<CurrentWeather> {
  const query = new URLSearchParams({
    latitude: String(coordinates.latitude),
    longitude: String(coordinates.longitude),
  });
  const response = await apiFetch(`/v1/styling/weather?${query}`);
  if (!response.ok) throw new Error((await response.text()) || "Current weather is unavailable.");
  return response.json();
}
