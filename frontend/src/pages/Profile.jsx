import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";
import "../styles/Profile.css";

const API = "http://localhost:5000/api";

function Profile() {
    const toast = useToast();
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : {};

    const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
    const [pwLoading, setPwLoading] = useState(false);

    const initials = user?.name
        ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
        : "?";

    const handlePwChange = (e) => setPwForm({ ...pwForm, [e.target.name]: e.target.value });

    const handlePwSubmit = async (e) => {
        e.preventDefault();
        if (pwForm.new_password !== pwForm.confirm_password) {
            toast("New passwords do not match", "error"); return;
        }
        if (pwForm.new_password.length < 6) {
            toast("Password must be at least 6 characters", "error"); return;
        }
        if (pwForm.new_password === pwForm.current_password) {
            toast("New password must differ from current password", "warning"); return;
        }
        setPwLoading(true);
        try {
            const res = await fetch(`${API}/users/me/password`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    current_password: pwForm.current_password,
                    new_password: pwForm.new_password,
                }),
            });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Failed to change password", "error"); return; }
            toast("Password changed successfully!", "success");
            setPwForm({ current_password: "", new_password: "", confirm_password: "" });
        } catch { toast("Server error", "error"); }
        finally { setPwLoading(false); }
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">

                {/* Profile card */}
                <div className="profile-header-card">
                    <div className="profile-avatar-lg">{initials}</div>
                    <div className="profile-info">
                        <h1 className="profile-name">{user.name}</h1>
                        <div className="profile-meta">
                            <span className="role-badge">{user.role === "faculty" ? "🎓" : "📚"} {user.role}</span>
                            <span style={{ color: "rgba(200,190,255,0.55)", fontSize: "0.82rem" }}>{user.email}</span>
                        </div>
                    </div>
                </div>

                <div className="profile-grid">
                    {/* Account details */}
                    <div className="profile-panel">
                        <h2 className="profile-panel-title">👤 Account Details</h2>
                        <div className="profile-detail-list">
                            {[
                                ["Full Name", user.name || "—"],
                                ["Email", user.email || "—"],
                                ["Role", user.role || "—"],
                                ["Address", user.address || "Not provided"],
                                ["User ID", `#${user.user_id}`],
                            ].map(([k, v]) => (
                                <div className="profile-detail-row" key={k}>
                                    <span className="profile-detail-key">{k}</span>
                                    <span className="profile-detail-val">{v}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: "1.5rem" }}>
                            <Link to="/my-books" className="btn btn-outline btn-sm">📚 View My Books</Link>
                        </div>
                    </div>

                    {/* Change password */}
                    <div className="profile-panel">
                        <h2 className="profile-panel-title">🔐 Change Password</h2>
                        <form className="auth-form" onSubmit={handlePwSubmit} id="change-pw-form">
                            <div className="form-group">
                                <label htmlFor="current-pw">Current Password</label>
                                <input id="current-pw" type="password" name="current_password"
                                    placeholder="Your current password"
                                    value={pwForm.current_password} onChange={handlePwChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="new-pw">New Password</label>
                                <input id="new-pw" type="password" name="new_password"
                                    placeholder="Min. 6 characters"
                                    value={pwForm.new_password} onChange={handlePwChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="confirm-pw">Confirm New Password</label>
                                <input
                                    id="confirm-pw" type="password" name="confirm_password"
                                    placeholder="Repeat new password"
                                    value={pwForm.confirm_password} onChange={handlePwChange}
                                    required
                                    className={
                                        pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password
                                            ? "is-invalid" : pwForm.confirm_password ? "is-valid" : ""
                                    }
                                />
                                {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
                                    <span className="field-hint">Passwords don't match</span>
                                )}
                            </div>
                            <button type="submit" className="btn-primary" id="change-pw-btn" disabled={pwLoading}>
                                {pwLoading ? "Saving…" : "🔐 Update Password"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
