import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  SlideInLeft,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/auth-store';

// First-run only (see (auth)/_layout.tsx — justSignedUp gates this,
// a plain sign-in skips straight to /(app)). Two beats: the fish swims
// in and greets you by name, then the wordmark assembles. The fish here
// is a placeholder shape (an Ionicons glyph, not an illustration) — real
// linework is designer work, see CLAUDE.md §6a on the app icon for the
// same call. Tap anywhere to skip ahead at any point.
export default function Welcome() {
  const { width } = useWindowDimensions();
  const session = useAuthStore((state) => state.session);
  const setJustSignedUp = useAuthStore((state) => state.setJustSignedUp);
  const { data: profile } = useProfile();
  const [phase, setPhase] = useState<'swim' | 'greeting' | 'wordmark'>('swim');

  const name = profile?.display_name || session?.user.email?.split('@')[0] || 'angler';

  const translateX = useSharedValue(-width * 0.6);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(withSequence(withTiming(-8, { duration: 260 }), withTiming(8, { duration: 260 })), 5, true);
    rotate.value = withRepeat(withSequence(withTiming(7, { duration: 260 }), withTiming(-7, { duration: 260 })), 5, true);
    translateX.value = withTiming(0, { duration: 1300, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(setPhase)('greeting');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishWelcome = () => {
    setJustSignedUp(false);
    router.replace('/(app)');
  };

  const handleTap = () => {
    if (phase === 'swim') return;
    if (phase === 'greeting') {
      setPhase('wordmark');
      return;
    }
    finishWelcome();
  };

  useEffect(() => {
    if (phase !== 'wordmark') return;
    const timer = setTimeout(finishWelcome, 2200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const fishStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Pressable style={{ flex: 1 }} onPress={handleTap}>
      <SafeAreaView className="flex-1 items-center justify-center bg-dock-bg">
        {phase !== 'wordmark' ? (
          <View className="items-center">
            <Animated.View style={fishStyle}>
              <Ionicons name="fish" size={72} color="#5C7A4C" />
            </Animated.View>
            {phase === 'greeting' ? (
              <Animated.Text
                entering={FadeInDown.duration(450)}
                className="mt-6 font-serif text-2xl capitalize text-dock-text"
              >
                Welcome, {name}
              </Animated.Text>
            ) : null}
          </View>
        ) : (
          <View className="flex-row items-baseline">
            <Animated.Text
              entering={SlideInLeft.duration(420).delay(500)}
              className="font-serif text-4xl text-dock-text"
            >
              (OB)
            </Animated.Text>
            <Animated.Text entering={FadeIn.duration(420)} className="font-serif text-4xl text-dock-amber">
              Session
            </Animated.Text>
          </View>
        )}

        {phase !== 'swim' ? (
          <Animated.Text
            entering={FadeIn.duration(400).delay(phase === 'greeting' ? 900 : 1600)}
            className="mt-10 font-sans text-xs uppercase tracking-widest text-dock-text-faint"
          >
            Tap to continue
          </Animated.Text>
        ) : null}
      </SafeAreaView>
    </Pressable>
  );
}
