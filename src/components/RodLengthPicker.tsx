import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout, SlideInRight } from 'react-native-reanimated';

import { Pressable as AnimatedPressable } from '@/components/Pressable';

const ROD_LENGTHS_FT = [9, 10, 11, 12, 13];

// A wrap only means a fixed distance once you know the rod it was
// counted against — a 9ft rod's wrap covers less line than a 13ft rod's.
// Tapping the pill slides out the rod-length options in place, closest
// available match to the "icons slide out of the button" interaction Ben
// pointed to (KWO screenshots) without pulling in a bottom-sheet library.
export function RodLengthPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (ft: number | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <AnimatedPressable
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center justify-between rounded-lg bg-dock-panel px-4 py-3"
      >
        <Text className="font-sans text-base text-dock-text">
          {value ? `${value}ft rod` : 'Rod length (for wraps)'}
        </Text>
        <Text className="font-sans text-xs text-dock-text-faint">{open ? 'Close' : 'Set'}</Text>
      </AnimatedPressable>

      {open ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(120)}
          layout={Layout.duration(200)}
          className="mt-2 flex-row flex-wrap gap-2"
        >
          {ROD_LENGTHS_FT.map((ft, index) => (
            <Animated.View key={ft} entering={SlideInRight.duration(180).delay(index * 25)}>
              <AnimatedPressable
                onPress={() => {
                  onChange(value === ft ? null : ft);
                  setOpen(false);
                }}
                className={`rounded-full border px-4 py-2 ${
                  value === ft ? 'border-dock-amber bg-dock-amber/20' : 'border-dock-border'
                }`}
              >
                <Text
                  className={`font-label text-xs uppercase tracking-wide ${
                    value === ft ? 'text-dock-amber' : 'text-dock-text-dim'
                  }`}
                >
                  {ft}ft
                </Text>
              </AnimatedPressable>
            </Animated.View>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}
