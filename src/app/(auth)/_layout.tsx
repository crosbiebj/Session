import { Redirect, Stack } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

export default function AuthLayout() {
  const session = useAuthStore((state) => state.session);
  const justSignedUp = useAuthStore((state) => state.justSignedUp);

  if (session) {
    return <Redirect href={justSignedUp ? '/welcome' : '/(app)'} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
