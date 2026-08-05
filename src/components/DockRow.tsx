import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  SlideInRight,
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
  // When both are given, tapping the icon slides out two quick-action
  // buttons (add / view) instead of navigating straight there — "buttons
  // should slide out so you can still make edits from there," rather than
  // always landing on a plain list. Omit both (e.g. Stats) to keep the
  // icon as a direct hard-navigate, since there's nothing to "add" there.
  addRoute?: string;
  addLabel?: string;
  viewLabel?: string;
  children?: React.ReactNode;
};

// CLAUDE.md §3, Home screen interaction model: tapping the icon itself is
// a "hard click" — either straight to the section's full page, or (when
// addRoute/addLabel are set) a quick-action slide-out first. Tapping the
// rest of the row (label/count/chevron) is a "soft click" that expands an
// inline accordion preview in place, without leaving Home.
//
// Everything here runs on Reanimated (chevron rotation, accordion
// reveal, slide-out actions, sibling reflow) rather than mixing in the
// legacy LayoutAnimation API — one animation system end to end.
export function DockRow({
  icon,
  label,
  count,
  route,
  addRoute,
  addLabel,
  viewLabel,
  children,
}: DockRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const rotation = useSharedValue(0);

  const toggle = () => {
    rotation.value = withTiming(expanded ? 0 : 180, { duration: 200 });
    setExpanded((e) => !e);
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const hasActions = !!(addRoute && addLabel);

  const handleIconPress = () => {
    if (hasActions) {
      setShowActions((s) => !s);
    } else {
      router.push(route as never);
    }
  };

  const go = (to: string) => {
    setShowActions(false);
    router.push(to as never);
  };

  return (
    <Animated.View layout={Layout.duration(200)} className="border-b border-dock-border">
      <View className="flex-row items-center">
        <Pressable
          onPress={handleIconPress}
          scaleTo={0.85}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center"
        >
          <Ionicons name={showActions ? 'close' : icon} size={showActions ? 18 : 21} color="#5C7A4C" />
        </Pressable>

        {showActions ? (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(120)}
            className="flex-1 flex-row items-center gap-2 py-2.5 pr-2"
          >
            <Animated.View entering={SlideInRight.duration(180)}>
              <Pressable onPress={() => go(addRoute as string)} className="rounded-full bg-dock-amber/20 px-3.5 py-1.5">
                <Text className="font-label text-xs uppercase tracking-wide text-dock-amber">{addLabel}</Text>
              </Pressable>
            </Animated.View>
            <Animated.View entering={SlideInRight.duration(180).delay(40)}>
              <Pressable onPress={() => go(route)} className="rounded-full bg-white/10 px-3.5 py-1.5">
                <Text className="font-label text-xs uppercase tracking-wide text-dock-text-dim">
                  {viewLabel ?? label}
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        ) : (
          <Pressable onPress={toggle} scaleTo={0.98} className="flex-1 flex-row items-center py-3.5 pr-2">
            <Text className="flex-1 font-sans-medium text-base text-dock-text">{label}</Text>
            {count > 0 ? (
              <Text className="mr-2 font-label text-xs text-dock-amber">{count}</Text>
            ) : null}
            <Animated.View style={chevronStyle}>
              <Ionicons name="chevron-down" size={16} color="#5C6154" />
            </Animated.View>
          </Pressable>
        )}
      </View>

      {expanded && !showActions ? (
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
