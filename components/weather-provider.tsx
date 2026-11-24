"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { WeatherMode, WeatherSnapshot } from "@/lib/weather";
import type { WeatherContextValue } from "@/lib/weather-state";

const WeatherContext = createContext<WeatherContextValue | null>(null);
const MODE_KEY = "me-weather-mode";
const MINIMAL_KEY = "me-minimal-mode";
const LOCATION_KEY = "me-location-override";

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [mode, setModeState] = useState<WeatherMode>("auto");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minimal, setMinimalState] = useState(false);

  const load = useCallback(async (coordinates?: { latitude: number; longitude: number }, label?: string) => {
    setLoading(true);
    try {
      const query = coordinates ? "?lat=" + coordinates.latitude + "&lon=" + coordinates.longitude + (label ? "&label=" + encodeURIComponent(label) : "") : "";
      const response = await fetch(`/api/weather${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Weather data is unavailable");
      const data = await response.json();

      // If server returned fallback data (e.g. server had network/DNS restriction), fetch client-side directly from Open-Meteo
      if (data.source === "fallback" && coordinates && typeof window !== "undefined") {
        try {
          const directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,visibility&daily=sunrise,sunset&timezone=auto&forecast_days=1`;
          const directRes = await fetch(directUrl);
          if (directRes.ok) {
            const directData = await directRes.json();
            const cur = directData.current;
            const code = cur.weather_code;
            const isRain = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code) || cur.precipitation > 0;
            const isSnow = [71, 73, 75, 77, 85, 86].includes(code);
            const isThunder = [95, 96, 99].includes(code);
            const isFog = code === 45 || code === 48;
            const isCloudy = code === 2 || code === 3;
            const isPartly = code === 1;
            const condition = isThunder ? "thunderstorm" : isSnow ? "snow" : isRain ? "rain" : isFog ? "fog" : isCloudy ? "cloudy" : isPartly ? "partly-cloudy" : "clear";

            setWeather({
              ...data,
              temperature: cur.temperature_2m,
              feelsLike: cur.apparent_temperature,
              humidity: cur.relative_humidity_2m,
              cloudCover: cur.cloud_cover,
              precipitation: cur.precipitation,
              windSpeed: cur.wind_speed_10m,
              windDirection: cur.wind_direction_10m,
              visibility: cur.visibility,
              weatherCode: code,
              condition,
              isDay: Boolean(cur.is_day),
              source: "open-meteo",
            });
            setError(null);
            return;
          }
        } catch {
          // Keep data
        }
      }

      setWeather(data);
      setError(null);
    } catch {
      setError("Live weather is unavailable. The preview modes still work.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshLocation = useCallback(() => {
    localStorage.removeItem(LOCATION_KEY);
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          void load({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        },
        async () => {
          // If browser prompt is rejected or times out, immediately query client IP geolocation
          try {
            const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(3500) });
            if (res.ok) {
              const data = await res.json();
              if (data.success && Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
                void load(
                  { latitude: data.latitude, longitude: data.longitude },
                  [data.city, data.region_code || data.region].filter(Boolean).join(", ")
                );
                return;
              }
            }
          } catch {
            // Server fallback
          }
          void load();
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    } else {
      void load();
    }
  }, [load]);

  const setLocation = useCallback((latitude: number, longitude: number) => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
    const location = { latitude, longitude };
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
    void load(location, "Manual location");
  }, [load]);

  useEffect(() => {
    const savedMode = localStorage.getItem(MODE_KEY) as WeatherMode | null;
    const savedMinimal = localStorage.getItem(MINIMAL_KEY) === "true";
    queueMicrotask(() => {
      if (savedMode && ["auto", "rain", "clear-day", "clear-night", "cloudy", "snow", "mist"].includes(savedMode)) {
        setModeState(savedMode);
      }
      setMinimalState(savedMinimal);
      // Clean up any stale/orphaned manual override so live weather always matches actual GPS location
      refreshLocation();
    });
  }, [load, refreshLocation]);

  const setMode = useCallback((next: WeatherMode) => {
    setModeState(next);
    localStorage.setItem(MODE_KEY, next);
  }, []);

  const setMinimal = useCallback((next: boolean) => {
    setMinimalState(next);
    localStorage.setItem(MINIMAL_KEY, String(next));
  }, []);

  const value = useMemo(() => ({ weather, mode, loading, error, minimal, setMode, setMinimal, refreshLocation, setLocation }), [weather, mode, loading, error, minimal, setMode, setMinimal, refreshLocation, setLocation]);
  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}

export function useWeather() {
  const context = useContext(WeatherContext);
  if (!context) throw new Error("useWeather must be used inside WeatherProvider");
  return context;
}
