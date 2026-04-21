import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from "react-native";
import { secureStorage } from './secureStorage';

const SUPABASE_URL =  process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const isWeb = Platform.OS === "web";
const storage = isWeb
  ? {
      getItem: async (_key: string) => null,
      setItem: async (_key: string, _value: string) => {},
      removeItem: async (_key: string) => {},
    }
  : {
      getItem: async (key: string) => await secureStorage.getItem(key),
      setItem: async (key: string, value: string) => await secureStorage.setItem(key, value),
      removeItem: async (key: string) => await secureStorage.removeItem(key),
    };

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage,
    autoRefreshToken: !isWeb,
    persistSession: !isWeb,
    detectSessionInUrl: false,
  },
});
