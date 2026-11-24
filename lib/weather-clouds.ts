// =============================================================================
// MINECRAFT PROCEDURAL CLOUD VOXEL ENGINE
// =============================================================================

export type VoxelBlock = {
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
};

export type MinecraftCloud = {
  id: number;
  x: number;
  y: number;
  speed: number;
  cellW: number;
  cellH: number;
  shapeIdx: number;
  blocks: VoxelBlock[];
  totalWidth: number;
  totalHeight: number;
};

/**
 * Handcrafted authentic Minecraft cloud silhouettes composed strictly of
 * rectangular 3D voxel blocks (no curves, orthogonal right angles only).
 */
export const MINECRAFT_CLOUD_SHAPES: VoxelBlock[][] = [
  // Shape 0: Classic Stepped Cruiser (authentic Minecraft cumulus block)
  [
    { gridX: 2, gridY: 0, gridW: 6, gridH: 2 },
    { gridX: 0, gridY: 1, gridW: 11, gridH: 2 },
    { gridX: 4, gridY: 2, gridW: 9, gridH: 2 },
    { gridX: 1, gridY: 2, gridW: 4, gridH: 1 },
  ],
  // Shape 1: Wide Horizontal Cloud Slab (long flat Minecraft voxel deck)
  [
    { gridX: 0, gridY: 1, gridW: 14, gridH: 2 },
    { gridX: 3, gridY: 0, gridW: 8, gridH: 2 },
    { gridX: 7, gridY: 2, gridW: 8, gridH: 2 },
  ],
  // Shape 2: Stepped Cumulus Cluster (tall stepped core with asymmetric wings)
  [
    { gridX: 3, gridY: 0, gridW: 5, gridH: 2 },
    { gridX: 1, gridY: 1, gridW: 9, gridH: 3 },
    { gridX: 0, gridY: 2, gridW: 12, gridH: 2 },
    { gridX: 8, gridY: 1, gridW: 5, gridH: 2 },
  ],
  // Shape 3: Massive Sky Cruiser (long multi-tier slab)
  [
    { gridX: 0, gridY: 0, gridW: 16, gridH: 2 },
    { gridX: 4, gridY: 1, gridW: 10, gridH: 2 },
    { gridX: 9, gridY: 0, gridW: 8, gridH: 3 },
  ],
  // Shape 4: Compact Voxel Cloud (small, puffy block cluster)
  [
    { gridX: 1, gridY: 0, gridW: 5, gridH: 2 },
    { gridX: 0, gridY: 1, gridW: 8, gridH: 2 },
    { gridX: 3, gridY: 2, gridW: 6, gridH: 2 },
  ],
  // Shape 5: Twin-Lobe Minecraft Formation (dual mass conjoined cloud)
  [
    { gridX: 0, gridY: 1, gridW: 7, gridH: 2 },
    { gridX: 2, gridY: 0, gridW: 4, gridH: 2 },
    { gridX: 6, gridY: 1, gridW: 8, gridH: 2 },
    { gridX: 8, gridY: 0, gridW: 5, gridH: 2 },
    { gridX: 3, gridY: 2, gridW: 9, gridH: 2 },
  ],
  // Shape 6: Slender Voxel Stratus (slender Minecraft cloud band)
  [
    { gridX: 0, gridY: 0, gridW: 13, gridH: 1 },
    { gridX: 3, gridY: 1, gridW: 12, gridH: 2 },
    { gridX: 10, gridY: 0, gridW: 6, gridH: 2 },
  ],
];

let cloudCounter = 0;

/**
 * Procedurally generates a randomized Minecraft cloud.
 * Selects a random silhouette, random cell size (scale), altitude Y, and drift speed.
 */
export function createRandomMinecraftCloud(
  skyWidth: number,
  skyHeight: number,
  isInitialSpawn = false
): MinecraftCloud {
  const shapeIdx = Math.floor(Math.random() * MINECRAFT_CLOUD_SHAPES.length);
  const blocks = MINECRAFT_CLOUD_SHAPES[shapeIdx];

  // Dynamic randomized voxel scale (cell width 15..22px, cell height 10..14px)
  const cellW = 15 + Math.floor(Math.random() * 8);
  const cellH = 10 + Math.floor(Math.random() * 5);

  const maxX = Math.max(...blocks.map((b) => b.gridX + b.gridW)) * cellW;
  const maxY = Math.max(...blocks.map((b) => b.gridY + b.gridH)) * cellH;

  // Natural vertical distribution across the sky band
  const maxSkyY = Math.max(40, Math.min(skyHeight * 0.38, 260) - maxY);
  const y = 20 + Math.floor(Math.random() * maxSkyY);

  // Varied parallax drift speed (10px/s to 24px/s)
  const speed = 10 + Math.floor(Math.random() * 15);

  // If initial spawn: scatter across screen width
  // If boundary wrap respawn: place off-screen left with randomized stagger
  const x = isInitialSpawn
    ? Math.random() * (skyWidth + maxX) - maxX
    : -maxX - 20 - Math.random() * 120;

  return {
    id: ++cloudCounter,
    x,
    y,
    speed,
    cellW,
    cellH,
    shapeIdx,
    blocks,
    totalWidth: maxX,
    totalHeight: maxY,
  };
}

/**
 * Returns a randomized cloud count tailored dynamically to the active weather conditions.
 */
export function getRandomCloudCount(params: {
  isCloudy?: boolean;
  isRain?: boolean;
  isSnow?: boolean;
  isFog?: boolean;
  isSunny?: boolean;
  isNight?: boolean;
}): number {
  if (params.isCloudy) {
    return 7 + Math.floor(Math.random() * 4); // 7 to 10 clouds
  }
  if (params.isRain) {
    return 5 + Math.floor(Math.random() * 3); // 5 to 7 storm slabs
  }
  if (params.isSnow) {
    return 4 + Math.floor(Math.random() * 3); // 4 to 6 snow slabs
  }
  if (params.isFog) {
    return 3 + Math.floor(Math.random() * 3); // 3 to 5 misty clouds
  }
  if (params.isSunny) {
    return 2 + Math.floor(Math.random() * 2); // 2 to 3 fair-weather clouds
  }
  if (params.isNight) {
    return 1 + Math.floor(Math.random() * 3); // 1 to 3 nocturnal clouds
  }
  return 3;
}

/**
 * Initializes a field of procedural clouds for the canvas.
 */
export function createMinecraftCloudField(
  skyWidth: number,
  skyHeight: number,
  count: number
): MinecraftCloud[] {
  return Array.from({ length: count }, () =>
    createRandomMinecraftCloud(skyWidth, skyHeight, true)
  );
}
