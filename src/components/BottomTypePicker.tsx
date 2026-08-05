import { Text, View } from 'react-native';

import { Pressable as AnimatedPressable } from '@/components/Pressable';

const BOTTOM_TYPES = ['Silt', 'Choddy', 'Weed', 'Gravel', 'Clay', 'Sand'];

// Reuses the chip-picker pattern from Targets' sub-type selector
// (src/app/targets/index.tsx) — one tap, toggleable, no free-text needed
// for the common cases carp anglers actually describe a lakebed with.
export function BottomTypePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (type: string | null) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {BOTTOM_TYPES.map((type) => (
        <AnimatedPressable
          key={type}
          onPress={() => onChange(value === type ? null : type)}
          className={`rounded-full border px-3.5 py-1.5 ${
            value === type ? 'border-dock-amber bg-dock-amber/20' : 'border-dock-border'
          }`}
        >
          <Text
            className={`font-label text-xs uppercase tracking-wide ${
              value === type ? 'text-dock-amber' : 'text-dock-text-dim'
            }`}
          >
            {type}
          </Text>
        </AnimatedPressable>
      ))}
    </View>
  );
}
