import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
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
            <div className="auth-card fade-in-up">
                <div className="auth-logo">
                    <span className="logo-icon">🏛️</span>
                    <h1>Bibliotheca Admin</h1>
                    <p>Staff portal for library management</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit} id="librarian-login-form">
                    <div className="librarian-badge">🔐 STAFF IDENTITY VERIFICATION</div>

                    <div className="form-group">
                        <label htmlFor="lib-email">Librarian Email</label>
                        <input id="lib-email" type="email" name="email"
                            placeholder="admin@library.com"
                            value={form.email} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="lib-password">Password</label>
                        <input id="lib-password" type="password" name="password"
                            placeholder="Enter administrative password"
                            value={form.password} onChange={handleChange} required />
                    </div>

                    <button className="btn-primary" type="submit" id="lib-login-btn" disabled={loading}>
                        {loading ? "Authenticating…" : "Sign In to Admin Portal →"}
                    </button>

                    <div className="default-creds">
                        <span style={{ color: "rgba(167,139,250,0.6)", fontSize: "0.75rem" }}>CREDENTIALS:</span><br />
                        <code>admin@library.com</code> / <code>admin123</code>
                    </div>
                </form>

                <div className="auth-footer">
                    <p>Are you a user? <Link to="/login">Student/Faculty Login</Link></p>
                </div>
            </div>

            <div className="auth-decoration">
                <div className="auth-orb auth-orb-3"></div>
            </div>
        </div>
    );
}

export default LibrarianLogin;
