import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Pressable } from '@/components/Pressable';

type DockRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  route: string;
  children?: React.ReactNode;
};

// CLAUDE.md §3, Home screen interaction model: tapping the icon itself is
// a "hard click" that navigates to the section's full page; tapping the
// rest of the row (label/count/chevron) is a "soft click" that expands an
// inline accordion preview in place, without leaving Home.
//
// Everything here runs on Reanimated (chevron rotation, accordion
// reveal, sibling reflow) rather than mixing in the legacy
// LayoutAnimation API — one animation system end to end, not two racing
// each other with different timing curves.
export function DockRow({ icon, label, count, route, children }: DockRowProps) {
  const [expanded, setExpanded] = useState(false);
  const rotation = useSharedValue(0);

  const toggle = () => {
    rotation.value = withTiming(expanded ? 0 : 180, { duration: 200 });
    setExpanded((e) => !e);
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View layout={Layout.duration(200)} className="border-b border-dock-border">
      <View className="flex-row items-center">
        <Pressable
          onPress={() => router.push(route as never)}
          scaleTo={0.85}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center"
        >
          <Ionicons name={icon} size={21} color="#5C7A4C" />
        </Pressable>

        <Pressable onPress={toggle} scaleTo={0.98} className="flex-1 flex-row items-center py-3.5 pr-2">
          <Text className="flex-1 font-sans-medium text-base text-dock-text">{label}</Text>
          {count > 0 ? (
            <Text className="mr-2 font-label text-xs text-dock-amber">{count}</Text>
          ) : null}
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={16} color="#5C6154" />
          </Animated.View>
        </Pressable>
      </View>

      {expanded ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          layout={Layout.duration(200)}
          className="pb-4 pl-11 pr-2"
        >
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export function DockRowEmpty({ label }: { label: string }) {
  return <Text className="font-sans text-sm text-dock-text-faint">{label}</Text>;
}
