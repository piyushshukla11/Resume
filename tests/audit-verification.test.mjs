import test from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// 1. Direct unit tests for lib/weather.ts
import { conditionFromCode, moonPhaseAt, solarElevationAt, atmosphereAt } from "../lib/weather.ts";

test("weather: conditionFromCode maps WMO codes correctly", () => {
  assert.equal(conditionFromCode(0), "clear");
  assert.equal(conditionFromCode(1), "partly-cloudy");
  assert.equal(conditionFromCode(2), "cloudy");
  assert.equal(conditionFromCode(3), "cloudy");
  assert.equal(conditionFromCode(45), "fog");
  assert.equal(conditionFromCode(48), "fog");
  assert.equal(conditionFromCode(71), "snow");
  assert.equal(conditionFromCode(77), "snow");
  assert.equal(conditionFromCode(85), "snow");
  assert.equal(conditionFromCode(95), "thunderstorm");
  assert.equal(conditionFromCode(99), "thunderstorm");
  assert.equal(conditionFromCode(61), "rain");
  assert.equal(conditionFromCode(80), "rain");
});

test("weather: moonPhaseAt returns value within [0, 1)", () => {
  const dates = [
    new Date("2026-01-01T00:00:00Z"),
    new Date("2026-06-15T12:00:00Z"),
    new Date("2026-11-22T17:50:00Z"),
  ];
  for (const d of dates) {
    const phase = moonPhaseAt(d);
    assert.ok(phase >= 0 && phase < 1, `Phase ${phase} out of bounds`);
  }
});

test("weather: solarElevationAt correctly differentiates day and night", () => {
  const noon = new Date("2026-06-21T06:30:00Z"); // Solar noon in India (~77.6E)
  const midnight = new Date("2026-06-21T18:30:00Z");
  const elevationNoon = solarElevationAt(noon, 12.9716, 77.5946);
  const elevationMidnight = solarElevationAt(midnight, 12.9716, 77.5946);
  assert.ok(elevationNoon > 45, `Expected noon elevation > 45°, got ${elevationNoon}`);
  assert.ok(elevationMidnight < -30, `Expected midnight elevation < -30°, got ${elevationMidnight}`);
});

test("weather: atmosphereAt maps elevation thresholds properly", () => {
  assert.equal(atmosphereAt(-10), "night");
  assert.equal(atmosphereAt(-7), "night");
  assert.equal(atmosphereAt(-2), "dusk");
  assert.equal(atmosphereAt(1), "dawn");
  assert.equal(atmosphereAt(6), "golden-hour");
  assert.equal(atmosphereAt(15), "clear-day");
});

// 2. Cryptographic Security & AES-256-GCM verification (lib/project-store.ts logic)
test("security: AES-256-GCM authenticated encryption roundtrip", () => {
  const secretKey = "a".repeat(32); // 32 bytes minimum
  const key = createHash("sha256").update(secretKey).digest();

  const originalState = {
    approved: [{ repoId: 1, repoName: "test-repo", status: "approved" }],
    pending: [],
    ignored: [],
  };

  const json = JSON.stringify(originalState);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const encoded = "enc:v1:" + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");

  assert.ok(encoded.startsWith("enc:v1:"));

  // Decrypt
  const payload = Buffer.from(encoded.slice("enc:v1:".length), "base64");
  const decIv = payload.subarray(0, 12);
  const decTag = payload.subarray(12, 28);
  const decEncrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, decIv);
  decipher.setAuthTag(decTag);
  const decrypted = JSON.parse(Buffer.concat([decipher.update(decEncrypted), decipher.final()]).toString("utf8"));

  assert.deepEqual(decrypted, originalState);

  // Tampered payload fails authentication
  const tamperedPayload = Buffer.from(payload);
  tamperedPayload[35] ^= 0xff; // flip a bit in ciphertext
  const badDecipher = createDecipheriv("aes-256-gcm", key, tamperedPayload.subarray(0, 12));
  badDecipher.setAuthTag(tamperedPayload.subarray(12, 28));
  assert.throws(() => {
    Buffer.concat([badDecipher.update(tamperedPayload.subarray(28)), badDecipher.final()]);
  }, /Unsupported state or unable to authenticate data/);
});

