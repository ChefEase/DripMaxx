import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hardcoded values for testing
const SUPABASE_URL =  process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const isServer = typeof window === 'undefined';
const storage = isServer
  ? {
      getItem: async (_key: string) => null,
      setItem: async (_key: string, _value: string) => {},
      removeItem: async (_key: string) => {},
    }
  : {
      getItem: async (key: string) => await AsyncStorage.getItem(key),
      setItem: async (key: string, value: string) => await AsyncStorage.setItem(key, value),
      removeItem: async (key: string) => await AsyncStorage.removeItem(key),
    };

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});

console.log('Supabase client initialized with URL:', SUPABASE_URL, 'platform:', Platform.OS, 'server:', isServer);
