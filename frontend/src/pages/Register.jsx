import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import "../styles/Register.css";

const API = "http://localhost:5000/api";

function Register() {
    const toast = useToast();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: "", email: "", address: "", role: "student", password: "", confirm_password: ""
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm_password) {
            toast("Passwords do not match", "error"); return;
        }
        if (form.password.length < 6) {
            toast("Password must be at least 6 characters", "error"); return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name, email: form.email,
                    address: form.address, role: form.role, password: form.password
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast(data.error || "Registration failed", "error");
                setLoading(false);
                return;
            }
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            toast("Account created! Welcome to Bibliotheca.", "success");
            navigate("/dashboard");
        } catch {
            toast("Cannot reach server. Is the backend running?", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page register-page">
            {/* ── Auth Navbar ── */}
            <nav className="auth-navbar">
                <Link to="/" className="auth-nav-brand">
                    <span className="auth-nav-logo">📖</span>
                    <span className="auth-nav-title">Bibliotheca</span>
                </Link>
                <div className="auth-nav-links">
                    <Link to="/" className="auth-nav-back" id="register-back-home">
                        ← Back to Home
                    </Link>
                    <Link to="/login" className="auth-nav-pill" id="register-goto-login">
                        Sign In
                    </Link>
                </div>
            </nav>

            <div className="auth-body register-body">
                <div className="auth-card clay-card fade-in-up" style={{ maxWidth: 520 }}>
                    <div className="clay-blob clay-blob-1"></div>
                    <div className="clay-blob clay-blob-2"></div>

                    <div className="auth-logo">
                        <span className="logo-icon">🎓</span>
                        <h1>Join Bibliotheca</h1>
                        <p>Create your student or faculty account</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit} id="register-form">
                        <div className="form-row-2">
                            <div className="form-group">
                                <label htmlFor="reg-name">Full Name</label>
                                <div className="input-clay-wrap">
                                    <span className="input-icon">👤</span>
                                    <input id="reg-name" type="text" name="name" placeholder="John Doe"
                                        value={form.name} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="reg-email">Email Address</label>
                                <div className="input-clay-wrap">
                                    <span className="input-icon">✉️</span>
                                    <input id="reg-email" type="email" name="email" placeholder="you@example.com"
                                        value={form.email} onChange={handleChange} required />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="reg-address">Address (Optional)</label>
                            <div className="input-clay-wrap">
                                <span className="input-icon">📍</span>
                                <input id="reg-address" type="text" name="address" placeholder="Your residential address"
                                    value={form.address} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="reg-role">Account Role</label>
                            <div className="role-picker">
                                <label className={`role-option ${form.role === "student" ? "selected" : ""}`}>
                                    <input type="radio" name="role" value="student"
                                        checked={form.role === "student"}
                                        onChange={handleChange} />
                                    <span className="role-icon">📚</span>
                                    <span className="role-label">Student</span>
                                </label>
                                <label className={`role-option ${form.role === "faculty" ? "selected" : ""}`}>
                                    <input type="radio" name="role" value="faculty"
                                        checked={form.role === "faculty"}
                                        onChange={handleChange} />
                                    <span className="role-icon">🎓</span>
                                    <span className="role-label">Faculty</span>
                                </label>
                            </div>
                            <span className="register-role-hint">This determines your borrowing privileges</span>
                        </div>

                        <div className="form-row-2">
                            <div className="form-group">
                                <label htmlFor="reg-password">Password</label>
                                <div className="input-clay-wrap">
                                    <span className="input-icon">🔒</span>
                                    <input id="reg-password" type="password" name="password" placeholder="Min. 6 chars"
                                        value={form.password} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="reg-confirm">Confirm</label>
                                <div className="input-clay-wrap">
                                    <span className="input-icon">✅</span>
                                    <input id="reg-confirm" type="password" name="confirm_password" placeholder="Repeat"
                                        value={form.confirm_password} onChange={handleChange} required />
                                </div>
                            </div>
                        </div>

                        <button className="btn-primary clay-btn" type="submit" id="register-btn" disabled={loading}>
                            {loading ? <><span className="btn-spinner"></span> Creating Account…</> : "Create Account →"}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>Already have an account? <Link to="/login">Sign In</Link></p>
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

export default Register;