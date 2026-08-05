import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No browser/URL context in React Native to auto-detect from — the
    // email confirmation link is instead caught by src/app/auth-callback.tsx
    // via the app's own session:// deep link scheme.
    detectSessionInUrl: false,
    // PKCE is the correct flow for a mobile app (no client secret to keep
    // safe, and it's what the emailRedirectTo + code-exchange pattern in
    // auth-callback.tsx expects).
    flowType: 'pkce',
  },
});
