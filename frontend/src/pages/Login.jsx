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
            <div className="auth-card fade-in-up">
                <div className="auth-logo">
                    <span className="logo-icon">📖</span>
                    <h1>Bibliotheca</h1>
                    <p>Welcome back — sign in to continue</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit} id="login-form">
                    <div className="form-group">
                        <label htmlFor="login-email">Email Address</label>
                        <input id="login-email" type="email" name="email"
                            placeholder="you@example.com"
                            value={form.email} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <div className="fp-label-row">
                            <label htmlFor="login-password">Password</label>
                            <Link to="/forgot-password" className="fp-inline-link" id="login-forgot-link">Forgot password?</Link>
                        </div>
                        <input id="login-password" type="password" name="password"
                            placeholder="Enter your password"
                            value={form.password} onChange={handleChange} required />
                    </div>

                    <button className="btn-primary" type="submit" id="login-btn" disabled={loading}>
                        {loading ? "Signing in…" : "Sign In →"}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Don't have an account? <Link to="/register">Register</Link></p>
                    <p className="login-alt-link">
                        Are you a librarian? <Link to="/librarian/login">Librarian Login</Link>
                    </p>
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