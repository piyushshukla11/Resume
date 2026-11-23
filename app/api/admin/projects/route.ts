import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { readProjectState, saveProject, writeProjectState } from "@/lib/project-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await readProjectState(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Project store unavailable" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !Number.isInteger(body.repoId) || !["approve", "ignore", "customize"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  try {
    const state = await readProjectState();
    const project = state.pending.find((item) => item.repoId === body.repoId)
      || state.approved.find((item) => item.repoId === body.repoId)
      || state.ignored.find((item) => item.repoId === body.repoId);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const updated = {
      ...project,
      displayTitle: typeof body.displayTitle === "string" ? body.displayTitle.slice(0, 100) : project.displayTitle,
      category: ["systems", "games", "ai"].includes(body.category) ? body.category : project.category,
      architectureNotes: typeof body.architectureNotes === "string" ? body.architectureNotes.slice(0, 2000) : project.architectureNotes,
      status: body.action === "approve" ? "approved" as const : body.action === "ignore" ? "ignored" as const : project.status,
      updatedAt: new Date().toISOString(),
    };
    await writeProjectState(saveProject(state, updated));
    return NextResponse.json({ project: updated });
  } catch {
    return NextResponse.json({ error: "Project update failed" }, { status: 503 });
  }
}
