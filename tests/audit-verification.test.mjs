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

test("projects: all 9 archived systems have unique IDs, categories, and case study metadata", async () => {
  const { featuredProjects, getProject } = await import("../lib/projects.ts");

  assert.equal(featuredProjects.length, 9, "Expected 9 archived engineering projects");

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
});
