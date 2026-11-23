import { createHmac, timingSafeEqual } from "node:crypto";
import { readProjectState, saveProject, writeProjectState } from "@/lib/project-store";
import type { CuratedProject } from "@/lib/project-store";

const api = "https://api.github.com";
const username = process.env.GITHUB_USERNAME || "Piyush-K-Shukla";

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ME-Portfolio-Repository-Sync",
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  };
}

async function githubJson(url: string) {
  const response = await fetch(url, { headers: githubHeaders(), next: { revalidate: 0 } });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return response.json();
}

function summarizeReadme(markdown: string): string {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/[*_`>~-]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, 520);
}

export async function ingestRepository(repository: Record<string, unknown>) {
  const repoId = Number(repository.id);
  const fullName = String(repository.full_name || "");
  if (!repoId || !fullName || repository.private === true || repository.archived === true) return "ignored";
  const state = await readProjectState();
  if (state.ignored.some((project) => project.repoId === repoId)) return "suppressed";

  const [details, languageResult, readmeResult] = await Promise.all([
    githubJson(`${api}/repos/${fullName}`),
    githubJson(`${api}/repos/${fullName}/languages`).catch(() => ({})),
    githubJson(`${api}/repos/${fullName}/readme`).catch(() => null),
  ]);
  const readmeMarkdown = readmeResult?.content && readmeResult.encoding === "base64"
    ? Buffer.from(readmeResult.content, "base64").toString("utf8")
    : "";
  const old = [...state.approved, ...state.pending].find((project) => project.repoId === repoId);
  const project: CuratedProject = {
    repoId,
    repoName: details.name,
    fullName: details.full_name,
    description: details.description || "",
    readmeSummary: summarizeReadme(readmeMarkdown),
    primaryLanguage: details.language || null,
    languages: languageResult,
    topics: details.topics || [],
    stars: details.stargazers_count || 0,
    lastCommitAt: details.pushed_at || null,
    metadataUpdatedAt: details.updated_at || null,
    demoUrl: details.homepage || null,
    socialImage: details.owner?.avatar_url ? `${details.owner.avatar_url}&s=1200` : null,
    status: old?.status === "approved" && old.metadataUpdatedAt === (details.updated_at || null) && old.lastCommitAt === (details.pushed_at || null) ? "approved" : "pending_approval",
    displayTitle: old?.displayTitle,
    category: old?.category,
    architectureNotes: old?.architectureNotes,
    updatedAt: new Date().toISOString(),
  };
  await writeProjectState(saveProject(state, project));
  return project.status;
}

export function verifyGitHubSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`);
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function pollPublicRepositories() {
  const repositories = await githubJson(`${api}/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&type=public`);
  const report = { scanned: 0, pending: 0, approved: 0, suppressed: 0, skipped: 0 };
  for (const repository of repositories as Record<string, unknown>[]) {
    report.scanned++;
    const status = await ingestRepository(repository);
    if (status === "pending_approval") report.pending++;
    else if (status === "approved") report.approved++;
    else if (status === "suppressed") report.suppressed++;
    else report.skipped++;
  }
  return report;
}
