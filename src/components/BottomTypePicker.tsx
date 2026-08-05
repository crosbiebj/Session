import { Text, View } from 'react-native';

import { Pressable as AnimatedPressable } from '@/components/Pressable';

const BOTTOM_TYPES = ['Silt', 'Choddy', 'Weed', 'Gravel', 'Clay', 'Sand'];

// Reuses the chip-picker pattern from Targets' sub-type selector
// (src/app/targets/index.tsx) — multi-select, since a real lakebed is
// often a mix (e.g. "silt + gravel"), not one single category.
export function BottomTypePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (types: string[]) => void;
}) {
  const toggle = (type: string) => {
    onChange(value.includes(type) ? value.filter((t) => t !== type) : [...value, type]);
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {BOTTOM_TYPES.map((type) => (
        <AnimatedPressable
          key={type}
          onPress={() => toggle(type)}
          className={`rounded-full border px-3.5 py-1.5 ${
            value.includes(type) ? 'border-dock-amber bg-dock-amber/20' : 'border-dock-border'
          }`}
        >
          <Text
            className={`font-label text-xs uppercase tracking-wide ${
              value.includes(type) ? 'text-dock-amber' : 'text-dock-text-dim'
            }`}
          >
            {type}
          </Text>
        </AnimatedPressable>
      ))}
    </View>
  );
}
