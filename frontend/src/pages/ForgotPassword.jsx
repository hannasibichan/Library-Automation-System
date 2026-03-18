import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../components/Toast";
import "../styles/ForgotPassword.css";

const API = "http://localhost:5000/api";

function ForgotPassword() {
    const toast = useToast();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [resetCode, setResetCode] = useState(null);
    const [accountType, setAccountType] = useState(null);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast(data.error || "Something went wrong.", "error");
                return;
            }
            setSubmitted(true);
            // If the email existed, reset_code is returned (dev/demo mode)
            if (data.reset_code) {
                setResetCode(data.reset_code);
                setAccountType(data.account_type);
            }
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
                    <span className="logo-icon">🔑</span>
                    <h1>Bibliotheca</h1>
                    <p>Reset your password</p>
                </div>

                {!submitted ? (
                    <form className="auth-form" onSubmit={handleSubmit} id="forgot-password-form">
                        <div className="fp-info-box">
                            <span className="fp-info-icon">ℹ️</span>
                            <p>Enter your registered email address and we'll send you a reset code.</p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="fp-email">Email Address</label>
                            <input
                                id="fp-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <button className="btn-primary" type="submit" id="fp-submit-btn" disabled={loading}>
                            {loading ? "Sending…" : "Send Reset Code →"}
                        </button>
                    </form>
                ) : (
                    <div className="fp-success-panel fade-in-up" id="fp-success-panel">
                        <div className="fp-success-icon">✅</div>
                        <h2>Reset Code Ready!</h2>
                        <p className="fp-success-sub">
                            {resetCode
                                ? "Your reset code has been generated. In production, this would be emailed to you."
                                : "If that email is registered, a reset code has been sent."}
                        </p>

                        {resetCode && (
                            <div className="fp-code-box">
                                <span className="fp-code-label">Your Reset Code</span>
                                <div className="fp-code-digits" id="fp-reset-code">{resetCode}</div>
                                <span className="fp-code-expires">⏱ Expires in 15 minutes</span>
                                {accountType && (
                                    <span className="fp-account-badge">
                                        {accountType === "librarian" ? "🏛️ Librarian Account" : "🎓 Student/Faculty Account"}
                                    </span>
                                )}
                            </div>
                        )}

                        <Link
                            to="/reset-password"
                            state={{ email, resetCode, accountType }}
                            className="btn-primary fp-continue-btn"
                            id="fp-continue-btn"
                        >
                            Continue to Reset Password →
                        </Link>
                    </div>
                )}

                <div className="auth-footer">
                    <p>Remember your password? <Link to="/login">Sign In</Link></p>
                    {!submitted && (
                        <p className="login-alt-link">
                            Are you a librarian? <Link to="/librarian/login">Librarian Login</Link>
                        </p>
                    )}
                </div>
            </div>

            <div className="auth-decoration">
                <div className="auth-orb auth-orb-1"></div>
                <div className="auth-orb auth-orb-2"></div>
            </div>
        </div>
    );
}

export default ForgotPassword;
