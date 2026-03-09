import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hardcoded values for testing
const SUPABASE_URL = 'https://mijricrsdyqstanhndmm.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1panJpY3JzZHlxc3RhbmhuZG1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTIzNDUsImV4cCI6MjA4ODQ2ODM0NX0.t12OFPhHDkfrBsMXY9VJhJ8sxYXpqkLzuIPs_1dIU_o'

const storage = {
  getItem: async (key: string) => await AsyncStorage.getItem(key),
  setItem: async (key: string, value: string) => await AsyncStorage.setItem(key, value),
  removeItem: async (key: string) => await AsyncStorage.removeItem(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

console.log('Supabase client initialized with URL:', SUPABASE_URL);