import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ingestRepository, pollPublicRepositories, verifyGitHubSignature } from "@/lib/github-sync";

export const runtime = "nodejs";

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
    const report = await pollPublicRepositories();
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "GitHub sync failed" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyGitHubSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }
  const event = request.headers.get("x-github-event");
  if (event === "ping") return NextResponse.json({ ok: true });
  if (!["push", "repository"].includes(event || "")) return NextResponse.json({ received: true, ignored: true });
  try {
    const payload = JSON.parse(rawBody);
    if (event === "repository" && !["created", "public"].includes(payload.action)) return NextResponse.json({ received: true, ignored: true });
    const result = await ingestRepository(payload.repository || {});
    return NextResponse.json({ received: true, status: result });
  } catch {
    return NextResponse.json({ error: "Repository ingestion failed" }, { status: 502 });
  }
}
