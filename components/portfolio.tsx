"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Cloud, Command, Github, Linkedin, LocateFixed, Menu, X } from "lucide-react";
import { useWeather } from "@/components/weather-provider";
import { WeatherCanvas } from "@/components/weather-canvas";
import { ProjectDrawer } from "@/components/project-drawer";
import { AdminDrawer } from "@/components/admin-drawer";
import { CommandPalette } from "@/components/command-palette";
import { featuredProjects } from "@/lib/projects";
import type { PortfolioProject } from "@/lib/projects";
import type { WeatherMode } from "@/lib/weather";

const modes: { id: WeatherMode; label: string }[] = [
  { id: "auto", label: "Live weather" }, { id: "rain", label: "Rain" }, { id: "clear-day", label: "Clear day" },
  { id: "clear-night", label: "Clear night" }, { id: "cloudy", label: "Cloud cover" }, { id: "snow", label: "Snow" }, { id: "mist", label: "Mist" },
];
const stacks = [
  { label: "SYSTEMS & CORE", items: ["C", "C++", "Python", "Java", "Kotlin", "Android dev"] },
  { label: "GAME DEV & 3D", items: ["C#", "Unity", "Unreal Engine", "Blender", "Shader foundations", "3D mathematics"] },
  { label: "WEB, DATA & AI", items: ["JavaScript", "React", "Node.js", "SQL", "Gemini API", "CesiumJS"] },
];
const milestones = [
  { date: "2025 — PRESENT", title: "Robotics & Artificial Intelligence", detail: "Undergraduate studies · Bengaluru", mark: "01" },
  { date: "HACK MALENADU ’26", title: "PRISM · Top 12 finalist", detail: "AI-powered customer review intelligence", mark: "02" },
  { date: "RIFT ’26", title: "Systems under constraints", detail: "Competitive build sprint and prototype work", mark: "03" },
  { date: "YUGAANTAR", title: "Ideas into working systems", detail: "Hackathon prototyping across software and hardware", mark: "04" },
  { date: "ONGOING", title: "Hardware & IoT experiments", detail: "Prototyping at the edge of software and physical systems", mark: "05" },
];

