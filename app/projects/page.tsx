import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Github } from "lucide-react";
import { featuredProjects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projects & Architecture Index — ME",
  description: "Comprehensive case studies for systems, game development, and AI engineering projects by Piyush Shukla.",
};

export default function ProjectsIndexPage() {
  return (
    <div className="site-shell project-page-shell">
      <header className="hud-header">
        <Link href="/" className="brand-lockup" aria-label="Return to portfolio home">
          <ArrowLeft size={16} />
          <span className="wordmark">ME<span>.</span></span>
          <span className="brand-caption">PIYUSH SHUKLA / INDEX</span>
        </Link>
        <div className="hud-actions">
          <Link href="/" className="button button-quiet">
            <span>Portfolio Home</span>
          </Link>
          <a href="https://github.com/Piyush-K-Shukla" target="_blank" rel="noreferrer" className="button button-primary">
            <Github size={14} />
            <span>GitHub Profile</span>
            <ArrowUpRight size={13} />
          </a>
        </div>
      </header>

      <main className="project-page-main">
        <section className="section-wrap project-hero-section">
          <div className="project-hero-badge">
            <span className="status-light" />
            <span className="eyebrow">ENGINEERING DIRECTORY · ALL CASE STUDIES</span>
          </div>
          <h1 className="project-hero-title">Selected Works & Systems<span>.</span></h1>
          <p className="project-hero-summary">
            Every atmospheric node in the weather simulation corresponds to one of these engineering projects. Click any project to inspect its complete architectural breakdown, kernel isolation primitives, and benchmark results.
          </p>
        </section>

        <section className="section-wrap project-section">
          <div className="project-grid">
            {featuredProjects.map((project, index) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="project-card">
                <span className="project-card-top">
                  <span className="project-count">{String(index + 1).padStart(2, "0")} / {project.category.toUpperCase()}</span>
                  <span className="project-open"><ArrowUpRight size={16} /></span>
                </span>
                <span className="project-title">{project.title}</span>
                <span className="project-subtitle">{project.subtitle}</span>
                <span className="project-description">{project.summary}</span>
                <span className="tag-row">
                  {project.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </span>
                <span className="project-card-foot">
                  <span>{project.featured ? "FEATURED CASE STUDY" : "OWNER APPROVED · GITHUB"}</span>
                  <span className="card-webpage-btn">
                    <span>WEBPAGE</span>
                    <ArrowUpRight size={13} />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <Link href="/" className="footer-brand">ME<span>.</span></Link>
        <span>PIYUSH SHUKLA · SYSTEMS / GAMES / SOFTWARE</span>
        <div>
          <Link href="/">HOME</Link>
          <a href="https://github.com/piyushshukla11" target="_blank" rel="noreferrer">GITHUB</a>
        </div>
        <span className="footer-year">© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
