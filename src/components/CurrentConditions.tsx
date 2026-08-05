import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { fetchCurrentWeather } from '@/lib/weather';

// A simple current-conditions readout, not a forecast or a rating —
// date/time, temperature, pressure, wind, right now, at wherever the
// angler is. Deliberately not the "best fishing day" scoring model other
// apps do — that's not what this is for.
export function CurrentConditions() {
  const { coords, loading: locationLoading, denied } = useCurrentLocation();

  const weather = useQuery({
    queryKey: ['current-weather', coords?.latitude, coords?.longitude],
    queryFn: () => fetchCurrentWeather(coords!.latitude, coords!.longitude),
    enabled: !!coords,
    staleTime: 10 * 60 * 1000, // 10 min — conditions don't need refetching every render
  });

  if (denied || (!locationLoading && !coords)) {
    return null; // no location permission — quietly omit the widget rather than nag
  }

  if (locationLoading || weather.isLoading || !weather.data) {
    return null; // avoid a layout-shifting loading skeleton for a "nice to have" widget
  }

  const { tempC, pressureHpa, windSpeedKmh, windDirectionDeg, time } = weather.data;
  const now = new Date(time);

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      className="mt-4 flex-row items-center justify-between rounded-2xl bg-dock-panel px-4 py-3.5"
    >
      <View>
        <Text className="font-label text-[10px] uppercase tracking-widest text-dock-text-faint">
          {now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
          {' · '}
          {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
        </Text>
        <Text className="mt-1 font-serif text-2xl text-dock-text">
          {tempC !== null ? `${Math.round(tempC)}°C` : '—'}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text className="font-sans text-xs text-dock-text-dim">
          {pressureHpa !== null ? `${Math.round(pressureHpa)} hPa` : 'Pressure —'}
        </Text>
        <Text className="font-sans text-xs text-dock-text-dim">
          {windSpeedKmh !== null ? `${Math.round(windSpeedKmh)} km/h` : 'Wind —'}
          {windDirectionDeg !== null ? ` ${degreesToCompass(windDirectionDeg)}` : ''}
        </Text>
      </View>
    </Animated.View>
  );
}

function degreesToCompass(deg: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(deg / 45) % 8];
}
