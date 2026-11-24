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

export const simulatedCondition: Record<WeatherMode, WeatherCondition | null> = {
  auto: null,
  rain: "rain",
  "clear-day": "clear",
  "clear-night": "clear",
  cloudy: "cloudy",
  snow: "snow",
  mist: "fog",
};

export function createDefaultSnapshot(mode: WeatherMode = "clear-day"): WeatherSnapshot {
  const isNight = mode === "clear-night";
  return {
    latitude: 12.9716,
    longitude: 77.5946,
    location: "Bengaluru",
    timezone: "Asia/Kolkata",
    temperature: 24,
    feelsLike: 24,
    humidity: 55,
    cloudCover: mode === "cloudy" ? 85 : mode === "rain" ? 95 : 10,
    precipitation: mode === "rain" ? 3.5 : 0,
    windSpeed: 4.2,
    windDirection: 120,
    visibility: 10000,
    weatherCode: mode === "rain" ? 61 : mode === "cloudy" ? 3 : mode === "snow" ? 71 : mode === "mist" ? 45 : 0,
    condition: simulatedCondition[mode] ?? "clear",
    isDay: !isNight,
    sunrise: "06:00",
    sunset: "18:00",
    moonPhase: 0.5,
    solarElevation: isNight ? -30 : 45,
    atmosphere: isNight ? "night" : "clear-day",
    observedAt: new Date().toISOString(),
    source: "fallback",
  };
}

export function withMode(snapshot: WeatherSnapshot | null, mode: WeatherMode): WeatherSnapshot {
  const base = snapshot ?? createDefaultSnapshot(mode);
  const condition = simulatedCondition[mode];
  if (!condition) return base;
  const isNight = mode === "clear-night";
  const isDay = mode === "clear-day" ? true : isNight ? false : base.isDay;
  return {
    ...base,
    condition,
    atmosphere: isNight ? "night" : mode === "clear-day" ? "clear-day" : base.atmosphere,
    isDay,
  };
}

export function resolveWeatherState(snapshot: WeatherSnapshot | null, mode: WeatherMode) {
  const active = withMode(snapshot, mode);
  const condition = active.condition;
  const isNight = active.atmosphere === "night" || mode === "clear-night" || !active.isDay;
  const isRain = condition === "rain" || condition === "thunderstorm" || mode === "rain";
  const isSnow = condition === "snow" || mode === "snow";
  const isFog = condition === "fog" || mode === "mist";
  const isCloudy = (condition === "cloudy" || condition === "partly-cloudy" || mode === "cloudy") && !isRain && !isSnow;
  const isSunny = !isNight && (condition === "clear" || mode === "clear-day") && !isRain && !isSnow && !isFog && !isCloudy;

  const weatherClass = isRain
    ? "weather-rain"
    : isSnow
    ? "weather-snow"
    : isFog
    ? "weather-fog"
    : isCloudy
    ? "weather-cloudy"
    : isNight
    ? "weather-night"
    : "weather-sunny";

  return {
    active,
    condition,
    isNight,
    isRain,
    isSnow,
    isFog,
    isCloudy,
    isSunny,
    weatherClass,
  };
}
