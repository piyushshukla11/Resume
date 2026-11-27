"use client";

import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useWeather } from "@/components/weather-provider";
import { resolveWeatherState } from "@/lib/weather-state";
import { WeatherCanvas } from "@/components/weather-canvas";

interface WeatherShellProps {
  className?: string;
  children: ReactNode;
  showCanvas?: boolean;
}

export function WeatherShell({ className = "", children, showCanvas = true }: WeatherShellProps) {
  const router = useRouter();
  const { weather, mode, minimal } = useWeather();
  const { weatherClass } = useMemo(() => resolveWeatherState(weather, mode), [weather, mode]);

  return (
    <div className={`site-shell ${weatherClass}${minimal ? " focus-mode" : ""} ${className}`.trim()}>
      {showCanvas && (
        <WeatherCanvas onProjectSelect={(target) => router.push(target === "work" ? "/work" : `/projects/${target}`)} />
      )}
      {children}
    </div>
  );
}
