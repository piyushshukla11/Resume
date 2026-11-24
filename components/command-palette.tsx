"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownToLine, ArrowUpRight, AtSign, Check, Command, Search } from "lucide-react";

const commands = [
  { label: "Open Engineering Index", hint: "Dedicated page with all 10 systems", type: "route", value: "/work" },
  { label: "Jump to Work", hint: "Projects and engineering index preview", type: "section", value: "work" },
  { label: "Jump to Stack", hint: "Languages and tools", type: "section", value: "stack" },
  { label: "Jump to Experience", hint: "Education and milestones", type: "section", value: "experience" },
  { label: "Jump to Competitive", hint: "Problem solving profiles", type: "section", value: "competitive" },
  { label: "Jump to Contact", hint: "Get in touch", type: "route", value: "/contact" },
  { label: "Open GitHub", hint: "@piyushshukla11", type: "link", value: "https://github.com/piyushshukla11" },
  { label: "Open LeetCode", hint: "@zogratis_775314", type: "link", value: "https://leetcode.com/u/zogratis_775314/" },
  { label: "Open LinkedIn", hint: "piyush-shukla-dev", type: "link", value: "https://www.linkedin.com/in/piyush-shukla-dev" },
  { label: "Copy email address", hint: "Copy to clipboard", type: "email", value: "email" },
  { label: "Export resume as PDF", hint: "Print-ready, ATS-friendly layout", type: "print", value: "print" },
  { label: "Toggle focus mode", hint: "Quiet the weather canvas", type: "focus", value: "focus" },
  { label: "Replay intro animation", hint: "ME pixel pop-up & block dissolve", type: "intro", value: "intro" },
];

export function CommandPalette({ open, onClose, email, onToggleFocus }: { open: boolean; onClose: () => void; email: string; onToggleFocus: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const visible = commands.filter((command) => `${command.label} ${command.hint}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => {
        setQuery("");
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [open]);

  async function run(command: typeof commands[number]) {
    if (command.type === "route") router.push(command.value);
    if (command.type === "section") document.getElementById(command.value)?.scrollIntoView({ behavior: "smooth" });
    if (command.type === "link") window.open(command.value, "_blank", "noopener,noreferrer");
    if (command.type === "email" && email) {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
    if (command.type === "print") window.print();
    if (command.type === "focus") onToggleFocus();
    if (command.type === "intro") window.dispatchEvent(new CustomEvent("me:replay-intro"));
    if (command.type !== "email") onClose();
  }

  return (
    <AnimatePresence>
      {open && <>
        <motion.button className="palette-scrim" aria-label="Close command palette" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.div className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}>
          <div className="palette-search"><Search size={18} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Where do you want to go?" aria-label="Search commands" /><kbd>ESC</kbd></div>
          <div className="palette-items">{visible.map((command) => <button key={command.label} className="palette-item" onClick={() => void run(command)}><span className="palette-icon">{command.type === "section" ? <Command size={15} /> : command.type === "email" ? copied ? <Check size={15} /> : <AtSign size={15} /> : command.type === "print" ? <ArrowDownToLine size={15} /> : <ArrowUpRight size={15} />}</span><span className="palette-label"><strong>{command.label}</strong><small>{command.type === "email" && copied ? "Copied" : command.type === "email" && !email ? "Set NEXT_PUBLIC_CONTACT_EMAIL to enable" : command.hint}</small></span><span className="palette-key">↵</span></button>)}{visible.length === 0 && <p className="palette-empty">No matching commands.</p>}</div>
          <div className="palette-footer"><span>Navigate with search</span><span><kbd>⌘</kbd> <kbd>K</kbd> to open</span></div>
        </motion.div>
      </>}
    </AnimatePresence>
  );
}
