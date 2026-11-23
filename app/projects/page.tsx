import type { Metadata } from "next";
import { featuredProjects } from "@/lib/projects";
import { EngineeringIndexView } from "@/components/engineering-index";

export const metadata: Metadata = {
  title: "Projects & Architecture Index — ME",
  description: "Complete archive of systems engineering, game development, and AI projects by Piyush Shukla.",
};

export default function ProjectsPage() {
  return <EngineeringIndexView projects={featuredProjects} />;
}
