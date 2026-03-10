import React, { useEffect, useState, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";
import { SkeletonTable } from "../components/SkeletonLoader";
import "../styles/ManageBooks.css";

const API = "http://localhost:5000/api";
const EMPTY = { ISBN: "", bookno: "", title: "", author: "", publisher: "" };

function ManageBooks() {
    const toast = useToast();
    const token = localStorage.getItem("token");
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [delConfirm, setDelConfirm] = useState(null);
    const [selected, setSelected] = useState([]); // Array of ISBNs
    const debounceRef = useRef(null);

    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    const fetchBooks = useCallback((q = "") => {
        setLoading(true);
        fetch(`${API}/books${q ? `?search=${encodeURIComponent(q)}` : ""}`)
            .then(r => r.json())
            .then(data => {
                setBooks(Array.isArray(data) ? data : []);
                setSelected([]); // Clear selection on fetch
            })
            .catch(() => toast("Failed to load books", "error"))
            .finally(() => setLoading(false));
    }, [toast]);

    useEffect(() => { fetchBooks(); }, [fetchBooks]);

    // Debounced search
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchBooks(val), 350);
    };

    const openAdd = () => { setForm(EMPTY); setEditMode(false); setModal(true); };
    const openEdit = (b) => {
        setForm({ ISBN: b.ISBN, bookno: b.bookno, title: b.title, author: b.author, publisher: b.publisher || "" });
        setEditMode(true); setModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editMode ? `${API}/books/${form.ISBN}` : `${API}/books`;
        const method = editMode ? "PUT" : "POST";
        try {
            const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Error", "error"); return; }
            toast(editMode ? "Book updated!" : "Book added!", "success");
            setModal(false);
            fetchBooks(search);
        } catch { toast("Server error", "error"); }
    };

    const handleDelete = async (isbn) => {
        try {
            const res = await fetch(`${API}/books/${isbn}`, { method: "DELETE", headers });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Error", "error"); return; }
            toast("Book deleted!", "success");
            setDelConfirm(null);
            fetchBooks(search);
        } catch { toast("Server error", "error"); }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selected.length} books?`)) return;
        setLoading(true);
        try {
            // Sequential delete as there's no bulk endpoint in the current backend
            for (const isbn of selected) {
                await fetch(`${API}/books/${isbn}`, { method: "DELETE", headers });
            }
            toast(`${selected.length} books deleted!`, "success");
            fetchBooks(search);
        } catch {
            toast("Error during bulk delete", "error");
            fetchBooks(search);
        }
    };

    const toggleSelectAll = () => {
        if (selected.length === books.length) setSelected([]);
        else setSelected(books.map(b => b.ISBN));
    };

    const toggleSelect = (isbn) => {
        if (selected.includes(isbn)) setSelected(selected.filter(i => i !== isbn));
        else setSelected([...selected, isbn]);
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">

                <div className="section-header">
                    <h2>📚 Manage Books</h2>
                    <div style={{ display: "flex", gap: "0.75rem" }}>
                        {selected.length > 0 && (
                            <button className="btn btn-red" onClick={handleBulkDelete}>
                                🗑️ Delete Selected ({selected.length})
                            </button>
                        )}
                        <button className="btn btn-violet" id="add-book-btn" onClick={openAdd}>+ Add Book</button>
                    </div>
                </div>

                <div className="search-bar">
                    <input id="manage-search-input" type="text" placeholder="🔍  Search books by title, author, isbn..."
                        value={search} onChange={handleSearchChange} />
                    {search && (
                        <button className="btn btn-outline btn-sm" onClick={() => { setSearch(""); fetchBooks(); }}>
                            Clear ✕
                        </button>
                    )}
                </div>

                {loading ? (
                    <SkeletonTable rows={8} />
                ) : books.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon">📭</span><p>No books found.</p></div>
                ) : (
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>
                                        <input type="checkbox" checked={selected.length === books.length && books.length > 0} onChange={toggleSelectAll} />
                                    </th>
                                    <th>ISBN</th><th>Book#</th><th>Title</th><th>Author</th>
                                    <th>Publisher</th><th>Status</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {books.map((b, i) => (
                                    <tr key={b.ISBN} style={{ animationDelay: `${i * 0.03}s` }} className="fade-in-row">
                                        <td>
                                            <input type="checkbox" checked={selected.includes(b.ISBN)} onChange={() => toggleSelect(b.ISBN)} />
                                        </td>
                                        <td className="isbn-cell">{b.ISBN}</td>
                                        <td>{b.bookno}</td>
                                        <td className="book-title-cell">{b.title}</td>
                                        <td>{b.author}</td>
                                        <td>{b.publisher || "—"}</td>
                                        <td className="book-status-cell">
                                            <span className={`chip ${b.user_id ? "borrowed" : "available"}`}>
                                                {b.user_id ? `Borrowed${b.borrowed_by ? ` by ${b.borrowed_by}` : ""}` : "Available"}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <button className="btn btn-yellow btn-sm" id={`edit-${b.ISBN}`} onClick={() => openEdit(b)}>✏️ Edit</button>
                                                <button className="btn btn-red    btn-sm" id={`delete-${b.ISBN}`} onClick={() => setDelConfirm(b)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add / Edit Modal */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editMode ? "✏️ Edit Book" : "➕ Add New Book"}</h2>
                            <button className="modal-close" onClick={() => setModal(false)}>✕</button>
                        </div>
                        <form className="auth-form" onSubmit={handleSubmit} id="book-form">
                            {[
                                { field: "ISBN", label: "ISBN *", readOnly: editMode },
                                { field: "bookno", label: "Book No. *", readOnly: false },
                                { field: "title", label: "Title *", readOnly: false },
                                { field: "author", label: "Author *", readOnly: false },
                                { field: "publisher", label: "Publisher", readOnly: false },
                            ].map(({ field, label, readOnly }) => (
                                <div className="form-group" key={field}>
                                    <label htmlFor={`book-${field}`}>{label}</label>
                                    <input id={`book-${field}`} type="text"
                                        value={form[field]}
                                        onChange={e => setForm({ ...form, [field]: e.target.value })}
                                        required={field !== "publisher"}
                                        readOnly={readOnly}
                                        className={readOnly ? "form-readonly" : ""}
                                    />
                                </div>
                            ))}
                            <div className="modal-actions">
                                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-violet" id="book-save-btn">
                                    {editMode ? "Save Changes" : "Add Book"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {delConfirm && (
                <div className="modal-overlay" onClick={() => setDelConfirm(null)}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🗑️ Delete Book?</h2>
                            <button className="modal-close" onClick={() => setDelConfirm(null)}>✕</button>
                        </div>
                        <p style={{ color: "rgba(200,190,255,0.75)", margin: "0.5rem 0 1.5rem" }}>
                            Are you sure you want to delete <strong style={{ color: "#e2e0ff" }}>"{delConfirm.title}"</strong>?
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setDelConfirm(null)}>Cancel</button>
                            <button className="btn btn-red" id="confirm-delete-btn" onClick={() => handleDelete(delConfirm.ISBN)}>Yes, Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManageBooks;
