import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";
import { SkeletonTable } from "../components/SkeletonLoader";
import "../styles/ManageRecords.css";

import config from "../config";
const API = config.API_BASE_URL;

function ManageRecords() {
    const toast = useToast();
    const token = sessionStorage.getItem("token");
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editRec, setEditRec] = useState(null);
    const [total, setTotal] = useState(0);

    const fetchRecords = useCallback(() => {
        setLoading(true);
        fetch(`${API}/records`, { headers })
            .then(r => r.json())
            .then(data => setRecords(Array.isArray(data) ? data : []))
            .catch(() => toast("Failed to load records", "error"))
            .finally(() => setLoading(false));
    }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    const openAdd = () => { setEditRec(null); setTotal(0); setModal(true); };
    const openEdit = (r) => { setEditRec(r); setTotal(r.total_books_available); setModal(true); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editRec ? `${API}/records/${editRec.book_record_id}` : `${API}/records`;
            const method = editRec ? "PUT" : "POST";
            const res = await fetch(url, { method, headers, body: JSON.stringify({ total_books_available: Number(total) }) });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Error", "error"); return; }
            toast(editRec ? "Record updated!" : "Record created!", "success");
            setModal(false);
            fetchRecords();
        } catch { toast("Server error", "error"); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Mark this record as deleted?")) return;
        try {
            const res = await fetch(`${API}/records/${id}`, { method: "DELETE", headers });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Error", "error"); return; }
            toast("Record marked as deleted.", "success");
            fetchRecords();
        } catch { toast("Server error", "error"); }
    };

    const fmt = (dt) => dt
        ? new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : "—";

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">

                <div className="section-header">
                    <h2>📊 Inventory Audit Records</h2>
                    <button className="btn btn-violet" id="add-record-btn" onClick={openAdd}>+ New Record</button>
                </div>

                {loading ? (
                    <SkeletonTable rows={8} />
                ) : records.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon">📋</span><p>No audit records yet.</p></div>
                ) : (
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th><th>Librarian</th><th>Total Available</th>
                                    <th>Created At</th><th>Updated At</th><th>Deleted At</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((r, i) => (
                                    <tr key={r.book_record_id} style={{ animationDelay: `${i * 0.03}s` }} className="fade-in-row">
                                        <td className="record-id-cell">#{r.book_record_id}</td>
                                        <td style={{ fontWeight: 600, color: "#e2e0ff" }}>{r.librarian_name || "—"}</td>
                                        <td>
                                            <span className="total-books-badge">
                                                📚 {r.total_books_available}
                                            </span>
                                        </td>
                                        <td className="datetime-cell">{fmt(r.add_record)}</td>
                                        <td className="datetime-cell">{fmt(r.update_record)}</td>
                                        <td className="datetime-cell">{fmt(r.delete_record)}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <button className="btn btn-yellow btn-sm" id={`edit-rec-${r.book_record_id}`}
                                                    onClick={() => openEdit(r)}>✏️</button>
                                                <button className="btn btn-red btn-sm" id={`del-rec-${r.book_record_id}`}
                                                    onClick={() => handleDelete(r.book_record_id)}>🗑️</button>
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
                    <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editRec ? "✏️ Edit Record" : "➕ New Audit Entry"}</h2>
                            <button className="modal-close" onClick={() => setModal(false)}>✕</button>
                        </div>
                        <form className="auth-form" onSubmit={handleSubmit} id="record-form">
                            <div className="form-group">
                                <label htmlFor="total-available">Total Books in System</label>
                                <input id="total-available" type="number" min="0" placeholder="e.g. 150"
                                    value={total} onChange={e => setTotal(e.target.value)} required />
                                <span className="field-hint">Specify current physical inventory count.</span>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-violet" id="record-save-btn">
                                    {editRec ? "Update Record" : "Save Record"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManageRecords;
