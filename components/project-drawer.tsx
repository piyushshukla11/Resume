"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, ExternalLink, FileText, X } from "lucide-react";
import { featuredProjects } from "@/lib/projects";
import type { PortfolioProject } from "@/lib/projects";

export function ProjectDrawer({ projectId, onClose, projects = featuredProjects }: { projectId: string | null; onClose: () => void; projects?: PortfolioProject[] }) {
  const project = projects.find((item) => item.id === projectId);
  return (
    <AnimatePresence>
      {project && (
        <>
          <motion.button className="drawer-scrim" aria-label="Close project details" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="project-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <div className="drawer-top"><span className="eyebrow">PROJECT / CASE STUDY</span><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
            <p className="drawer-index">{project.category.toUpperCase()} · FEATURED</p>
            <h2 id="drawer-title">{project.title}</h2>
            <p className="drawer-subtitle">{project.subtitle}</p>
            <p className="drawer-summary">{project.summary}</p>
            <div className="tag-row">{project.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}</div>
            <div className="drawer-section"><span className="eyebrow">SYSTEM SHAPE</span><ol className="architecture-list">{project.architecture.map((item, index) => <li key={item}><span>0{index + 1}</span>{item}</li>)}</ol></div>
            <div className="drawer-section"><span className="eyebrow">ENGINEERING NOTES</span><ul className="outcomes-list">{project.outcomes.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className="case-visual" aria-label="Architecture flow diagram">
              {project.architecture.map((item, index) => <div key={item} className="case-step"><span>0{index + 1}</span><strong>{item}</strong>{index < project.architecture.length - 1 && <i aria-hidden="true">→</i>}</div>)}
            </div>
            <div className="drawer-links">
              <Link href={`/projects/${project.id}`} className="button button-primary" onClick={onClose}>
                <FileText size={14} />
                <span>Open Dedicated Page</span>
                <ArrowUpRight size={14} />
              </Link>
              <a href={project.githubUrl} target="_blank" rel="noreferrer">View on GitHub <ArrowUpRight size={16} /></a>
              {project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer">Live demo <ExternalLink size={15} /></a>}
            </div>
            <p className="drawer-footnote">Repository ingestion is owner-reviewed before appearing in the public index.</p>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
