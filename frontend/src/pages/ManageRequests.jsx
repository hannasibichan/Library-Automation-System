import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";
import "../styles/Global.css";

import config from "../config";
const API = config.API_BASE_URL;

function ManageRequests() {
    const toast = useToast();
    const token = sessionStorage.getItem("token");
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/requests`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            const data = await res.json();
            setRequests(Array.isArray(data) ? data : []);
        } catch {
            toast("Failed to load requests", "error");
        } finally {
            setLoading(false);
        }
    }, [token, toast]);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);

    const filtered = requests.filter(r => 
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.user_name.toLowerCase().includes(search.toLowerCase()) ||
        r.ISBN.toLowerCase().includes(search.toLowerCase())
    );

    const handleConfirm = async (req) => {
        if (!window.confirm(`Confirm borrow for ${req.user_name} - "${req.title}"?`)) return;
        try {
            const res = await fetch(`${API}/confirm-borrow/${req.ISBN}/${req.bookno}/${req.user_id}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Failed to confirm", "error"); return; }
            toast("Borrow confirmed!", "success");
            fetchRequests();
        } catch { toast("Server error", "error"); }
    };

    const handleCancel = async (req) => {
        if (!window.confirm(`Cancel reservation for "${req.title}"?`)) return;
        try {
            const res = await fetch(`${API}/cancel-request/${req.ISBN}/${req.bookno}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Failed to cancel", "error"); return; }
            toast("Reservation cancelled", "success");
            fetchRequests();
        } catch { toast("Server error", "error"); }
    };

    const getTimeRemaining = (expiry) => {
        const diff = new Date(expiry) - new Date();
        if (diff <= 0) return "Expired";
        const mins = Math.floor(diff / 60000);
        const hrs = Math.floor(mins / 60);
        return `${hrs}h ${mins % 60}m`;
    };

    const isExpired = (expiry) => {
        return (new Date(expiry) - new Date()) <= 0;
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">
                <div className="section-header">
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <h2>⏳ Manage Borrow Requests</h2>
                        <span className="chip">{filtered.length} pending</span>
                    </div>
                    <p className="subtitle">Pending pickups from users</p>
                </div>

                <div className="search-bar" style={{ marginBottom: "1.5rem" }}>
                    <input 
                        type="text" 
                        placeholder="🔍 Search by user, book title, or ISBN..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setSearch("")}>✕ Clear</button>
                    )}
                </div>

                {loading ? (
                    <div className="loading-state">Loading requests...</div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🔍</span>
                        <p>{search ? "No matching requests found." : "No pending borrow requests."}</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Book Details</th>
                                    <th>Expires In</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(req => (
                                    <tr key={`${req.ISBN}-${req.bookno}`}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{req.user_name}</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--ink-4)" }}>{req.user_email}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{req.title}</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--ink-4)" }}>
                                                ISBN: {req.ISBN} | No: {req.bookno}
                                            </div>
                                        </td>
                                        <td>
                                            {(() => {
                                                const expired = isExpired(req.request_expiry);
                                                return (
                                                    <span className="chip" style={{ 
                                                        background: expired ? "var(--red-light)" : "var(--amber-light)", 
                                                        color: expired ? "#991B1B" : "#92400E",
                                                        fontWeight: 700 
                                                    }}>
                                                        {expired ? "Expired" : getTimeRemaining(req.request_expiry)}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                <button 
                                                    className="btn btn-green btn-sm" 
                                                    onClick={() => handleConfirm(req)}
                                                    disabled={isExpired(req.request_expiry)}
                                                    title={isExpired(req.request_expiry) ? "Cannot confirm expired request" : ""}
                                                >
                                                    Confirm Pickup
                                                </button>
                                                <button className="btn btn-outline btn-sm" onClick={() => handleCancel(req)}>
                                                    Cancel
                                                </button>
                                            </div>
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

export default ManageRequests;