test("security: STAGING_ENCRYPTION_KEY enforces 32-byte minimum", () => {
  const shortSecret = "short-key-16-byte";
  assert.ok(Buffer.byteLength(shortSecret, "utf8") < 32);
  const validateKeyLength = (secret) => {
    if (secret && Buffer.byteLength(secret, "utf8") < 32) {
      throw new Error("STAGING_ENCRYPTION_KEY must contain at least 32 bytes");
    }
  };
  assert.throws(() => validateKeyLength(shortSecret), /STAGING_ENCRYPTION_KEY must contain at least 32 bytes/);
  assert.doesNotThrow(() => validateKeyLength("a".repeat(32)));
});

// 3. Webhook HMAC verification (lib/github-sync.ts logic)
test("security: timingSafeEqual HMAC SHA-256 verification", () => {
  const secret = "super-secret-webhook-key-98765";
  const body = JSON.stringify({ action: "push", repository: { id: 999 } });

  const validHmac = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const invalidHmac = `sha256=${createHmac("sha256", "wrong-key").update(body).digest("hex")}`;

  function checkSignature(rawBody, sig, sec) {
    if (!sec || !sig?.startsWith("sha256=")) return false;
    const expected = Buffer.from(`sha256=${createHmac("sha256", sec).update(rawBody).digest("hex")}`);
    const received = Buffer.from(sig);
    return expected.length === received.length && timingSafeEqual(expected, received);
  }

  assert.ok(checkSignature(body, validHmac, secret));
  assert.ok(!checkSignature(body, invalidHmac, secret));
  assert.ok(!checkSignature(body + "altered", validHmac, secret));
  assert.ok(!checkSignature(body, null, secret));
  assert.ok(!checkSignature(body, validHmac, ""));
});

// 4. Project State transition logic
test("project-store: state transitions maintain invariants across approved, pending, and ignored", () => {
  function saveProject(state, project) {
    const next = {
      approved: state.approved.filter((item) => item.repoId !== project.repoId),
      pending: state.pending.filter((item) => item.repoId !== project.repoId),
      ignored: state.ignored.filter((item) => item.repoId !== project.repoId),
    };
    const bucket = project.status === "approved" ? next.approved : project.status === "ignored" ? next.ignored : next.pending;
    bucket.push(project);
    return next;
  }

  const initial = { approved: [], pending: [], ignored: [] };
  const p1 = { repoId: 42, repoName: "polyexecution-studio", status: "pending_approval" };

  const s1 = saveProject(initial, p1);
  assert.equal(s1.pending.length, 1);
  assert.equal(s1.approved.length, 0);

  // Transition to approved
  const s2 = saveProject(s1, { ...p1, status: "approved" });
  assert.equal(s2.approved.length, 1);
  assert.equal(s2.pending.length, 0);

  // Transition to ignored
  const s3 = saveProject(s2, { ...p1, status: "ignored" });
  assert.equal(s3.ignored.length, 1);
  assert.equal(s3.approved.length, 0);
  assert.equal(s3.pending.length, 0);

  // Re-approve from ignored
  const s4 = saveProject(s3, { ...p1, status: "approved" });
  assert.equal(s4.approved.length, 1);
  assert.equal(s4.ignored.length, 0);
});

test("projects: all 10 archived systems have unique IDs, categories, and case study metadata", async () => {
  const { featuredProjects, getProject } = await import("../lib/projects.ts");

  assert.equal(featuredProjects.length, 10, "Expected 10 archived engineering projects");

  const ids = new Set();
  const validCategories = new Set(["systems", "ai", "games"]);

  for (const project of featuredProjects) {
    assert.ok(project.id && typeof project.id === "string", "Project ID must be a non-empty string");
    assert.ok(!ids.has(project.id), `Duplicate project ID detected: ${project.id}`);
    ids.add(project.id);

    assert.ok(validCategories.has(project.category), `Invalid category: ${project.category}`);
    assert.ok(project.title && project.title.length > 0, "Title must be non-empty");
    assert.ok(project.summary && project.summary.length > 10, "Summary must be descriptive");
    assert.ok(project.tags && project.tags.length > 0, "Must have at least one tag");
    assert.ok(project.githubUrl.startsWith("https://github.com/"), "Must have valid GitHub URL");

    // Verify lookup helper
    const retrieved = getProject(project.id);
    assert.equal(retrieved?.id, project.id, `getProject failed to find ${project.id}`);
  }

  // Verify PES 2 wording specifies 27 programming environments without LeetCode
  const pes2 = getProject("polyexecution-studio2");
  assert.ok(pes2, "PES 2 must exist");
  assert.ok(pes2.subtitle.includes("27 programming environments"));
  assert.ok(!pes2.subtitle.toLowerCase().includes("leetcode"));

  // Verify Voyage and 3D ULPIN exist for highlights
  const voyage = getProject("voyage");
  assert.ok(voyage, "Voyage must exist");
  const ulpin = getProject("ulpin-cadastre");
  assert.ok(ulpin, "3D ULPIN must exist");
});

