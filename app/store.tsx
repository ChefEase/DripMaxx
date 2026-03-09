import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  displayName: string | null;
  avatarUrl: string | null;
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
  setDisplayName: React.Dispatch<React.SetStateAction<string | null>>;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string | null>>;
};

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const genId = () => `user_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

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
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.multiGet([
      "dripmaxx:userId",
      "dripmaxx:userEmail",
      "dripmaxx:displayName",
      "dripmaxx:avatarUrl",
    ]).then(
      (entries) => {
        const idVal = entries.find((e) => e[0] === "dripmaxx:userId")?.[1];
        const emailVal = entries.find((e) => e[0] === "dripmaxx:userEmail")?.[1];
        const nameVal = entries.find((e) => e[0] === "dripmaxx:displayName")?.[1];
        const avatarVal = entries.find((e) => e[0] === "dripmaxx:avatarUrl")?.[1];
        if (idVal) {
          setUserId(idVal);
        } else {
          const next = genId();
          setUserId(next);
          AsyncStorage.setItem("dripmaxx:userId", next).catch(() => {});
        }
        if (emailVal) setUserEmail(emailVal);
        if (nameVal) setDisplayName(nameVal);
        if (avatarVal) setAvatarUrl(avatarVal);
      }
    );
  }, []);

  useEffect(() => {
    if (userId) {
      AsyncStorage.setItem("dripmaxx:userId", userId).catch(() => {});
    }
  }, [userId]);

  useEffect(() => {
    if (userEmail) {
      AsyncStorage.setItem("dripmaxx:userEmail", userEmail).catch(() => {});
    }
  }, [userEmail]);

  useEffect(() => {
    if (displayName) {
      AsyncStorage.setItem("dripmaxx:displayName", displayName).catch(() => {});
    }
  }, [displayName]);

  useEffect(() => {
    if (avatarUrl) {
      AsyncStorage.setItem("dripmaxx:avatarUrl", avatarUrl).catch(() => {});
    }
  }, [avatarUrl]);

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
      displayName,
      avatarUrl,
      setStylePreferences,
      setCustomStyle,
      setFavoriteCelebrityStyle,
      setStyleInspirations,
      setUserHeight,
      setUserBodyType,
      setGenderStylePreference,
      setUserId,
      setUserEmail,
      setDisplayName,
      setAvatarUrl,
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
      displayName,
      avatarUrl,
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
