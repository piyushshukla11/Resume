"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Pixel art glyph bitmaps (7 rows tall)
const BITMAP_M = [
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 1, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
];

const BITMAP_E = [
  [1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 1],
];

const BITMAP_DOT = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [1, 1],
  [1, 1],
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

    // Screen dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Block size for pixel dissolve
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
        // Blend distance-from-center wave with high-entropy noise for authentic pixel dither dissolve
        const threshold = Math.min(1, Math.max(0, dist * 0.35 + Math.random() * 0.65));
        blocks.push({ c, r, threshold });
      }
    }

    // Bitmap unit scale (pixels per voxel cell)
    const u = width < 640 ? 8 : 12;
    const letterGap = 2 * u;
    const mWidth = 7 * u;
    const eWidth = 6 * u;
    const dotWidth = 2 * u;
    const totalLogoWidth = mWidth + letterGap + eWidth + letterGap + dotWidth;
    const totalLogoHeight = 7 * u;

    startTimeRef.current = performance.now();

    function renderScene(scale: number, alpha: number, blinkCursor: boolean) {
      if (!ctx) return;
      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Solid gray scene background
      ctx.fillStyle = "#1e222a";
      ctx.fillRect(0, 0, width, height);

      // 2. Retro scanlines texture
      ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 2);
      }

      // 3. Subtle pixel grid points
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      for (let x = 0; x < width; x += 32) {
        for (let y = 0; y < height; y += 32) {
          ctx.fillRect(x, y, 2, 2);
        }
      }

      // 4. Corner HUD brackets
      ctx.fillStyle = "#475569";
      ctx.font = "9px 'Press Start 2P', monospace, sans-serif";
      ctx.fillText("[ SYS_BOOT // PIYUSH_OS ]", 24, 32);
      const rightText = "[ ENVIRONMENT: READY ]";
      const rightMetrics = ctx.measureText(rightText);
      ctx.fillText(rightText, width - rightMetrics.width - 24, 32);

      // 5. Centered Pixelated ME. Logo Box
      const boxW = totalLogoWidth + 56;
      const boxH = totalLogoHeight + 72;
      const boxX = (width - boxW) / 2;
      const boxY = (height - boxH) / 2;

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-width / 2, -height / 2);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // Logo retro container panel
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(boxX, boxY, boxW, boxH);

      // Pixel border & corner accents
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Corner accent blocks
      ctx.fillStyle = "#38bdf8";
      const cs = 6;
      ctx.fillRect(boxX - 2, boxY - 2, cs, cs);
      ctx.fillRect(boxX + boxW - cs + 2, boxY - 2, cs, cs);
      ctx.fillRect(boxX - 2, boxY + boxH - cs + 2, cs, cs);
      ctx.fillRect(boxX + boxW - cs + 2, boxY + boxH - cs + 2, cs, cs);

      // Category tag above logo
      ctx.font = "7px 'Press Start 2P', monospace, sans-serif";
      ctx.fillStyle = "#94a3b8";
      const tagText = "SYS // ARCHITECTURE";
      const tagMetrics = ctx.measureText(tagText);
      ctx.fillText(tagText, (width - tagMetrics.width) / 2, boxY + 18);

      // Pixelated "ME." glyphs
      const startX = (width - totalLogoWidth) / 2;
      const startY = boxY + 28;

      function drawBitmap(bitmap: number[][], xOffset: number, color: string, shadowColor: string) {
        if (!ctx) return;
        const shadowOffset = Math.max(2, Math.round(u * 0.28));
        // Shadow pass
        ctx.fillStyle = shadowColor;
        for (let r = 0; r < bitmap.length; r++) {
          for (let c = 0; c < bitmap[r].length; c++) {
            if (bitmap[r][c] === 1) {
              ctx.fillRect(
                startX + xOffset + c * u + shadowOffset,
                startY + r * u + shadowOffset,
                u,
                u
              );
            }
          }
        }
        // Foreground pass
        ctx.fillStyle = color;
        for (let r = 0; r < bitmap.length; r++) {
          for (let c = 0; c < bitmap[r].length; c++) {
            if (bitmap[r][c] === 1) {
              ctx.fillRect(startX + xOffset + c * u, startY + r * u, u, u);
            }
          }
        }
      }

      // Draw "M" (white)
      drawBitmap(BITMAP_M, 0, "#f8fafc", "#090d16");

      // Draw "E" (white)
      drawBitmap(BITMAP_E, mWidth + letterGap, "#f8fafc", "#090d16");

      // Draw "." (vibrant emerald green with soft glow)
      const dotX = mWidth + letterGap + eWidth + letterGap;
      // Soft green glow behind dot
      ctx.fillStyle = "rgba(74, 222, 128, 0.35)";
      ctx.fillRect(startX + dotX - 2, startY + 5 * u - 2, 2 * u + 4, 2 * u + 4);
      drawBitmap(BITMAP_DOT, dotX, "#4ade80", "#064e3b");

      // Subtitle below logo
      ctx.font = "9px 'Press Start 2P', monospace, sans-serif";
      ctx.fillStyle = "#e2e8f0";
      const nameText = "PIYUSH SHUKLA";
      const nameMetrics = ctx.measureText(nameText);
      ctx.fillText(nameText, (width - nameMetrics.width) / 2, boxY + boxH - 22);

      // Status indicator with blinking block cursor
      ctx.font = "7px 'Press Start 2P', monospace, sans-serif";
      ctx.fillStyle = "#4ade80";
      const statusText = blinkCursor ? "> INITIALIZING ENVIRONMENT █" : "> INITIALIZING ENVIRONMENT  ";
      const statusMetrics = ctx.measureText(statusText);
      ctx.fillText(statusText, (width - statusMetrics.width) / 2, boxY + boxH - 10);

      ctx.restore();
      ctx.restore();
    }

    function frame(now: number) {
      if (!ctx) return;
      const elapsed = skippedRef.current ? 2000 : now - startTimeRef.current;

      // Phase 1: Pop-up animation (0 - 350ms)
      if (elapsed < 350) {
        const p = Math.min(1, elapsed / 350);
        const scale = easeOutBack(p);
        const alpha = Math.min(1, elapsed / 100);
        renderScene(scale, alpha, true);
        animFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      // Phase 2: Hold & Telemetry Ready (350 - 750ms)
      if (elapsed < 750) {
        const blink = Math.floor(elapsed / 180) % 2 === 0;
        renderScene(1.0, 1.0, blink);
        animFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      // Phase 3: Pixel Block by Pixel Block Dissolve (750 - 1450ms)
      const dissolveElapsed = elapsed - 750;
      const dissolveDuration = 700;
      const progress = Math.min(1, dissolveElapsed / dissolveDuration);

      // Re-render scene base before clearing dissolved blocks
      renderScene(1.0, 1.0, true);

      // Clear blocks that have dissolved
      ctx.save();
      ctx.scale(dpr, dpr);

      // Cleared blocks
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        if (b.threshold <= progress) {
          ctx.clearRect(b.c * BLOCK_SIZE, b.r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        } else if (b.threshold <= progress + 0.05) {
          // Dissolve fizz/sparkle edge
          ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
          ctx.fillRect(b.c * BLOCK_SIZE, b.r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
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
      <div className="pixel-intro-skip-hint">
        <span>CLICK OR PRESS ESC TO SKIP</span>
      </div>
    </div>
  );
}
