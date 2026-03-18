import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import "../styles/ForgotPassword.css";

const API = "http://localhost:5000/api";

function ResetPassword() {
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    // Pre-fill from ForgotPassword navigation state if available
    const prefill = location.state || {};
    const [form, setForm] = useState({
        email: prefill.email || "",
        otp: prefill.resetCode || "",
        new_password: "",
        confirm_password: "",
    });
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.new_password !== form.confirm_password) {
            toast("Passwords do not match.", "error");
            return;
        }
        if (form.new_password.length < 6) {
            toast("Password must be at least 6 characters.", "error");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email.trim().toLowerCase(),
                    otp: form.otp.trim(),
                    new_password: form.new_password,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast(data.error || "Reset failed.", "error");
                return;
            }
            toast("Password reset successfully! Please sign in.", "success");
            navigate("/login");
        } catch {
            toast("Cannot reach server. Is the backend running?", "error");
        } finally {
            setLoading(false);
        }
    };

    // Strength meter
    const strength = (() => {
        const p = form.new_password;
        if (!p) return 0;
        let s = 0;
        if (p.length >= 6)  s++;
        if (p.length >= 10) s++;
        if (/[A-Z]/.test(p)) s++;
        if (/[0-9]/.test(p)) s++;
        if (/[^A-Za-z0-9]/.test(p)) s++;
        return s;
    })();
    const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Excellent"][strength];
    const strengthClass = ["", "strength-weak", "strength-fair", "strength-good", "strength-strong", "strength-excellent"][strength];

    return (
        <div className="auth-page">
            <div className="auth-card fade-in-up">
                <div className="auth-logo">
                    <span className="logo-icon">🔐</span>
                    <h1>Set New Password</h1>
                    <p>Enter your reset code and choose a new password</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit} id="reset-password-form">
                    <div className="form-group">
                        <label htmlFor="rp-email">Email Address</label>
                        <input
                            id="rp-email"
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="rp-otp">Reset Code</label>
                        <input
                            id="rp-otp"
                            type="text"
                            name="otp"
                            placeholder="6-digit code"
                            value={form.otp}
                            onChange={handleChange}
                            maxLength={6}
                            inputMode="numeric"
                            className="fp-otp-input"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="rp-new-password">New Password</label>
                        <div className="fp-password-wrap">
                            <input
                                id="rp-new-password"
                                type={showPass ? "text" : "password"}
                                name="new_password"
                                placeholder="At least 6 characters"
                                value={form.new_password}
                                onChange={handleChange}
                                required
                            />
                            <button
                                type="button"
                                className="fp-eye-btn"
                                onClick={() => setShowPass(!showPass)}
                                id="rp-toggle-pass"
                                tabIndex={-1}
                            >
                                {showPass ? "🙈" : "👁️"}
                            </button>
                        </div>
                        {form.new_password && (
                            <div className="fp-strength-row">
                                <div className="fp-strength-bar">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className={`fp-strength-seg ${i <= strength ? strengthClass : ""}`}
                                        />
                                    ))}
                                </div>
                                <span className={`fp-strength-label ${strengthClass}`}>{strengthLabel}</span>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="rp-confirm-password">Confirm New Password</label>
                        <input
                            id="rp-confirm-password"
                            type={showPass ? "text" : "password"}
                            name="confirm_password"
                            placeholder="Repeat your password"
                            value={form.confirm_password}
                            onChange={handleChange}
                            className={
                                form.confirm_password
                                    ? form.confirm_password === form.new_password
                                        ? "is-valid"
                                        : "is-invalid"
                                    : ""
                            }
                            required
                        />
                        {form.confirm_password && form.confirm_password !== form.new_password && (
                            <span className="field-hint">Passwords do not match</span>
                        )}
                    </div>

                    <button className="btn-primary" type="submit" id="rp-submit-btn" disabled={loading}>
                        {loading ? "Resetting…" : "Reset Password →"}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Remembered your password? <Link to="/login">Sign In</Link></p>
                    <p className="login-alt-link">Need a new code? <Link to="/forgot-password">Request Again</Link></p>
                </div>
            </div>

            <div className="auth-decoration">
                <div className="auth-orb auth-orb-1"></div>
                <div className="auth-orb auth-orb-2"></div>
            </div>
        </div>
    );
}

export default ResetPassword;
