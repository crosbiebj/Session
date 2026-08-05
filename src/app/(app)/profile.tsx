import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable } from '@/components/Pressable';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

export default function Profile() {
  const session = useAuthStore((state) => state.session);
  const email = session?.user.email ?? '';
  const initial = email.charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top']}>
      <View className="flex-1 px-5 pt-6">
        <Text className="font-label-semibold text-xs uppercase tracking-widest text-dock-text-faint">
          Profile
        </Text>

        <Animated.View entering={FadeIn.duration(400)} className="mt-4 flex-row items-center gap-3">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-dock-moss">
            <Text className="font-serif text-2xl text-dock-text">{initial || '?'}</Text>
          </View>
          <Text className="flex-1 font-sans text-base text-dock-text">{email}</Text>
        </Animated.View>

        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="mt-10 flex-row items-center justify-center gap-2 rounded-xl border border-dock-border bg-dock-panel py-3.5"
        >
          <Ionicons name="log-out-outline" size={18} color="#EDEBE0" />
          <Text className="font-sans-semibold text-base text-dock-text">Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
