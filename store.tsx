import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, apiJsonHeaders } from "./lib/api";
import { getDeviceCountry, getDeviceLocale } from "./lib/deviceLocale";
import { logWarn } from "./lib/logger";

type StoreState = {
  stylePreferences: string[];
  customStyle: string;
  favoriteCelebrityStyle: string;
  styleInspirations: string[];
  userHeight: string;
  userBodyType: string | null;
  genderStylePreference: string | null;
  userId: string | null;
  userEmail: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  country: string | null;
};

type StoreContextValue = StoreState & {
  setStylePreferences: React.Dispatch<React.SetStateAction<string[]>>;
  setCustomStyle: React.Dispatch<React.SetStateAction<string>>;
  setFavoriteCelebrityStyle: React.Dispatch<React.SetStateAction<string>>;
  setStyleInspirations: React.Dispatch<React.SetStateAction<string[]>>;
  setUserHeight: React.Dispatch<React.SetStateAction<string>>;
  setUserBodyType: React.Dispatch<React.SetStateAction<string | null>>;
  setGenderStylePreference: React.Dispatch<React.SetStateAction<string | null>>;
  setUserId: React.Dispatch<React.SetStateAction<string | null>>;
  setUserEmail: React.Dispatch<React.SetStateAction<string | null>>;
  setUsername: React.Dispatch<React.SetStateAction<string | null>>;
  setDisplayName: React.Dispatch<React.SetStateAction<string | null>>;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string | null>>;
  setCountry: React.Dispatch<React.SetStateAction<string | null>>;
};

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [stylePreferences, setStylePreferences] = useState<string[]>([]);
  const [customStyle, setCustomStyle] = useState("");
  const [favoriteCelebrityStyle, setFavoriteCelebrityStyle] = useState("");
  const [styleInspirations, setStyleInspirations] = useState<string[]>([]);
  const [userHeight, setUserHeight] = useState("");
  const [userBodyType, setUserBodyType] = useState<string | null>(null);
  const [genderStylePreference, setGenderStylePreference] = useState<
    string | null
  >(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [locale, setLocale] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.multiGet([
      "dripmaxx:userId",
      "dripmaxx:userEmail",
      "dripmaxx:username",
      "dripmaxx:displayName",
      "dripmaxx:avatarUrl",
      "dripmaxx:country",
    ]).then(
      (entries) => {
        const idVal = entries.find((e) => e[0] === "dripmaxx:userId")?.[1];
        const emailVal = entries.find((e) => e[0] === "dripmaxx:userEmail")?.[1];
        const usernameVal = entries.find((e) => e[0] === "dripmaxx:username")?.[1];
        const nameVal = entries.find((e) => e[0] === "dripmaxx:displayName")?.[1];
        const avatarVal = entries.find((e) => e[0] === "dripmaxx:avatarUrl")?.[1];
        if (idVal) setUserId(idVal);
        if (emailVal) setUserEmail(emailVal);
        if (usernameVal) setUsername(usernameVal);
        if (nameVal) setDisplayName(nameVal);
        if (avatarVal) setAvatarUrl(avatarVal);
        const countryVal = entries.find((e) => e[0] === "dripmaxx:country")?.[1];
        const deviceCountry = getDeviceCountry();
        const resolvedCountry = deviceCountry || countryVal || null;
        const detectedLocale = getDeviceLocale();

        if (resolvedCountry) {
          setCountry(resolvedCountry);
          AsyncStorage.setItem("dripmaxx:country", resolvedCountry).catch(() => {});
        }
        if (detectedLocale) setLocale(detectedLocale);
      }
    );
  }, []);

  useEffect(() => {
    if (userId) {
      AsyncStorage.setItem("dripmaxx:userId", userId).catch(() => {});
    } else {
      AsyncStorage.removeItem("dripmaxx:userId").catch(() => {});
    }
  }, [userId]);

  useEffect(() => {
    if (userEmail) {
      AsyncStorage.setItem("dripmaxx:userEmail", userEmail).catch(() => {});
    } else {
      AsyncStorage.removeItem("dripmaxx:userEmail").catch(() => {});
    }
  }, [userEmail]);

  useEffect(() => {
    if (username) {
      AsyncStorage.setItem("dripmaxx:username", username).catch(() => {});
    } else {
      AsyncStorage.removeItem("dripmaxx:username").catch(() => {});
    }
  }, [username]);

  useEffect(() => {
    if (displayName) {
      AsyncStorage.setItem("dripmaxx:displayName", displayName).catch(() => {});
    } else {
      AsyncStorage.removeItem("dripmaxx:displayName").catch(() => {});
    }
  }, [displayName]);

  useEffect(() => {
    if (avatarUrl) {
      AsyncStorage.setItem("dripmaxx:avatarUrl", avatarUrl).catch(() => {});
    } else {
      AsyncStorage.removeItem("dripmaxx:avatarUrl").catch(() => {});
    }
  }, [avatarUrl]);

  useEffect(() => {
    if (country) {
      AsyncStorage.setItem("dripmaxx:country", country).catch(() => {});
    }
  }, [country]);

  useEffect(() => {
    if (!userId || !country) return;

    apiFetch("/v1/profile/sync", {
      method: "POST",
      headers: apiJsonHeaders(),
      body: JSON.stringify({
        user_id: userId,
        country,
        locale,
      }),
    }).catch((e) => logWarn("[Store] locale sync failed", e));
  }, [country, locale, userId]);

  const value = useMemo(
    () => ({
      stylePreferences,
      customStyle,
      favoriteCelebrityStyle,
      styleInspirations,
      userHeight,
      userBodyType,
      genderStylePreference,
      userId,
      userEmail,
      username,
      displayName,
      avatarUrl,
      country,
      locale,
      setStylePreferences,
      setCustomStyle,
      setFavoriteCelebrityStyle,
      setStyleInspirations,
      setUserHeight,
      setUserBodyType,
      setGenderStylePreference,
      setUserId,
      setUserEmail,
      setUsername,
      setDisplayName,
      setAvatarUrl,
      setCountry,
    }),
    [
      stylePreferences,
      customStyle,
      favoriteCelebrityStyle,
      styleInspirations,
      userHeight,
      userBodyType,
      genderStylePreference,
      userId,
      userEmail,
      username,
      displayName,
      avatarUrl,
      country,
      locale,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error("useStore must be used within StoreProvider");
  }
  return ctx;
};