function Clock({ timezone }: { timezone?: string }) {
  const [time, setTime] = useState("--:--");
  useEffect(() => {
    const update = () => setTime(new Intl.DateTimeFormat("en-IN", { timeZone: timezone || "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()));
    update(); const timer = window.setInterval(update, 15_000); return () => window.clearInterval(timer);
  }, [timezone]);
  return <time className="live-clock">{time}</time>;
}

export function Portfolio() {
  const router = useRouter();
  const { weather, mode, setMode, minimal, setMinimal, refreshLocation, setLocation, error } = useWeather();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [curated, setCurated] = useState<PortfolioProject[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [manualLatitude, setManualLatitude] = useState("12.9716");
  const [manualLongitude, setManualLongitude] = useState("77.5946");
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "piyushsukla775314@gmail.com";
  const leetcodeUsername = process.env.NEXT_PUBLIC_LEETCODE_USERNAME;
  const codechefUsername = process.env.NEXT_PUBLIC_CODECHEF_USERNAME;
  const projects = useMemo(() => [...featuredProjects, ...curated], [curated]);

  useEffect(() => {
    let alive = true;
    fetch("/api/projects", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      if (alive && Array.isArray(data)) setCurated(data as PortfolioProject[]);
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen((open) => !open); }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "m") { event.preventDefault(); setAdminOpen(true); }
      if (event.key === "Escape") { setPaletteOpen(false); setAdminOpen(false); setMobileMenu(false); }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, []);

  const conditionLabel = mode !== "auto" ? modes.find((item) => item.id === mode)?.label : weather?.condition?.replaceAll("-", " ") || "Finding weather";
  const location = weather?.location || "Bengaluru";
  const condition = weather?.condition ?? "clear";
  const night = weather?.atmosphere === "night" || mode === "clear-night";
  const isRain = condition === "rain" || condition === "thunderstorm" || mode === "rain";
  const isSnow = condition === "snow" || mode === "snow";
  const isSunny = (condition === "clear" || mode === "clear-day") && !night && !isRain && !isSnow;
  const weatherClass = isRain ? "weather-rain" : isSunny ? "weather-sunny" : night ? "weather-night" : isSnow ? "weather-snow" : "weather-cloudy";

  useEffect(() => {
    if (weather) {
      const lat = String(weather.latitude);
      const lon = String(weather.longitude);
      queueMicrotask(() => {
        setManualLatitude(lat);
        setManualLongitude(lon);
      });
    }
  }, [weather]);

  return <div className={`site-shell ${weatherClass}${minimal ? " focus-mode" : ""}`}>
    <WeatherCanvas onProjectSelect={(target) => router.push(target === "work" ? "/work" : `/projects/${target}`)} />
    <header className="hud-header">
      <a className="brand-lockup" href="#top" aria-label="ME, return to top"><span className="wordmark">ME<span>.</span></span><span className="brand-caption">PIYUSH SHUKLA / PORTFOLIO</span></a>
      <button className="mobile-menu-button" aria-label={mobileMenu ? "Close navigation" : "Open navigation"} onClick={() => setMobileMenu((value) => !value)}>{mobileMenu ? <X size={18} /> : <Menu size={18} />}</button>
      <nav className={`primary-nav${mobileMenu ? " is-open" : ""}`} aria-label="Main navigation">
        <Link href="/work" onClick={() => setMobileMenu(false)}>Work</Link>
        <a href="#stack" onClick={() => setMobileMenu(false)}>Stack</a>
        <a href="#competitive" onClick={() => setMobileMenu(false)}>Competitive</a>
        <a href="#experience" onClick={() => setMobileMenu(false)}>Experience</a>
        <Link href="/contact" onClick={() => setMobileMenu(false)}>Contact</Link>
      </nav>
      <div className="hud-actions">
        <div className="weather-control"><label htmlFor="weather-mode" className="sr-only">Weather simulator</label><select id="weather-mode" value={mode} onChange={(event) => setMode(event.target.value as WeatherMode)} aria-label="Weather simulator">{modes.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select><Cloud size={14} /></div>
        <button className={`focus-toggle${minimal ? " is-active" : ""}`} onClick={() => setMinimal(!minimal)} aria-pressed={minimal}>{minimal ? "Focus on" : "Focus mode"}</button>
        <button className="export-button" onClick={() => window.print()}><ArrowDownToLine size={14} /><span>Resume PDF</span></button>
      </div>
    </header>

    <div className="environment-pill" role="status">
      <span className="status-light" />
      <span>{location} · {weather ? `${Math.round(weather.temperature)}°C` : "—"} · {conditionLabel}</span>
      <Clock timezone={weather?.timezone} />
      <details className="location-override">
        <summary aria-label="Choose a manual location" title="Choose a manual location"><LocateFixed size={13} /></summary>
        <div className="location-popover">
          <span className="eyebrow">LOCATION PREVIEW</span>
          <form onSubmit={(event) => { event.preventDefault(); setLocation(Number(manualLatitude), Number(manualLongitude)); }}>
            <label>Latitude<input type="number" min="-90" max="90" step="any" value={manualLatitude} onChange={(event) => setManualLatitude(event.target.value)} required /></label>
            <label>Longitude<input type="number" min="-180" max="180" step="any" value={manualLongitude} onChange={(event) => setManualLongitude(event.target.value)} required /></label>
            <button className="button button-primary" type="submit">Preview location</button>
          </form>
          <button className="location-reset" type="button" onClick={refreshLocation}>Use my current location</button>
        </div>
      </details>
    </div>
    {error && <span className="weather-error" role="status">{error}</span>}

    <main id="top">
      <section className="hero section-wrap" aria-labelledby="hero-title">
        <div className="hero-content">
          <p className="eyebrow hero-eyebrow"><span className="status-light" /> ❖ BUILDING SYSTEMS THAT HOLD UP ❖</p>
          <h1 id="hero-title">I make complex<br />systems feel <em>simple.</em></h1>
          <p className="hero-copy">I’m Piyush Shukla — a robotics and artificial intelligence undergrad drawn to the layers beneath the interface. I build execution systems, useful AI, and playful worlds.</p>
          <div className="hero-actions"><Link className="button button-primary" href="/work">Explore the index <ArrowRight size={15} /></Link><a className="button button-outline" href="https://github.com/piyushshukla11" target="_blank" rel="noreferrer"><Github size={15} /> GitHub <ArrowUpRight size={13} /></a></div>
          <p className="hero-hint"><span className="hint-mark">❖</span> 8-bit weather engine active. Engineering index is available as a dedicated archive.</p>
        </div>
        <a className="scroll-cue" href="#work"><span /> SCROLL TO EXPLORE</a>
      </section>

      <section id="work" className="section-wrap work-section section-anchor" aria-labelledby="work-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">01 ❖ SELECTED WORK</p>
            <h2 id="work-title">Engineering index<span>.</span></h2>
          </div>
          <p className="section-aside">Builds shaped by curiosity, constraints,<br />and the details underneath.</p>
        </div>

        {/* Portal Gateway to Dedicated Engineering Index */}
        <div className="index-gateway-card">
          <div className="index-gateway-header">
            <div className="gateway-badge">
              <span className="status-light" />
              <span>DEDICATED ARCHIVE · 09 PRODUCTION SYSTEMS</span>
            </div>
            <Link href="/work" className="button button-primary">
              <span>Open Dedicated Index</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="gateway-domain-grid">
            <div className="gateway-domain-item">
              <span className="domain-index">01</span>
              <h4>Systems & Low-Level</h4>
              <p>Linux kernel namespaces, seccomp BPF isolation, and custom runtime execution engines.</p>
              <span className="domain-count">05 SYSTEMS</span>
            </div>
            <div className="gateway-domain-item">
              <span className="domain-index">02</span>
              <h4>Planetary AI & Vision</h4>
              <p>Chandrayaan-2 correspondence, YOLOv9 crater detection, and SPICE ephemeris pipelines.</p>
              <span className="domain-count">04 SYSTEMS</span>
            </div>
            <div className="gateway-domain-item">
              <span className="domain-index">03</span>
              <h4>Graphics & Spatial CAD</h4>
              <p>3D spatial mathematical simulations, CesiumJS planetary viewer, and cadastre integrity.</p>
              <span className="domain-count">VERIFIED</span>
            </div>
          </div>

          {/* Featured flagship preview cards */}
          <div className="gateway-preview-section">
            <div className="gateway-preview-title">
              <span>FEATURED HIGHLIGHTS</span>
              <Link href="/work" className="gateway-view-all">
                <span>View all 9 systems in index</span>
                <ArrowRight size={13} />
              </Link>
            </div>
            <div className="project-grid">
              {featuredProjects.slice(0, 2).map((project, index) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="project-card">
                  <span className="project-card-top">
                    <span className="project-count">{String(index + 1).padStart(2, "0")} / {project.category.toUpperCase()}</span>
                    <span className="project-open" title="Open case study webpage"><ArrowUpRight size={16} /></span>
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
                    <span className="card-webpage-btn" aria-label={`Open ${project.title} webpage`}>
                      <span>WEBPAGE</span>
                      <ArrowUpRight size={13} />
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Launchpad Banner */}
          <div className="index-launchpad-row">
            <div className="launchpad-text">
              <strong>Complete Architecture Archive</strong>
              <p>Browse all 9 projects with interactive category filters, real-time keyword search, and deep case studies.</p>
            </div>
            <Link href="/work" className="index-launchpad-btn">
              <span>OPEN FULL ENGINEERING INDEX (09)</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <p className="weather-index-note">
          <span className="node-mini" /> Interactive weather nodes are active in the sky. All systems are cataloged in the dedicated engineering index.
        </p>
      </section>

      <section id="stack" className="section-wrap stack-section section-anchor" aria-labelledby="stack-title">
        <div className="section-heading"><div><p className="eyebrow">02 ❖ TOOLING & CRAFT</p><h2 id="stack-title">A practical toolkit<span>.</span></h2></div><p className="section-aside">The tools change. The instinct to understand<br />the system stays.</p></div>
        <div className="stack-matrix">{stacks.map((group, groupIndex) => <article className="stack-group" key={group.label}><div className="stack-group-head"><span className="stack-number">0{groupIndex + 1}</span><h3>{group.label}</h3></div><div className="stack-items">{group.items.map((item, index) => <span key={item} className={index === 0 ? "stack-primary" : ""}>{item}</span>)}</div></article>)}</div>
        <div className="stack-footnote"><span>{mode === "clear-night" || weather?.atmosphere === "night" ? "MOON / CORE COMPETENCIES" : "SUN / CORE COMPETENCIES"}</span><span>SELECTED FROM THE CELESTIAL MATRIX</span></div>
      </section>

      <section id="competitive" className="section-wrap competitive-section section-anchor" aria-labelledby="competitive-title">
        <div className="section-heading"><div><p className="eyebrow">03 ❖ ALGORITHMIC PROOF-OF-WORK</p><h2 id="competitive-title">Think in constraints<span>.</span></h2></div><p className="section-aside">Practice that carries back into the code:<br />clear invariants, measured trade-offs.</p></div>
        <div className="competitive-grid">
          <a className="profile-card" href={leetcodeUsername ? "https://leetcode.com/u/" + encodeURIComponent(leetcodeUsername) + "/" : "https://leetcode.com"} target="_blank" rel="noreferrer"><span className="profile-mark">LC</span><span className="profile-body"><span className="eyebrow">PROBLEM SOLVING</span><strong>LeetCode</strong><small>{leetcodeUsername ? "Dynamic programming · graphs · trees" : "Set NEXT_PUBLIC_LEETCODE_USERNAME to link your profile"}</small></span><ArrowUpRight size={16} /></a>
          <a className="profile-card" href={codechefUsername ? "https://www.codechef.com/users/" + encodeURIComponent(codechefUsername) : "https://www.codechef.com"} target="_blank" rel="noreferrer"><span className="profile-mark profile-mark-alt">CC</span><span className="profile-body"><span className="eyebrow">CONTEST PRACTICE</span><strong>CodeChef</strong><small>{codechefUsername ? "Complexity · data structures · optimization" : "Set NEXT_PUBLIC_CODECHEF_USERNAME to link your profile"}</small></span><ArrowUpRight size={16} /></a>
          <div className="principle-card"><span className="eyebrow">WORKING PRINCIPLE</span><p>“Make the invariant visible. Let the code explain the rest.”</p><span className="principle-signature">P / ENGINEERING NOTES</span></div>
        </div>
        <p className="data-note">Competition scores are omitted until profile handles or a verified stats feed are configured.</p>
      </section>

      <section id="experience" className="section-wrap experience-section section-anchor" aria-labelledby="experience-title">
        <div className="section-heading"><div><p className="eyebrow">04 ❖ EDUCATION & MILESTONES</p><h2 id="experience-title">Learning by building<span>.</span></h2></div><p className="section-aside">A timeline of rooms entered, ideas tested,<br />and systems made real.</p></div>
        <div className="timeline">{milestones.map((item) => <article className="timeline-row" key={item.mark}><span className="timeline-mark">{item.mark}</span><span className="timeline-date">{item.date}</span><div className="timeline-copy"><h3>{item.title}</h3><p>{item.detail}</p></div><span className="timeline-dot" /></article>)}</div>
      </section>

      <section id="contact" className="section-wrap contact-section section-anchor" aria-labelledby="contact-title">
        <div className="contact-orbit" aria-hidden="true"><span /><span /><span /></div>
        <div className="contact-content"><p className="eyebrow">05 ❖ OPEN CHANNEL</p><h2 id="contact-title">Let’s make<br /><em>something matter.</em></h2><p>For systems engineering, game development, internships, or a curious technical conversation.</p><div className="contact-actions">{email ? <a className="button button-primary" href={`mailto:${email}`}>Start a conversation <ArrowUpRight size={15} /></a> : <a className="button button-primary" href="https://github.com/piyushshukla11" target="_blank" rel="noreferrer">Reach out on GitHub <ArrowUpRight size={15} /></a>}<a className="button button-outline" href="https://www.linkedin.com/in/piyush-shukla-dev" target="_blank" rel="noreferrer"><Linkedin size={15} /> LinkedIn</a><Link className="button button-outline" href="/contact">View Profile & Contact Page <ArrowRight size={14} /></Link></div></div>
      </section>
    </main>

    <footer className="site-footer"><a href="#top" className="footer-brand">ME<span>.</span></a><span>PIYUSH SHUKLA · SYSTEMS / GAMES / SOFTWARE</span><div><Link href="/work">WORK</Link><Link href="/contact">CONTACT</Link><a href="https://github.com/piyushshukla11" target="_blank" rel="noreferrer">GITHUB</a><a href="https://www.linkedin.com/in/piyush-shukla-dev" target="_blank" rel="noreferrer">LINKEDIN</a><button onClick={() => setPaletteOpen(true)}><Command size={12} /> COMMANDS</button></div><span className="footer-year">© {new Date().getFullYear()}</span></footer>

    <button className="command-hint" onClick={() => setPaletteOpen(true)} aria-label="Open command palette"><Command size={14} /><span>COMMANDS</span><kbd>⌘ K</kbd></button>
    <ProjectDrawer projectId={projectId} projects={projects} onClose={() => setProjectId(null)} />
    <AdminDrawer open={adminOpen} onClose={() => setAdminOpen(false)} />
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} email={email} onToggleFocus={() => setMinimal(!minimal)} />
  </div>;
}
