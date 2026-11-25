"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Glyph matrix for 'M' (7 rows x 7 cols)
// 0: empty, 1: black (outer pillar), 2: red (middle part of M)
const MATRIX_M = [
  [1, 0, 0, 0, 0, 0, 1],
  [1, 2, 0, 0, 0, 2, 1],
  [1, 0, 2, 0, 2, 0, 1],
  [1, 0, 0, 2, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
];

// Glyph matrix for 'E' (7 rows x 6 cols)
// 1: black
const MATRIX_E = [
  [1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1],
];

function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

interface PixelIntroProps {
  onComplete?: () => void;
}

export function PixelIntro({ onComplete }: PixelIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [completed, setCompleted] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const skippedRef = useRef(false);

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    skippedRef.current = false;
    setCompleted(false);

    // Screen dimensions & high-DPI scaling
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Grid block size for pixel dissolve
    const BLOCK_SIZE = width < 640 ? 18 : 24;
    const cols = Math.ceil(width / BLOCK_SIZE);
    const rows = Math.ceil(height / BLOCK_SIZE);

    // Center coordinates for radial dither calculation
    const cx = cols / 2;
    const cy = rows / 2;
    const maxDist = Math.hypot(cx, cy);

    // Precalculate dissolve threshold for each grid block
    const blocks: { c: number; r: number; threshold: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dist = Math.hypot(c - cx, r - cy) / maxDist;
        // Blend distance-from-center with high-entropy pseudo-random noise for authentic pixel dither dissolve
        const threshold = Math.min(1, Math.max(0, dist * 0.35 + Math.random() * 0.65));
        blocks.push({ c, r, threshold });
      }
    }

    // Dynamic large voxel unit size: makes ME big across all screen sizes
    const u = Math.min(32, Math.max(16, Math.floor(width / 32)));
    const mCols = 7;
    const eCols = 6;
    const gapUnits = 2;
    const totalWidthUnits = mCols + gapUnits + eCols;
    const totalHeightUnits = 7;

    const totalLogoWidth = totalWidthUnits * u;
    const totalLogoHeight = totalHeightUnits * u;

    startTimeRef.current = performance.now();

    function renderScene(scale: number, alpha: number) {
      if (!ctx) return;
      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Pristine pure white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // 2. Centered Big Pixelated ME Logo
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      const startX = (width - totalLogoWidth) / 2;
      const startY = (height - totalLogoHeight) / 2;

      // Draw 'M': outer pillars in black, middle diagonal V in red
      const blackColor = "#000000";
      const redColor = "#ef4444";

      for (let r = 0; r < MATRIX_M.length; r++) {
        for (let c = 0; c < MATRIX_M[r].length; c++) {
          const val = MATRIX_M[r][c];
          if (val === 1) {
            // Black outer stems
            ctx.fillStyle = blackColor;
            ctx.fillRect(startX + c * u, startY + r * u, u, u);
          } else if (val === 2) {
            // Red middle part of M
            ctx.fillStyle = redColor;
            ctx.fillRect(startX + c * u, startY + r * u, u, u);
          }
        }
      }

      // Draw 'E': pure black text
      const eStartX = startX + (mCols + gapUnits) * u;
      ctx.fillStyle = blackColor;
      for (let r = 0; r < MATRIX_E.length; r++) {
        for (let c = 0; c < MATRIX_E[r].length; c++) {
          if (MATRIX_E[r][c] === 1) {
            ctx.fillRect(eStartX + c * u, startY + r * u, u, u);
          }
        }
      }

      ctx.restore();
      ctx.restore();
    }

    function frame(now: number) {
      if (!ctx) return;
      const elapsed = skippedRef.current ? 5000 : now - startTimeRef.current;

      // Phase 1: Pop-up animation (0 - 400ms)
      if (elapsed < 400) {
        const p = Math.min(1, elapsed / 400);
        const scale = easeOutBack(p);
        const alpha = Math.min(1, elapsed / 100);
        renderScene(scale, alpha);
        animFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      // Phase 2: Hold & Display ME Logo (400 - 1750ms) - extended by a second for prominent display
      if (elapsed < 1750) {
        renderScene(1.0, 1.0);
        animFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      // Phase 3: White Screen & Logo Dissolve Pixel Block by Pixel Block (1750 - 2500ms)
      const dissolveElapsed = elapsed - 1750;
      const dissolveDuration = 750;
      const progress = Math.min(1, dissolveElapsed / dissolveDuration);

      // Re-render base scene before clearing blocks
      renderScene(1.0, 1.0);

      // Clear blocks that have dissolved
      ctx.save();
      ctx.scale(dpr, dpr);

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.threshold <= progress) {
          ctx.clearRect(b.c * BLOCK_SIZE, b.r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
      }
      ctx.restore();

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(frame);
      } else {
        // Dissolve complete
        setCompleted(true);
        onComplete?.();
      }
    }

    animFrameRef.current = requestAnimationFrame(frame);
  }, [onComplete]);

  // Skip animation on click or keypress
  const handleSkip = useCallback(() => {
    skippedRef.current = true;
    setCompleted(true);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    startAnimation();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        handleSkip();
      }
    };

    const handleReplayEvent = () => {
      startAnimation();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("me:replay-intro", handleReplayEvent);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("me:replay-intro", handleReplayEvent);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [startAnimation, handleSkip]);

  if (completed) {
    return null;
  }

  return (
    <div
      className="pixel-intro-overlay"
      aria-hidden="true"
      onClick={handleSkip}
      title="Click anywhere or press Esc to skip"
    >
      <canvas ref={canvasRef} className="pixel-intro-canvas" />
    </div>
  );
}
