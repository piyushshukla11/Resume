"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  MapPin,
  Send,
  Sparkles,
  Terminal,
} from "lucide-react";

export default function ContactPage() {
  const [copied, setCopied] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderMessage, setSenderMessage] = useState("");

  const email = "piyush.shukla.dev@gmail.com";

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderMessage.trim()) return;

    // Trigger mailto with prefilled details
    const subject = encodeURIComponent(`Portfolio Connection from ${senderName || "Visitor"}`);
    const body = encodeURIComponent(
      `Hi Piyush,\n\n${senderMessage}\n\nFrom: ${senderName} (${senderEmail})`
    );
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    setFormSent(true);
  };

  return (
    <div className="contact-page-shell">
      {/* Background Ambience */}
      <div className="contact-ambient-glow" aria-hidden="true" />

      {/* Top Header Navigation */}
      <header className="contact-nav-header">
        <Link href="/" className="contact-back-link" title="Return to sky & portfolio">
          <ArrowLeft size={16} />
          <span>Return to Sky & Work</span>
        </Link>
        <div className="contact-brand">
          <span className="wordmark">ME<span>.</span></span>
          <span className="brand-caption">PIYUSH SHUKLA / CONTACT & ABOUT</span>
        </div>
      </header>

      <main className="contact-main-content">
        {/* Hero & About Description Section */}
        <section className="contact-bio-card">
          <div className="bio-eyebrow">
            <span className="status-light" />
            <span>ABOUT PIYUSH SHUKLA · SYSTEMS & SOFTWARE</span>
          </div>

          <h1 className="bio-heading">
            I make complex<br />systems feel <em>simple.</em>
          </h1>

          <div className="bio-description-body">
            <p>
              I’m <strong>Piyush Shukla</strong> — a robotics and artificial intelligence undergraduate driven by the foundational
              layers underneath the interface. I design execution engines, resilient AI toolchains,
              lunar computer vision systems, and interactive worlds.
            </p>
            <p>
              Whether engineering an AST-level JavaScript execution visualizer, segmenting Chandrayaan-2
              orbital craters with sub-meter precision, or optimizing multimodal voice RAG pipelines,
              my focus remains constant: <strong>fast by default, deterministic under load, and architectural clarity</strong>.
            </p>
          </div>

          {/* Quick Technical Pillars Matrix */}
          <div className="bio-pillars">
            <div className="pillar-item">
              <span className="pillar-label"><Terminal size={13} /> CORE LANGUAGES</span>
              <span className="pillar-value">C · C++ · Python · Java · Kotlin · Android Dev · React · Node.js</span>
            </div>
            <div className="pillar-item">
              <span className="pillar-label"><Code2 size={13} /> FOCUS DOMAINS</span>
              <span className="pillar-value">Systems Architecture · AI/ML Tooling · Computer Vision · Game Engines</span>
            </div>
            <div className="pillar-item">
              <span className="pillar-label"><MapPin size={13} /> LOCATION & STATUS</span>
              <span className="pillar-value">Bengaluru, India · Open for internships & engineering roles</span>
            </div>
          </div>
        </section>

        {/* Complete Contacts & Profiles Matrix */}
        <section className="contact-matrix-grid" aria-labelledby="channels-heading">
          <h2 id="channels-heading" className="sr-only">Contact Channels</h2>

          {/* 1. LinkedIn Card */}
          <div className="channel-card channel-linkedin">
            <div className="channel-card-head">
              <div className="channel-icon-wrap linkedin-icon">
                <Linkedin size={22} />
              </div>
              <span className="channel-tag">PRIMARY NETWORK</span>
            </div>
            <strong className="channel-title">LinkedIn</strong>
            <p className="channel-handle">linkedin.com/in/piyush-shukla-dev</p>
            <p className="channel-copy">
              Professional network for internships, software engineering roles, collaboration, and technical discussions.
            </p>
            <a
              href="https://www.linkedin.com/in/piyush-shukla-dev"
              target="_blank"
              rel="noreferrer"
              className="channel-cta-button"
            >
              <span>Connect on LinkedIn</span>
              <ArrowUpRight size={15} />
            </a>
          </div>

          {/* 2. GitHub Card */}
          <div className="channel-card channel-github">
            <div className="channel-card-head">
              <div className="channel-icon-wrap github-icon">
                <Github size={22} />
              </div>
              <span className="channel-tag">CODE & REPOSITORIES</span>
            </div>
            <strong className="channel-title">GitHub</strong>
            <p className="channel-handle">github.com/piyushshukla11</p>
            <p className="channel-copy">
              Explore 9+ authentic personal & team repositories, systems architectures, compiler pipelines, and commit histories.
            </p>
            <a
              href="https://github.com/piyushshukla11"
              target="_blank"
              rel="noreferrer"
              className="channel-cta-button"
            >
              <span>Explore Repositories</span>
              <ArrowUpRight size={15} />
            </a>
          </div>

          {/* 3. Direct Email Card */}
          <div className="channel-card channel-email">
            <div className="channel-card-head">
              <div className="channel-icon-wrap email-icon">
                <Mail size={22} />
              </div>
              <span className="channel-tag">DIRECT INBOX</span>
            </div>
            <strong className="channel-title">Email Correspondence</strong>
            <p className="channel-handle">{email}</p>
            <p className="channel-copy">
              Direct inbox for technical questions, engineering opportunities, project inquiries, or casual curiosity.
            </p>
            <div className="channel-dual-actions">
              <button
                type="button"
                onClick={handleCopyEmail}
                className="channel-action-btn secondary-btn"
                title="Copy email to clipboard"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? "Copied!" : "Copy Address"}</span>
              </button>
              <a
                href={`mailto:${email}`}
                className="channel-action-btn primary-btn"
              >
                <span>Compose Mail</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>

          {/* 4. Competitive Programming (LeetCode & CodeChef) */}
          <div className="channel-card channel-competitive">
            <div className="channel-card-head">
              <div className="channel-icon-wrap competitive-icon">
                <Sparkles size={22} />
              </div>
              <span className="channel-tag">ALGORITHMS & SPEED</span>
            </div>
            <strong className="channel-title">Competitive Profiles</strong>
            <p className="channel-handle">LeetCode & CodeChef (@piyushshukla11)</p>
            <p className="channel-copy">
              Data structures, dynamic programming, graph theory, and algorithmic speed benchmarks.
            </p>
            <div className="channel-dual-actions">
              <a
                href="https://leetcode.com/u/piyushshukla11/"
                target="_blank"
                rel="noreferrer"
                className="channel-action-btn secondary-btn"
              >
                <span>LeetCode</span>
                <ExternalLink size={13} />
              </a>
              <a
                href="https://www.codechef.com/users/piyushshukla11"
                target="_blank"
                rel="noreferrer"
                className="channel-action-btn secondary-btn"
              >
                <span>CodeChef</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </section>

        {/* Interactive Direct Message Composer */}
        <section className="contact-message-section">
          <div className="message-box-header">
            <div>
              <p className="eyebrow"><Send size={12} /> QUICK DISPATCH</p>
              <h3>Send a Direct Note</h3>
            </div>
            <span className="message-aside">Opens your default email client with your message prepared</span>
          </div>

          {formSent ? (
            <div className="message-success-banner">
              <Check size={20} />
              <div>
                <strong>Draft opened in your email client!</strong>
                <p>Feel free to send it directly or reach out on LinkedIn for fastest response.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-message-form">
              <div className="form-row-dual">
                <label>
                  <span>Your Name</span>
                  <input
                    type="text"
                    placeholder="e.g. Maya Lin"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </label>
                <label>
                  <span>Your Email</span>
                  <input
                    type="email"
                    placeholder="e.g. maya@domain.com"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                  />
                </label>
              </div>
              <label>
                <span>Message</span>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell me about your system, project idea, or opportunity..."
                  value={senderMessage}
                  onChange={(e) => setSenderMessage(e.target.value)}
                />
              </label>
              <button type="submit" className="button button-primary message-submit-btn">
                <span>Send Message Note</span>
                <Send size={14} />
              </button>
            </form>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="contact-page-footer">
        <Link href="/" className="footer-brand">ME<span>.</span></Link>
        <span>PIYUSH SHUKLA · SYSTEMS / GAMES / SOFTWARE</span>
        <div className="footer-links">
          <a href="https://github.com/piyushshukla11" target="_blank" rel="noreferrer">GITHUB</a>
          <a href="https://www.linkedin.com/in/piyush-shukla-dev" target="_blank" rel="noreferrer">LINKEDIN</a>
        </div>
      </footer>
    </div>
  );
}
