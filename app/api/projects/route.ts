import { NextResponse } from "next/server";
import { readProjectState } from "@/lib/project-store";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  try {
    const { approved } = await readProjectState();
    const projects = approved.map((project) => ({
      id: `github-${project.repoId}`,
      title: project.displayTitle || project.repoName,
      subtitle: project.description || project.primaryLanguage || "GitHub project",
      summary: project.description || project.readmeSummary,
      category: project.category || "systems",
      tags: [project.primaryLanguage, ...project.topics].filter(Boolean).slice(0, 8),
      architecture: project.architectureNotes?.split("\n").filter(Boolean) || [project.readmeSummary].filter(Boolean),
      outcomes: [`${project.stars} GitHub stars`, ...(project.lastCommitAt ? [`Updated ${project.lastCommitAt.slice(0, 10)}`] : [])],
      githubUrl: `https://github.com/${project.fullName}`,
      demoUrl: project.demoUrl,
      featured: false,
    }));
    return NextResponse.json(projects, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
  }
}
