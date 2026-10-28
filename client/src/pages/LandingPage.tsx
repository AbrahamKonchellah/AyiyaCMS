import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Kenya-Ready", href: "#kenya" },
  { label: "How It Works", href: "#how" },
];

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
      </svg>
    ),
    title: "Client & Matter Management",
    desc: "Centralise every client profile, KYC document, and case file. Track matter status, team assignments, and court dates in one place.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    title: "Document Management",
    desc: "Upload, version, and search documents by content — not just filename. Share files with clients via secure, expiring links.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: "Time Tracking & Billing",
    desc: "Log billable hours with a built-in stopwatch. Generate LSK-compliant fee notes and invoices automatically — no manual formatting.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
    title: "Deadline Calendar",
    desc: "All court dates and filing deadlines on one visual calendar. Colour-coded alerts and automatic SMS reminders before every hearing.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
    title: "Client Portal",
    desc: "Clients log in to track their own cases, view shared documents, and receive hearing reminders — without calling your office.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "Audit & Compliance",
    desc: "Immutable audit trail on every action. Satisfies Kenya Data Protection Act and Computer Misuse Act requirements out of the box.",
  },
];

const STATS = [
  { value: "8", unit: "phases", label: "of structured build" },
  { value: "6", unit: "roles", label: "partner to client" },
  { value: "PDF/A", unit: "export", label: "JICMS e-filing ready" },
  { value: "M-Pesa", unit: "built-in", label: "no third-party gateway" },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", color: "#1C1C1C", background: "#FFFFFF" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,700;0,800;1,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .hero-fade {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .hero-fade.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .hero-fade.delay-1 { transition-delay: 0.1s; }
        .hero-fade.delay-2 { transition-delay: 0.22s; }
        .hero-fade.delay-3 { transition-delay: 0.36s; }

        .stamp {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1.5px solid #D4A853;
          color: #D4A853;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border-radius: 2px;
        }
        .stamp-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #D4A853;
          flex-shrink: 0;
        }

        .nav-link {
          color: rgba(255,255,255,0.75);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: color 0.2s;
        }
        .nav-link:hover { color: #fff; }

        .feature-card {
          background: #fff;
          border: 1px solid #E8E4DC;
          border-radius: 6px;
          padding: 28px 24px;
          transition: box-shadow 0.2s, border-color 0.2s;
        }
        .feature-card:hover {
          box-shadow: 0 4px 20px rgba(11,43,38,0.08);
          border-color: #C5BFB5;
        }

        .cta-btn {
          display: inline-block;
          background: #D4A853;
          color: #0B2B26;
          font-weight: 600;
          font-size: 15px;
          padding: 13px 28px;
          border-radius: 4px;
          text-decoration: none;
          letter-spacing: 0.01em;
          transition: background 0.2s, transform 0.15s;
        }
        .cta-btn:hover { background: #C49840; transform: translateY(-1px); }

        .cta-btn-ghost {
          display: inline-block;
          background: transparent;
          color: #fff;
          font-weight: 500;
          font-size: 14px;
          padding: 11px 24px;
          border-radius: 4px;
          text-decoration: none;
          border: 1.5px solid rgba(255,255,255,0.35);
          transition: border-color 0.2s, background 0.2s;
        }
        .cta-btn-ghost:hover { border-color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.06); }

        .stat-card {
          text-align: center;
          padding: 0 16px;
        }

        .kenya-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(212,168,83,0.12);
          border: 1px solid rgba(212,168,83,0.3);
          color: #D4A853;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .step-num {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: #0B2B26;
          color: #D4A853;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }

        .divider {
          width: 48px;
          height: 2px;
          background: #D4A853;
          margin: 0 auto 32px;
        }

        @media (max-width: 768px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; gap: 24px !important; }
          .how-steps { flex-direction: column !important; }
          .hero-btns { flex-direction: column !important; align-items: flex-start !important; }
          .desktop-nav { display: none !important; }
          .hero-stamps { flex-direction: column; align-items: flex-start !important; }
        }
        @media (min-width: 769px) {
          .mobile-nav { display: none !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-fade { transition: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(11,43,38,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(8px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "none",
        transition: "background 0.3s, border-color 0.3s",
        padding: "0 24px",
      }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "#D4A853", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B2B26" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 5.49Z" />
              </svg>
            </div>
            <span style={{ color: "#fff", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>
              AyiyaCMS
            </span>
          </div>

          <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {NAV_LINKS.map(l => <a key={l.href} href={l.href} className="nav-link">{l.label}</a>)}
            <a href="/login" className="cta-btn" style={{ padding: "9px 20px", fontSize: 13 }}>Sign In</a>
          </div>

          <button
            className="mobile-nav"
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 4 }}
            aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="mobile-nav" style={{ background: "#0B2B26", borderTop: "1px solid rgba(255,255,255,0.1)", padding: "16px 24px 20px" }}>
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className="nav-link" onClick={() => setMenuOpen(false)}
                style={{ display: "block", padding: "10px 0", fontSize: 15, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {l.label}
              </a>
            ))}
            <a href="/login" className="cta-btn" style={{ display: "block", textAlign: "center", marginTop: 16 }}>Sign In</a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{
        background: "linear-gradient(160deg, #0B2B26 0%, #0f3830 60%, #0B2B26 100%)",
        minHeight: "100vh",
        display: "flex", alignItems: "center",
        padding: "120px 24px 80px",
      }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", width: "100%" }}>
          <div className={`hero-fade ${heroVisible ? "visible" : ""}`}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }} className="hero-stamps">
              <span className="stamp"><span className="stamp-dot" />JICMS e-filing compatible</span>
              <span className="stamp"><span className="stamp-dot" />M-Pesa built in</span>
              <span className="stamp"><span className="stamp-dot" />LSK Remuneration Order</span>
            </div>
          </div>

          <h1 className={`hero-fade delay-1 ${heroVisible ? "visible" : ""}`}
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(36px, 6vw, 72px)",
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.1,
              maxWidth: 760,
              marginBottom: 24,
            }}>
            Built for the way<br />
            <em style={{ fontStyle: "italic", color: "#D4A853" }}>Kenyan law</em> actually works.
          </h1>

          <p className={`hero-fade delay-2 ${heroVisible ? "visible" : ""}`}
            style={{ color: "rgba(255,255,255,0.7)", fontSize: "clamp(15px, 2vw, 18px)", maxWidth: 520, lineHeight: 1.7, marginBottom: 40 }}>
            AyiyaCMS gives small and medium law firms a single system for clients, cases, documents, deadlines, and billing — with M-Pesa payments and JICMS e-filing built in from day one.
          </p>

          <div
              className={`hero-fade delay-3 ${heroVisible ? "visible" : ""} hero-btns`}
              style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <a href="/login" className="cta-btn">Get started →</a>
            <a href="#features" className="cta-btn-ghost">See features</a>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── */}
      <div style={{ background: "#F7F4EE", borderTop: "1px solid #E8E4DC", borderBottom: "1px solid #E8E4DC", padding: "36px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {STATS.map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, justifyContent: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: "#0B2B26" }}>{s.value}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#1A5C52", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.unit}</span>
                </div>
                <div style={{ fontSize: 13, color: "#666", letterSpacing: "0.02em" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" style={{ background: "#F7F4EE", padding: "88px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span className="kenya-pill" style={{ marginBottom: 16, display: "inline-flex" }}>Everything your firm needs</span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, color: "#0B2B26", marginTop: 12 }}>
              One system. Every workflow.
            </h2>
            <div className="divider" style={{ marginTop: 20 }} />
          </div>

          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ color: "#1A5C52", marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0B2B26", marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#555", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KENYA-SPECIFIC ── */}
      <section id="kenya" style={{ background: "#0B2B26", padding: "88px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 64, alignItems: "center" }}>
          <div style={{ flex: "1 1 300px" }}>
            <span className="kenya-pill" style={{ marginBottom: 20, display: "inline-flex" }}>🇰🇪 Kenya-ready</span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 700, color: "#fff", lineHeight: 1.2, marginBottom: 20 }}>
              Not adapted for Kenya.<br /><em style={{ color: "#D4A853", fontStyle: "italic" }}>Designed for Kenya.</em>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, lineHeight: 1.75, maxWidth: 420 }}>
              International practice management tools treat Kenya as an afterthought. AyiyaCMS was built from the ground up around JICMS e-filing, M-Pesa payments, and the LSK Advocates Remuneration Order.
            </p>
          </div>

          <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              {
                title: "JICMS e-filing",
                body: "Export any document as a PDF/A-1b file stamped with the JICMS case number and court station — ready to upload to the e-filing portal without any manual reformatting.",
              },
              {
                title: "M-Pesa STK Push",
                body: "Clients pay invoices directly from the client portal. A payment prompt appears on their phone. No third-party payment link, no bank transfer, no cheque.",
              },
              {
                title: "LSK-compliant fee notes",
                body: "Generate fee notes that follow the structure prescribed by the LSK Advocates (Remuneration) Order — itemised, dated, and ready to send without editing.",
              },
              {
                title: "Data Protection Act compliance",
                body: "Encrypted storage, immutable audit trail, role-level data isolation, and MFA for all senior roles — meeting the requirements of the Kenya Data Protection Act.",
              },
            ].map(item => (
              <div key={item.title} style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6, padding: "18px 20px",
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4A853", marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.65 }}>{item.body}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ background: "#fff", padding: "88px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 700, color: "#0B2B26" }}>
              How it works
            </h2>
            <div className="divider" style={{ marginTop: 20 }} />
          </div>

          <div className="how-steps" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { n: "1", title: "Onboard your firm", body: "An admin invites staff by email. Each person gets a role — Partner, Associate, Paralegal, or Client — and sees only what's relevant to them." },
              { n: "2", title: "Create clients and matters", body: "Add a client profile with KYC documents, then open a matter linked to them. Set the JICMS case number and court station if it's a litigated matter." },
              { n: "3", title: "Work the case", body: "Upload documents, log time with the built-in stopwatch, schedule hearings, write internal notes, and collaborate with your team — all inside the matter." },
              { n: "4", title: "Bill and collect", body: "Generate an LSK-compliant fee note, turn it into an invoice, and send it. The client pays via M-Pesa from their portal. The system marks it paid automatically." },
            ].map((step, i, arr) => (
              <div key={step.n} style={{ display: "flex", gap: 20, position: "relative" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div className="step-num">{step.n}</div>
                  {i < arr.length - 1 && (
                    <div style={{ width: 1, flex: 1, background: "#E8E4DC", margin: "8px 0" }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < arr.length - 1 ? 40 : 0, paddingTop: 4 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0B2B26", marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, maxWidth: 560 }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ background: "linear-gradient(135deg, #0B2B26, #1A5C52)", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 580, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 700, color: "#fff", marginBottom: 16 }}>
            Ready to run a better practice?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 15, marginBottom: 36, lineHeight: 1.7 }}>
            AyiyaCMS gives your firm a professional system built for Kenyan legal practice — from day one case intake to final M-Pesa payment.
          </p>
          <a href="/login" className="cta-btn" style={{ fontSize: 16, padding: "15px 36px" }}>
            Sign in to your firm →
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#071F1B", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: "#D4A853", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B2B26" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 5.49Z" />
              </svg>
            </div>
            <span style={{ color: "rgba(255,255,255,0.8)", fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16 }}>AyiyaCMS</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
            Law Practice Management · Built for Kenyan firms
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy", "Terms", "Contact"].map(l => (
              <a key={l} href="#" style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
