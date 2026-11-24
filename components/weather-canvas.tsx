"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWeather } from "@/components/weather-provider";
import { withMode } from "@/lib/weather-state";
import type { WeatherCondition } from "@/lib/weather";

export function WeatherCanvas({ onProjectSelect }: { onProjectSelect?: (projectId: string) => void } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { weather, mode, minimal } = useWeather();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDialogueOpen, setIsDialogueOpen] = useState(false);

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

    let width = wrapper.clientWidth || 380;
    let height = wrapper.clientHeight || 380;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let frame = 0;
    let visible = true;

    const resize = () => {
      if (!canvas || !wrapper) return;
      width = wrapper.clientWidth || 380;
      height = wrapper.clientHeight || 380;
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

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });

    observer.observe(wrapper);
    resizeObserver.observe(wrapper);
    window.addEventListener("resize", resize, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    resize();

    // =========================================================================
    // 1. RADIANT 16-BIT PIXEL SUN ENGINE
    // =========================================================================
    const drawPixelSun = (scx: number, scy: number, t: number, isCalm: boolean) => {
      const isMobile = width < 340;
      const ps = isMobile ? 3 : 4;
      const radiusBlocks = 11;

      // Soft Ambient Stepped Pixel Solar Halo
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

      // Concentric Expanding Pixel Rings (Coronal emission shockwaves)
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

        // Radiating 8-Bit Solar Rays (8 directional stepped beams)
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

      // Stepped Pixel Sun Core Disc
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

    // =========================================================================
    // 2. RADIANT 16-BIT PIXEL MOON ENGINE
    // =========================================================================
    const drawPixelMoon = (mcx: number, mcy: number) => {
      const isMobile = width < 340;
      const ps = isMobile ? 3 : 4;
      const radiusBlocks = 9;

      // Subtle pixel aura
      ctx.fillStyle = "rgba(186, 212, 196, 0.16)";
      for (let gy = -radiusBlocks - 3; gy <= radiusBlocks + 3; gy++) {
        for (let gx = -radiusBlocks - 3; gx <= radiusBlocks + 3; gx++) {
          if (gx * gx + gy * gy <= (radiusBlocks + 3) ** 2) {
            ctx.fillRect(mcx + gx * ps, mcy + gy * ps, ps, ps);
          }
        }
      }

      // Lunar Disc with Stepped Craters
      for (let gy = -radiusBlocks; gy <= radiusBlocks; gy++) {
        for (let gx = -radiusBlocks; gx <= radiusBlocks; gx++) {
          const distSq = gx * gx + gy * gy;
          if (distSq <= radiusBlocks * radiusBlocks) {
            const px = mcx + gx * ps;
            const py = mcy + gy * ps;

            const isCrater1 = (gx === -2 || gx === -3) && (gy === -1 || gy === -2);
            const isCrater2 = (gx === 1 || gx === 2) && (gy === 2 || gy === 3);
            const isCrater3 = gx === -1 && gy === 3;

            if (isCrater1 || isCrater2 || isCrater3) {
              ctx.fillStyle = "#64748b"; // Dark crater
            } else if (distSq > radiusBlocks * radiusBlocks - 16) {
              ctx.fillStyle = "#94a3b8"; // Shaded rim
            } else if (gx < 0 && gy < 0) {
              ctx.fillStyle = "#ffffff"; // Specular highlight
            } else {
              ctx.fillStyle = "#e2e8f0"; // Pale silver body
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

      const celestialX = Math.round(width / 2);
      const celestialY = Math.round(height / 2);

      if (night) {
        drawPixelMoon(celestialX, celestialY);
      } else {
        drawPixelSun(celestialX, celestialY, time, calm);
      }
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [minimal, reducedMotion, night]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="false"
      className={`weather-layer weather-${condition}${night ? " is-night" : ""}${minimal ? " is-minimal" : ""}`}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="weather-canvas" />

      {/* Interactive Celestial Anchor (Sun / Moon) - Triggers Dialogue on Press */}
      <div className="celestial-anchor">
        <button
          type="button"
          className="celestial-hitbox"
          aria-label={night ? "Pixel Moon. Press to view core stack & biography." : "Pixel Sun. Press to view core stack & biography."}
          aria-expanded={isDialogueOpen}
          onClick={() => setIsDialogueOpen((prev) => !prev)}
        >
          <span className="sr-only">{night ? "Toggle Lunar Profile" : "Toggle Solar Profile"}</span>
        </button>

        {/* Retro Pixel Dialogue Popup - Appears only when pressed */}
        {isDialogueOpen && (
          <div className="celestial-dialogue-card" role="dialog" aria-label="Technical Profile">
            <div className="dialogue-header">
              <span className="dialogue-badge">
                {night ? "🌙 LUNAR SYSTEM" : "☀️ SOLAR SYSTEM"}
              </span>
              <button
                type="button"
                className="dialogue-close-btn"
                aria-label="Close dialogue"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDialogueOpen(false);
                }}
              >
                ✕
              </button>
            </div>

            <div className="dialogue-body">
              <strong className="dialogue-name">PIYUSH SHUKLA</strong>
              <p className="dialogue-role">
                {night
                  ? "Systems & Low-Level Architecture · Night Owl Mode"
                  : "Computer Science Undergrad · Systems, AI & Games"}
              </p>

              <div className="dialogue-stack-wrap">
                <span className="dialogue-stack-heading">CORE TECHNICAL STACK:</span>
                <div className="dialogue-stack-chips">
                  {(night
                    ? ["C", "C++", "Linux Kernel", "Process Isolation", "Networking", "Go", "Rust", "Systems"]
                    : ["C", "C#", "Java", "Kotlin", "Python", "JavaScript", "SQL", "Go", "Shaders"]
                  ).map((skill) => (
                    <span key={skill} className="dialogue-stack-chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="dialogue-btn-row">
              <button
                type="button"
                className="dialogue-action-btn"
                onClick={() => {
                  setIsDialogueOpen(false);
                  document.getElementById("stack")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <span>EXPLORE TECH MATRIX ↓</span>
              </button>
              <button
                type="button"
                className="dialogue-action-btn dialogue-action-btn-alt"
                onClick={() => {
                  setIsDialogueOpen(false);
                  onProjectSelect?.("work");
                }}
              >
                <span>OPEN WORK INDEX ↗</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
