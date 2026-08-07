import * as Linking from 'expo-linking';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable as AnimatedPressable } from '@/components/Pressable';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

// Mode 2 (dark, sleek, carpy) — CLAUDE.md §6a: the Book is the only
// screen that stays warm/cream. Sign-in is the first thing anyone sees,
// so it should feel like the rest of the app, not a different product.
export default function SignIn() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Set after a successful sign-up while email confirmation is pending —
  // without this, signUp() succeeding produces no visible feedback at all
  // (no session yet, no error), which reads as the app doing nothing.
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<string | null>(null);
  const setJustSignedUp = useAuthStore((state) => state.setJustSignedUp);

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim() || !password) {
      setError('Enter an email and password.');
      return;
    }

    setLoading(true);

    if (mode === 'sign-in') {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (authError) setError(authError.message);
      // On success, the root layout's auth listener updates the session and
      // (auth)/_layout redirects to /(app) automatically.
      return;
    }

    // Set optimistically, before the request resolves — see auth-store.ts.
    // Reset on failure below so a failed attempt can't send a later,
    // unrelated sign-in through /welcome.
    setJustSignedUp(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: Linking.createURL('/auth-callback') },
    });

    setLoading(false);

    if (authError) {
      setJustSignedUp(false);
      setError(authError.message);
    } else if (!data.session) {
      // Email confirmation is required — no session yet until the link in
      // the email is tapped (src/app/auth-callback.tsx handles that).
      setAwaitingConfirmation(email.trim());
    }
    // If data.session is already set, confirmation is off and the auth
    // listener redirects automatically, same as sign-in.
  };

  if (awaitingConfirmation) {
    return (
      <SafeAreaView className="flex-1 bg-dock-bg" edges={['top', 'bottom']}>
        <Animated.View entering={FadeIn.duration(350)} className="flex-1 items-center justify-center px-8">
          <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-dock-moss/15">
            <Text className="font-serif text-3xl text-dock-moss">✓</Text>
          </View>
          <Text className="mb-3 text-center font-label-semibold text-xl uppercase tracking-wide text-dock-text">
            Check your email
          </Text>
          <Text className="text-center font-sans text-base text-dock-text-dim">
            We sent a confirmation link to{'\n'}
            <Text className="font-sans-medium text-dock-text">{awaitingConfirmation}</Text>
            {'\n\n'}Tap it to finish creating your account.
          </Text>
          <Pressable
            onPress={() => {
              setAwaitingConfirmation(null);
              setMode('sign-in');
            }}
            className="mt-8 items-center"
          >
            <Text className="font-sans text-sm text-dock-text-dim">Back to sign in</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          <Animated.View entering={FadeIn.duration(450)}>
            <Text className="mb-1 font-serif text-4xl text-dock-text">
              (OB)<Text className="text-dock-amber">Session</Text>
            </Text>
            <Text className="mb-10 font-sans text-base text-dock-text-dim">
              Your book. Shared only when you choose.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(450).delay(100)} className="gap-3">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#5C6154"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
              className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#5C6154"
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              className="rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
            />
          </Animated.View>

          {error ? (
            <Animated.Text
              entering={FadeIn.duration(200)}
              className="mt-3 font-sans text-sm text-red-400"
            >
              {error}
            </Animated.Text>
          ) : null}

          <Animated.View entering={FadeInDown.duration(450).delay(180)}>
            <AnimatedPressable
              onPress={handleSubmit}
              disabled={loading}
              className="mt-6 items-center rounded-lg bg-dock-moss py-3.5 disabled:opacity-60"
            >
              {loading ? (
                <ActivityIndicator color="#EDEBE0" />
              ) : (
                <Text className="font-sans-semibold text-base text-dock-text">
                  {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
                </Text>
              )}
            </AnimatedPressable>

            <Pressable
              onPress={() => {
                setError(null);
                setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'));
              }}
              className="mt-5 items-center"
            >
              <Text className="font-sans text-sm text-dock-text-dim">
                {mode === 'sign-in'
                  ? "New here? Create an account"
                  : 'Already have an account? Sign in'}
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
