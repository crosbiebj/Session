import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';

// Caught via the app's session:// scheme when the angler taps the email
// confirmation link (see emailRedirectTo in sign-in.tsx). Exchanges the
// PKCE code Supabase put in the URL for a real session — the root
// layout's auth listener then picks up the new session and redirects
// into the app automatically.
export default function AuthCallback() {
  const { code, error: linkError } = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (linkError) {
      setError('That confirmation link is invalid or has expired.');
      return;
    }
    if (!code) {
      setError('Missing confirmation code.');
      return;
    }

    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (exchangeError) {
        setError(exchangeError.message);
      }
      // On success the auth listener in the root layout updates the
      // session and the app redirects on its own — nothing else to do
      // here.
    });
  }, [code, linkError]);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center px-8">
        {error ? (
          <>
            <Text className="mb-3 text-center font-serif text-2xl text-moss">
              Couldn&apos;t confirm your email
            </Text>
            <Text className="text-center font-sans text-base text-ink/70">{error}</Text>
            <Pressable onPress={() => router.replace('/(auth)/sign-in')} className="mt-8">
              <Text className="font-sans text-sm text-ink/70">Back to sign in</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color="#3D4A34" />
            <Text className="mt-4 font-sans text-base text-ink/70">Confirming your email…</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
