import '@/global.css';

import { Fraunces_400Regular, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Oswald_500Medium, Oswald_600SemiBold } from '@expo-google-fonts/oswald';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RippleIntro } from '@/components/RippleIntro';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Fraunces-Regular': Fraunces_400Regular,
    'Fraunces-SemiBold': Fraunces_600SemiBold,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Oswald-Medium': Oswald_500Medium,
    'Oswald-SemiBold': Oswald_600SemiBold,
  });

  const authLoading = useAuthStore((state) => state.isLoading);
  const setSession = useAuthStore((state) => state.setSession);
  const setLoading = useAuthStore((state) => state.setLoading);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading]);

  const ready = (fontsLoaded || !!fontError) && !authLoading;
  // "Something cool to make you feel like you're working with a living
  // breathing app" — a brief ripple overlay every time the app finishes
  // loading, unmounted once it's done rather than just faded to
  // invisible-but-present.
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="log-catch" options={{ presentation: 'modal' }} />
          <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />
        </Stack>
        {showIntro ? <RippleIntro onFinish={() => setShowIntro(false)} /> : null}
        <StatusBar style="light" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