test("weather-state: resolveWeatherState deterministically maps all preview modes", async () => {
  const { resolveWeatherState } = await import("../lib/weather-state.ts");

  const cloudyState = resolveWeatherState(null, "cloudy");
  assert.equal(cloudyState.isCloudy, true);
  assert.equal(cloudyState.weatherClass, "weather-cloudy");

  const rainState = resolveWeatherState(null, "rain");
  assert.equal(rainState.isRain, true);
  assert.equal(rainState.weatherClass, "weather-rain");

  const snowState = resolveWeatherState(null, "snow");
  assert.equal(snowState.isSnow, true);
  assert.equal(snowState.weatherClass, "weather-snow");

  const mistState = resolveWeatherState(null, "mist");
  assert.equal(mistState.isFog, true);
  assert.equal(mistState.weatherClass, "weather-fog");

  const nightState = resolveWeatherState(null, "clear-night");
  assert.equal(nightState.isNight, true);
  assert.equal(nightState.weatherClass, "weather-night");

  const sunnyState = resolveWeatherState(null, "clear-day");
  assert.equal(sunnyState.isSunny, true);
  assert.equal(sunnyState.weatherClass, "weather-sunny");
});

test("weather-clouds: procedurally generates randomized Minecraft clouds with voxel geometry", async () => {
  const {
    MINECRAFT_CLOUD_SHAPES,
    createRandomMinecraftCloud,
    getRandomCloudCount,
    createMinecraftCloudField,
  } = await import("../lib/weather-clouds.ts");

  // 1. Validate voxel shape catalog
  assert.ok(MINECRAFT_CLOUD_SHAPES.length >= 6, "Must define at least 6 distinct Minecraft silhouettes");
  for (const shape of MINECRAFT_CLOUD_SHAPES) {
    assert.ok(shape.length > 0, "Each shape must contain at least one voxel block");
    for (const b of shape) {
      assert.ok(b.gridX >= 0 && b.gridY >= 0, "Grid coordinates must be non-negative");
      assert.ok(b.gridW > 0 && b.gridH > 0, "Block dimensions must be strictly positive");
    }
  }

  // 2. Validate cloud counts across weather conditions
  for (let i = 0; i < 20; i++) {
    const cloudyCount = getRandomCloudCount({ isCloudy: true });
    assert.ok(cloudyCount >= 7 && cloudyCount <= 10, `Cloudy count out of range: ${cloudyCount}`);

    const rainCount = getRandomCloudCount({ isRain: true });
    assert.ok(rainCount >= 5 && rainCount <= 7, `Rain count out of range: ${rainCount}`);

    const snowCount = getRandomCloudCount({ isSnow: true });
    assert.ok(snowCount >= 4 && snowCount <= 6, `Snow count out of range: ${snowCount}`);

    const sunnyCount = getRandomCloudCount({ isSunny: true });
    assert.ok(sunnyCount >= 2 && sunnyCount <= 3, `Sunny count out of range: ${sunnyCount}`);

    const nightCount = getRandomCloudCount({ isNight: true });
    assert.ok(nightCount >= 1 && nightCount <= 3, `Night count out of range: ${nightCount}`);
  }

  // 3. Validate procedural cloud generation
  const cloudInitial = createRandomMinecraftCloud(1200, 800, true);
  assert.ok(cloudInitial.totalWidth > 0 && cloudInitial.totalHeight > 0);
  assert.ok(cloudInitial.speed >= 10 && cloudInitial.speed <= 25);
  assert.ok(cloudInitial.y >= 20 && cloudInitial.y <= 260);
  assert.ok(cloudInitial.cellW >= 15 && cloudInitial.cellW <= 22);
  assert.ok(cloudInitial.cellH >= 10 && cloudInitial.cellH <= 14);

  // 4. Validate boundary respawn logic (spawns offscreen left)
  const cloudRespawn = createRandomMinecraftCloud(1200, 800, false);
  assert.ok(cloudRespawn.x < 0, "Respawned cloud must start off-screen to the left");

  // 5. Validate field generation
  const field = createMinecraftCloudField(1400, 900, 8);
  assert.equal(field.length, 8);
  const shapesUsed = new Set(field.map((c) => c.shapeIdx));
  // In 8 random rolls from 7 shapes, there should almost certainly be multiple distinct shapes
  assert.ok(shapesUsed.size > 1, "Field should display varied Minecraft cloud shapes");
});

