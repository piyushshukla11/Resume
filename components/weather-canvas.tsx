"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWeather } from "@/components/weather-provider";
import { resolveWeatherState } from "@/lib/weather-state";
import {
  createMinecraftCloudField,
  createRandomMinecraftCloud,
  getRandomCloudCount,
  type MinecraftCloud,
} from "@/lib/weather-clouds";

type Raindrop = {
  x: number;
  y: number;
  vy: number;
  len: number;
  alpha: number;
};

type RainSplash = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
};

type Snowflake = {
  x: number;
  y: number;
  vy: number;
  phase: number;
  size: number;
};

type Star = {
  x: number;
  y: number;
  phase: number;
  armLen: number;
};

function createRaindrops(w: number, h: number, count: number): Raindrop[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * (w + 120) - 60,
    y: Math.random() * h,
    vy: 540 + Math.random() * 220,
    len: 12 + Math.floor(Math.random() * 8),
    alpha: 0.45 + Math.random() * 0.45,
  }));
}

function createSnowflakes(w: number, h: number, count: number): Snowflake[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vy: 30 + Math.random() * 32,
    phase: Math.random() * Math.PI * 2,
    size: Math.random() > 0.4 ? 3 : 2,
  }));
}

function createStars(w: number, h: number, count: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * (h * 0.65),
    phase: Math.random() * Math.PI * 2,
    armLen: Math.random() > 0.6 ? 3 : 2,
  }));
}

