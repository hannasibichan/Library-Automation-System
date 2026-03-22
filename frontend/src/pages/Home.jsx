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
    { icon: "📥", color: "#059669", title: "Easy Requesting", desc: "Place borrow requests for up to 5 books directly from your dashboard." },
    { icon: "📊", color: "#d97706", title: "Record Tracking", desc: "Librarians maintain accurate inventory records with full audit timestamps." },
    { icon: "👥", color: "#2563eb", title: "User Management", desc: "Role-based accounts for students and faculty with tailored dashboards." },
    { icon: "🔒", color: "#dc2626", title: "JWT Security", desc: "Industry-standard token authentication keeps your data private and safe." },
    { icon: "📱", color: "#7c3aed", title: "Fully Responsive", desc: "Seamless experience on any screen — desktop, tablet, and mobile." },
];

const GUIDELINES = [
    { step: "01", title: "Create Account", desc: "Sign up as a student or faculty. You'll receive all library updates, due date reminders, and alerts on your registered email." },
    { step: "02", title: "Find Your Book", desc: "Use the smart search on your dashboard to filter by title, author, or publisher in real-time." },
    { step: "03", title: "Submit Request", desc: "Click 'Borrow' to hold a book. You'll receive a cancellation email if the request is not collected within 4 hours." },
    { step: "04", title: "Collect & Monitor", desc: "Collect books in-person. Monitor due dates on your dashboard and receive email notifications for upcoming returns." }
];

function Home() {
    const [visible, setVisible] = React.useState(false);
    const userStr = sessionStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const isLib = user?.role === "librarian";

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
                <div className="hero-particle p4"></div>
                <div className="hero-orb hero-orb-1"></div>
                <div className="hero-orb hero-orb-2"></div>

                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="hero-badge-dot"></span>
                        📖 SmartStack — Smart Library System
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
                        {user ? (
                            <Link
                                to={isLib ? "/librarian/dashboard" : "/dashboard"}
                                className="btn btn-violet btn-lg"
                                id="hero-dashboard-btn"
                            >
                                Enter Dashboard →
                            </Link>
                        ) : (
                            <>
                                <Link to="/register" className="btn btn-violet btn-lg" id="hero-register-btn">
                                    Get Started Free →
                                </Link>
                                <Link to="/login" className="btn btn-outline btn-lg" id="hero-login-btn">
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                    {!user && (
                        <div className="hero-extra">
                            <Link to="/librarian/login" className="librarian-link">
                                🔐 Librarian Portal →
                            </Link>
                        </div>
                    )}
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

            {/* ── Guidelines ── */}
            <section className="guidelines-section">
                <div className="section-header">
                    <div className="features-badge">HOW IT WORKS</div>
                    <h2 className="features-heading">Simple steps to <span className="hero-gradient">get reading</span></h2>
                </div>
                <div className="guidelines-steps">
                    {GUIDELINES.map((g, i) => (
                        <div className="step-card" key={i}>
                            <div className="step-number">{g.step}</div>
                            <div className="step-content">
                                <h3 className="step-title">{g.title}</h3>
                                <p className="step-desc">{g.desc}</p>
                            </div>
                            {i < GUIDELINES.length - 1 && <div className="step-connector"></div>}
                        </div>
                    ))}
                </div>

                <div className="notification-info-box">
                    <div className="info-icon">📧</div>
                    <div className="info-text">
                        <p>Important: All library updates, due date reminders, and alerts are sent via:</p>
                        <strong className="info-email">campuseventhub2@gmail.com</strong>
                    </div>
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
                <div className="footer-content">
                    <div className="footer-top">
                        <div className="footer-brand">
                            <strong style={{ color: "#6366f1" }}>SmartStack</strong>
                            <p>Premium Library Automation System</p>
                        </div>
                        <div className="footer-links">
                            <div className="footer-col">
                                <h4>Notifications</h4>
                                <p>All library alerts are sent via:</p>
                                <p><strong>campuseventhub2@gmail.com</strong></p>
                            </div>
                            <div className="footer-col">
                                <h4>Contact</h4>
                                <p>Email: <a href="mailto:campuseventhub2@gmail.com">campuseventhub2@gmail.com</a></p>
                                <p>Phone: +91-XXXX-XXX-XXX</p>
                                <p>Support: <a href="mailto:campuseventhub2@gmail.com">Help Desk</a></p>
                            </div>
                            <div className="footer-col">
                                <h4>Social</h4>
                                <div className="social-links">
                                    <a href="#" aria-label="Instagram">Instagram</a>
                                    <a href="#" aria-label="LinkedIn">LinkedIn</a>
                                    <a href="#" aria-label="Twitter">Twitter</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>© 2026 SmartStack — Built with Flask, MySQL &amp; React</p>
                    </div>
                </div>
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
