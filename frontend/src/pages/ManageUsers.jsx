import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";
import { SkeletonTable } from "../components/SkeletonLoader";
import "../styles/ManageUsers.css";

import config from "../config";
const API = config.API_BASE_URL;

function ManageUsers() {
    const toast = useToast();
    const token = sessionStorage.getItem("token");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expanded, setExpanded] = useState(null); // user_id that is expanded

    useEffect(() => {
        fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => setUsers(Array.isArray(data) ? data : []))
            .catch(() => toast("Failed to load users", "error"))
            .finally(() => setLoading(false));
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
    );

    const fmt = (dt) => dt
        ? new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : "—";

    // CSV export
    const handleExport = () => {
        const rows = [
            ["ID", "Name", "Email", "Address", "Role", "Books Borrowed", "Joined"],
            ...users.map(u => [u.user_id, u.name, u.email, u.address || "", u.role, u.books_borrowed, fmt(u.created_at)])
        ];
        const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "library_users.csv"; a.click();
        URL.revokeObjectURL(url);
        toast("Users exported as CSV!", "success");
    };

    // Fetch borrowed books for expanded row
    const [expandedBooks, setExpandedBooks] = useState({});
    const handleExpand = async (uid) => {
        if (expanded === uid) { setExpanded(null); return; }
        setExpanded(uid);
        if (expandedBooks[uid]) return; // cached
        try {
            const res = await fetch(`${API}/users/${uid}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            setExpandedBooks(prev => ({ ...prev, [uid]: data.borrowed_books || [] }));
        } catch { /* silent */ }
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">

                <div className="section-header">
                    <h2>👥 Registered Users</h2>
                    <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                        <span className="chip">{users.length} total</span>
                        <button className="btn btn-blue btn-sm" id="export-csv-btn" onClick={handleExport}>
                            📥 Export CSV
                        </button>
                    </div>
                </div>

                <div className="search-bar">
                    <input id="user-search-input" type="text"
                        placeholder="🔍  Filter by name, email, or role…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {loading ? (
                    <SkeletonTable rows={6} />
                ) : filtered.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon">👤</span><p>No users found.</p></div>
                ) : (
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th><th>Name</th><th>Email</th><th>Address</th>
                                    <th>Role</th><th>Borrowed</th><th>Joined</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => (
                                    <React.Fragment key={u.user_id}>
                                        <tr className={expanded === u.user_id ? "row-expanded" : ""}>
                                            <td style={{ color: "var(--brand)", fontWeight: 700 }}>#{u.user_id}</td>
                                            <td className="user-name-cell">{u.name}</td>
                                            <td style={{ fontSize: "0.82rem" }}>{u.email}</td>
                                            <td style={{ fontSize: "0.8rem" }}>{u.address || "—"}</td>
                                            <td>
                                                <span className={`user-role-badge ${u.role}`}>
                                                    {u.role === "faculty" ? "🎓" : "📚"} {u.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`chip ${u.books_borrowed > 0 ? "borrowed" : ""}`}>
                                                    {u.books_borrowed} / 5
                                                </span>
                                            </td>
                                            <td style={{ fontSize: "0.8rem" }}>{fmt(u.created_at)}</td>
                                            <td>
                                                {u.books_borrowed > 0 && (
                                                    <button
                                                        className={`btn btn-ghost btn-sm expand-btn ${expanded === u.user_id ? "active" : ""}`}
                                                        id={`expand-${u.user_id}`}
                                                        onClick={() => handleExpand(u.user_id)}
                                                        title="View borrowed books"
                                                    >
                                                        {expanded === u.user_id ? "▲" : "▼"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>

                                        {/* Expanded borrowed books */}
                                        {expanded === u.user_id && (
                                            <tr>
                                                <td colSpan={8} style={{ padding: 0 }}>
                                                    <div className="expanded-books">
                                                        <p className="expanded-label">📚 Books borrowed by {u.name}:</p>
                                                        {!expandedBooks[u.user_id] ? (
                                                            <div className="loading" style={{ padding: "0.75rem 0" }}>Loading<span className="spinner"></span></div>
                                                        ) : expandedBooks[u.user_id].length === 0 ? (
                                                            <p style={{ color: "rgba(167,139,250,0.5)", fontSize: "0.8rem" }}>No borrowed books.</p>
                                                        ) : (
                                                            <div className="expanded-book-list">
                                                                {expandedBooks[u.user_id].map(b => (
                                                                    <div className="expanded-book-item" key={b.ISBN}>
                                                                        <span style={{ fontSize: "0.9rem" }}>📖</span>
                                                                        <span style={{ fontWeight: 600, color: "var(--ink)" }}>{b.title}</span>
                                                                        <span style={{ color: "var(--ink-3)", fontSize: "0.78rem" }}>by {b.author}</span>
                                                                        <span className="chip" style={{ 
                                                                            fontSize: "0.7rem", 
                                                                            marginLeft: "auto",
                                                                            background: "var(--amber-light)",
                                                                            color: "var(--amber)",
                                                                            border: "1px solid #FEF08A"
                                                                        }}>
                                                                            ISBN: {b.ISBN}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ManageUsers;
