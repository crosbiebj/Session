import { Redirect } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

export default function Index() {
  const session = useAuthStore((state) => state.session);
  return <Redirect href={session ? '/(app)' : '/(auth)/sign-in'} />;
}
