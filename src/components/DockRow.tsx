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
  route: string;
  // When both are given, the expanded accordion gets a small tray of
  // circular icon buttons (add / view) above the preview content — part
  // of the dropdown, not a replacement for it. The icon always still
  // hard-navigates straight to route, unchanged.
  addRoute?: string;
  addLabel?: string;
  addIcon?: keyof typeof Ionicons.glyphMap;
  viewLabel?: string;
  viewIcon?: keyof typeof Ionicons.glyphMap;
  children?: React.ReactNode;
};

// CLAUDE.md §3, Home screen interaction model: tapping the icon itself is
// a hard click straight to the section's full page. Tapping the rest of
// the row (label/count/chevron) is a soft click that expands an inline
// accordion in place — a quick-action tray up top (when the section has
// one) plus the existing preview content below it, without leaving Home.
//
// Everything here runs on Reanimated (chevron rotation, accordion
// reveal, tray slide-in, sibling reflow) rather than mixing in the
// legacy LayoutAnimation API — one animation system end to end.
export function DockRow({
  icon,
  label,
  route,
  addRoute,
  addLabel,
  addIcon = 'add',
  viewLabel,
  viewIcon = 'list',
  children,
}: DockRowProps) {
  const [expanded, setExpanded] = useState(false);
  const rotation = useSharedValue(0);

  const toggle = () => {
    rotation.value = withTiming(expanded ? 0 : 180, { duration: 200 });
    setExpanded((e) => !e);
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const hasActions = !!(addRoute && addLabel);

  return (
    <Animated.View layout={Layout.duration(200)} className="border-b border-dock-border">
      <View className="flex-row items-center">
        <Pressable
          onPress={() => router.push(route as never)}
          scaleTo={0.85}
          hitSlop={8}
          className="h-11 w-11 items-center justify-center"
        >
          <View
            className="h-10 w-10 items-center justify-center rounded-full bg-dock-moss/15"
            style={{ borderWidth: 1, borderColor: '#5C7A4C4D' }}
          >
            <Ionicons name={icon} size={19} color="#5C7A4C" />
          </View>
        </Pressable>

        <Pressable
          onPress={toggle}
          scaleTo={0.98}
          className="flex-1 flex-row items-center gap-3 py-3.5 pl-1 pr-4"
        >
          <Text className="flex-1 font-sans-medium text-base text-dock-text">{label}</Text>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={18} color="#5C6154" />
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
          {hasActions ? (
            <View className="mb-4 mt-1 flex-row gap-5 border-t border-dock-border pt-4">
              <Animated.View entering={SlideInRight.duration(420)}>
                <Pressable
                  onPress={() => router.push(addRoute as never)}
                  scaleTo={0.9}
                  className="items-center gap-1.5"
                  style={{ width: 60 }}
                >
                  <View
                    className="h-12 w-12 items-center justify-center rounded-full bg-dock-amber/15"
                    style={{ borderWidth: 1, borderColor: '#C9974A40' }}
                  >
                    <Ionicons name={addIcon} size={21} color="#C9974A" />
                  </View>
                  <Text
                    className="font-label text-[9px] uppercase tracking-wide text-dock-amber"
                    numberOfLines={1}
                  >
                    {addLabel}
                  </Text>
                </Pressable>
              </Animated.View>
              <Animated.View entering={SlideInRight.duration(420).delay(100)}>
                <Pressable
                  onPress={() => router.push(route as never)}
                  scaleTo={0.9}
                  className="items-center gap-1.5"
                  style={{ width: 60 }}
                >
                  <View
                    className="h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]"
                    style={{ borderWidth: 1, borderColor: '#FFFFFF1A' }}
                  >
                    <Ionicons name={viewIcon} size={19} color="#8B9184" />
                  </View>
                  <Text
                    className="font-label text-[9px] uppercase tracking-wide text-dock-text-dim"
                    numberOfLines={1}
                  >
                    {viewLabel ?? label}
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          ) : null}
          {children}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export function DockRowEmpty({ label }: { label: string }) {
  return <Text className="font-sans text-sm text-dock-text-faint">{label}</Text>;
}
