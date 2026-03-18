import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import "../styles/Login.css";
import "../styles/LibrarianLogin.css";

const API = "http://localhost:5000/api";

function LibrarianLogin() {
    const toast = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/librarian/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                toast(data.error || "Librarian login failed", "error");
                setLoading(false);
                return;
            }
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            toast(`Librarian Session Started: ${data.user.name}`, "success");
            navigate("/librarian/dashboard");
        } catch {
            toast("Cannot reach server. Is the backend running?", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page librarian-page">
            {/* ── Auth Navbar ── */}
            <nav className="auth-navbar auth-navbar-admin">
                <Link to="/" className="auth-nav-brand">
                    <span className="auth-nav-logo">🏛️</span>
                    <span className="auth-nav-title">Bibliotheca Admin</span>
                </Link>
                <div className="auth-nav-links">
                    <Link to="/" className="auth-nav-back" id="lib-back-home">
                        ← Back to Home
                    </Link>
                    <Link to="/login" className="auth-nav-pill auth-nav-pill-green" id="lib-goto-user-login">
                        User Login
                    </Link>
                </div>
            </nav>

            <div className="auth-body">
                <div className="auth-card clay-card clay-card-admin fade-in-up">
                    <div className="clay-blob clay-blob-admin-1"></div>
                    <div className="clay-blob clay-blob-admin-2"></div>

                    <div className="auth-logo">
                        <span className="logo-icon admin-icon">🏛️</span>
                        <h1>Admin Portal</h1>
                        <p>Staff portal for library management</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit} id="librarian-login-form">
                        <div className="librarian-badge">🔐 STAFF IDENTITY VERIFICATION</div>

                        <div className="form-group">
                            <label htmlFor="lib-email">Librarian Email</label>
                            <div className="input-clay-wrap input-clay-admin">
                                <span className="input-icon">🏛️</span>
                                <input id="lib-email" type="email" name="email"
                                    placeholder="admin@library.com"
                                    value={form.email} onChange={handleChange} required />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="lib-password">Password</label>
                            <div className="input-clay-wrap input-clay-admin">
                                <span className="input-icon">🔐</span>
                                <input id="lib-password" type="password" name="password"
                                    placeholder="Enter administrative password"
                                    value={form.password} onChange={handleChange} required />
                            </div>
                        </div>

                        <button className="btn-primary clay-btn clay-btn-admin" type="submit" id="lib-login-btn" disabled={loading}>
                            {loading ? <><span className="btn-spinner"></span> Authenticating…</> : "Sign In to Admin Portal →"}
                        </button>

                        <div className="default-creds">
                            <span>🔑 Default Credentials</span><br />
                            <code>admin@library.com</code> / <code>admin123</code>
                        </div>
                    </form>

                    <div className="auth-footer">
                        <p>Are you a student/faculty? <Link to="/login">User Login</Link></p>
                    </div>
                </div>

                {/* Side admin visual */}
                <div className="auth-visual admin-visual">
                    <div className="auth-visual-blob av1 av-admin1"></div>
                    <div className="auth-visual-blob av2 av-admin2"></div>
                    <div className="auth-visual-content">
                        <div className="auth-visual-icon">⚙️</div>
                        <h2>Library <span>Control Centre</span></h2>
                        <p>Manage books, users, borrowing records and library operations from one powerful dashboard.</p>
                        <div className="auth-visual-features">
                            <div className="av-feature">📖 Book Management</div>
                            <div className="av-feature">👥 User Control</div>
                            <div className="av-feature">📊 Records & Analytics</div>
                            <div className="av-feature">➕ Add Librarians</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="auth-decoration">
                <div className="auth-orb auth-orb-3"></div>
            </div>
        </div>
    );
}

export default LibrarianLogin;
