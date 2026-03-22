import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/SkeletonLoader";
import "../styles/Profile.css";

import config from "../config";
const API = config.API_BASE_URL;

const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function Profile() {
    const toast  = useToast();
    const token  = sessionStorage.getItem("token");
    const userStr = sessionStorage.getItem("user");
    const localUser = userStr ? JSON.parse(userStr) : {};

    // Live profile data (includes borrowed books)
    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
    const [pwLoading, setPwLoading] = useState(false);

    const [editModal, setEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", email: "", address: "" });
    const [editLoading, setEditLoading] = useState(false);

    useEffect(() => {
        fetch(`${API}/users/me/profile`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setProfile(data);
                setEditForm({ name: data.name, email: data.email, address: data.address || "" });
            })
            .catch(() => toast("Could not load profile details", "error"))
            .finally(() => setLoadingProfile(false));
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    const user = profile || localUser;

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

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditLoading(true);
        try {
            const res = await fetch(`${API}/users/me/profile`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(editForm),
            });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Update failed", "error"); return; }
            
            toast("Profile updated!", "success");
            setEditModal(false);
            // Refresh local profile
            setProfile({ ...profile, ...editForm });
            // Update sessionStorage
            const updatedUser = { ...localUser, ...editForm };
            sessionStorage.setItem("user", JSON.stringify(updatedUser));
        } catch { toast("Server error", "error"); }
        finally { setEditLoading(false); }
    };

    const borrowedBooks = profile?.borrowed_books || [];
    const booksCount    = profile?.books_borrowed ?? 0;

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
                            <span className="role-badge">{user.role === "librarian" ? "🛡️" : user.role === "faculty" ? "🎓" : "📚"} {user.role}</span>
                            <span className="email-text">{user.email}</span>
                            {user.role !== "librarian" && booksCount > 0 && (
                                <span className={`chip ${booksCount >= 5 ? "danger" : "borrowed"}`}>
                                    📖 {booksCount}/5 books borrowed
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Top two panels: Account Details + Change Password */}
                <div className="profile-grid">
                    {/* Account details */}
                    <div className="profile-panel">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", paddingBottom: "0.85rem", borderBottom: "1px solid var(--border)" }}>
                            <h2 className="profile-panel-title" style={{ margin: 0, border: "none", padding: 0, fontSize: "1.1rem" }}>👤 Account Details</h2>
                            <button className="btn btn-violet btn-sm" onClick={() => setEditModal(true)} 
                                    style={{ borderRadius: "8px", padding: "6px 14px", fontSize: "0.82rem", boxShadow: "0 4px 12px rgba(79,70,229,0.2)" }}>
                                ✏️ Edit Profile
                            </button>
                        </div>
                        <div className="profile-detail-list">
                            {[
                                ["Full Name",  user.name    || "—"],
                                ["Email",      user.email   || "—"],
                                ["Role",       user.role    || "—"],
                                ["Address",    user.role === "librarian" ? (user.address || "Contact: " + user.email) : (user.address || "Not provided")],
                                ["Account ID", user.role === "librarian" ? `#Lib ${user.lib_id}` : `#User ${user.user_id}`],
                                ["Member Since", fmtDate(profile?.created_at || null)],
                            ].map(([k, v]) => (
                                <div className="profile-detail-row" key={k}>
                                    <span className="profile-detail-key">{k}</span>
                                    <span className="profile-detail-val">{v}</span>
                                </div>
                            ))}
                        </div>

                        {user.role !== "librarian" && (
                            <div style={{ marginTop: "1.5rem" }}>
                                <Link to="/my-books" className="btn btn-outline btn-sm">📚 View My Books</Link>
                            </div>
                        )}
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

                {/* ── Borrower Details Section (Only for users) ─────────────────────────────── */}
                {user.role !== "librarian" && (
                <div className="borrower-section">
                    <div className="section-header" style={{ marginBottom: "1.15rem" }}>
                        <h2>📋 Borrower Details</h2>
                        <span className={`chip ${booksCount >= 5 ? "danger" : booksCount > 0 ? "borrowed" : ""}`}>
                            {booksCount} / 5 slots used
                        </span>
                    </div>

                    {/* Borrow utilisation bar */}
                    <div className="borrow-usage-bar" style={{ marginBottom: "1.75rem" }}>
                        <div className="progress-wrap">
                            <div
                                className="progress-bar"
                                style={{
                                    width: `${(booksCount / 5) * 100}%`,
                                    background: booksCount >= 5
                                        ? "linear-gradient(90deg,#ef4444,#f87171)"
                                        : undefined
                                }}
                            />
                        </div>
                        <p className="usage-hint">
                            {booksCount === 0 && "You haven't borrowed any books yet."}
                            {booksCount > 0 && booksCount < 5 && `You can still borrow ${5 - booksCount} more book${5 - booksCount !== 1 ? "s" : ""}.`}
                            {booksCount >= 5 && "You've reached your borrowing limit. Return a book to borrow more."}
                        </p>
                    </div>

                    {loadingProfile ? (
                        <div className="borrowed-detail-list">
                            {[1, 2].map(i => <SkeletonCard key={i} />)}
                        </div>
                    ) : borrowedBooks.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">📭</span>
                            <p>You haven't borrowed any books yet.</p>
                            <Link to="/books" className="btn btn-violet" style={{ marginTop: "0.5rem" }}>
                                Browse Catalog →
                            </Link>
                        </div>
                    ) : (
                        <div className="borrowed-detail-list">
                            {borrowedBooks.map((book) => {
                                const isOverdue = book.return_date && new Date(book.return_date) < new Date();
                                const fine = book.current_fine > 0 ? book.current_fine : (book.fine ?? 0);
                                return (
                                    <div
                                        className={`profile-borrow-card ${isOverdue ? "overdue" : ""}`}
                                        key={book.ISBN}
                                        id={`profile-book-${book.ISBN}`}
                                    >
                                        {/* Left: Thumbnail */}
                                        <div className="pbc-cover">
                                            {book.cover_image ? (
                                                <img src={book.cover_image} alt={book.title} className="pbc-img" />
                                            ) : (
                                                <div className="pbc-placeholder">📚</div>
                                            )}
                                        </div>

                                        {/* Right: Content */}
                                        <div className="pbc-body">
                                            <div className="pbc-header-row">
                                                <span className="pbc-title">{book.title}</span>
                                                <div className="pbc-badges">
                                                    {isOverdue && <span className="chip danger" style={{ fontSize: "0.65rem" }}>⚠️ Overdue</span>}
                                                    <span className="chip borrowed" style={{ fontSize: "0.65rem" }}>📖 Borrowed</span>
                                                </div>
                                            </div>

                                            {/* Subtitle meta */}
                                            <div className="pbc-meta-row">
                                                <span>✍️ {book.author}</span>
                                                <span className="pbc-isbn">ISBN: {book.ISBN} · #{book.bookno}</span>
                                            </div>

                                            {/* ── Borrowing Details (maps to form section) ── */}
                                            <div className="pbc-info-grid">
                                                <div className="pbc-info-item">
                                                    <span className="pbc-info-label">📅 Date Taken</span>
                                                    <span className="pbc-info-value">{fmtDate(book.date_taken)}</span>
                                                </div>
                                                <div className="pbc-info-item">
                                                    <span className="pbc-info-label">🔔 Return By</span>
                                                    <span className={`pbc-info-value ${isOverdue ? "overdue-text" : ""}`}>
                                                        {fmtDate(book.return_date)}
                                                    </span>
                                                </div>
                                                <div className="pbc-info-item">
                                                    <span className="pbc-info-label">💰 Fine</span>
                                                    <span className={`pbc-info-value ${fine > 0 ? "fine-text" : ""}`}>
                                                        {fine > 0 ? `₹${Number(fine).toFixed(2)}` : "₹0.00"}
                                                    </span>
                                                </div>
                                                <div className="pbc-info-item">
                                                    <span className="pbc-info-label">📚 Issued By</span>
                                                    <span className="pbc-info-value">
                                                        {book.librarian_name || (book.lib_id ? `Lib #${book.lib_id}` : "—")}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                )}

            </div> {/* end dashboard-content */}

            {/* ── Edit Profile Modal (OUTSIDE dashboard-content) ── */}
            {editModal && (
                <div className="modal-overlay" style={{ zIndex: 10000, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(6px)" }}>
                    <div className="modal-content profile-edit-modal fade-in-up" 
                         style={{ 
                            maxWidth: "480px", width: "95%", padding: "2.5rem", 
                            background: "#ffffff", borderRadius: "1.5rem", 
                            color: "#1e293b", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                            border: "1px solid rgba(255,255,255,0.8)",
                            position: "relative"
                         }}>
                        <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <h2 style={{ margin: 0, color: "#0f172a", fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Edit Profile</h2>
                                <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.9rem" }}>Update your personal workspace details</p>
                            </div>
                            <button className="close-btn" onClick={() => setEditModal(false)} 
                                    style={{ background: "#f1f5f9", border: "none", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 0.2s" }}>
                                <span style={{ fontSize: "1.2rem", color: "#64748b" }}>✕</span>
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            <div className="form-group">
                                <label style={{ display: "block", marginBottom: "0.6rem", color: "#334155", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Full Name</label>
                                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required 
                                    style={{ width: "100%", padding: "0.9rem 1.1rem", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#0f172a", fontSize: "1rem", transition: "all 0.2s" }}
                                    placeholder="Enter your full name" />
                            </div>

                            <div className="form-group">
                                <label style={{ display: "block", marginBottom: "0.6rem", color: "#334155", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Address</label>
                                <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required 
                                    style={{ width: "100%", padding: "0.9rem 1.1rem", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#0f172a", fontSize: "1rem", transition: "all 0.2s" }}
                                    placeholder="email@example.com" />
                            </div>

                            <div className="form-group">
                                <label style={{ display: "block", marginBottom: "0.6rem", color: "#334155", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    {user.role === "librarian" ? "Mobile Number" : "Street Address"}
                                </label>
                                <input type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} 
                                    style={{ width: "100%", padding: "0.9rem 1.1rem", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#0f172a", fontSize: "1rem", transition: "all 0.2s" }}
                                    placeholder={user.role === "librarian" ? "Contact Number" : "Your residential address"} />
                            </div>

                            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                                <button type="button" className="btn btn-ghost" style={{ flex: 1, padding: "0.9rem", borderRadius: "12px", fontWeight: 600 }} onClick={() => setEditModal(false)}>
                                    Discard
                                </button>
                                <button type="submit" className="btn-primary" 
                                        style={{ 
                                            flex: 1.5, padding: "0.9rem", borderRadius: "12px", 
                                            background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", 
                                            color: "#fff", border: "none", fontWeight: 700, 
                                            boxShadow: "0 10px 15px -3px rgba(79, 70, 229, 0.3)" 
                                        }} 
                                        disabled={editLoading}>
                                    {editLoading ? "Updating..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Profile;
