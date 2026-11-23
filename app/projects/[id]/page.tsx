import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Cpu, ExternalLink, Github, Layers } from "lucide-react";
import { featuredProjects, getProject } from "@/lib/projects";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  return featuredProjects.map((project) => ({ id: project.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const project = getProject(id);
  if (!project) return { title: "Project Not Found — ME" };
  return {
    title: `${project.title} — Technical Case Study | ME`,
    description: project.summary,
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();

  const otherProjects = featuredProjects.filter((p) => p.id !== project.id);

  return (
    <div className="site-shell project-page-shell">
      <header className="hud-header">
        <Link href="/" className="brand-lockup" aria-label="Return to portfolio home">
          <ArrowLeft size={16} />
          <span className="wordmark">ME<span>.</span></span>
          <span className="brand-caption">PIYUSH SHUKLA / CASE STUDY</span>
        </Link>
        <div className="hud-actions">
          <Link href="/projects" className="button button-quiet">
            <Layers size={13} />
            <span>All Projects</span>
          </Link>
          <a href={project.githubUrl} target="_blank" rel="noreferrer" className="button button-primary">
            <Github size={14} />
            <span>Source Code</span>
            <ArrowUpRight size={13} />
          </a>
        </div>
      </header>

      <main className="project-page-main">
        {/* Project Hero */}
        <section className="section-wrap project-hero-section">
          <div className="project-hero-badge">
            <span className="status-light" />
            <span className="eyebrow">{project.category.toUpperCase()} · FLAGSHIP ARCHITECTURE</span>
          </div>
          <h1 className="project-hero-title">{project.title}</h1>
          <p className="project-hero-subtitle">{project.subtitle}</p>
          <p className="project-hero-summary">{project.summary}</p>

          <div className="project-repo-banner">
            <a href={project.githubUrl} target="_blank" rel="noreferrer" className="project-repo-link-pill">
              <Github size={15} />
              <span className="repo-label">Official Repository:</span>
              <span className="repo-name">{project.githubUrl.replace("https://github.com/", "")}</span>
              <ArrowUpRight size={13} />
            </a>
            {project.demoUrl && (
              <a href={project.demoUrl} target="_blank" rel="noreferrer" className="project-demo-link-pill">
                <ExternalLink size={14} />
                <span>Live Demo</span>
              </a>
            )}
          </div>

          <div className="tag-row project-hero-tags">
            {project.tags.map((tag) => (
              <span key={tag} className="tag tag-large">{tag}</span>
            ))}
          </div>

          {project.metrics && (
            <div className="project-metrics-grid">
              {project.metrics.map((m) => (
                <div key={m.label} className="metric-card">
                  <span className="metric-label">{m.label}</span>
                  <strong className="metric-value">{m.value}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Problem & Motivation */}
        {project.problemStatement && (
          <section className="section-wrap project-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">01 / PROBLEM STATEMENT</p>
                <h2>The challenge & constraints<span>.</span></h2>
              </div>
            </div>
            <div className="project-box">
              <p className="project-box-text">{project.problemStatement}</p>
            </div>
          </section>
        )}

        {/* Deep Dive & Invariants */}
        <section className="section-wrap project-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">02 / SYSTEM ARCHITECTURE</p>
              <h2>How it is built underneath<span>.</span></h2>
            </div>
            <p className="section-aside">Core subsystems and runtime isolation mechanisms.</p>
          </div>

          <div className="project-architecture-grid">
            {project.architecture.map((item, idx) => {
              const [title, ...descParts] = item.split(":");
              return (
                <article key={item} className="architecture-card">
                  <span className="architecture-step-num">0{idx + 1}</span>
                  <h3>{title.trim()}</h3>
                  <p>{descParts.join(":").trim() || title.trim()}</p>
                </article>
              );
            })}
          </div>

          {/* Interactive Flow visual */}
          <div className="project-flow-visual" aria-label="System flow pipeline">
            {project.architecture.map((item, index) => {
              const shortName = item.split(":")[0];
              return (
                <div key={item} className="flow-node">
                  <span className="flow-step">STAGE 0{index + 1}</span>
                  <strong>{shortName}</strong>
                  {index < project.architecture.length - 1 && <span className="flow-arrow" aria-hidden="true">→</span>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Technical Deep Dive list */}
        {project.technicalDeepDive && (
          <section className="section-wrap project-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">03 / IMPLEMENTATION DETAILS</p>
                <h2>Technical deep dive<span>.</span></h2>
              </div>
            </div>
            <div className="deep-dive-list">
              {project.technicalDeepDive.map((detail, idx) => (
                <div key={idx} className="deep-dive-item">
                  <div className="deep-dive-icon"><Cpu size={15} /></div>
                  <p>{detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Code Highlight if present */}
        {project.codeHighlight && (
          <section className="section-wrap project-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">04 / KERNEL & CODE LEVEL</p>
                <h2>Implementation snippet<span>.</span></h2>
              </div>
              <p className="section-aside">{project.codeHighlight.filename}</p>
            </div>
            <div className="code-snippet-box">
              <div className="code-snippet-header">
                <span className="code-snippet-lang">{project.codeHighlight.language.toUpperCase()}</span>
                <span className="code-snippet-file">{project.codeHighlight.filename}</span>
              </div>
              <pre className="code-snippet-pre">
                <code>{project.codeHighlight.snippet}</code>
              </pre>
            </div>
          </section>
        )}

        {/* Key Outcomes & Challenges Solved */}
        <section className="section-wrap project-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">05 / VERIFIED OUTCOMES</p>
              <h2>Results & reliability<span>.</span></h2>
            </div>
          </div>
          <div className="outcomes-grid">
            {project.outcomes.map((outcome, idx) => (
              <div key={idx} className="outcome-card">
                <CheckCircle2 size={16} className="outcome-icon" />
                <p>{outcome}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Action bar */}
        <section className="section-wrap project-cta-section">
          <div className="project-cta-box">
            <div>
              <h2>Inspect the repository.</h2>
              <p>Explore full commits, issue discussion, and benchmarks on GitHub.</p>
            </div>
            <div className="project-cta-actions">
              <a href={project.githubUrl} target="_blank" rel="noreferrer" className="button button-primary">
                <Github size={15} />
                <span>View on GitHub</span>
                <ArrowUpRight size={13} />
              </a>
              {project.demoUrl && (
                <a href={project.demoUrl} target="_blank" rel="noreferrer" className="button button-outline">
                  <ExternalLink size={15} />
                  <span>Live Demo</span>
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Explore other projects */}
        <section className="section-wrap project-next-section">
          <p className="eyebrow">CONTINUE EXPLORING</p>
          <div className="other-projects-grid">
            {otherProjects.map((other) => (
              <Link key={other.id} href={`/projects/${other.id}`} className="other-project-card">
                <span className="eyebrow">{other.category.toUpperCase()}</span>
                <h3>{other.title}</h3>
                <p>{other.subtitle}</p>
                <span className="other-project-link">
                  <span>Read case study</span>
                  <ArrowUpRight size={14} />
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
          <Link href="/projects">ALL PROJECTS</Link>
          <a href="https://github.com/piyushshukla11" target="_blank" rel="noreferrer">GITHUB</a>
        </div>
        <span className="footer-year">© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
