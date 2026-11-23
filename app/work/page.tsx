import type { Metadata } from "next";
import { featuredProjects } from "@/lib/projects";
import { EngineeringIndexView } from "@/components/engineering-index";

export const metadata: Metadata = {
  title: "Engineering Index — Systems, AI & Software Architecture | ME",
  description: "Complete archive of engineering builds, low-level execution sandboxes, planetary optical correspondence pipelines, and systems case studies by Piyush Shukla.",
};

export default function WorkIndexPage() {
  return <EngineeringIndexView projects={featuredProjects} />;
}
