import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { SkeletonStatCards, SkeletonCard } from "../components/SkeletonLoader";
import { useToast } from "../components/Toast";
import "../styles/Dashboard.css";

import config from "../config";
const API = config.API_BASE_URL;

function useCountUp(target, delay = 100) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!target) return;
        const t = setTimeout(() => {
            let s = 0;
            const step = Math.ceil(target / 30);
            const timer = setInterval(() => {
                s += step;
                if (s >= target) { setCount(target); clearInterval(timer); }
                else setCount(s);
            }, 30);
            return () => clearInterval(timer);
        }, delay);
        return () => clearTimeout(t);
    }, [target, delay]);
    return count;
}

function StatCard({ icon, value, label, colorClass, trend }) {
    const displayed = useCountUp(typeof value === "number" ? value : 0);
    return (
        <div className="stat-card">
            <div className="stat-card-top">
                <div className={`stat-icon-wrap ${colorClass}`}>{icon}</div>
                {trend && <span className={`stat-trend ${trend.dir}`}>{trend.label}</span>}
            </div>
            <div className="stat-number">{typeof value === "number" ? displayed : value}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

function Dashboard() {
    const toast = useToast();
    const userStr = sessionStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : {};
    const token = sessionStorage.getItem("token");

    const [stats, setStats] = useState(null);
    const [myBooks, setMyBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(() => {
        const headers = { Authorization: `Bearer ${token}` };
        Promise.all([
            fetch(`${API}/users/me/stats`, { headers }).then(r => r.json()),
            fetch(`${API}/my-books`, { headers }).then(r => r.json()),
        ]).then(([s, b]) => {
            setStats(Array.isArray(s) ? null : s);
            setMyBooks(Array.isArray(b) ? b : []);
        }).catch(() => toast("Failed to load dashboard data", "error"))
            .finally(() => setLoading(false));
    }, [token, toast]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchData(); }, [fetchData]);

    const borrowed = stats?.books_borrowed ?? 0;
    const borrowPct = Math.round((borrowed / 5) * 100);

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">

                {/* Welcome banner */}
                <div className="dashboard-welcome">
                    <h1>Welcome back, {user.name?.split(" ")[0]}! 👋</h1>
                    <div className="welcome-meta">
                        <span className="role-badge">{user.role === "faculty" ? "🎓" : "📚"} {user.role}</span>
                        <span className="email-text">{user.email}</span>
                    </div>
                </div>

                {/* Stats */}
                {loading ? <SkeletonStatCards count={4} /> : (
                    <div className="stats-grid">
                        <StatCard icon="📚" value={stats?.total_books ?? 0} label="Total Books" colorClass="violet" />
                        <StatCard icon="✅" value={stats?.available_books ?? 0} label="Available" colorClass="green" />
                        <StatCard icon="🔖" value={borrowed} label="You Borrowed" colorClass="amber" trend={{ dir: "flat", label: `${borrowed}/5` }} />
                        <StatCard icon="🎯" value={stats?.remaining_borrows ?? 0} label="Can Still Borrow" colorClass="blue" />
                    </div>
                )}

                {/* Borrow progress */}
                {!loading && (
                    <div className="borrow-progress-wrap">
                        <div className="borrow-progress-header">
                            <span>Borrow Utilization</span>
                            <span className="borrow-pct">{borrowed} / 5 books</span>
                        </div>
                        <div className="progress-wrap">
                            <div className="progress-bar" style={{ width: `${borrowPct}%`, background: borrowed >= 5 ? "linear-gradient(90deg,#ef4444,#f87171)" : undefined }}></div>
                        </div>
                    </div>
                )}

                {/* Quick actions */}
                <div className="section-header" style={{ marginTop: "1.75rem" }}>
                    <h2>Quick Actions</h2>
                </div>
                <div className="quick-actions">
                    <Link to="/books" className="quick-action-card" id="qa-browse">
                        <span className="qa-icon">🔍</span>
                        <span className="qa-label">Browse Books</span>
                        <span className="qa-desc">Search the library catalog</span>
                    </Link>
                    <Link to="/my-books" className="quick-action-card" id="qa-mybooks">
                        <span className="qa-icon">📚</span>
                        <span className="qa-label">My Books</span>
                        <span className="qa-desc">View &amp; return borrowed books</span>
                    </Link>
                    <Link to="/profile" className="quick-action-card" id="qa-profile">
                        <span className="qa-icon">👤</span>
                        <span className="qa-label">Profile</span>
                        <span className="qa-desc">Account settings &amp; password</span>
                    </Link>
                </div>

                {/* Currently borrowed */}
                <div className="section-header">
                    <h2>Currently Borrowed</h2>
                    <Link to="/my-books" className="btn btn-outline btn-sm">View All →</Link>
                </div>

                {loading ? (
                    <div className="books-grid">
                        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : myBooks.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📭</span>
                        <p>No borrowed books yet.</p>
                        <Link to="/books" className="btn btn-violet">Browse Catalog →</Link>
                    </div>
                ) : (
                    <div className="books-grid">
                        {myBooks.slice(0, 4).map(book => {
                            const returnDate = new Date(book.return_date);
                            const isOverdue = book.return_date && new Date(returnDate.setHours(23, 59, 59, 999)) < new Date();
                            return (
                                <Link to="/my-books" className="book-card-mini" key={book.ISBN}>
                                    <div className="bcm-cover">
                                        {book.cover_image ? (
                                            <img src={book.cover_image} alt={book.title} className="bcm-img" />
                                        ) : (
                                            <div className="bcm-placeholder">📚</div>
                                        )}
                                    </div>
                                    <div className="bcm-body">
                                        <div className="bcm-title">{book.title}</div>
                                        <div className="bcm-author">by {book.author}</div>
                                        <div className="bcm-meta">
                                            {isOverdue ? (
                                                <span className="chip danger" style={{ fontSize: "0.65rem" }}>⚠️ Overdue</span>
                                            ) : (
                                                <span className="chip borrowed" style={{ fontSize: "0.65rem" }}>📖 Borrowed</span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
