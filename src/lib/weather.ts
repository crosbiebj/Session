// Open-Meteo — free, no API key required at current scale (CLAUDE.md §3,
// Weather & moon phase auto-fetch). Two endpoints: /forecast for
// current-conditions (Home screen), /archive for a specific past hour
// (catch-time auto-fill).

export type WeatherReading = {
  tempC: number | null;
  pressureHpa: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  time: string;
};

export async function fetchCurrentWeather(
  latitude: number,
  longitude: number
): Promise<WeatherReading | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,surface_pressure,wind_speed_10m,wind_direction_10m&timezone=auto`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const current = json.current;
    if (!current) return null;

    return {
      tempC: current.temperature_2m ?? null,
      pressureHpa: current.surface_pressure ?? null,
      windSpeedKmh: current.wind_speed_10m ?? null,
      windDirectionDeg: current.wind_direction_10m ?? null,
      time: current.time,
    };
  } catch {
    // Network/API failure shouldn't be fatal anywhere this is called from
    // — the Home widget just doesn't render, catch save proceeds without
    // weather.
    return null;
  }
}

export async function fetchHistoricalWeather(
  latitude: number,
  longitude: number,
  occurredAt: Date
): Promise<WeatherReading | null> {
  const dateStr = occurredAt.toISOString().slice(0, 10); // YYYY-MM-DD
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,surface_pressure,wind_speed_10m,wind_direction_10m&timezone=UTC`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const hourly = json.hourly;
    if (!hourly?.time?.length) return null;

    // Find the hourly slot closest to the catch's actual time.
    const targetMs = occurredAt.getTime();
    let closestIndex = 0;
    let closestDiff = Infinity;
    for (let i = 0; i < hourly.time.length; i++) {
      const diff = Math.abs(new Date(hourly.time[i] + 'Z').getTime() - targetMs);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }

    return {
      tempC: hourly.temperature_2m?.[closestIndex] ?? null,
      pressureHpa: hourly.surface_pressure?.[closestIndex] ?? null,
      windSpeedKmh: hourly.wind_speed_10m?.[closestIndex] ?? null,
      windDirectionDeg: hourly.wind_direction_10m?.[closestIndex] ?? null,
      time: hourly.time[closestIndex],
    };
  } catch {
    return null;
  }
}
