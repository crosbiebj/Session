import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { pickAvatarPhoto } from '@/components/PhotoPicker';
import { Pressable } from '@/components/Pressable';
import { useProfile, useUpdateAvatar, useUpdateDisplayName } from '@/hooks/useProfile';
import { describeError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';

export default function Profile() {
  const session = useAuthStore((state) => state.session);
  const email = session?.user.email ?? '';
  const { data: profile } = useProfile();
  const updateDisplayName = useUpdateDisplayName();
  const updateAvatar = useUpdateAvatar();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) setNickname(profile.display_name ?? '');
  }, [profile]);

  const initial = (profile?.display_name || email).charAt(0).toUpperCase();

  const handleSaveNickname = async () => {
    setError(null);
    setSaved(false);
    try {
      await updateDisplayName.mutateAsync(nickname);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(describeError(err));
    }
  };

  const handlePickAvatar = async () => {
    const photo = await pickAvatarPhoto();
    if (!photo) return;
    try {
      await updateAvatar.mutateAsync(photo);
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dock-bg" edges={['top']}>
      <View className="flex-1 px-5 pt-6">
        <Text className="font-label-semibold text-xs uppercase tracking-widest text-dock-text-faint">
          Profile
        </Text>

        <Animated.View entering={FadeIn.duration(400)} className="mt-4 flex-row items-center gap-3">
          <Pressable onPress={handlePickAvatar} disabled={updateAvatar.isPending} className="relative">
            <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-dock-moss">
              {profile?.avatarSignedUrl ? (
                <Image source={{ uri: profile.avatarSignedUrl }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <Text className="font-serif text-2xl text-dock-text">{initial || '?'}</Text>
              )}
            </View>
            <View className="absolute -bottom-0.5 -right-0.5 h-5 w-5 items-center justify-center rounded-full bg-dock-amber">
              {updateAvatar.isPending ? (
                <ActivityIndicator size="small" color="#14170F" />
              ) : (
                <Ionicons name="camera" size={11} color="#14170F" />
              )}
            </View>
          </Pressable>
          <Text className="flex-1 font-sans text-base text-dock-text">{email}</Text>
        </Animated.View>

        <View className="mt-6 gap-2">
          <Text className="font-label text-[10px] uppercase tracking-widest text-dock-text-faint">
            Nickname
          </Text>
          <Text className="font-sans text-xs text-dock-text-faint">
            Shown to friends and groups instead of your email — has to be unique, kept clean.
          </Text>
          <View className="mt-1 flex-row gap-2">
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="e.g. Curtis"
              placeholderTextColor="#5C6154"
              maxLength={24}
              className="flex-1 rounded-lg bg-dock-panel px-4 py-3 font-sans text-base text-dock-text"
            />
            <Pressable
              onPress={handleSaveNickname}
              disabled={updateDisplayName.isPending || nickname.trim() === (profile?.display_name ?? '')}
              className="items-center justify-center rounded-lg bg-dock-moss px-5 disabled:opacity-40"
            >
              <Text className="font-sans-semibold text-base text-dock-text">{saved ? 'Saved' : 'Save'}</Text>
            </Pressable>
          </View>
          {error ? <Text className="font-sans text-xs text-red-400">{error}</Text> : null}
        </View>

        <Pressable
          onPress={() => router.push('/trash')}
          className="mt-10 flex-row items-center justify-center gap-2 rounded-xl border border-dock-border bg-dock-panel py-3.5"
        >
          <Ionicons name="trash-outline" size={18} color="#8B9184" />
          <Text className="font-sans-semibold text-base text-dock-text">Recently Deleted</Text>
        </Pressable>

        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="mt-3 flex-row items-center justify-center gap-2 rounded-xl border border-dock-border bg-dock-panel py-3.5"
        >
          <Ionicons name="log-out-outline" size={18} color="#EDEBE0" />
          <Text className="font-sans-semibold text-base text-dock-text">Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
