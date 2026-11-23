"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Sun } from "lucide-react";
import { useWeather } from "@/components/weather-provider";
import { withMode } from "@/lib/weather-state";
import type { WeatherCondition } from "@/lib/weather";

export function WeatherCanvas({ onProjectSelect }: { onProjectSelect?: (projectId: string) => void } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { weather, mode, minimal } = useWeather();
  const [reducedMotion, setReducedMotion] = useState(false);

  const activeWeather = useMemo(() => (weather ? withMode(weather, mode) : null), [weather, mode]);
  const condition: WeatherCondition = activeWeather?.condition ?? "clear";
  const night = activeWeather?.atmosphere === "night" || mode === "clear-night";

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(query.matches);
    change();
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !wrapper || !ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let frame = 0;
    let visible = true;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false; // Strictly enforce crisp pixel art!
    };

    const visibility = () => {
      visible = document.visibilityState === "visible";
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && document.visibilityState === "visible";
    });

    observer.observe(wrapper);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    resize();

    // =========================================================================
    // RADIANT 16-BIT PIXEL SUN ENGINE
    // =========================================================================
    const drawPixelSun = (scx: number, scy: number, t: number, isCalm: boolean) => {
      const isMobile = width < 768;
      const ps = isMobile ? 3 : 4; // Pixel block scale
      const radiusBlocks = 11;

      // 1. Soft Ambient Stepped Pixel Solar Halo
      for (let gy = -radiusBlocks - 8; gy <= radiusBlocks + 8; gy += 2) {
        for (let gx = -radiusBlocks - 8; gx <= radiusBlocks + 8; gx += 2) {
          const distSq = gx * gx + gy * gy;
          if (distSq > radiusBlocks * radiusBlocks && distSq <= (radiusBlocks + 8) * (radiusBlocks + 8)) {
            const glowDist = Math.sqrt(distSq);
            const norm = 1 - (glowDist - radiusBlocks) / 8;
            ctx.fillStyle = `rgba(251, 191, 36, ${Math.max(0, norm * 0.12)})`;
            ctx.fillRect(scx + gx * ps, scy + gy * ps, ps * 2, ps * 2);
          }
        }
      }

      // 2. Concentric Expanding Pixel Rings (Coronal emission shockwaves)
      if (!isCalm) {
        for (let ring = 0; ring < 3; ring++) {
          const phase = ((t * 0.0006 + ring * 0.33) % 1);
          const r = Math.round(13 + phase * 22);
          const alpha = (1 - phase) * 0.35;
          ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
          for (let i = -r; i <= r; i++) {
            const j = r - Math.abs(i);
            ctx.fillRect(scx + i * ps, scy + j * ps, ps, ps);
            ctx.fillRect(scx + i * ps, scy - j * ps, ps, ps);
          }
        }

        // 3. Radiating 8-Bit Solar Rays (8 directional stepped beams)
        for (let ray = 0; ray < 8; ray++) {
          const rayAngle = (ray * Math.PI) / 4;
          const rayPulse = Math.sin(t * 0.004 + ray * 0.8);
          const rayLenBlocks = Math.round(16 + rayPulse * 6);
          for (let step = 12; step <= rayLenBlocks; step++) {
            const rx = scx + Math.round(Math.cos(rayAngle) * step * ps);
            const ry = scy + Math.round(Math.sin(rayAngle) * step * ps);
            const rayAlpha = Math.max(0.1, 1 - (step - 12) / (rayLenBlocks - 11));
            ctx.fillStyle = step % 2 === 0 ? `rgba(254, 240, 138, ${rayAlpha})` : `rgba(245, 158, 11, ${rayAlpha * 0.8})`;
            ctx.fillRect(rx, ry, ps, ps);
            if (step < rayLenBlocks - 2) {
              ctx.fillRect(rx + (step % 2 === 0 ? 1 : -1) * ps, ry, ps, ps);
            }
          }
        }
      }

      // 4. Stepped Pixel Sun Core Disc
      for (let gy = -radiusBlocks; gy <= radiusBlocks; gy++) {
        for (let gx = -radiusBlocks; gx <= radiusBlocks; gx++) {
          const distSq = gx * gx + gy * gy;
          if (distSq <= radiusBlocks * radiusBlocks) {
            const px = scx + gx * ps;
            const py = scy + gy * ps;

            if (distSq <= 12) {
              ctx.fillStyle = "#ffffff";
            } else if (distSq <= 32) {
              ctx.fillStyle = "#fef08a";
            } else if (distSq <= 65) {
              ctx.fillStyle = "#facc15";
            } else if (distSq <= 95) {
              ctx.fillStyle = "#f59e0b";
            } else {
              ctx.fillStyle = "#d97706";
            }
            ctx.fillRect(px, py, ps, ps);
          }
        }
      }
    };

    // Main RAF animation loop
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible) return;

      ctx.clearRect(0, 0, width, height);
      const calm = reducedMotion || minimal;
      const isMobile = width < 768;

      const sunX = isMobile ? Math.round(width * 0.78) : Math.round(width * 0.82);
      const sunY = isMobile ? Math.round(height * 0.22) : Math.round(height * 0.26);

      drawPixelSun(sunX, sunY, time, calm);
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [minimal, reducedMotion]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="false"
      className={`weather-layer weather-${condition}${night ? " is-night" : ""}${minimal ? " is-minimal" : ""}`}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="weather-canvas" />

      {/* Pixelated Celestial Hub - Navigates to Stack */}
      <button
        type="button"
        className="celestial-hub"
        aria-label="Pixel Sun node. Explore core technical skills."
        title="Open the tech stack matrix"
        onClick={() => {
          onProjectSelect?.("polyexecution-studio");
          document.getElementById("stack")?.scrollIntoView({ behavior: "smooth" });
        }}
      >
        <Sun size={17} strokeWidth={1.4} />
        <span className="celestial-label">SOLAR / CORE</span>
        <span className="celestial-orbit" aria-hidden="true">
          {["C", "C#", "Java", "Kotlin", "Python", "JavaScript", "SQL", "Go"].map((skill, index) => {
            const angle = index * 45;
            return (
              <span
                key={skill}
                style={{
                  transform: `rotate(${angle}deg) translateX(72px) rotate(-${angle}deg)`,
                }}
              >
                {skill}
              </span>
            );
          })}
        </span>
      </button>
    </div>
  );
}