export function WeatherCanvas({ onProjectSelect }: { onProjectSelect?: (projectId: string) => void } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { weather, mode, minimal } = useWeather();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDialogueOpen, setIsDialogueOpen] = useState(false);

  const { active, condition, isNight, isRain, isSnow, isFog, isCloudy, isSunny } = useMemo(
    () => resolveWeatherState(weather, mode),
    [weather, mode]
  );

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
    let previousTime = 0;

    const resize = () => {
      if (!canvas || !wrapper) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false; // strictly crisp pixel art
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

    // Weather entities (procedurally generated Minecraft cloud field)
    const cloudCount = getRandomCloudCount({ isCloudy, isRain, isSnow, isFog, isSunny, isNight });
    const clouds = createMinecraftCloudField(width, height, cloudCount);
    const raindrops = createRaindrops(width, height, 75);
    const splashes: RainSplash[] = [];
    const snowflakes = createSnowflakes(width, height, 65);
    const stars = createStars(width, height, 50);

    let mistOffset = 0;
    let lightningTimer = 0;
    let lightningActive = 0;
    let lightningBolt: { x: number; y: number }[] = [];
    let shootingStarTimer = 0;
    let shootingStarActive = false;
    let shootingStarX = 0;
    let shootingStarY = 0;
    let shootingStarProgress = 0;

    // =========================================================================
    // 1. RADIANT 16-BIT PIXEL SUN ENGINE
    // =========================================================================
    const drawPixelSun = (scx: number, scy: number, t: number, isCalm: boolean, overcast: boolean) => {
      const isMobile = width < 340;
      const ps = isMobile ? 3 : 4;
      const radiusBlocks = 11;

      // Soft Ambient Stepped Solar Halo
      const haloAlpha = overcast ? 0.07 : 0.14;
      for (let gy = -radiusBlocks - 8; gy <= radiusBlocks + 8; gy += 2) {
        for (let gx = -radiusBlocks - 8; gx <= radiusBlocks + 8; gx += 2) {
          const distSq = gx * gx + gy * gy;
          if (distSq > radiusBlocks * radiusBlocks && distSq <= (radiusBlocks + 8) * (radiusBlocks + 8)) {
            const glowDist = Math.sqrt(distSq);
            const norm = 1 - (glowDist - radiusBlocks) / 8;
            ctx.fillStyle = `rgba(251, 191, 36, ${Math.max(0, norm * haloAlpha)})`;
            ctx.fillRect(scx + gx * ps, scy + gy * ps, ps * 2, ps * 2);
          }
        }
      }

      // Concentric Expanding Coronal Shockwaves
      if (!isCalm && !overcast) {
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

        // Radiating 8-Bit Solar Rays
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

            if (overcast) {
              if (distSq <= 12) ctx.fillStyle = "#fef9c3";
              else if (distSq <= 32) ctx.fillStyle = "#fef08a";
              else if (distSq <= 65) ctx.fillStyle = "#facc15";
              else if (distSq <= 95) ctx.fillStyle = "#eab308";
              else ctx.fillStyle = "#ca8a04";
            } else {
              if (distSq <= 12) ctx.fillStyle = "#ffffff";
              else if (distSq <= 32) ctx.fillStyle = "#fef08a";
              else if (distSq <= 65) ctx.fillStyle = "#facc15";
              else if (distSq <= 95) ctx.fillStyle = "#f59e0b";
              else ctx.fillStyle = "#d97706";
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

    // =========================================================================
    // 3. MINECRAFT VOXEL CLOUD ENGINE (Authentic 3D Block Slabs)
    // =========================================================================
    const drawMinecraftClouds = (
      cloudsList: MinecraftCloud[],
      w: number,
      h: number,
      dt: number,
      palette: "day" | "storm" | "night" | "snow",
      opacityMultiplier = 1
    ) => {
      ctx.save();
      ctx.globalAlpha = opacityMultiplier;

      // Minecraft 3D voxel color palettes
      let topColor = "#ffffff";
      let bodyColor = "#e2e8f0";
      let shadowColor = "#64748b";
      let seamColor = "rgba(148, 163, 184, 0.4)";

      if (palette === "storm") {
        topColor = "#64748b";
        bodyColor = "#334155";
        shadowColor = "#0f172a";
        seamColor = "rgba(15, 23, 42, 0.6)";
      } else if (palette === "night") {
        topColor = "rgba(186, 230, 253, 0.85)";
        bodyColor = "rgba(30, 41, 59, 0.88)";
        shadowColor = "rgba(15, 23, 42, 0.95)";
        seamColor = "rgba(51, 65, 85, 0.5)";
      } else if (palette === "snow") {
        topColor = "#f8fafc";
        bodyColor = "#cbd5e1";
        shadowColor = "#94a3b8";
        seamColor = "rgba(100, 116, 139, 0.4)";
      }

      for (const c of cloudsList) {
        c.x += c.speed * dt;
        if (c.x > w + 40) {
          // Procedurally re-roll new silhouette, scale, altitude, and speed on wrap-around!
          const fresh = createRandomMinecraftCloud(w, h, false);
          Object.assign(c, fresh);
        }

        const cx = Math.round(c.x);
        const cy = Math.round(c.y);

        for (const b of c.blocks) {
          const bx = Math.round(cx + b.gridX * c.cellW);
          const by = Math.round(cy + b.gridY * c.cellH);
          const bw = Math.round(b.gridW * c.cellW);
          const bh = Math.round(b.gridH * c.cellH);

          // 1. Bottom shadow face (underside of Minecraft voxel slab)
          ctx.fillStyle = shadowColor;
          ctx.fillRect(bx, by, bw, bh);

          // 2. Front vertical face (body thickness of the block)
          if (bh > 4) {
            ctx.fillStyle = bodyColor;
            ctx.fillRect(bx, by, bw, bh - 4);
          }

          // 3. Top face highlight (sunlit upper plane of Minecraft block)
          ctx.fillStyle = topColor;
          ctx.fillRect(bx, by, bw, 3);

          // 4. Subtle inner voxel grid lines (block unit seams)
          ctx.fillStyle = seamColor;
          for (let gx = 1; gx < b.gridW; gx++) {
            ctx.fillRect(bx + gx * c.cellW, by + 3, 1, bh - 7);
          }
          for (let gy = 1; gy < b.gridH; gy++) {
            ctx.fillRect(bx, by + gy * c.cellH, bw, 1);
          }
        }
      }

      ctx.restore();
    };

    // =========================================================================
    // 4. STEPPED LIGHTNING GENERATOR
    // =========================================================================
    const generateLightning = (w: number, h: number) => {
      lightningBolt = [];
      let lx = Math.round(w * 0.3 + Math.random() * (w * 0.4));
      let ly = 30;
      lightningBolt.push({ x: lx, y: ly });

      while (ly < h * 0.75) {
        ly += 12 + Math.floor(Math.random() * 16);
        lx += (Math.random() - 0.5) * 36;
        lightningBolt.push({ x: lx, y: ly });
      }
    };

    // =========================================================================
    // MAIN RAF ANIMATION LOOP
    // =========================================================================
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible) return;

      const dt = Math.min((time - (previousTime || time)) / 1000, 0.05);
      previousTime = time;

      ctx.clearRect(0, 0, width, height);
      const calm = reducedMotion || minimal;
      const isMobile = width < 768;

      // Celestial coordinates (upper-right sky of the page)
      const celestialX = isMobile ? Math.round(width * 0.82) : Math.round(width * 0.85);
      const celestialY = isMobile ? Math.round(height * 0.16) : Math.round(height * 0.17);

      const wind = (active.windSpeed ?? 4) * 0.04;

      // -----------------------------------------------------------------------
      // LAYER 1: BACK LAYER (STARS & CELESTIAL BODIES)
      // -----------------------------------------------------------------------
      if (isNight) {
        // Draw Twinkling 4-Point Cross Pixel Stars
        for (const st of stars) {
          const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(st.phase + time * 0.003));
          const sx = Math.round(st.x);
          const sy = Math.round(st.y);

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(sx - 1, sy - 1, 2, 2);

          ctx.fillStyle = `rgba(186, 230, 253, ${pulse})`;
          ctx.fillRect(sx - st.armLen, sy, st.armLen, 1);
          ctx.fillRect(sx + 1, sy, st.armLen, 1);
          ctx.fillRect(sx, sy - st.armLen, 1, st.armLen);
          ctx.fillRect(sx, sy + 1, 1, st.armLen);
        }

        // Shooting Star
        shootingStarTimer += dt;
        if (shootingStarTimer > 12) {
          shootingStarActive = true;
          shootingStarTimer = 0;
          shootingStarX = Math.random() * (width * 0.7);
          shootingStarY = Math.random() * (height * 0.25);
          shootingStarProgress = 0;
        }
        if (shootingStarActive) {
          shootingStarProgress += dt * 3.5;
          if (shootingStarProgress > 1) {
            shootingStarActive = false;
          } else {
            const curX = shootingStarX + shootingStarProgress * 180;
            const curY = shootingStarY + shootingStarProgress * 90;
            const alpha = Math.sin(shootingStarProgress * Math.PI);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(Math.round(curX), Math.round(curY), 3, 2);
            ctx.fillStyle = `rgba(186, 230, 253, ${alpha * 0.6})`;
            ctx.fillRect(Math.round(curX - 8), Math.round(curY - 4), 8, 2);
          }
        }

        // Draw Moon
        drawPixelMoon(celestialX, celestialY);
      } else {
        // Draw Sun (full radiance in sunny; soft diffuse disc in cloudy/rain/fog)
        drawPixelSun(celestialX, celestialY, time, calm, isCloudy || isRain || isFog || isSnow);
      }

      // -----------------------------------------------------------------------
      // LAYER 2: MINECRAFT VOXEL CLOUDS (Procedural Infinite Drift)
      // -----------------------------------------------------------------------
      if (isCloudy) {
        // Full rich Minecraft cloud cover (procedural 7-10 clouds)
        drawMinecraftClouds(clouds, width, height, dt, isNight ? "night" : "day", 1.0);
      } else if (isRain) {
        // Dark moody Minecraft storm slabs (procedural 5-7 clouds)
        drawMinecraftClouds(clouds, width, height, dt, "storm", 1.0);
      } else if (isSnow) {
        // Soft winter Minecraft snow slabs (procedural 4-6 clouds)
        drawMinecraftClouds(clouds, width, height, dt, "snow", 0.95);
      } else if (isSunny) {
        // Subtle fair-weather Minecraft clouds (procedural 2-3 clouds)
        drawMinecraftClouds(clouds, width, height, dt, "day", 0.40);
      } else if (isNight) {
        // Nocturnal Minecraft clouds (procedural 1-3 clouds)
        drawMinecraftClouds(clouds, width, height, dt, "night", 0.30);
      }

      // -----------------------------------------------------------------------
      // LAYER 3: PRECIPITATION & PARTICLES
      // -----------------------------------------------------------------------
      if (isRain && !calm) {
        const windOffset = -35 + wind * 25;
        for (const r of raindrops) {
          r.y += r.vy * dt;
          r.x += windOffset * dt;
          if (r.y > height) {
            if (splashes.length < 35 && Math.random() > 0.45) {
              splashes.push({
                x: r.x,
                y: height - 10 + Math.random() * 8,
                vx: (Math.random() - 0.5) * 70,
                vy: -50 - Math.random() * 70,
                alpha: 0.8,
              });
            }
            r.y = -r.len - 10;
            r.x = Math.random() * (width + 120) - 60;
          }
          // Stepped 2px vertical rain streak
          ctx.fillStyle = `rgba(186, 230, 253, ${r.alpha})`;
          ctx.fillRect(Math.round(r.x), Math.round(r.y), 2, r.len);
        }

        // Splashes
        for (let sIdx = splashes.length - 1; sIdx >= 0; sIdx--) {
          const s = splashes[sIdx];
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.vy += 320 * dt;
          s.alpha -= 2.4 * dt;
          if (s.alpha <= 0) {
            splashes.splice(sIdx, 1);
            continue;
          }
          ctx.fillStyle = `rgba(224, 242, 254, ${s.alpha})`;
          ctx.fillRect(Math.round(s.x), Math.round(s.y), 2, 2);
        }

        // Thunderstorm lightning bolt & sky illumination
        if (condition === "thunderstorm") {
          lightningTimer += dt;
          if (lightningTimer > 6.0) {
            lightningActive = 0.12;
            lightningTimer = 0;
            generateLightning(width, height);
          }
          if (lightningActive > 0) {
            lightningActive -= dt;
            ctx.fillStyle = "rgba(240, 249, 255, 0.15)";
            ctx.fillRect(0, 0, width, height);

            if (lightningBolt.length > 1) {
              ctx.fillStyle = "#ffffff";
              for (let i = 0; i < lightningBolt.length - 1; i++) {
                const p1 = lightningBolt[i];
                const p2 = lightningBolt[i + 1];
                ctx.fillRect(Math.round(p1.x), Math.round(p1.y), 3, 3);
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                ctx.fillRect(Math.round(midX), Math.round(midY), 2, 2);
              }
            }
          }
        }
      }

      if (isSnow && !calm) {
        for (const s of snowflakes) {
          s.y += s.vy * dt;
          s.x += Math.sin(s.phase + time * 0.0016) * 16 * dt;
          if (s.y > height + 8) {
            s.y = -8;
            s.x = Math.random() * width;
          }
          const sx = Math.round(s.x);
          const sy = Math.round(s.y);

          if (s.size === 3) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(sx - 1, sy - 1, 2, 2);
            ctx.fillStyle = "#e0f2fe";
            ctx.fillRect(sx - 2, sy, 4, 1);
            ctx.fillRect(sx, sy - 2, 1, 4);
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(sx, sy, 2, 2);
          }
        }
      }

      // -----------------------------------------------------------------------
      // LAYER 4: MIST / FOG BANDS
      // -----------------------------------------------------------------------
      if (isFog && !calm) {
        mistOffset += 12 * dt;
        const bands = [
          { y: height * 0.22, h: 36, speed: 1.0, alpha: 0.12 },
          { y: height * 0.44, h: 48, speed: 0.7, alpha: 0.10 },
          { y: height * 0.66, h: 54, speed: 1.2, alpha: 0.14 },
          { y: height * 0.88, h: 40, speed: 0.9, alpha: 0.15 },
        ];
        for (const b of bands) {
          const shift = (mistOffset * b.speed) % (width + 240);
          ctx.fillStyle = `rgba(203, 213, 225, ${b.alpha})`;
          for (let x = -240 + shift; x < width + 120; x += 70) {
            const wave = Math.sin((x + mistOffset) * 0.006) * 6;
            ctx.fillRect(Math.round(x), Math.round(b.y + wave), 60, b.h);
          }
        }
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
  }, [minimal, reducedMotion, condition, isNight, isRain, isSnow, isFog, isCloudy, isSunny, active.windSpeed]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="false"
      className={`weather-layer weather-${condition}${isNight ? " is-night" : ""}${minimal ? " is-minimal" : ""}${isDialogueOpen ? " has-dialogue-open" : ""}`}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="weather-canvas" />

      {/* Interactive Celestial Anchor (Sun / Moon) - Triggers Dialogue on Press */}
      <div className="celestial-anchor">
        <button
          type="button"
          className="celestial-hitbox"
          aria-label={isNight ? "Pixel Moon. Press to view core stack & biography." : "Pixel Sun. Press to view core stack & biography."}
          aria-expanded={isDialogueOpen}
          onClick={() => setIsDialogueOpen((prev) => !prev)}
        >
          <span className="sr-only">{isNight ? "Toggle Lunar Profile" : "Toggle Solar Profile"}</span>
        </button>

        {/* Retro Pixel Dialogue Popup - Appears only when pressed */}
        {isDialogueOpen && (
          <>
            <div
              className="celestial-scrim"
              aria-hidden="true"
              onClick={(e) => {
                e.stopPropagation();
                setIsDialogueOpen(false);
              }}
            />
            <div className="celestial-dialogue-card" role="dialog" aria-label="Technical Profile">
            <div className="dialogue-header">
              <span className="dialogue-badge">
                {isNight ? "🌙 LUNAR SYSTEM" : "☀️ SOLAR SYSTEM"}
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
                {isNight
                  ? "Systems & Low-Level Architecture · Night Owl Mode"
                  : "Robotics & Artificial Intelligence Undergrad · Systems, AI & Games"}
              </p>

              <div className="dialogue-stack-wrap">
                <span className="dialogue-stack-heading">CORE TECHNICAL STACK:</span>
                <div className="dialogue-stack-chips">
                  {(isNight
                    ? ["C", "C++", "Python", "Java", "Kotlin", "Android Dev", "Rust", "Robotics & AI"]
                    : ["C", "C++", "Python", "Java", "Kotlin", "Android Dev", "JavaScript", "React", "Node.js", "SQL"]
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
          </>
        )}
      </div>
    </div>
  );
}
