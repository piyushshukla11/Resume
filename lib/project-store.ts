import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type ProjectStatus = "pending_approval" | "approved" | "ignored";
export type CuratedProject = {
  repoId: number;
  repoName: string;
  fullName: string;
  description: string;
  readmeSummary: string;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  topics: string[];
  stars: number;
  lastCommitAt: string | null;
  metadataUpdatedAt: string | null;
  demoUrl: string | null;
  socialImage: string | null;
  status: ProjectStatus;
  displayTitle?: string;
  category?: "systems" | "games" | "ai";
  architectureNotes?: string;
  updatedAt: string;
};

export type ProjectState = {
  approved: CuratedProject[];
  pending: CuratedProject[];
  ignored: CuratedProject[];
};

const KV_KEY = "me:project-state";
const localFile = path.join(process.cwd(), "data", "pipeline.json");
const emptyState = (): ProjectState => ({ approved: [], pending: [], ignored: [] });

function storageKey() {
  const secret = process.env.STAGING_ENCRYPTION_KEY;
  if (secret && Buffer.byteLength(secret, "utf8") < 32) throw new Error("STAGING_ENCRYPTION_KEY must contain at least 32 bytes");
  if (process.env.NODE_ENV === "production" && (!secret || !process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN)) {
    throw new Error("Production project storage requires encrypted durable KV configuration");
  }
  return secret ? createHash("sha256").update(secret).digest() : null;
}

function encodeState(state: ProjectState): string {
  const key = storageKey();
  const json = JSON.stringify(state);
  if (!key) return json;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  return "enc:v1:" + Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

function decodeState(value: string): ProjectState {
  if (!value.startsWith("enc:v1:")) return JSON.parse(value) as ProjectState;
  const key = storageKey();
  if (!key) throw new Error("STAGING_ENCRYPTION_KEY is required to read encrypted projects");
  const payload = Buffer.from(value.slice("enc:v1:".length), "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")) as ProjectState;
}

async function kvCommand(command: string[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("KV credentials are missing");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Project store returned ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error("Project store command failed");
  return payload.result;
}

export async function readProjectState(): Promise<ProjectState> {
  storageKey();
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const stored = await kvCommand(["GET", KV_KEY]);
    return stored ? decodeState(String(stored)) : emptyState();
  }
  try {
    return decodeState(await readFile(localFile, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw error;
  }
}

export async function writeProjectState(state: ProjectState): Promise<void> {
  storageKey();
  const serialized = encodeState(state);
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    await kvCommand(["SET", KV_KEY, serialized]);
    return;
  }
  await mkdir(path.dirname(localFile), { recursive: true });
  await writeFile(localFile, serialized + "\n", { mode: 0o600 });
}

export function projectBucket(state: ProjectState, status: ProjectStatus): CuratedProject[] {
  return status === "approved" ? state.approved : status === "ignored" ? state.ignored : state.pending;
}

export function saveProject(state: ProjectState, project: CuratedProject): ProjectState {
  const next: ProjectState = {
    approved: state.approved.filter((item) => item.repoId !== project.repoId),
    pending: state.pending.filter((item) => item.repoId !== project.repoId),
    ignored: state.ignored.filter((item) => item.repoId !== project.repoId),
  };
  projectBucket(next, project.status).push(project);
  return next;
}
