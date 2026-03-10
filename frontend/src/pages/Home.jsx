import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/Home.css";

/* Counter hook */
function useCounter(target, duration = 1500) {
    const [count, setCount] = React.useState(0);
    React.useEffect(() => {
        if (!target || isNaN(target)) return;
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(start));
        }, 16);
        return () => clearInterval(timer);
    }, [target, duration]);
    return count;
}

const FEATURES = [
    { icon: "🔍", color: "#7c3aed", title: "Smart Search", desc: "Find any book instantly by title, author, publisher or ISBN with live search." },
    { icon: "📥", color: "#059669", title: "Easy Borrowing", desc: "Borrow up to 5 books and return them with a single click — no paperwork." },
    { icon: "📊", color: "#d97706", title: "Record Tracking", desc: "Librarians maintain accurate inventory records with full audit timestamps." },
    { icon: "👥", color: "#2563eb", title: "User Management", desc: "Role-based accounts for students and faculty with tailored dashboards." },
    { icon: "🔒", color: "#dc2626", title: "JWT Security", desc: "Industry-standard token authentication keeps your data private and safe." },
    { icon: "📱", color: "#7c3aed", title: "Fully Responsive", desc: "Seamless experience on any screen — desktop, tablet, and mobile." },
];

function Home() {
    const [visible, setVisible] = React.useState(false);
    React.useEffect(() => {
        const t = setTimeout(() => setVisible(true), 100);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="page-wrapper">
            <Navbar />

            {/* ── Hero ── */}
            <section className={`hero ${visible ? "hero-visible" : ""}`}>
                <div className="hero-particle p1"></div>
                <div className="hero-particle p2"></div>
                <div className="hero-particle p3"></div>
                <div className="hero-orb hero-orb-1"></div>
                <div className="hero-orb hero-orb-2"></div>

                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="hero-badge-dot"></span>
                        📖 Bibliotheca — Smart Library System
                    </div>
                    <h1 className="hero-title">
                        The <span className="hero-gradient">Smartest Way</span><br />
                        to Manage a Library
                    </h1>
                    <p className="hero-subtitle">
                        Streamline book management, borrowing, and records with our modern
                        library platform — built for students, faculty, and librarians.
                    </p>
                    <div className="hero-actions">
                        <Link to="/register" className="btn btn-violet btn-lg" id="hero-register-btn">
                            Get Started Free →
                        </Link>
                        <Link to="/login" className="btn btn-outline btn-lg" id="hero-login-btn">
                            Sign In
                        </Link>
                    </div>
                    <div className="hero-extra">
                        <Link to="/librarian/login" className="librarian-link">
                            🔐 Librarian Portal →
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Stats strip ── */}
            <section className="stats-strip">
                {[
                    { num: "∞", label: "Books Available", isStr: true },
                    { num: 2, label: "User Roles", isStr: false },
                    { num: 5, label: "Max Borrow Limit", isStr: false },
                    { num: 100, label: "Uptime %", isStr: false, suffix: "%" },
                ].map((s, i) => (
                    <StripStat key={i} {...s} />
                ))}
            </section>

            {/* ── Features ── */}
            <section className="features-section">
                <div className="features-badge">FEATURES</div>
                <h2 className="features-heading">Everything you need to<br /><span className="hero-gradient">run your library flawlessly</span></h2>
                <div className="features-grid">
                    {FEATURES.map((f, i) => (
                        <div className="feature-card" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                            <div className="feature-icon-wrap" style={{ background: f.color + "22", border: `1px solid ${f.color}44` }}>
                                <span>{f.icon}</span>
                            </div>
                            <h3 className="feature-title">{f.title}</h3>
                            <p className="feature-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="cta-section">
                <div className="cta-card">
                    <div className="cta-orb"></div>
                    <h2>Ready to get started?</h2>
                    <p>Join your library's digital ecosystem today — free for all students and faculty.</p>
                    <div className="hero-actions">
                        <Link to="/register" className="btn btn-violet btn-lg" id="cta-register-btn">Create Account →</Link>
                        <Link to="/librarian/login" className="btn btn-outline btn-lg" id="cta-lib-btn">Librarian Login</Link>
                    </div>
                </div>
            </section>

            <footer className="home-footer">
                <p>© 2025 <strong style={{ color: "#a78bfa" }}>Bibliotheca</strong> — Built with Flask, MySQL &amp; React</p>
            </footer>
        </div>
    );
}

function StripStat({ num, label, isStr, suffix = "" }) {
    const count = isStr ? num : useCounter(num); // eslint-disable-line react-hooks/rules-of-hooks
    return (
        <div className="strip-stat">
            <span className="strip-num">{isStr ? num : `${count}${suffix}`}</span>
            <span className="strip-label">{label}</span>
        </div>
    );
}

export default Home;
