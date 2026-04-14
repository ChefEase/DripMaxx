import AsyncStorage from "@react-native-async-storage/async-storage";

type SecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

let secureStore: SecureStoreModule | null = null;

try {
  secureStore = require("expo-secure-store");
} catch {
  secureStore = null;
}

export const secureStorage = {
  getItem: async (key: string) => {
    if (secureStore) {
      return secureStore.getItemAsync(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (secureStore) {
      await secureStore.setItemAsync(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (secureStore) {
      await secureStore.deleteItemAsync(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};
