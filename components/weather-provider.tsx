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
      setWeather(await response.json());
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
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60_000 }
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
      try {
        const savedLocation = localStorage.getItem(LOCATION_KEY);
        const coordinates = savedLocation ? JSON.parse(savedLocation) as { latitude: number; longitude: number } : null;
        if (coordinates && Number.isFinite(coordinates.latitude) && Number.isFinite(coordinates.longitude)) {
          void load(coordinates, "Manual location");
        } else {
          refreshLocation();
        }
      } catch {
        refreshLocation();
      }
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
