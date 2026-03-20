import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { SkeletonStatCards } from "../components/SkeletonLoader";
import { useToast } from "../components/Toast";
import "../styles/LibrarianDashboard.css";

const API = "http://localhost:5000/api";

function StatCard({ icon, value, label, colorClass }) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!value) return;
        let s = 0;
        const step = Math.ceil(value / 30);
        const timer = setInterval(() => {
            s += step;
            if (s >= value) { setCount(value); clearInterval(timer); }
            else setCount(s);
        }, 35);
        return () => clearInterval(timer);
    }, [value]);

    return (
        <div className="stat-card">
            <div className="stat-card-top">
                <div className={`stat-icon-wrap ${colorClass}`}>{icon}</div>
            </div>
            <div className="stat-number">{count}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

function LibrarianDashboard() {
    const toast = useToast();
    const userStr = sessionStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : {};
    const token = sessionStorage.getItem("token");

    const [stats, setStats] = useState(null);
    const [recentBooks, setRecent] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(() => {
        const headers = { Authorization: `Bearer ${token}` };
        Promise.all([
            fetch(`${API}/records/stats`, { headers }).then(r => r.json()),
            fetch(`${API}/books`, { headers: {} }).then(r => r.json()),
        ]).then(([s, b]) => {
            setStats(s);
            if (Array.isArray(b)) setRecent(b.slice(0, 5));
        }).catch(() => toast("Failed to load dashboard", "error"))
            .finally(() => setLoading(false));
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchData(); }, [fetchData]);

    const total = stats?.total_books ?? 0;
    const borrowed = stats?.borrowed ?? 0;
    const available = total - borrowed;
    const pct = total > 0 ? Math.round((borrowed / total) * 100) : 0;

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">

                <div className="dashboard-welcome">
                    <h1>Librarian Dashboard 📋</h1>
                    <div className="welcome-meta">
                        <span className="role-badge">🏛️ Librarian</span>
                        <span style={{ color: "rgba(200,190,255,0.5)", fontSize: "0.8rem" }}>{user.email}</span>
                    </div>
                </div>

                {loading ? <SkeletonStatCards count={4} /> : (
                    <div className="stats-grid">
                        <StatCard icon="📚" value={total} label="Total Books" colorClass="violet" />
                        <StatCard icon="✅" value={available} label="Available" colorClass="green" />
                        <StatCard icon="🔖" value={borrowed} label="Borrowed" colorClass="amber" />
                        <StatCard icon="👥" value={stats?.total_users ?? 0} label="Users" colorClass="blue" />
                    </div>
                )}

                {/* Borrow utilization bar */}
                {!loading && total > 0 && (
                    <div className="borrow-usage-bar" style={{ marginBottom: "1.75rem" }}>
                        <div className="borrow-progress-header" style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "rgba(200,190,255,0.7)", marginBottom: "0.6rem" }}>
                            <span>📊 Borrow utilization across all books</span>
                            <span style={{ color: "#a78bfa", fontWeight: 700 }}>{pct}% in use</span>
                        </div>
                        <div className="progress-wrap">
                            <div className="progress-bar"
                                style={{ width: `${pct}%`, background: pct > 80 ? "linear-gradient(90deg,#ef4444,#f87171)" : undefined }}>
                            </div>
                        </div>
                        <div className="progress-legend">
                            <span className="chip available" style={{ fontSize: "0.72rem" }}>✅ {available} Available</span>
                            <span className="chip borrowed" style={{ fontSize: "0.72rem" }}>🔖 {borrowed} Borrowed</span>
                        </div>
                    </div>
                )}

                {/* Management links */}
                <div className="section-header">
                    <h2>Management</h2>
                </div>
                <div className="quick-actions">
                    <Link to="/librarian/manage-books" className="quick-action-card" id="qa-books">
                        <span className="qa-icon">📖</span>
                        <span className="qa-label">Manage Books</span>
                        <span className="qa-desc">Add, edit, or delete books</span>
                    </Link>
                    <Link to="/librarian/manage-records" className="quick-action-card" id="qa-records">
                        <span className="qa-icon">📊</span>
                        <span className="qa-label">Book Records</span>
                        <span className="qa-desc">Track inventory changes</span>
                    </Link>
                    <Link to="/librarian/manage-users" className="quick-action-card" id="qa-users">
                        <span className="qa-icon">👥</span>
                        <span className="qa-label">Users</span>
                        <span className="qa-desc">View registered users</span>
                    </Link>
                    <Link to="/librarian/add-librarian" className="quick-action-card" id="qa-add-lib">
                        <span className="qa-icon">🏛️</span>
                        <span className="qa-label">Add Librarian</span>
                        <span className="qa-desc">Create new staff account</span>
                    </Link>
                </div>

                {/* Recent additions */}
                <div className="section-header">
                    <h2>Recent Books in Catalog</h2>
                    <Link to="/librarian/manage-books" className="btn btn-outline btn-sm">Manage All →</Link>
                </div>

                {loading ? (
                    <div className="loading">Loading<span className="spinner"></span></div>
                ) : recentBooks.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon">📭</span><p>No books yet.</p></div>
                ) : (
                    <div className="recent-books-list">
                        {recentBooks.map(b => (
                            <div className="recent-book-item" key={b.ISBN}>
                                <span className="recent-book-icon">📚</span>
                                <div className="recent-book-info">
                                    <span className="recent-book-title">{b.title}</span>
                                    <span className="recent-book-meta">by {b.author}{b.publisher ? ` · ${b.publisher}` : ""}</span>
                                </div>
                                <span className={`chip ${b.status}`} style={{ flexShrink: 0 }}>
                                    {b.status === 'requested' ? "Requested" : 
                                     b.status === 'borrowed' ? "Borrowed" : "Available"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default LibrarianDashboard;
