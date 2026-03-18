import React, { useEffect, useState, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";
import { SkeletonTable } from "../components/SkeletonLoader";
import "../styles/ManageBooks.css";

const API = "http://localhost:5000/api";

const EMPTY = {
    ISBN: "", bookno: "", title: "", author: "", publisher: "",
    lib_id: "", user_id: "", date_taken: "", return_date: "", fine: "",
    cover_image: "",
};

const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (dt) =>
    dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// ── Inline book cover thumbnail ──────────────────────────────────────────────
function BookThumb({ src, size = 40 }) {
    if (!src) return <div className="book-thumb-placeholder" style={{ width: size, height: Math.round(size * 1.35) }}>📚</div>;
    return (
        <img
            src={src}
            alt="cover"
            className="book-thumb-img"
            style={{ width: size, height: Math.round(size * 1.35) }}
        />
    );
}

// ── Image uploader with drag-drop + preview ──────────────────────────────────
function ImageUploader({ value, onChange }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);

    const processFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            alert("Please select an image file (jpg, png, webp, etc.)");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            alert("Image must be under 2 MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => onChange(e.target.result);
        reader.readAsDataURL(file);
    };

    const handleFile = (e) => processFile(e.target.files[0]);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        processFile(e.dataTransfer.files[0]);
    };

    return (
        <div className="img-uploader-wrap">
            {/* Drop zone */}
            <div
                className={`img-drop-zone ${dragOver ? "drag-over" : ""} ${value ? "has-image" : ""}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                {value ? (
                    <img src={value} alt="Book cover preview" className="img-preview" />
                ) : (
                    <div className="img-drop-hint">
                        <span className="img-drop-icon">🖼️</span>
                        <span>Click or drag & drop a cover image</span>
                        <span className="img-drop-sub">JPG · PNG · WEBP · max 2 MB</span>
                    </div>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                id="cover-image-input"
                onChange={handleFile}
            />

            {/* Action buttons */}
            <div className="img-uploader-actions">
                <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => inputRef.current?.click()}>
                    📁 Choose File
                </button>
                {value && (
                    <button type="button" className="btn btn-red btn-sm"
                        onClick={() => { onChange(""); if (inputRef.current) inputRef.current.value = ""; }}>
                        🗑️ Remove
                    </button>
                )}
            </div>
        </div>
    );
}

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
    const [selected, setSelected] = useState([]);
    const [detailBook, setDetailBook] = useState(null);
    const debounceRef = useRef(null);

    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    const fetchBooks = useCallback((q = "") => {
        setLoading(true);
        fetch(`${API}/books${q ? `?search=${encodeURIComponent(q)}` : ""}`)
            .then(r => r.json())
            .then(data => {
                setBooks(Array.isArray(data) ? data : []);
                setSelected([]);
            })
            .catch(() => toast("Failed to load books", "error"))
            .finally(() => setLoading(false));
    }, [toast]);

    useEffect(() => { fetchBooks(); }, [fetchBooks]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchBooks(val), 350);
    };

    const openAdd = () => { setForm(EMPTY); setEditMode(false); setModal(true); };

    const openEdit = (b) => {
        setForm({
            ISBN: b.ISBN,
            bookno: b.bookno,
            title: b.title,
            author: b.author,
            publisher: b.publisher || "",
            lib_id: b.lib_id ?? "",
            user_id: b.user_id ?? "",
            date_taken: b.date_taken ? b.date_taken.slice(0, 16) : "",
            return_date: b.return_date ? b.return_date.slice(0, 16) : "",
            fine: b.fine ?? "",
            cover_image: b.cover_image || "",
        });
        setEditMode(true);
        setModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...form,
            lib_id:      form.lib_id      !== "" ? Number(form.lib_id)  : null,
            user_id:     form.user_id     !== "" ? Number(form.user_id) : null,
            date_taken:  form.date_taken  || null,
            return_date: form.return_date || null,
            fine:        form.fine        !== "" ? Number(form.fine)     : 0,
            cover_image: form.cover_image || null,
        };
        const url    = editMode ? `${API}/books/${form.ISBN}` : `${API}/books`;
        const method = editMode ? "PUT" : "POST";
        const currentToken = localStorage.getItem("token");
        const fetchHeaders = { ...headers, Authorization: `Bearer ${currentToken}` };
        try {
            const res  = await fetch(url, { method, headers: fetchHeaders, body: JSON.stringify(payload) });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Error", "error"); return; }
            toast(editMode ? "Book updated!" : "Book added!", "success");
            setModal(false);
            fetchBooks(search);
        } catch { toast("Server error", "error"); }
    };

    const handleDelete = async (isbn) => {
        try {
            const res  = await fetch(`${API}/books/${isbn}`, { method: "DELETE", headers });
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
                                    <th style={{ width: 56 }}>Cover</th>
                                    <th>ISBN</th><th>Book#</th><th>Title</th><th>Author</th>
                                    <th>Publisher</th><th>Lib ID</th><th>Status</th>
                                    <th>Date Taken</th><th>Return By</th><th>Fine (₹)</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {books.map((b, i) => (
                                    <tr key={b.ISBN} style={{ animationDelay: `${i * 0.03}s` }} className="fade-in-row">
                                        <td>
                                            <input type="checkbox" checked={selected.includes(b.ISBN)} onChange={() => toggleSelect(b.ISBN)} />
                                        </td>
                                        <td>
                                            <BookThumb src={b.cover_image} size={38} />
                                        </td>
                                        <td className="isbn-cell">{b.ISBN}</td>
                                        <td>{b.bookno}</td>
                                        <td className="book-title-cell">{b.title}</td>
                                        <td>{b.author}</td>
                                        <td>{b.publisher || "—"}</td>
                                        <td style={{ color: "rgba(200,190,255,0.6)", fontSize: "0.8rem" }}>
                                            {b.lib_id ?? "—"}
                                        </td>
                                        <td className="book-status-cell">
                                            <span className={`chip ${b.user_id ? "borrowed" : "available"}`}>
                                                {b.user_id
                                                    ? `Borrowed${b.borrowed_by ? ` by ${b.borrowed_by}` : ` (UID:${b.user_id})`}`
                                                    : "Available"}
                                            </span>
                                        </td>
                                        <td className="datetime-cell">{fmtDate(b.date_taken)}</td>
                                        <td className="datetime-cell">
                                            {b.return_date ? (
                                                <span style={{ color: new Date(b.return_date) < new Date() ? "#f87171" : undefined }}>
                                                    {fmtDate(b.return_date)}
                                                    {new Date(b.return_date) < new Date() && " ⚠️"}
                                                </span>
                                            ) : "—"}
                                        </td>
                                        <td>
                                            {b.fine > 0
                                                ? <span className="chip danger">₹{Number(b.fine).toFixed(2)}</span>
                                                : <span style={{ opacity: 0.4 }}>₹0.00</span>}
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setDetailBook(b)}>🔍</button>
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
                <div className="modal-overlay" id="add-book-modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal modal-wide"
                        style={{ display: "flex", flexDirection: "column", maxHeight: "92vh", padding: 0, overflow: "hidden" }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header" style={{ padding: "1.75rem 2.25rem 1rem", borderBottom: "1px solid var(--border)", marginBottom: 0 }}>
                            <h2>{editMode ? "✏️ Edit Book Record" : "📚 Add New Book"}</h2>
                            <button className="modal-close" onClick={() => setModal(false)}>✕</button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
                            {/* Scrollable form body */}
                            <div className="modal-scroll-body" style={{ flex: 1, overflowY: "auto", padding: "1.25rem 2.25rem" }}>
                                {/* ── Book info ── */}
                                <div className="form-section-label">📖 Book Information</div>
                                <div className="form-grid-2">
                                    {[
                                        { field: "ISBN",         label: "ISBN *",      readOnly: editMode, type: "text" },
                                        { field: "bookno",       label: "Book No. *",  readOnly: false,    type: "text" },
                                        { field: "title",        label: "Title *",     readOnly: false,    type: "text" },
                                        { field: "author",       label: "Author *",    readOnly: false,    type: "text" },
                                        { field: "publisher",    label: "Publisher",   readOnly: false,    type: "text" },
                                    ].map(({ field, label, readOnly, type }) => (
                                        <div className="form-group" key={field}>
                                            <label htmlFor={`book-${field}`}>{label}</label>
                                            <input id={`book-${field}`} type={type}
                                                value={form[field]}
                                                onChange={e => setForm({ ...form, [field]: e.target.value })}
                                                required={field !== "publisher"}
                                                readOnly={readOnly}
                                                className={readOnly ? "form-readonly" : ""}
                                            />
                                        </div>
                                    ))}
                                    <div className="form-group">
                                        <label htmlFor="book-lib_id">Librarian ID</label>
                                        <input id="book-lib_id" type="number" min="1"
                                            placeholder="Auto-filled from session"
                                            value={form.lib_id}
                                            onChange={e => setForm({ ...form, lib_id: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* ── Cover Image ── */}
                                <div className="form-section-label" style={{ marginTop: "1.25rem" }}>
                                    🖼️ Book Cover <span className="field-hint">(optional — shown in catalog & book cards)</span>
                                </div>
                                <ImageUploader
                                    value={form.cover_image}
                                    onChange={(val) => setForm(f => ({ ...f, cover_image: val }))}
                                />

                                {/* ── Borrowing info ── */}
                                <div className="form-section-label" style={{ marginTop: "1.25rem" }}>📋 Borrowing Details <span className="field-hint">(optional — fill if book is already taken)</span></div>
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label htmlFor="book-user_id">User ID (Borrower)</label>
                                        <input id="book-user_id" type="number" min="1"
                                            placeholder="Leave blank if not borrowed"
                                            value={form.user_id}
                                            onChange={e => setForm({ ...form, user_id: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="book-date_taken">Date Taken</label>
                                        <input id="book-date_taken" type="datetime-local"
                                            value={form.date_taken}
                                            onChange={e => setForm({ ...form, date_taken: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="book-return_date">Return Date (Due)</label>
                                        <input id="book-return_date" type="datetime-local"
                                            value={form.return_date}
                                            onChange={e => setForm({ ...form, return_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="book-fine">Fine (₹)</label>
                                        <input id="book-fine" type="number" min="0" step="0.01"
                                            placeholder="0.00"
                                            value={form.fine}
                                            onChange={e => setForm({ ...form, fine: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sticky footer */}
                            <div className="modal-actions" style={{ padding: "1.5rem 2.25rem", marginTop: 0, borderTop: "1px solid var(--border)", background: "var(--bg-alt)" }}>
                                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-violet" id="book-save-btn">
                                    {editMode ? "Save Changes" : "Add Book"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Borrow Details Modal */}
            {detailBook && (
                <div className="modal-overlay" onClick={() => setDetailBook(null)}>
                    <div className="modal modal-wide"
                        style={{ display: "flex", flexDirection: "column", maxHeight: "92vh", padding: 0, overflow: "hidden" }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header" style={{ padding: "1.75rem 2.25rem 1rem", borderBottom: "1px solid var(--border)", marginBottom: 0 }}>
                            <h2>📋 Book Record Details</h2>
                            <button className="modal-close" onClick={() => setDetailBook(null)}>✕</button>
                        </div>

                        {/* Scrollable details body */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 2.25rem" }}>
                            {/* Cover image preview in detail modal */}
                            {detailBook.cover_image && (
                                <div className="detail-cover-wrap">
                                    <img src={detailBook.cover_image} alt={detailBook.title} className="detail-cover-img" />
                                </div>
                            )}

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: "0.5rem 0" }}>
                                {[
                                    ["Title",        detailBook.title],
                                    ["ISBN",         detailBook.ISBN],
                                    ["Book No.",     "#" + detailBook.bookno],
                                    ["Author",       detailBook.author],
                                    ["Publisher",    detailBook.publisher || "—"],
                                    ["Librarian ID", detailBook.lib_id ?? "—"],
                                    ["Status",       detailBook.user_id ? "Borrowed" : "Available"],
                                    ["Borrower",     detailBook.borrowed_by || (detailBook.user_id ? `UID: ${detailBook.user_id}` : "—")],
                                    ["User ID",      detailBook.user_id ?? "—"],
                                    ["Date Taken",   fmtDateTime(detailBook.date_taken)],
                                    ["Return By",    fmtDateTime(detailBook.return_date)],
                                    ["Fine",         detailBook.fine > 0 ? `₹${Number(detailBook.fine).toFixed(2)}` : "₹0.00"],
                                ].map(([k, v]) => (
                                    <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--bg-alt)", paddingBottom: "0.6rem" }}>
                                        <span style={{ color: "var(--ink-4)", fontSize: "0.82rem", fontWeight: 500 }}>{k}</span>
                                        <span style={{ color: "var(--ink)", fontWeight: 600, fontSize: "0.88rem" }}>{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions" style={{ padding: "1.5rem 2.25rem", marginTop: 0, borderTop: "1px solid var(--border)", background: "var(--bg-alt)" }}>
                            <button className="btn btn-outline" onClick={() => setDetailBook(null)}>Close</button>
                            <button className="btn btn-yellow btn-sm" onClick={() => { openEdit(detailBook); setDetailBook(null); }}>✏️ Edit Record</button>
                        </div>
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
