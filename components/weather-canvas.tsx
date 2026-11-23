"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sparkles, Sun } from "lucide-react";
import { useWeather } from "@/components/weather-provider";
import { featuredProjects } from "@/lib/projects";
import { withMode } from "@/lib/weather-state";
import type { PortfolioProject } from "@/lib/projects";
import type { WeatherCondition } from "@/lib/weather";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
};

type HeroNode = {
  project: PortfolioProject;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vy: number;
  size: number;
  phase: number;
  photonAngle: number;
  photonDistance: number;
  photonSpeed: number;
  photonMaxDist: number;
};

type PixelSplash = {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
};

type PixelCloud = {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
};

const getPhotonAngle = (idx: number, isMobile: boolean) => {
  if (isMobile) {
    const mobileAngles = [-2.60, -2.05, -1.50, -0.90, -0.20, 0.60, 1.35, 1.95, 2.45];
    return mobileAngles[idx % mobileAngles.length];
  }
  const desktopAngles = [-2.82, -2.35, -1.75, -1.10, -0.25, 0.45, 1.25, 1.85, 2.42];
  return desktopAngles[idx % desktopAngles.length];
};

function makeParticles(width: number, height: number, count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: 0,
    vy: 0,
    size: 2 + Math.floor(Math.random() * 3), // Discrete 2px..4px square pixels
    alpha: 0.15 + Math.random() * 0.65,
    phase: Math.random() * Math.PI * 2,
  }));
}

function makeClouds(width: number): PixelCloud[] {
  return [
    { x: width * 0.1, y: 70, width: 140, height: 28, speed: 12 },
    { x: width * 0.45, y: 110, width: 220, height: 36, speed: 18 },
    { x: width * 0.78, y: 55, width: 170, height: 30, speed: 14 },
    { x: width * 0.25, y: 155, width: 190, height: 32, speed: 16 },
  ];
}

