import React, { createContext, useContext, useMemo, useState } from "react";

type StoreState = {
  stylePreferences: string[];
  customStyle: string;
  favoriteCelebrityStyle: string;
  styleInspirations: string[];
  userHeight: string;
  userBodyType: string | null;
  genderStylePreference: string | null;
};

type StoreContextValue = StoreState & {
  setStylePreferences: React.Dispatch<React.SetStateAction<string[]>>;
  setCustomStyle: React.Dispatch<React.SetStateAction<string>>;
  setFavoriteCelebrityStyle: React.Dispatch<React.SetStateAction<string>>;
  setStyleInspirations: React.Dispatch<React.SetStateAction<string[]>>;
  setUserHeight: React.Dispatch<React.SetStateAction<string>>;
  setUserBodyType: React.Dispatch<React.SetStateAction<string | null>>;
  setGenderStylePreference: React.Dispatch<React.SetStateAction<string | null>>;
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

  const value = useMemo(
    () => ({
      stylePreferences,
      customStyle,
      favoriteCelebrityStyle,
      styleInspirations,
      userHeight,
      userBodyType,
      genderStylePreference,
      setStylePreferences,
      setCustomStyle,
      setFavoriteCelebrityStyle,
      setStyleInspirations,
      setUserHeight,
      setUserBodyType,
      setGenderStylePreference,
    }),
    [
      stylePreferences,
      customStyle,
      favoriteCelebrityStyle,
      styleInspirations,
      userHeight,
      userBodyType,
      genderStylePreference,
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
