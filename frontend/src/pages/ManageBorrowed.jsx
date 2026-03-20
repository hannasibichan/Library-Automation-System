import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";
import "../styles/Global.css";

const API = "http://localhost:5000/api";

const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function ManageBorrowed() {
    const toast = useToast();
    const token = sessionStorage.getItem("token");
    const [borrowed, setBorrowed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchBorrowed = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/borrowed`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            const data = await res.json();
            setBorrowed(Array.isArray(data) ? data : []);
        } catch {
            toast("Failed to load borrowed books", "error");
        } finally {
            setLoading(false);
        }
    }, [token, toast]);

    useEffect(() => { fetchBorrowed(); }, [fetchBorrowed]);

    const filtered = borrowed.filter(b => 
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.user_name.toLowerCase().includes(search.toLowerCase()) ||
        b.ISBN.toLowerCase().includes(search.toLowerCase())
    );

    const handleReturn = async (book) => {
        if (!window.confirm(`Mark "${book.title}" as returned?`)) return;
        try {
            const res = await fetch(`${API}/return/${book.ISBN}/${book.bookno}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Failed to return", "error"); return; }
            toast(data.fine > 0 ? `Returned! Fine of ₹${data.fine} applied.` : "Book returned!", "success");
            fetchBorrowed();
        } catch { toast("Server error", "error"); }
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">
                <div className="section-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <h2>📖 Manage Borrowed Books</h2>
                        <span className="chip">{filtered.length} active</span>
                    </div>
                    <p className="subtitle">Books currently with users</p>
                </div>

                <div className="search-bar" style={{ marginBottom: "1.5rem" }}>
                    <input 
                        type="text" 
                        placeholder="🔍 Search by borrower, book title, or ISBN..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setSearch("")}>✕ Clear</button>
                    )}
                </div>

                {loading ? (
                    <div className="loading-state">Loading borrowings...</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🔍</span>
                        <p>{search ? "No matching borrowings found." : "No books are currently borrowed."}</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Book Details</th>
                                    <th>Date Taken</th>
                                    <th>Return date</th>
                                    <th>Fine (₹)</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(item => (
                                    <tr key={`${item.ISBN}-${item.bookno}`}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{item.user_name}</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--ink-4)" }}>{item.user_email}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{item.title}</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--ink-4)" }}>
                                                ISBN: {item.ISBN} | No: {item.bookno}
                                            </div>
                                        </td>
                                        <td>{fmtDate(item.date_taken)}</td>
                                        <td>
                                            <span style={{ color: new Date(item.return_date) < new Date() ? "#dc2626" : "inherit" }}>
                                                {fmtDate(item.return_date)}
                                                {new Date(item.return_date) < new Date() && " ⚠️"}
                                            </span>
                                        </td>
                                        <td>
                                            {item.fine > 0 ? (
                                                <span className="chip danger">₹{Number(item.fine).toFixed(2)}</span>
                                            ) : "₹0.00"}
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <button className="btn btn-green btn-sm" onClick={() => handleReturn(item)}>
                                                Mark Returned
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ManageBorrowed;
