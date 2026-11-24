"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Github, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import type { PortfolioProject, ProjectCategory } from "@/lib/projects";

type CategoryFilter = ProjectCategory | "all";

const filterTabs: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All work" },
  { id: "systems", label: "Systems & low-level" },
  { id: "ai", label: "AI & full-stack" },
  { id: "games", label: "Game dev & graphics" },
];

export function EngineeringIndexView({ projects }: { projects: PortfolioProject[] }) {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesCategory = activeFilter === "all" || project.category === activeFilter;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const inTitle = project.title.toLowerCase().includes(q);
      const inSubtitle = project.subtitle.toLowerCase().includes(q);
      const inSummary = project.summary.toLowerCase().includes(q);
      const inTags = project.tags.some((t) => t.toLowerCase().includes(q));

      return inTitle || inSubtitle || inSummary || inTags;
    });
  }, [projects, activeFilter, searchQuery]);

  return (
    <div className="site-shell project-page-shell">
      <header className="hud-header">
        <Link href="/" className="brand-lockup" aria-label="Return to portfolio home">
          <ArrowLeft size={16} />
          <span className="wordmark">ME<span>.</span></span>
          <span className="brand-caption">PIYUSH SHUKLA / WORK</span>
        </Link>
        <div className="hud-actions">
          <Link href="/" className="button button-quiet">
            <ArrowLeft size={13} />
            <span>Portfolio Home</span>
          </Link>
          <a
            href="https://github.com/piyushshukla11"
            target="_blank"
            rel="noreferrer"
            className="button button-primary"
          >
            <Github size={14} />
            <span>GitHub Profile</span>
            <ArrowUpRight size={13} />
          </a>
        </div>
      </header>

      <main className="project-page-main">
        {/* Index Hero Header */}
        <section className="section-wrap project-hero-section">
          <div className="project-hero-badge">
            <span className="status-light" />
            <span className="eyebrow">01 ❖ SELECTED WORK · ARCHIVE DIRECTORY</span>
          </div>
          <h1 className="project-hero-title">Engineering index<span>.</span></h1>
          <p className="project-hero-subtitle">
            Builds shaped by curiosity, constraints, and the details underneath.
          </p>
          <p className="project-hero-summary">
            A complete catalogue of low-level execution sandboxes, planetary optical correspondence pipelines,
            customer intelligence models, and distributed CAD systems. Click any build to inspect its kernel
            isolation mechanics, architectural pipeline, and benchmark metrics.
          </p>

          <div className="index-metrics-banner">
            <div className="index-metric-pill">
              <span className="metric-count">{projects.length.toString().padStart(2, "0")}</span>
              <span className="metric-tag">TOTAL BUILDS</span>
            </div>
            <div className="index-metric-pill">
              <span className="metric-count">
                {projects.filter((p) => p.category === "systems").length.toString().padStart(2, "0")}
              </span>
              <span className="metric-tag">SYSTEMS & RUNTIMES</span>
            </div>
            <div className="index-metric-pill">
              <span className="metric-count">
                {projects.filter((p) => p.category === "ai").length.toString().padStart(2, "0")}
              </span>
              <span className="metric-tag">PLANETARY AI & ML</span>
            </div>
            <div className="index-metric-pill">
              <span className="metric-count">100%</span>
              <span className="metric-tag">OWNER VERIFIED</span>
            </div>
          </div>
        </section>

        {/* Filter Controls & Search */}
        <section className="section-wrap project-section">
          <div className="index-controls-bar">
            <div className="filter-bar" role="group" aria-label="Filter engineering projects">
              {filterTabs.map((tab) => {
                const count = tab.id === "all"
                  ? projects.length
                  : projects.filter((p) => p.category === tab.id).length;
                const isSelected = activeFilter === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFilter(tab.id)}
                    className={isSelected ? "is-selected" : ""}
                    aria-pressed={isSelected}
                  >
                    <span>{tab.label}</span>
                    <span>{count.toString().padStart(2, "0")}</span>
                  </button>
                );
              })}
            </div>

            <div className="index-search-wrap">
              <Search size={15} className="index-search-icon" />
              <input
                type="text"
                placeholder="Search by keyword, tag, or technology (e.g. Linux, PyTorch)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="index-search-input"
                aria-label="Search engineering index"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="index-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Results Counter */}
          <div className="index-results-meta">
            <span>
              SHOWING {filteredProjects.length.toString().padStart(2, "0")} OF {projects.length.toString().padStart(2, "0")} ARCHIVED SYSTEMS
            </span>
            {searchQuery && (
              <span className="index-filter-indicator">
                FILTERED BY: &ldquo;{searchQuery}&rdquo;
              </span>
            )}
          </div>

          {/* Project Grid */}
          {filteredProjects.length > 0 ? (
            <div className="project-grid">
              {filteredProjects.map((project, index) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="project-card"
                  aria-label={`Open case study webpage for ${project.title}`}
                >
                  <span className="project-card-top">
                    <span className="project-count">
                      {String(index + 1).padStart(2, "0")} / {project.category.toUpperCase()}
                    </span>
                    <span className="project-open" title="Open case study webpage">
                      <ArrowUpRight size={16} />
                    </span>
                  </span>
                  <span className="project-title">{project.title}</span>
                  <span className="project-subtitle">{project.subtitle}</span>
                  <span className="project-description">{project.summary}</span>
                  <span className="tag-row">
                    {project.tags.slice(0, 5).map((tag) => (
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
          ) : (
            <div className="index-empty-box">
              <SlidersHorizontal size={28} />
              <h3>No engineering systems matched your query.</h3>
              <p>Try searching for a different language (e.g. &ldquo;C&rdquo;, &ldquo;Python&rdquo;), runtime primitive, or reset filters.</p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => { setActiveFilter("all"); setSearchQuery(""); }}
              >
                Reset All Filters
              </button>
            </div>
          )}
        </section>

        {/* Footer Navigation CTA */}
        <section className="section-wrap project-cta-section">
          <div className="project-cta-box">
            <div>
              <h3>Explore Core Tooling & Matrix</h3>
              <p>Inspect languages, runtime frameworks, and system competencies on the portfolio homepage.</p>
            </div>
            <div className="project-cta-actions">
              <Link href="/#stack" className="button button-primary">
                <Sparkles size={14} />
                <span>View Tech Matrix</span>
                <ArrowUpRight size={13} />
              </Link>
              <Link href="/" className="button button-outline">
                <ArrowLeft size={14} />
                <span>Return to Portfolio</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <Link href="/" className="footer-brand">ME<span>.</span></Link>
        <span>PIYUSH SHUKLA · SYSTEMS / GAMES / SOFTWARE</span>
        <div>
          <Link href="/">HOME</Link>
          <Link href="/work">ENGINEERING INDEX</Link>
          <a href="https://github.com/piyushshukla11" target="_blank" rel="noreferrer">GITHUB</a>
        </div>
        <span className="footer-year">© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
