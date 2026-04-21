import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './secureStorage';

const SUPABASE_URL =  process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const storage = {
  getItem: async (key: string) => await secureStorage.getItem(key),
  setItem: async (key: string, value: string) => await secureStorage.setItem(key, value),
  removeItem: async (key: string) => await secureStorage.removeItem(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
