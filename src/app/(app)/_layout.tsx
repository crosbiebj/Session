import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';

export default function AppLayout() {
  const session = useAuthStore((state) => state.session);

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Frosted-glass tab bar — the standard native iOS pattern —
        // instead of a flat solid fill. Absolute positioning lets content
        // show through the blur as it scrolls underneath.
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'android' ? '#14170F' : 'transparent',
          borderTopColor: '#262B1E',
          borderTopWidth: 0.5,
          elevation: 0,
        },
        tabBarBackground:
          Platform.OS === 'ios'
            ? () => <BlurView intensity={80} tint="dark" style={{ flex: 1 }} />
            : undefined,
        tabBarActiveTintColor: '#C9974A',
        tabBarInactiveTintColor: '#8B9184',
        tabBarLabelStyle: { fontFamily: 'Oswald-Medium', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
