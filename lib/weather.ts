export type WeatherMode = "auto" | "rain" | "clear-day" | "clear-night" | "cloudy" | "snow" | "mist";
export type Atmosphere = "dawn" | "clear-day" | "golden-hour" | "dusk" | "night";
export type WeatherCondition = "clear" | "partly-cloudy" | "cloudy" | "fog" | "rain" | "snow" | "thunderstorm";

export type WeatherSnapshot = {
  latitude: number;
  longitude: number;
  location: string;
  country?: string;
  timezone: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  cloudCover: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  weatherCode: number;
  condition: WeatherCondition;
  isDay: boolean;
  sunrise: string | null;
  sunset: string | null;
  moonPhase: number;
  solarElevation: number;
  atmosphere: Atmosphere;
  observedAt: string;
  source: "open-meteo" | "fallback";
};

export function conditionFromCode(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if (code <= 3) return code === 1 ? "partly-cloudy" : "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunderstorm";
  return "rain";
}

export function moonPhaseAt(date: Date): number {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const synodicMonth = 29.530588853 * 86_400_000;
  return (((date.getTime() - knownNewMoon) / synodicMonth) % 1 + 1) % 1;
}

export function solarElevationAt(date: Date, latitude: number, longitude: number): number {
  const radians = Math.PI / 180;
  const day = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const gamma = (2 * Math.PI / 365) * (day - 1 + (hour - 12) / 24);
  const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const trueSolarMinutes = (hour * 60 + equationOfTime + 4 * longitude) % 1440;
  const hourAngle = (trueSolarMinutes / 4 - 180) * radians;
  const latitudeRadians = latitude * radians;
  const cosineZenith = Math.sin(latitudeRadians) * Math.sin(declination) + Math.cos(latitudeRadians) * Math.cos(declination) * Math.cos(hourAngle);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosineZenith))) / radians;
}

export function atmosphereAt(solarElevation: number): Atmosphere {
  if (solarElevation < -6) return "night";
  if (solarElevation < 0) return "dusk";
  if (solarElevation < 8) return solarElevation > 3 ? "golden-hour" : "dawn";
  return "clear-day";
}

export async function getWeather(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,visibility",
    daily: "sunrise,sunset",
    timezone: "auto",
    forecast_days: "1",
  }).toString();
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Open-Meteo returned ${response.status}`);
  const data = await response.json();
  const current = data.current;
  const now = new Date();
  const solarElevation = solarElevationAt(now, latitude, longitude);
  return {
    latitude,
    longitude,
    location: "Your location",
    timezone: data.timezone ?? "UTC",
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    cloudCover: current.cloud_cover,
    precipitation: current.precipitation,
    windSpeed: current.wind_speed_10m,
    windDirection: current.wind_direction_10m,
    visibility: current.visibility,
    weatherCode: current.weather_code,
    condition: conditionFromCode(current.weather_code),
    isDay: Boolean(current.is_day),
    sunrise: data.daily?.sunrise?.[0] ?? null,
    sunset: data.daily?.sunset?.[0] ?? null,
    moonPhase: moonPhaseAt(now),
    solarElevation,
    atmosphere: atmosphereAt(solarElevation),
    observedAt: current.time,
    source: "open-meteo",
  };
}
