import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";
import { SkeletonCard } from "../components/SkeletonLoader";
import "../styles/Profile.css";

const API = "http://localhost:5000/api";

const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function Profile() {
    const toast  = useToast();
    const token  = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    const localUser = userStr ? JSON.parse(userStr) : {};

    // Live profile data (includes borrowed books)
    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
    const [pwLoading, setPwLoading] = useState(false);

    useEffect(() => {
        fetch(`${API}/users/me/profile`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setProfile(data);
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
                            <span className="role-badge">{user.role === "faculty" ? "🎓" : "📚"} {user.role}</span>
                            <span style={{ color: "rgba(200,190,255,0.55)", fontSize: "0.82rem" }}>{user.email}</span>
                            {booksCount > 0 && (
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
                        <h2 className="profile-panel-title">👤 Account Details</h2>
                        <div className="profile-detail-list">
                            {[
                                ["Full Name",  user.name    || "—"],
                                ["Email",      user.email   || "—"],
                                ["Role",       user.role    || "—"],
                                ["Address",    user.address || "Not provided"],
                                ["User ID",    `#${user.user_id}`],
                                ["Member Since", fmtDate(profile?.created_at || null)],
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

                {/* ── Borrower Details Section ─────────────────────────────── */}
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

            </div>
        </div>
    );
}

export default Profile;
