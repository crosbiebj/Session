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

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: Linking.createURL('/auth-callback') },
    });

    setLoading(false);

    if (authError) {
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
      <SafeAreaView className="flex-1 bg-cream" edges={['top', 'bottom']}>
        <Animated.View entering={FadeIn.duration(350)} className="flex-1 items-center justify-center px-8">
          <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-moss/10">
            <Text className="font-serif text-3xl text-moss">✓</Text>
          </View>
          <Text className="mb-3 text-center font-serif text-2xl text-moss">Check your email</Text>
          <Text className="text-center font-sans text-base text-ink/70">
            We sent a confirmation link to{'\n'}
            <Text className="font-sans-medium text-ink">{awaitingConfirmation}</Text>
            {'\n\n'}Tap it to finish creating your account.
          </Text>
          <Pressable
            onPress={() => {
              setAwaitingConfirmation(null);
              setMode('sign-in');
            }}
            className="mt-8 items-center"
          >
            <Text className="font-sans text-sm text-ink/70">Back to sign in</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          <Animated.View entering={FadeIn.duration(450)}>
            <Text className="mb-1 font-serif text-4xl text-moss">
              (OB)<Text className="text-amber">Session</Text>
            </Text>
            <Text className="mb-10 font-sans text-base text-ink/70">
              Your book. Shared only when you choose.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(450).delay(100)} className="gap-3">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#8B5A2B80"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              className="rounded-lg border border-tobacco/30 bg-white/60 px-4 py-3 font-sans text-base text-ink"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#8B5A2B80"
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              className="rounded-lg border border-tobacco/30 bg-white/60 px-4 py-3 font-sans text-base text-ink"
            />
          </Animated.View>

          {error ? (
            <Animated.Text
              entering={FadeIn.duration(200)}
              className="mt-3 font-sans text-sm text-red-700"
            >
              {error}
            </Animated.Text>
          ) : null}

          <Animated.View entering={FadeInDown.duration(450).delay(180)}>
            <AnimatedPressable
              onPress={handleSubmit}
              disabled={loading}
              className="mt-6 items-center rounded-lg bg-moss py-3.5 disabled:opacity-60"
            >
              {loading ? (
                <ActivityIndicator color="#F5F1E8" />
              ) : (
                <Text className="font-sans-semibold text-base text-cream">
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
              <Text className="font-sans text-sm text-ink/70">
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
