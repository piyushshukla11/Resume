import type { WeatherCondition, WeatherMode, WeatherSnapshot } from "@/lib/weather";

export type WeatherContextValue = {
  weather: WeatherSnapshot | null;
  mode: WeatherMode;
  loading: boolean;
  error: string | null;
  minimal: boolean;
  setMode: (mode: WeatherMode) => void;
  setMinimal: (minimal: boolean) => void;
  refreshLocation: () => void;
  setLocation: (latitude: number, longitude: number) => void;
};

export const simulatedCondition: Partial<Record<WeatherMode, WeatherCondition>> = {
  rain: "rain",
  "clear-day": "clear",
  "clear-night": "clear",
  cloudy: "cloudy",
  snow: "snow",
  mist: "fog",
};

export function withMode(snapshot: WeatherSnapshot, mode: WeatherMode): WeatherSnapshot {
  const condition = simulatedCondition[mode];
  if (!condition) return snapshot;
  return {
    ...snapshot,
    condition,
    atmosphere: mode === "clear-night" ? "night" : mode === "clear-day" ? "clear-day" : snapshot.atmosphere,
    isDay: mode === "clear-night" ? false : mode === "clear-day" ? true : snapshot.isDay,
  };
}
