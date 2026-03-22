import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";
import { SkeletonTable } from "../components/SkeletonLoader";
import "../styles/Global.css";

import config from "../config";
const API = config.API_BASE_URL;

function ManageLibrarians() {
    const toast = useToast();
    const navigate = useNavigate();
    const token = sessionStorage.getItem("token");
    const [libs, setLibs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    
    // Modal state
    const [modal, setModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState({ lib_id: "", name: "", email: "", mobileno: "", password: "" });

    const fetchLibs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/librarians`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            const data = await res.json();
            if (!res.ok) { 
                toast(data.error || "Failed to load admins", "error"); 
                return; 
            }
            setLibs(Array.isArray(data) ? data : []);
        } catch {
            toast("Server error", "error");
        } finally {
            setLoading(false);
        }
    }, [token, toast]);

    useEffect(() => { fetchLibs(); }, [fetchLibs]);

    const filtered = libs.filter(l =>
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.email.toLowerCase().includes(search.toLowerCase())
    );

    const handleEdit = (lib) => {
        setForm({ ...lib, password: "" });
        setEditMode(true);
        setModal(true);
    };

    const handleDelete = async (lib_id) => {
        if (lib_id === 1) { toast("Main admin cannot be deleted", "error"); return; }
        if (!window.confirm("Are you sure you want to remove this admin?")) return;
        
        try {
            const res = await fetch(`${API}/librarians/${lib_id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Delete failed", "error"); return; }
            toast("Admin removed!", "success");
            fetchLibs();
        } catch { toast("Server error", "error"); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API}/librarians/${form.lib_id}`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Update failed", "error"); return; }
            toast("Admin updated!", "success");
            setModal(false);
            fetchLibs();
        } catch { toast("Server error", "error"); }
    };

    const fmt = (dt) => dt
        ? new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : "—";

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">
                <div className="section-header">
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <h2>🛡️ Manage Admins</h2>
                            <span className="chip">{libs.length} total</span>
                        </div>
                        <p className="subtitle" style={{ marginTop: "0.2rem", color: "var(--ink-4)" }}>Main admin control panel for library staff</p>
                    </div>
                    <button className="btn btn-violet" onClick={() => navigate("/librarian/add-librarian")}>
                        ➕ Add New Admin
                    </button>
                </div>

                <div className="search-bar" style={{ marginBottom: "1.5rem" }}>
                    <input 
                        type="text" 
                        style={{ borderRadius: "999px" }}
                        placeholder="🔍 Search admins by name or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {loading ? (
                    <SkeletonTable rows={5} />
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🛡️</span>
                        <p>No other admins found.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Mobile</th>
                                    <th>Joined</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(l => (
                                    <tr key={l.lib_id}>
                                        <td style={{ fontWeight: 700, color: "var(--indigo)" }}>#{l.lib_id}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{l.name} {l.lib_id === 1 && "👑"}</div>
                                        </td>
                                        <td>{l.email}</td>
                                        <td>{l.mobileno || "—"}</td>
                                        <td>{fmt(l.created_at)}</td>
                                        <td style={{ textAlign: "right" }}>
                                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(l)}>✏️ Edit</button>
                                                {l.lib_id !== 1 && (
                                                    <button className="btn btn-red btn-sm" onClick={() => handleDelete(l.lib_id)}>🗑️ Remove</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editMode ? "✏️ Edit Admin Details" : "🛡️ Admin Details"}</h2>
                            <button className="modal-close" onClick={() => setModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="auth-form" style={{ gap: "1.25rem" }}>
                            <div className="form-group">
                                <label>Name</label>
                                <input 
                                    type="text" required
                                    placeholder="Full name"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input 
                                    type="email" required
                                    placeholder="email@library.com"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Mobile Number</label>
                                <input 
                                    type="text"
                                    placeholder="Enter mobile no."
                                    value={form.mobileno || ""}
                                    onChange={e => setForm({ ...form, mobileno: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    Security <span style={{ fontSize: "0.75rem", color: "var(--ink-4)", fontWeight: 400 }}>
                                        ({editMode ? "Leave blank to keep current password" : "Set initial password"})
                                    </span>
                                </label>
                                <input 
                                    type="password"
                                    placeholder={editMode ? "••••••••" : "Enter password"}
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions" style={{ marginTop: "1rem" }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-violet" style={{ minWidth: "140px" }}>
                                    {editMode ? "Save Changes" : "Create Admin"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManageLibrarians;
