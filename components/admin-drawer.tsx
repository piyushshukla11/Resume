"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, LockKeyhole, RefreshCw, ShieldCheck, X } from "lucide-react";

type PendingProject = { repoId: number; repoName: string; fullName: string; description: string; readmeSummary: string; primaryLanguage: string | null; topics: string[]; stars: number; lastCommitAt: string | null; demoUrl: string | null; status: string; displayTitle?: string; category?: string; architectureNotes?: string };

type State = { approved: PendingProject[]; pending: PendingProject[]; ignored: PendingProject[] };

export function AdminDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [token, setToken] = useState("");
  const [state, setState] = useState<State>({ approved: [], pending: [], ignored: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("systems");
  const [notes, setNotes] = useState("");

  const load = useCallback(async (secret: string) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/projects", { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "Token not accepted." : "Could not load the review queue.");
      setState(await response.json());
      sessionStorage.setItem("me-admin-token", secret);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Request failed."); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => {
    if (!open) return;
    const saved = sessionStorage.getItem("me-admin-token") || "";
    queueMicrotask(() => {
      if (saved) { setToken(saved); void load(saved); }
      else setToken("");
    });
  }, [open, load]);

  async function act(project: PendingProject, action: "approve" | "ignore" | "customize") {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/projects", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ repoId: project.repoId, action, ...(action === "customize" ? { displayTitle: title, category, architectureNotes: notes } : {}) }) });
      if (!response.ok) throw new Error("Could not update this repository.");
      await load(token);
      setEditing(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Request failed."); setBusy(false); }
  }

  async function sync() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/github/sync", { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Scheduled GitHub sync failed.");
      await load(token);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sync failed."); setBusy(false); }
  }

  return <AnimatePresence>{open && <>
    <motion.button className="drawer-scrim" aria-label="Close owner curation" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
    <motion.aside className="project-drawer admin-drawer" role="dialog" aria-modal="true" aria-labelledby="admin-title" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}>
      <div className="drawer-top"><span className="eyebrow"><ShieldCheck size={13} /> OWNER CURATION</span><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      <h2 id="admin-title">Review the queue.</h2>
      <p className="drawer-summary">Public repositories stay private to this portfolio until you approve them.</p>
      {!state.pending.length && !state.approved.length && !token ? <form className="admin-login" onSubmit={(event) => { event.preventDefault(); void load(token); }}><label htmlFor="admin-token">Admin access token</label><div className="admin-token-input"><LockKeyhole size={16} /><input id="admin-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Enter ADMIN_TOKEN" autoComplete="current-password" required /></div><button className="button button-primary" disabled={busy}>Unlock curation</button></form> : null}
      {token && <div className="admin-toolbar"><span className="admin-count">{state.pending.length} awaiting review</span><button className="button button-quiet" onClick={() => void sync()} disabled={busy}><RefreshCw size={14} className={busy ? "spin" : ""} /> Sync GitHub</button></div>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      <div className="admin-list">{state.pending.map((project) => <article className="admin-card" key={project.repoId}>
        <div className="admin-card-head"><div><span className="eyebrow">{project.primaryLanguage || "REPOSITORY"} · {project.stars} STARS</span><h3>{project.displayTitle || project.repoName}</h3></div><a href={`https://github.com/${project.fullName}`} target="_blank" rel="noreferrer" aria-label="Open repository">↗</a></div>
        <p>{project.description || project.readmeSummary || "No description provided."}</p>
        <div className="tag-row">{project.topics.slice(0, 5).map((topic) => <span className="tag" key={topic}>{topic}</span>)}</div>
        {editing === project.repoId ? <div className="admin-edit"><label>Display title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="systems">Systems / Infra</option><option value="games">Game Dev</option><option value="ai">AI / Full-Stack</option></select></label><label>Architecture notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={2000} /></label><button className="button button-primary" onClick={() => void act(project, "customize")} disabled={busy}>Save metadata</button></div> : <div className="admin-actions"><button className="button button-primary" onClick={() => void act(project, "approve")} disabled={busy}><Check size={14} /> Approve & publish</button><button className="button button-quiet" onClick={() => { setEditing(project.repoId); setTitle(project.displayTitle || project.repoName); setCategory(project.category || "systems"); setNotes(project.architectureNotes || ""); }}>Customize</button><button className="text-action" onClick={() => void act(project, "ignore")} disabled={busy}>Ignore / archive</button></div>}
      </article>)}
      {token && state.pending.length === 0 && <div className="admin-empty"><ShieldCheck size={22} /><p>Review queue is clear.</p><small>New public repositories will wait here for your approval.</small></div>}
      {state.approved.length > 0 && <div className="admin-approved"><span className="eyebrow">PUBLISHED · {state.approved.length}</span>{state.approved.map((project) => <div key={project.repoId}><Check size={13} /> {project.displayTitle || project.repoName}</div>)}</div>}
      </div>
    </motion.aside>
  </>}</AnimatePresence>;
}
