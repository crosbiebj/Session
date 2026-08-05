import { Dimensions, Image, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// A full page of the book, not a scrolling list card — one catch, full
// bleed photo, given room to breathe (CLAUDE.md §8: "does this let the
// photo breathe?").
export function BookPage({ item }: { item: CatchListItem }) {
  const cover = [...item.catch_photos].sort((a, b) => a.position - b.position)[0];
  const date = new Date(item.occurred_at);

  return (
    <View style={{ width: SCREEN_WIDTH }} className="flex-1 px-5 pb-6 pt-2">
      <Animated.View
        entering={FadeIn.duration(300)}
        className="flex-1 overflow-hidden rounded-3xl bg-white/60"
        style={{
          shadowColor: '#2B2620',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.22,
          shadowRadius: 20,
          elevation: 8,
        }}
      >
        {cover?.signedUrl ? (
          <Image source={{ uri: cover.signedUrl }} className="flex-[3] w-full" resizeMode="cover" />
        ) : (
          <View className="flex-[3] w-full items-center justify-center bg-tobacco/10">
            <Text className="font-sans text-sm text-ink/40">No photo</Text>
          </View>
        )}
        <View className="flex-1 justify-center p-5">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-serif text-2xl text-moss">
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
                <Text className="font-sans text-sm text-tobacco">{SUB_TYPE_LABELS[item.sub_type]}</Text>
              ) : null}
              {item.lakes?.name ? (
                <Text className="font-sans text-sm text-ink/50">
                  {item.sub_type ? `· ${item.lakes.name}` : item.lakes.name}
                </Text>
              ) : null}
            </View>
          ) : null}
          {item.story ? (
            <Text className="mt-2 font-sans text-sm leading-5 text-ink/70" numberOfLines={3}>
              {item.story}
            </Text>
          ) : null}
          {item.air_temp_c !== null || item.air_pressure_hpa !== null ? (
            <Text className="mt-2 font-sans text-xs text-ink/40">
              {item.air_temp_c !== null ? `${Math.round(item.air_temp_c)}°C` : null}
              {item.air_pressure_hpa !== null ? ` · ${Math.round(item.air_pressure_hpa)} hPa` : null}
              {item.wind_speed !== null ? ` · ${Math.round(item.wind_speed)} km/h` : null}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}