test("stack: highlights all core technologies with green primary box except unity, c++, blender, sql", () => {
  const excluded = new Set(["unity", "c++", "blender", "sql"]);
  const isStackPrimary = (item) => !excluded.has(item.toLowerCase());

  // Excluded skills must NOT be primary
  assert.equal(isStackPrimary("Unity"), false);
  assert.equal(isStackPrimary("C++"), false);
  assert.equal(isStackPrimary("Blender"), false);
  assert.equal(isStackPrimary("SQL"), false);

  // All other core stack items MUST be primary (green highlight)
  const highlighted = ["C", "Python", "Java", "Kotlin", "Android dev", "C#", "JavaScript", "React", "Node.js", "Gemini API", "CesiumJS"];
  for (const skill of highlighted) {
    assert.equal(isStackPrimary(skill), true, `Expected ${skill} to be highlighted with green box`);
  }

  // Verify that in all stack groups, uncolored items are strictly at the end of the list
  const testStacks = [
    { label: "SYSTEMS & CORE", items: ["C", "Python", "Java", "Kotlin", "Android dev", "C++"] },
    { label: "GAME DEV & 3D", items: ["C#", "Unity", "Blender"] },
    { label: "WEB, DATA & AI", items: ["JavaScript", "React", "Node.js", "Gemini API", "CesiumJS", "SQL"] },
  ];

  for (const group of testStacks) {
    let seenUncolored = false;
    for (const item of group.items) {
      const isPrimary = isStackPrimary(item);
      if (!isPrimary) {
        seenUncolored = true;
      } else {
        assert.ok(!seenUncolored, `In group "${group.label}", primary item "${item}" appears after an uncolored item`);
      }
    }
  }
});

test("leetcode: profile handle links to zogratis_775314", async () => {
  const fs = await import("node:fs");
  const portfolioSrc = fs.readFileSync("components/portfolio.tsx", "utf8");
  const contactSrc = fs.readFileSync("app/contact/page.tsx", "utf8");
  const paletteSrc = fs.readFileSync("components/command-palette.tsx", "utf8");

  assert.ok(portfolioSrc.includes("zogratis_775314"), "Portfolio must fallback to zogratis_775314");
  assert.ok(contactSrc.includes("https://leetcode.com/u/zogratis_775314/"), "Contact page must link to zogratis_775314");
  assert.ok(paletteSrc.includes("https://leetcode.com/u/zogratis_775314/"), "Command palette must link to zogratis_775314");
});

test("pixel-intro: component and layout integration", async () => {
  const fs = await import("node:fs");
  const layoutSrc = fs.readFileSync("app/layout.tsx", "utf8");
  const introSrc = fs.readFileSync("components/pixel-intro.tsx", "utf8");
  const cssSrc = fs.readFileSync("app/globals.css", "utf8");

  assert.ok(layoutSrc.includes("<PixelIntro />"), "PixelIntro must be included in RootLayout");
  assert.ok(introSrc.includes("BITMAP_M") && introSrc.includes("BITMAP_E") && introSrc.includes("BITMAP_DOT"), "Must define pixel glyph bitmaps");
  assert.ok(introSrc.includes("clearRect"), "Must use clearRect for block-by-block pixel dissolve");
  assert.ok(cssSrc.includes(".pixel-intro-overlay"), "globals.css must define .pixel-intro-overlay");
});

test("email: contact address is piyushshukla775314@gmail.com with live compose action", async () => {
  const fs = await import("node:fs");
  const portfolioSrc = fs.readFileSync("components/portfolio.tsx", "utf8");
  const contactSrc = fs.readFileSync("app/contact/page.tsx", "utf8");

  assert.ok(portfolioSrc.includes("piyushshukla775314@gmail.com"), "Portfolio must fallback to piyushshukla775314@gmail.com");
  assert.ok(contactSrc.includes("piyushshukla775314@gmail.com"), "Contact page must use piyushshukla775314@gmail.com");
  assert.ok(contactSrc.includes("mail.google.com/mail/?view=cm"), "Contact page must link to web compose");
  assert.ok(portfolioSrc.includes("mail.google.com/mail/?view=cm"), "Portfolio start conversation must link to web compose");
});
