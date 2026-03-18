import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import "../styles/Login.css";

const API = "http://localhost:5000/api";

function Login() {
    const toast = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                toast(data.error || "Login failed", "error");
                setLoading(false);
                return;
            }
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            toast(`Welcome back, ${data.user.name.split(" ")[0]}!`, "success");
            navigate("/dashboard");
        } catch {
            toast("Cannot reach server. Is the backend running?", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* ── Auth Navbar ── */}
            <nav className="auth-navbar">
                <Link to="/" className="auth-nav-brand">
                    <span className="auth-nav-logo">📖</span>
                    <span className="auth-nav-title">Bibliotheca</span>
                </Link>
                <div className="auth-nav-links">
                    <Link to="/" className="auth-nav-back" id="login-back-home">
                        ← Back to Home
                    </Link>
                    <Link to="/register" className="auth-nav-pill" id="login-goto-register">
                        Create Account
                    </Link>
                </div>
            </nav>

            <div className="auth-body">
                <div className="auth-card clay-card fade-in-up">
                    {/* Decorative clay blobs */}
                    <div className="clay-blob clay-blob-1"></div>
                    <div className="clay-blob clay-blob-2"></div>

                    <div className="auth-logo">
                        <span className="logo-icon">📖</span>
                        <h1>Welcome Back</h1>
                        <p>Sign in to your Bibliotheca account</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit} id="login-form">
                        <div className="form-group">
                            <label htmlFor="login-email">Email Address</label>
                            <div className="input-clay-wrap">
                                <span className="input-icon">✉️</span>
                                <input id="login-email" type="email" name="email"
                                    placeholder="you@example.com"
                                    value={form.email} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <div className="fp-label-row">
                                <label htmlFor="login-password">Password</label>
                                <Link to="/forgot-password" className="fp-inline-link" id="login-forgot-link">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="input-clay-wrap">
                                <span className="input-icon">🔑</span>
                                <input id="login-password" type="password" name="password"
                                    placeholder="Enter your password"
                                    value={form.password} onChange={handleChange} required />
                            </div>
                        </div>

                        <button className="btn-primary clay-btn" type="submit" id="login-btn" disabled={loading}>
                            {loading ? <><span className="btn-spinner"></span> Signing in…</> : "Sign In →"}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>Don't have an account? <Link to="/register">Register Free</Link></p>
                        <p className="login-alt-link">
                            Are you a librarian? <Link to="/librarian/login">Librarian Portal</Link>
                        </p>
                    </div>
                </div>

                {/* Side visual panel */}
                <div className="auth-visual">
                    <div className="auth-visual-blob av1"></div>
                    <div className="auth-visual-blob av2"></div>
                    <div className="auth-visual-blob av3"></div>
                    <div className="auth-visual-content">
                        <div className="auth-visual-icon">📚</div>
                        <h2>Your Library, <span>Reimagined</span></h2>
                        <p>Access thousands of books, track your reading, and manage your account effortlessly.</p>
                        <div className="auth-visual-stats">
                            <div className="av-stat"><strong>∞</strong><span>Books</span></div>
                            <div className="av-stat"><strong>2</strong><span>User Roles</span></div>
                            <div className="av-stat"><strong>100%</strong><span>Uptime</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="auth-decoration">
                <div className="auth-orb auth-orb-1"></div>
                <div className="auth-orb auth-orb-2"></div>
            </div>
        </div>
    );
}

export default Login;