export function WeatherCanvas({ onProjectSelect }: { onProjectSelect?: (projectId: string) => void }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { weather, mode, minimal } = useWeather();
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [heroPositions, setHeroPositions] = useState<{ id: string; x: number; y: number; project: PortfolioProject }[]>([]);
  const hoveredProjectIdRef = useRef<string | null>(null);

  const handleNodeActivate = (projectId: string) => {
    if (navigatingId) return;
    setNavigatingId(projectId);
    onProjectSelect?.(projectId);
    setTimeout(() => {
      router.push(`/projects/${projectId}`);
    }, 220);
  };

  useEffect(() => {
    hoveredProjectIdRef.current = hoveredProjectId;
  }, [hoveredProjectId]);

  const activeWeather = useMemo(() => (weather ? withMode(weather, mode) : null), [weather, mode]);
  const condition: WeatherCondition = activeWeather?.condition ?? "clear";
  const night = activeWeather?.atmosphere === "night" || mode === "clear-night";
  const isRain = condition === "rain" || condition === "thunderstorm";
  const isSnow = condition === "snow";
  const isNightMode = Boolean((night && (condition === "clear" || mode === "clear-night")) && !isRain && !isSnow);

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
    let particles = makeParticles(width, height, reducedMotion || minimal ? 35 : Math.min(150, Math.floor((width * height) / 9500)));
    let clouds = makeClouds(width);
    let frame = 0;
    let previous = 0;
    let visible = true;
    let pointerX = -1000;
    let pointerY = -1000;
    const splashes: PixelSplash[] = [];

    const isRainfall = condition === "rain" || condition === "thunderstorm";
    const isNightTime = Boolean(night && condition === "clear" && !isRainfall);

    const computeBaseCoords = (idx: number, w: number, h: number, isNight: boolean) => {
      if (isNight) {
        if (w < 768) {
          const mobileConstellation = [
            { x: 0.80, y: 0.15 },
            { x: 0.22, y: 0.18 },
            { x: 0.86, y: 0.27 },
            { x: 0.26, y: 0.38 },
            { x: 0.82, y: 0.48 },
            { x: 0.24, y: 0.58 },
            { x: 0.84, y: 0.68 },
            { x: 0.30, y: 0.78 },
            { x: 0.76, y: 0.85 },
          ];
          const m = mobileConstellation[idx % mobileConstellation.length];
          return { x: Math.round(m.x * w), y: Math.round(m.y * h) };
        }
        const desktopConstellation = [
          { x: 0.65, y: 0.16 },
          { x: 0.88, y: 0.16 },
          { x: 0.94, y: 0.32 },
          { x: 0.68, y: 0.34 },
          { x: 0.86, y: 0.44 },
          { x: 0.70, y: 0.54 },
          { x: 0.92, y: 0.62 },
          { x: 0.76, y: 0.72 },
          { x: 0.88, y: 0.82 },
        ];
        const d = desktopConstellation[idx % desktopConstellation.length];
        return { x: Math.round(d.x * w), y: Math.round(d.y * h) };
      }
      if (w < 768) {
        const mobilePhotons = [
          { x: 0.82, y: 0.12 },
          { x: 0.22, y: 0.16 },
          { x: 0.88, y: 0.28 },
          { x: 0.28, y: 0.36 },
          { x: 0.84, y: 0.44 },
          { x: 0.26, y: 0.54 },
          { x: 0.86, y: 0.64 },
          { x: 0.30, y: 0.74 },
          { x: 0.78, y: 0.82 },
        ];
        const m = mobilePhotons[idx % mobilePhotons.length];
        return { x: Math.round(m.x * w), y: Math.round(m.y * h) };
      }
      const desktopPhotons = [
        { x: 0.62, y: 0.14 },
        { x: 0.88, y: 0.14 },
        { x: 0.94, y: 0.28 },
        { x: 0.66, y: 0.32 },
        { x: 0.86, y: 0.40 },
        { x: 0.68, y: 0.50 },
        { x: 0.92, y: 0.58 },
        { x: 0.74, y: 0.68 },
        { x: 0.88, y: 0.78 },
      ];
      const d = desktopPhotons[idx % desktopPhotons.length];
      return { x: Math.round(d.x * w), y: Math.round(d.y * h) };
    };

    const initialSunX = Math.round(width * 0.82);
    const initialSunY = Math.round(height * 0.28);
    const initialMaxDist = Math.hypot(Math.max(initialSunX, width - initialSunX), Math.max(initialSunY, height - initialSunY)) + 60;
    const initialIsMobile = width < 768;

    const heroNodes: HeroNode[] = featuredProjects.map((project, idx) => {
      const coords = computeBaseCoords(idx, width, height, isNightTime);
      const startY = isRainfall
        ? -40 - (idx * (height * 0.85)) / featuredProjects.length
        : coords.y;
      const angle = getPhotonAngle(idx, initialIsMobile);
      const startDist = 28 + (idx * (initialMaxDist - 28)) / featuredProjects.length;
      const speed = 95 + (idx % 3) * 22;

      return {
        project,
        x: coords.x,
        y: startY,
        baseX: coords.x,
        baseY: coords.y,
        vy: 64 + (idx % 4) * 12,
        size: 8,
        phase: Math.random() * Math.PI * 2,
        photonAngle: angle,
        photonDistance: startDist,
        photonSpeed: speed,
        photonMaxDist: initialMaxDist,
      };
    });

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false; // Strictly enforce crisp pixel-art rendering!
      particles = makeParticles(width, height, reducedMotion || minimal ? 35 : Math.min(150, Math.floor((width * height) / 9500)));
      clouds = makeClouds(width);

      const newSunX = Math.round(width * 0.82);
      const newSunY = Math.round(height * 0.28);
      const newMaxDist = Math.hypot(Math.max(newSunX, width - newSunX), Math.max(newSunY, height - newSunY)) + 60;
      const isMob = width < 768;

      heroNodes.forEach((node, idx) => {
        const coords = computeBaseCoords(idx, width, height, isNightTime);
        node.baseX = coords.x;
        node.baseY = coords.y;
        node.photonAngle = getPhotonAngle(idx, isMob);
        node.photonMaxDist = newMaxDist;
        if (reducedMotion || minimal) {
          node.x = node.baseX;
          node.y = node.baseY;
        }
      });
    };

    const pointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
    };
    const pointerLeave = () => {
      pointerX = -1000;
      pointerY = -1000;
    };
    const visibility = () => {
      visible = document.visibilityState === "visible";
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && document.visibilityState === "visible";
    });

    observer.observe(wrapper);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("pointerleave", pointerLeave, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    resize();

    let lastSyncTime = 0;

    // =========================================================================
    // PIXEL ART ENVIRONMENT RENDERING ENGINE
    // =========================================================================

    // 0. Draw Distant Floating Voxel Sky Islands with Cascading Waterfalls
    const drawPixelFloatingIslands = (
      w: number,
      h: number,
      t: number,
      isNight: boolean
    ) => {
      const turfTop = isNight ? "#2b6e22" : "#4ade80";
      const turfFront = isNight ? "#1d4d17" : "#22c55e";
      const rockBody = isNight ? "#151e2b" : "#1e293b";
      const rockDark = isNight ? "#090d14" : "#0f172a";
      const waterCyan = isNight ? "#93c5fd" : "#38bdf8";
      const waterWhite = "#ffffff";
      const sakuraPink = isNight ? "#db2777" : "#f472b6";

      const drawIsland = (ix: number, iy: number, iWidth: number, iHeight: number, hasTree: boolean, fallHeight: number) => {
        const bob = Math.sin(t * 0.0015 + ix) * 3;
        const cy = Math.round(iy + bob);
        const cx = Math.round(ix);

        // Tapered inverted rock pyramid
        for (let row = 0; row < iHeight; row += 3) {
          const progress = row / iHeight;
          const rowW = Math.round(iWidth * (1 - progress * 0.82));
          const rx = cx - Math.round(rowW / 2);
          const ry = cy + row;
          ctx.fillStyle = progress > 0.6 ? rockDark : rockBody;
          ctx.fillRect(rx, ry, rowW, 3);
          ctx.fillStyle = rockDark;
          ctx.fillRect(rx + rowW - 3, ry, 3, 3);
        }

        // Hanging root spikes
        ctx.fillStyle = rockDark;
        ctx.fillRect(cx - 3, cy + iHeight, 3, 6);
        ctx.fillRect(cx + 6, cy + iHeight - 2, 2, 8);
        ctx.fillRect(cx - Math.round(iWidth * 0.25), cy + Math.round(iHeight * 0.7), 2, 6);

        // Grassy top turf
        ctx.fillStyle = turfTop;
        ctx.fillRect(cx - Math.round(iWidth / 2), cy, iWidth, 3);
        ctx.fillStyle = turfFront;
        ctx.fillRect(cx - Math.round(iWidth / 2), cy + 3, iWidth, 4);

        // Mini Voxel Sakura Tree on island
        if (hasTree) {
          const treeX = cx - Math.round(iWidth * 0.2);
          const treeY = cy - 16;
          ctx.fillStyle = "#78350f";
          ctx.fillRect(treeX, cy - 7, 3, 7);
          ctx.fillStyle = sakuraPink;
          ctx.fillRect(treeX - 7, treeY, 17, 10);
          ctx.fillStyle = "#fdf2f8";
          ctx.fillRect(treeX - 5, treeY - 2, 13, 5);
        }

        // Cascading Pixel Waterfall
        if (fallHeight > 0) {
          const fallX = cx + Math.round(iWidth * 0.15);
          const flowOffset = Math.floor((t * 0.022) % 4);
          for (let f = 0; f < fallHeight; f += 2) {
            const isWhite = (f + flowOffset) % 6 < 2;
            ctx.fillStyle = isWhite ? waterWhite : waterCyan;
            ctx.fillRect(fallX, cy + 4 + f, 2, 2);
            if (f % 10 === 0) {
              ctx.fillRect(fallX - 1, cy + 4 + f, 4, 1);
            }
          }
          // Mist puff at waterfall base
          ctx.fillStyle = "rgba(224, 242, 254, 0.4)";
          ctx.fillRect(fallX - 5, cy + 4 + fallHeight, 12, 4);
          ctx.fillRect(fallX - 3, cy + 2 + fallHeight, 8, 2);
        }
      };

      const isMobile = w < 768;

      // Island 1: Upper-left sky (with tiny sakura tree and waterfall)
      const isl1X = isMobile ? Math.round(w * 0.16) : Math.round(w * 0.14);
      const isl1Y = Math.round(h * 0.14);
      drawIsland(isl1X, isl1Y, isMobile ? 48 : 64, 34, true, 55);

      // Island 2: Upper-right sky (floating island with waterfall)
      const isl2X = isMobile ? Math.round(w * 0.88) : Math.round(w * 0.91);
      const isl2Y = Math.round(h * 0.11);
      drawIsland(isl2X, isl2Y, isMobile ? 40 : 54, 28, false, 45);

      // Island 4: Mid-left drifting island
      if (!isMobile) {
        const isl4X = Math.round(w * 0.28);
        const isl4Y = Math.round(h * 0.36);
        drawIsland(isl4X, isl4Y, 52, 26, false, 35);
      }

      // Island 3: Distant Grand Floating Voxel Sky Citadel (Centerpiece of the sky!)
      const isl3X = isMobile ? Math.round(w * 0.55) : Math.round(w * 0.58);
      const isl3Y = isMobile ? Math.round(h * 0.30) : Math.round(h * 0.36);
      const citadelW = isMobile ? 110 : 190;
      const citadelH = isMobile ? 48 : 82;
      const citadelBob = Math.sin(t * 0.0012) * 4;
      const ccY = Math.round(isl3Y + citadelBob);

      // A. Glowing Celestial Halo Disc behind the Citadel (like in Yugantar!)
      const haloRadius = isMobile ? 56 : 96;
      const haloColor = isNight ? "rgba(224, 242, 254, 0.32)" : "rgba(254, 240, 138, 0.45)";
      ctx.fillStyle = haloColor;
      for (let r = -haloRadius; r <= haloRadius; r += 3) {
        const span = Math.round(Math.sqrt(Math.max(0, haloRadius * haloRadius - r * r)));
        ctx.fillRect(isl3X - span, ccY - 14 + r, span * 2, 3);
      }
      // Outer halo aura rim
      ctx.fillStyle = isNight ? "rgba(147, 197, 253, 0.18)" : "rgba(245, 158, 11, 0.22)";
      for (let r = -haloRadius - 6; r <= haloRadius + 6; r += 4) {
        const span = Math.round(Math.sqrt(Math.max(0, (haloRadius + 6) ** 2 - r * r)));
        ctx.fillRect(isl3X - span, ccY - 14 + r, span * 2, 4);
      }

      // B. Tapered Inverted Rock Citadel Mountain Base
      for (let row = 0; row < citadelH; row += 3) {
        const progress = row / citadelH;
        const rowW = Math.round(citadelW * (1 - progress * 0.85));
        const rx = isl3X - Math.round(rowW / 2);
        const ry = ccY + row;
        ctx.fillStyle = progress > 0.65 ? rockDark : rockBody;
        ctx.fillRect(rx, ry, rowW, 3);
        // Strata rock highlights
        if (row % 6 === 0) {
          ctx.fillStyle = isNight ? "#334155" : "#475569";
          ctx.fillRect(rx + 6, ry, Math.round(rowW * 0.4), 2);
        }
      }

      // C. Stalactite spikes hanging from citadel bottom
      ctx.fillStyle = rockDark;
      ctx.fillRect(isl3X - 8, ccY + citadelH, 4, 12);
      ctx.fillRect(isl3X + 12, ccY + citadelH - 4, 3, 10);
      ctx.fillRect(isl3X - 22, ccY + citadelH - 8, 3, 8);
      ctx.fillRect(isl3X + 28, ccY + citadelH - 6, 4, 9);

      // D. Grassy Top Turf with Floral Pixels
      ctx.fillStyle = turfTop;
      ctx.fillRect(isl3X - Math.round(citadelW / 2), ccY, citadelW, 4);
      ctx.fillStyle = turfFront;
      ctx.fillRect(isl3X - Math.round(citadelW / 2), ccY + 4, citadelW, 4);
      // Small voxel flower specks on grass
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(isl3X - Math.round(citadelW * 0.35), ccY - 1, 2, 2);
      ctx.fillRect(isl3X + Math.round(citadelW * 0.28), ccY - 1, 2, 2);
      ctx.fillStyle = "#f472b6";
      ctx.fillRect(isl3X - Math.round(citadelW * 0.15), ccY - 1, 2, 2);
      ctx.fillRect(isl3X + Math.round(citadelW * 0.42), ccY - 1, 2, 2);

      // E. Majestic Castle Towers & Spires (7 Staggered Voxel Towers)
      const towerBaseColor = isNight ? "#1e293b" : "#334155";
      const towerRoofColor = isNight ? "#93c5fd" : "#38bdf8";
      const windowColor = "#fef08a";

      const towers = [
        { dx: 0, w: isMobile ? 12 : 20, h: isMobile ? 36 : 60, roofH: isMobile ? 12 : 20 },   // Central Grand Cathedral Spire
        { dx: -24, w: isMobile ? 10 : 16, h: isMobile ? 26 : 45, roofH: isMobile ? 10 : 16 }, // Left Main Tower
        { dx: 24, w: isMobile ? 10 : 16, h: isMobile ? 28 : 48, roofH: isMobile ? 10 : 16 },  // Right Main Tower
        { dx: -48, w: isMobile ? 8 : 12, h: isMobile ? 18 : 32, roofH: isMobile ? 7 : 12 },   // Left Outer Tower
        { dx: 48, w: isMobile ? 8 : 12, h: isMobile ? 20 : 34, roofH: isMobile ? 7 : 12 },    // Right Outer Tower
        { dx: -68, w: isMobile ? 6 : 9, h: isMobile ? 12 : 22, roofH: isMobile ? 5 : 9 },     // Left Flank Turret
        { dx: 68, w: isMobile ? 6 : 9, h: isMobile ? 13 : 24, roofH: isMobile ? 5 : 9 },      // Right Flank Turret
      ];

      for (const tow of towers) {
        const tx = isl3X + Math.round(tow.dx * (isMobile ? 0.6 : 1));
        const tw = tow.w;
        const th = tow.h;
        const ty = ccY - th;

        // Tower Body
        ctx.fillStyle = towerBaseColor;
        ctx.fillRect(tx - Math.round(tw / 2), ty, tw, th);

        // Stepped Spire Roof
        ctx.fillStyle = towerRoofColor;
        const rSteps = tow.roofH;
        for (let s = 0; s < rSteps; s += 2) {
          const frac = s / rSteps;
          const sw = Math.max(2, Math.round(tw * (1 - frac)));
          ctx.fillRect(tx - Math.round(sw / 2), ty - s - 2, sw, 2);
        }
        // Crystal Spire Finial Tip
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(tx - 1, ty - rSteps - 3, 2, 3);

        // Voxel Light Windows
        ctx.fillStyle = windowColor;
        ctx.fillRect(tx - 1, ty + Math.round(th * 0.35), 2, 3);
        if (th > 35) {
          ctx.fillRect(tx - 1, ty + Math.round(th * 0.65), 2, 3);
        }
      }

      // F. 3 Majestic Cascading Waterfalls
      const flowOffset = Math.floor((t * 0.024) % 4);
      const waterfalls = [
        { dx: -4, fallH: isMobile ? 55 : 95, w: isMobile ? 2 : 4 }, // Central main torrent
        { dx: -38, fallH: isMobile ? 40 : 70, w: 2 },                // Left torrent
        { dx: 36, fallH: isMobile ? 44 : 75, w: 2 },                 // Right torrent
      ];

      for (const wf of waterfalls) {
        const fx = isl3X + Math.round(wf.dx * (isMobile ? 0.6 : 1));
        const fh = wf.fallH;
        const fw = wf.w;

        for (let f = 0; f < fh; f += 2) {
          const isWhite = (f + flowOffset) % 6 < 2;
          ctx.fillStyle = isWhite ? waterWhite : waterCyan;
          ctx.fillRect(fx, ccY + 4 + f, fw, 2);
          if (f % 12 === 0) {
            ctx.fillRect(fx - 1, ccY + 4 + f, fw + 2, 1);
          }
        }

        // Billowing Voxel Mist Cloud Puffs at Waterfall Base
        ctx.fillStyle = "rgba(224, 242, 254, 0.45)";
        ctx.fillRect(fx - 8, ccY + 4 + fh, fw + 16, 5);
        ctx.fillRect(fx - 4, ccY + 1 + fh, fw + 8, 3);
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.fillRect(fx - 2, ccY + 2 + fh, fw + 4, 3);
      }
    };

    // 1. Draw Stepped Pixel Sun Disc with 8-bit Solar Rays & Coronal Flares
    const drawPixelSun = (scx: number, scy: number, t: number, isCalm: boolean) => {
      const ps = 3; // Pixel block size for the sun
      const radiusBlocks = 9;

      // Concentric Expanding Pixel Rings (Coronal emission shockwaves)
      if (!isCalm) {
        for (let ring = 0; ring < 3; ring++) {
          const phase = ((t * 0.0006 + ring * 0.33) % 1);
          const r = Math.round(11 + phase * 18);
          const alpha = (1 - phase) * 0.35;
          ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
          // Draw stepped diamond ring
          for (let i = -r; i <= r; i++) {
            const j = r - Math.abs(i);
            ctx.fillRect(scx + i * ps, scy + j * ps, ps, ps);
            ctx.fillRect(scx + i * ps, scy - j * ps, ps, ps);
          }
        }

        // Radiating 8-Bit Solar Rays (stepped pixel beams shooting in 8 directions)
        for (let ray = 0; ray < 8; ray++) {
          const rayAngle = (ray * Math.PI) / 4;
          const rayPulse = Math.sin(t * 0.004 + ray * 0.8);
          const rayLenBlocks = Math.round(14 + rayPulse * 5);
          for (let step = 10; step <= rayLenBlocks; step++) {
            const rx = scx + Math.round(Math.cos(rayAngle) * step * ps);
            const ry = scy + Math.round(Math.sin(rayAngle) * step * ps);
            const rayAlpha = Math.max(0.1, 1 - (step - 10) / (rayLenBlocks - 9));
            ctx.fillStyle = step % 2 === 0 ? `rgba(254, 240, 138, ${rayAlpha})` : `rgba(245, 158, 11, ${rayAlpha * 0.8})`;
            ctx.fillRect(rx, ry, ps, ps);
            // Lateral accent pixel
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

            if (distSq <= 9) {
              // White-hot core
              ctx.fillStyle = "#ffffff";
            } else if (distSq <= 25) {
              // Pale solar yellow
              ctx.fillStyle = "#fef08a";
            } else if (distSq <= 55) {
              // Rich solar amber
              ctx.fillStyle = "#facc15";
            } else if (distSq <= 75) {
              // Golden orange
              ctx.fillStyle = "#f59e0b";
            } else {
              // Stepped perimeter outline
              ctx.fillStyle = "#d97706";
            }
            ctx.fillRect(px, py, ps, ps);
          }
        }
      }
    };

    // 2. Draw Stepped Pixel Moon with Lunar Craters
    const drawPixelMoon = (mcx: number, mcy: number) => {
      const ps = 3;
      const radiusBlocks = 7;

      // Subtle pixel aura
      ctx.fillStyle = "rgba(186, 212, 196, 0.16)";
      for (let gy = -radiusBlocks - 2; gy <= radiusBlocks + 2; gy++) {
        for (let gx = -radiusBlocks - 2; gx <= radiusBlocks + 2; gx++) {
          if (gx * gx + gy * gy <= (radiusBlocks + 2) ** 2) {
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

            // Pixel craters
            const isCrater1 = (gx === -2 || gx === -3) && (gy === -1 || gy === -2);
            const isCrater2 = (gx === 1 || gx === 2) && (gy === 2 || gy === 3);
            const isCrater3 = gx === -1 && gy === 3;

            if (isCrater1 || isCrater2 || isCrater3) {
              ctx.fillStyle = "#64748b"; // Dark crater pixel
            } else if (distSq > radiusBlocks * radiusBlocks - 12) {
              ctx.fillStyle = "#94a3b8"; // Shaded rim
            } else if (gx < 0 && gy < 0) {
              ctx.fillStyle = "#ffffff"; // Specular lunar highlight
            } else {
              ctx.fillStyle = "#e2e8f0"; // Pale silver body
            }
            ctx.fillRect(px, py, ps, ps);
          }
        }
      }
    };

    // 3. Draw Pixel-Art Project Photon Diamond with Stepped Laser Beams
    const drawPixelPhotonDiamond = (
      px: number,
      py: number,
      sunX: number,
      sunY: number,
      isHovered: boolean,
      rayAngle: number
    ) => {
      // 3A. Stepped Pixel Laser Trajectory Line connecting Sun to Photon
      const distFromSun = Math.hypot(px - sunX, py - sunY);
      if (distFromSun > 10) {
        const stepCount = Math.floor(distFromSun / 6);
        for (let s = 2; s < stepCount; s++) {
          const progress = s / stepCount;
          const beamX = Math.round(sunX + (px - sunX) * progress);
          const beamY = Math.round(sunY + (py - sunY) * progress);
          const beamAlpha = isHovered ? 0.65 : 0.35;
          ctx.fillStyle = s % 2 === 0 ? `rgba(254, 240, 138, ${beamAlpha})` : `rgba(245, 158, 11, ${beamAlpha * 0.7})`;
          ctx.fillRect(beamX, beamY, 2, 2);
        }
      }

      // 3B. Trailing Wave-Packet Laser Tail (staggered pixel sparks trailing behind)
      const trailBlocks = isHovered ? 6 : 4;
      for (let tb = 1; tb <= trailBlocks; tb++) {
        const distBack = tb * 5;
        const trailX = Math.round(px - Math.cos(rayAngle) * distBack);
        const trailY = Math.round(py - Math.sin(rayAngle) * distBack);
        const trailAlpha = 0.8 * (1 - tb / (trailBlocks + 1));
        ctx.fillStyle = `rgba(251, 191, 36, ${trailAlpha})`;
        ctx.fillRect(trailX, trailY, 3, 3);
      }

      // 3C. Stepped Pixel Energy Diamond
      // Draw 5x5 stepped pixel diamond grid
      const pattern = [
        [0, 0, 1, 0, 0],
        [0, 1, 2, 1, 0],
        [1, 2, 3, 2, 1],
        [0, 1, 2, 1, 0],
        [0, 0, 1, 0, 0],
      ];

      const blockSize = isHovered ? 3 : 2;
      const offset = (pattern.length * blockSize) / 2;

      for (let r = 0; r < pattern.length; r++) {
        for (let c = 0; c < pattern[r].length; c++) {
          const val = pattern[r][c];
          if (val === 0) continue;
          const drawX = Math.round(px - offset + c * blockSize);
          const drawY = Math.round(py - offset + r * blockSize);

          if (val === 3) {
            ctx.fillStyle = "#ffffff"; // Pure white crystal core
          } else if (val === 2) {
            ctx.fillStyle = "#fef08a"; // Solar yellow
          } else {
            ctx.fillStyle = isHovered ? "#f59e0b" : "#d97706"; // Amber outline
          }
          ctx.fillRect(drawX, drawY, blockSize, blockSize);
        }
      }

      // Four-point 8-bit sparkle points when hovered
      if (isHovered) {
        const sparkleLen = 4;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(px, py - offset - sparkleLen, 2, sparkleLen);
        ctx.fillRect(px, py + offset + 1, 2, sparkleLen);
        ctx.fillRect(px - offset - sparkleLen, py, sparkleLen, 2);
        ctx.fillRect(px + offset + 1, py, sparkleLen, 2);
      }
    };

    // 4. Draw Stepped Pixel Raindrop
    const drawPixelRaindrop = (rx: number, ry: number, isHovered: boolean, isMagnetized: boolean) => {
      const dropHeight = isHovered ? 14 : 10;
      const topY = Math.round(ry - dropHeight);
      const botY = Math.round(ry);
      const cx = Math.round(rx);

      // Trailing atmospheric water wake (stepped pixel streak)
      const wakeLen = isMagnetized ? 4 : 8;
      for (let w = 1; w <= wakeLen; w += 2) {
        ctx.fillStyle = `rgba(186, 212, 196, ${0.4 * (1 - w / wakeLen)})`;
        ctx.fillRect(cx, topY - w, 2, 2);
      }

      // Vertical stepped raindrop body (2-3px wide)
      for (let y = topY; y < botY; y += 2) {
        const progress = (y - topY) / dropHeight;
        if (progress > 0.7) {
          ctx.fillStyle = isHovered ? "#ffffff" : "#e0f2fe"; // Droplet head
          ctx.fillRect(cx - 1, y, 3, 2);
        } else if (progress > 0.3) {
          ctx.fillStyle = isHovered ? "#bae6fd" : "#7dd3fc"; // Liquid body
          ctx.fillRect(cx, y, 2, 2);
        } else {
          ctx.fillStyle = "rgba(186, 230, 253, 0.45)"; // Tapered tail
          ctx.fillRect(cx, y, 1, 2);
        }
      }
    };

    // 5. Draw 4-Point Cross Pixel Star (Night Mode)
    const drawPixelStar = (sx: number, sy: number, isHovered: boolean, phase: number) => {
      const cx = Math.round(sx);
      const cy = Math.round(sy);
      const armLen = isHovered ? 4 : 2 + Math.floor(Math.abs(Math.sin(phase * 1.5)) * 2);

      // Core
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - 1, cy - 1, 2, 2);

      // Cardinal Arms
      ctx.fillStyle = isHovered ? "#ffffff" : "#bae6fd";
      ctx.fillRect(cx - armLen, cy, armLen, 1);
      ctx.fillRect(cx + 1, cy, armLen, 1);
      ctx.fillRect(cx, cy - armLen, 1, armLen);
      ctx.fillRect(cx, cy + 1, 1, armLen);

      // Secondary diagonal sparkles when hovered
      if (isHovered) {
        ctx.fillStyle = "#93c5fd";
        ctx.fillRect(cx - 2, cy - 2, 1, 1);
        ctx.fillRect(cx + 2, cy - 2, 1, 1);
        ctx.fillRect(cx - 2, cy + 2, 1, 1);
        ctx.fillRect(cx + 2, cy + 2, 1, 1);
      }
    };

    // 6. Draw 8-Bit Pixel Snowflake
    const drawPixelSnowflake = (sx: number, sy: number, isHovered: boolean) => {
      const cx = Math.round(sx);
      const cy = Math.round(sy);
      const size = isHovered ? 3 : 2;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - 1, cy - 1, 2, 2); // Center
      // Arms
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(cx - size * 2, cy, size * 4, 1);
      ctx.fillRect(cx, cy - size * 2, 1, size * 4);
      // Diagonals
      ctx.fillRect(cx - size, cy - size, 1, 1);
      ctx.fillRect(cx + size, cy - size, 1, 1);
      ctx.fillRect(cx - size, cy + size, 1, 1);
      ctx.fillRect(cx + size, cy + size, 1, 1);
    };

    // 7. Draw Stepped Pixel Clouds (Voxel Atmosphere)
    const drawPixelClouds = (cl: PixelCloud[], w: number, dt: number) => {
      for (const c of cl) {
        c.x += c.speed * dt;
        if (c.x > w + 60) {
          c.x = -c.width - 40;
        }

        const cx = Math.round(c.x);
        const cy = Math.round(c.y);

        // Multi-tiered stepped horizontal voxel cloud blocks
        const tiers = [
          { dy: 0, wFrac: 0.55, offset: 0.22, color: "rgba(255, 255, 255, 0.22)" }, // Top sunlit rim
          { dy: 4, wFrac: 0.85, offset: 0.08, color: "rgba(226, 232, 240, 0.16)" }, // Mid cloud mass
          { dy: 8, wFrac: 1.00, offset: 0.00, color: "rgba(203, 213, 225, 0.14)" }, // Main body
          { dy: 14, wFrac: 0.90, offset: 0.05, color: "rgba(148, 163, 184, 0.12)" }, // Lower body
          { dy: 20, wFrac: 0.65, offset: 0.18, color: "rgba(100, 116, 139, 0.09)" }, // Underside shadow
        ];

        for (const t of tiers) {
          ctx.fillStyle = t.color;
          const tierW = Math.round(c.width * t.wFrac);
          const tierX = cx + Math.round(c.width * t.offset);
          ctx.fillRect(tierX, cy + t.dy, tierW, 5);
        }
      }
    };

    // =========================================================================
    // MAIN RAF ANIMATION LOOP
    // =========================================================================

    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (!visible) return;

      const dt = Math.min((time - (previous || time)) / 1000, 0.04);
      previous = time;
      ctx.clearRect(0, 0, width, height);

      const wind = (activeWeather?.windSpeed ?? 3) * 0.035;
      const calm = reducedMotion || minimal;
      const isRain = condition === "rain" || condition === "thunderstorm";
      const isSnow = condition === "snow";
      const isNightMode = Boolean(night && condition === "clear" && !isRain && !isSnow);
      const isClearDay = condition === "clear" && !night && !isRain && !isSnow;

      const sunX = Math.round(width * 0.82);
      const sunY = Math.round(height * 0.28);

      // 0. Draw Distant Floating Voxel Sky Islands with Cascading Waterfalls
      drawPixelFloatingIslands(width, height, time, isNightMode);

      // 1. Draw Stepped Pixel Clouds in atmosphere
      drawPixelClouds(clouds, width, dt);

      // 2. Draw Pixel Celestial Body (Sun / Moon)
      if (isClearDay) {
        drawPixelSun(sunX, sunY, time, calm);
      } else if (isNightMode) {
        drawPixelMoon(sunX, sunY);
      }

      // 3. Draw Ambient Square Pixel Dust / Motes / Atmospheric Particles
      for (const p of particles) {
        p.phase += dt;
        if (calm) {
          ctx.fillStyle = `rgba(201, 216, 207, ${p.alpha * 0.28})`;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
          continue;
        }

        if (isRain) {
          p.vy = 420 + p.size * 160;
          p.vx = 35 + wind * 60;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.y > height + 20 || p.x > width + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }
          // Ambient pixel rain streak (stepped 2px line)
          ctx.fillStyle = `rgba(165, 202, 222, ${p.alpha * 0.45})`;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 8 + p.size * 2);
        } else if (isSnow) {
          p.x += (Math.sin(p.phase * 0.7) * 12 + wind * 20) * dt;
          p.y += (14 + p.size * 8) * dt;
          if (p.y > height + 8) {
            p.y = -8;
            p.x = Math.random() * width;
          }
          ctx.fillStyle = `rgba(230, 241, 246, ${p.alpha * 0.8})`;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        } else if (isNightMode) {
          const dist = Math.hypot(pointerX - p.x, pointerY - p.y);
          const alpha = p.alpha * (0.45 + Math.sin(p.phase * 1.2) * 0.35) + (dist < 80 ? 0.35 : 0);
          ctx.fillStyle = `rgba(224, 235, 245, ${Math.min(alpha, 0.95)})`;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        } else {
          // Sunny ambient pixel pollen / light dust
          p.x += Math.sin(p.phase * 0.6) * 4 * dt;
          p.y -= (6 + p.size * 3) * dt;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          ctx.fillStyle = `rgba(254, 240, 138, ${p.alpha * 0.38})`;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
      }

      // Thunderstorm pixel lightning flash
      if (condition === "thunderstorm" && Math.sin(time * 0.0003) > 0.998) {
        ctx.fillStyle = "rgba(224, 242, 254, 0.12)";
        ctx.fillRect(0, 0, width, height);
      }

      // 4. Draw Pixel Splashes (when raindrops land at the bottom)
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.radius += dt * 28;
        s.alpha -= dt * 1.6;
        if (s.alpha <= 0) {
          splashes.splice(i, 1);
          continue;
        }
        // Stepped 2x2 splash pixel droplets scattering upward
        const sx = Math.round(s.x);
        const sy = Math.round(s.y);
        ctx.fillStyle = `rgba(186, 230, 253, ${s.alpha * 0.75})`;
        ctx.fillRect(sx - Math.round(s.radius * 1.4), sy - Math.round(s.radius * 0.5), 2, 2);
        ctx.fillRect(sx + Math.round(s.radius * 1.4), sy - Math.round(s.radius * 0.5), 2, 2);
        ctx.fillRect(sx - Math.round(s.radius * 0.7), sy - Math.round(s.radius * 0.9), 2, 2);
        ctx.fillRect(sx + Math.round(s.radius * 0.7), sy - Math.round(s.radius * 0.9), 2, 2);
      }

      // 5. Update & Draw HERO PROJECT NODES (Pixel Diamonds, Raindrops, Stars, Snowflakes)
      const updatedPositions: { id: string; x: number; y: number; project: PortfolioProject }[] = [];

      for (let i = 0; i < heroNodes.length; i++) {
        const node = heroNodes[i];
        node.phase += dt;

        const distToPointer = Math.hypot(pointerX - node.x, pointerY - node.y);
        const isMagnetized = distToPointer < (isRain ? 48 : 55);

        if (calm) {
          node.x = node.baseX;
          node.y = node.baseY;
        } else if (isRain) {
          const targetVy = isMagnetized ? node.vy * 0.12 : node.vy;
          node.y += targetVy * dt;
          node.x += (wind * 20 + Math.sin(node.phase * 0.8) * 2.5) * dt;

          if (isMagnetized) {
            node.x += (pointerX - node.x) * 0.045;
            node.y += (pointerY - node.y) * 0.045;
          }

          if (node.y > height + 25) {
            splashes.push({
              x: node.x,
              y: height - 12,
              radius: 3,
              maxRadius: 24,
              alpha: 0.85,
            });
            node.y = -40;
            node.x = width * (0.12 + Math.random() * 0.76);
          }
        } else if (isSnow) {
          const targetVy = isMagnetized ? 8 : 26 + (i % 2) * 8;
          node.y += targetVy * dt;
          node.x += (Math.sin(node.phase * 0.6) * 18 + wind * 15) * dt;
          if (isMagnetized) {
            node.x += (pointerX - node.x) * 0.04;
          }
          if (node.y > height + 20) {
            node.y = -25;
            node.x = width * (0.15 + Math.random() * 0.7);
          }
        } else if (isNightMode) {
          node.x = node.baseX + Math.sin(node.phase * 0.5) * 8;
          node.y = node.baseY + Math.cos(node.phase * 0.5) * 6;
          if (isMagnetized) {
            node.x += (pointerX - node.x) * 0.04;
            node.y += (pointerY - node.y) * 0.04;
          }
        } else {
          // SOLAR PHOTON BALLISTIC ENGINE: Shoot out of Sun's core
          const targetSpeed = isMagnetized ? node.photonSpeed * 0.08 : node.photonSpeed;
          node.photonDistance += targetSpeed * dt;
          node.phase += dt * 3.5;

          if (node.photonDistance > node.photonMaxDist) {
            node.photonDistance = 28;
          }

          const basePhotonX = sunX + Math.cos(node.photonAngle) * node.photonDistance;
          const basePhotonY = sunY + Math.sin(node.photonAngle) * node.photonDistance;

          const wobble = Math.sin(node.phase) * 4.5;
          const perpAngle = node.photonAngle + Math.PI / 2;
          node.x = basePhotonX + Math.cos(perpAngle) * wobble;
          node.y = basePhotonY + Math.sin(perpAngle) * wobble;

          if (isMagnetized) {
            node.x += (pointerX - node.x) * 0.055;
            node.y += (pointerY - node.y) * 0.055;
          }
        }

        const isHovered = hoveredProjectIdRef.current === node.project.id || isMagnetized;
        const nodeX = Math.round(node.x);
        const nodeY = Math.round(node.y);

        if (isRain) {
          drawPixelRaindrop(nodeX, nodeY, isHovered, isMagnetized);
        } else if (isNightMode) {
          drawPixelStar(nodeX, nodeY, isHovered, node.phase);
        } else if (isSnow) {
          drawPixelSnowflake(nodeX, nodeY, isHovered);
        } else {
          drawPixelPhotonDiamond(nodeX, nodeY, sunX, sunY, isHovered, node.photonAngle);
        }

        updatedPositions.push({
          id: node.project.id,
          x: nodeX,
          y: nodeY,
          project: node.project,
        });
      }

      // Sync positions with React state throttled (~30fps) for DOM overlays
      if (time - lastSyncTime > 32) {
        lastSyncTime = time;
        setHeroPositions(updatedPositions);
      }
    };

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerleave", pointerLeave);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [activeWeather, condition, minimal, reducedMotion, night]);

  const activeModeLabel =
    condition === "rain" || condition === "thunderstorm"
      ? "PIXEL RAINDROP"
      : night
      ? "CONSTELLATION STAR"
      : condition === "snow"
      ? "PIXEL SNOWFLAKE"
      : "SOLAR PHOTON NODE";

  return (
    <div
      ref={wrapRef}
      aria-hidden="false"
      className={`weather-layer weather-${condition}${night ? " is-night" : ""}${minimal ? " is-minimal" : ""}`}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="weather-canvas" />

      {/* Pixelated Celestial Hub (Sun / Moon) - Navigates to Stack */}
      <button
        type="button"
        className="celestial-hub"
        aria-label={night ? "Pixel Moon node. Explore core technical skills." : "Pixel Sun node. Explore core technical skills."}
        title="Open the tech stack matrix"
        onClick={() => document.getElementById("stack")?.scrollIntoView({ behavior: "smooth" })}
      >
        {night ? <Moon size={16} strokeWidth={1.4} /> : <Sun size={17} strokeWidth={1.4} />}
        <span className="celestial-label">{night ? "LUNAR / CORE" : "SOLAR / CORE"}</span>
        <span className="celestial-orbit" aria-hidden="true">
          {(night
            ? ["C", "C++", "Java", "Kotlin", "Go", "Linux", "Graphs", "Systems"]
            : ["C", "C#", "Java", "Kotlin", "Python", "JavaScript", "SQL", "Go"]
          ).map((skill, index) => {
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

      {/* Interactive Hero Weather Nodes (Raindrops / Stars / Snowflakes / Photons) */}
      {heroPositions.map(({ id, x, y, project }) => {
        const isHovered = hoveredProjectId === id;
        return (
          <div
            key={id}
            className={`hero-weather-node ${isHovered ? "is-hovered" : ""}`}
            style={{
              left: `${x}px`,
              top: `${y}px`,
            }}
          >
            {/* Clickable reactive pixel button */}
            <button
              type="button"
              className={`weather-node-hitbox ${isNightMode ? "is-star" : isRain ? "is-raindrop" : "is-photon"}${navigatingId === id ? " is-activating" : ""}`}
              aria-label={`Open project description: ${project.title}`}
              onMouseEnter={() => {
                setHoveredProjectId(id);
                router.prefetch(`/projects/${project.id}`);
              }}
              onMouseLeave={() => setHoveredProjectId(null)}
              onFocus={() => {
                setHoveredProjectId(id);
                router.prefetch(`/projects/${project.id}`);
              }}
              onBlur={() => setHoveredProjectId(null)}
              onClick={() => handleNodeActivate(project.id)}
            >
              {isNightMode ? (
                <span className="star-dot-badge" aria-hidden="true" />
              ) : isRain ? (
                <span className="raindrop-core-badge" aria-hidden="true" />
              ) : (
                <span className="photon-core-badge" aria-hidden="true" />
              )}
            </button>

            {/* Retro Pixel-Notched Floating Tooltip with Project Details */}
            <div
              className={`weather-project-tooltip ${isHovered ? "is-visible" : ""}`}
              role="tooltip"
              onClick={() => handleNodeActivate(project.id)}
            >
              <div className="tooltip-eyebrow">
                {isNightMode || isRain ? <Sparkles size={11} /> : <Sun size={11} />}
                <span>{isNightMode ? "CONSTELLATION STAR" : activeModeLabel}</span>
              </div>
              <strong className="tooltip-title">{project.title}</strong>
              <p className="tooltip-subtitle">{project.subtitle}</p>
              <div className="tooltip-tags">
                {project.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="tag tag-sm">
                    {tag}
                  </span>
                ))}
              </div>
              <span className="tooltip-cta">
                <span>Explore Project Description & Repo →</span>
              </span>
            </div>
          </div>
        );
      })}

      {/* Cinematic Water Transition Curtain */}
      {navigatingId && <div className="water-transition-curtain" aria-hidden="true" />}
    </div>
  );
}
