import { Image, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { CatchListItem } from '@/hooks/useCatches';
import { formatWeightLbOz } from '@/lib/units';
import type { FishSubType } from '@/types/database';

const SUB_TYPE_LABELS: Record<FishSubType, string> = {
  common: 'Common',
  mirror: 'Mirror',
  linear: 'Linear',
  fully_scaled: 'Fully Scaled',
  leather: 'Leather',
  grass: 'Grass',
  koi: 'Koi',
  ghost: 'Ghost',
};

export function CatchCard({ item, index = 0 }: { item: CatchListItem; index?: number }) {
  const cover = [...item.catch_photos].sort((a, b) => a.position - b.position)[0];
  const date = new Date(item.occurred_at);

  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(Math.min(index, 8) * 40)}
      className="mb-6 overflow-hidden rounded-2xl bg-white/60"
      style={{
        shadowColor: '#2B2620',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      {cover?.signedUrl ? (
        <Image source={{ uri: cover.signedUrl }} className="h-72 w-full" resizeMode="cover" />
      ) : (
        <View className="h-72 w-full items-center justify-center bg-tobacco/10">
          <Text className="font-sans text-sm text-ink/40">No photo</Text>
        </View>
      )}
      <View className="p-4">
        <View className="flex-row items-baseline justify-between">
          <Text className="font-serif text-xl text-moss">
            {item.weight_grams ? formatWeightLbOz(item.weight_grams) : 'Weight not logged'}
          </Text>
          <Text className="font-sans text-xs text-ink/60">
            {date.toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        {item.sub_type || item.lakes?.name ? (
          <View className="mt-1 flex-row items-center gap-1">
            {item.sub_type ? (
              <Text className="font-sans text-sm text-tobacco">
                {SUB_TYPE_LABELS[item.sub_type]}
              </Text>
            ) : null}
            {item.lakes?.name ? (
              <Text className="font-sans text-sm text-ink/50">
                {item.sub_type ? `· ${item.lakes.name}` : item.lakes.name}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}
