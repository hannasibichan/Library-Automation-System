import React, { useEffect, useState, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";
import { SkeletonTable } from "../components/SkeletonLoader";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/ManageBooks.css";

import config from "../config";
const API = config.API_BASE_URL;

const EMPTY = {
    ISBN: "", bookno: "", title: "", author: "", publisher: "",
    category: "General",
    lib_id: "", user_id: "", date_taken: "", return_date: "", fine: 0,
    cover_image: "", originalBookNo: "", originalISBN: "",
};

const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const fmtDateTime = (dt) =>
    dt ? new Date(dt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

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

    const compressImage = (dataUrl, quality = 0.7, maxWidth = 800) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.src = dataUrl;
        });
    };

    const processFile = async (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            alert("Please select an image file (jpg, png, webp, etc.)");
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const compressed = await compressImage(e.target.result);
            onChange(compressed);
        };
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
    const token = sessionStorage.getItem("token");
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [modal, setModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [delConfirm, setDelConfirm] = useState(null);
    const [selected, setSelected] = useState([]); // Keep state for now but remove UI
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
            category: b.category || "General",
            lib_id: b.lib_id ?? "",
            user_id: b.user_id ?? "",
            date_taken: b.date_taken ? b.date_taken.slice(0, 16) : "",
            return_date: b.return_date ? b.return_date.slice(0, 16) : "",
            fine: b.fine ?? "",
            cover_image: b.cover_image || "",
            originalBookNo: b.bookno,
            originalISBN: b.ISBN,
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
        const url    = editMode ? `${API}/books/${form.originalISBN}/${form.originalBookNo}` : `${API}/books`;
        const method = editMode ? "PUT" : "POST";
        const currentToken = sessionStorage.getItem("token");
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

    const handleDelete = async (isbn, bookno) => {
        try {
            const res  = await fetch(`${API}/books/${isbn}/${bookno}`, { method: "DELETE", headers });
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
            for (const b of selected) {
                await fetch(`${API}/books/${b.ISBN}/${b.bookno}`, { method: "DELETE", headers });
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
        else setSelected(books.map(b => ({ ISBN: b.ISBN, bookno: b.bookno })));
    };

    const toggleSelect = (book) => {
        const key = { ISBN: book.ISBN, bookno: book.bookno };
        const exists = selected.some(s => s.ISBN === key.ISBN && s.bookno === key.bookno);
        if (exists) setSelected(selected.filter(s => !(s.ISBN === key.ISBN && s.bookno === key.bookno)));
        else setSelected([...selected, key]);
    };
    const handleExportCSV = () => {
        if (!books.length) return toast("No books to export", "error");

        const headers = ["ISBN", "Book#", "Title", "Author", "Category", "Publisher", "Librarian", "Borrower", "Status", "Date Taken", "Return By", "Fine (Rs)"];
        const rows = books.map(b => [
            b.ISBN, b.bookno, b.title, b.author,
            b.category || "General", b.publisher || "-",
            b.librarian_name || b.lib_id || "-", 
            b.borrowed_by || (b.user_id ? `UID:${b.user_id}` : "-"), 
            b.status,
            b.date_taken ? new Date(b.date_taken).toISOString().split('T')[0] : "-",
            b.return_date ? new Date(b.return_date).toISOString().split('T')[0] : "-",
            b.current_fine || 0
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `library_catalog_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const handleExportPDF = () => {
        if (!books.length) return toast("No books to export", "error");
        
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(18);
        doc.text("Library Automation System - Book Catalog", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 30);
        
        const tableHeaders = [["ISBN", "Book#", "Title", "Author", "Status", "Date Taken", "Return By", "Fine (Rs)"]];
        const tableRows = books.map(b => [
            b.ISBN, b.bookno, b.title, b.author, 
            b.status.toUpperCase(),
            b.date_taken ? new Date(b.date_taken).toLocaleDateString('en-IN') : "-",
            b.return_date ? new Date(b.return_date).toLocaleDateString('en-IN') : "-",
            `Rs ${Number(b.current_fine || b.fine || 0).toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: 35,
            head: tableHeaders,
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], textColor: 255 },
            styles: { fontSize: 8, cellPadding: 3 },
            alternateRowStyles: { fillColor: [245, 243, 255] },
            margin: { top: 35 }
        });

        doc.save(`library_catalog_${new Date().toISOString().split('T')[0]}.pdf`);
        toast("PDF Report generated!", "success");
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">

                <div className="section-header">
                    <h2>📚 Manage Books</h2>
                    <div className="header-actions">
                        <button className="btn btn-csv-download" onClick={handleExportCSV}>
                            📥 CSV
                        </button>
                        <button className="btn btn-outline" onClick={handleExportPDF} style={{ background: "white", color: "var(--brand-dark)" }}>
                            📄 PDF
                        </button>
                        <button className="btn btn-violet" id="add-book-btn" onClick={openAdd}>+ Add Book</button>
                    </div>
                </div>

                <div className="search-bar">
                    <input id="manage-search-input" type="text" placeholder="🔍  Search books by title, author, user id, isbn..."
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
                                    <th style={{ width: 56 }}>Cover</th>
                                    <th>ISBN</th><th>Book#</th><th>Title</th><th>Author</th>
                                    <th>Category</th><th>Publisher</th><th>Librarian</th><th>Borrower</th><th>Status</th>
                                    <th>Date Taken</th><th>Return By</th><th>Fine (₹)</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {books.map((b, i) => (
                                    <tr key={`${b.ISBN}-${b.bookno}`} style={{ animationDelay: `${i * 0.03}s` }} className="fade-in-row">
                                        <td>
                                            <BookThumb src={b.cover_image} size={38} />
                                        </td>
                                        <td className="isbn-cell">{b.ISBN}</td>
                                        <td>{b.bookno}</td>
                                        <td className="book-title-cell">{b.title}</td>
                                        <td>{b.author}</td>
                                        <td>
                                            <span className="category-tag">{b.category || "General"}</span>
                                        </td>
                                        <td>{b.publisher || "—"}</td>
                                        <td className="lib-id-cell">
                                            {b.librarian_name || b.lib_id || "-"}
                                        </td>
                                        <td className="user-id-cell">
                                            {b.borrowed_by || (b.user_id ? `UID:${b.user_id}` : "-")}
                                        </td>
                                        <td className="book-status-cell">
                                            <span className={`chip ${b.status}`}>
                                                {b.status === 'requested' ? "Requested" : 
                                                 b.status === 'borrowed' ? `Borrowed${b.borrowed_by ? ` by ${b.borrowed_by}` : ` (UID:${b.user_id})`}` : 
                                                 "Available"}
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
                                            {(b.current_fine || b.fine) > 0
                                                ? <span className="chip danger">₹{Number(b.current_fine || b.fine).toFixed(2)}</span>
                                                : <span style={{ opacity: 0.7 }}>₹0.00</span>}
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => setDetailBook(b)}>🔍</button>
                                                <button className="btn btn-yellow btn-sm" id={`edit-${b.bookno}`} onClick={() => openEdit(b)}>✏️ Edit</button>
                                                <button className="btn btn-red    btn-sm" id={`delete-${b.bookno}`} onClick={() => setDelConfirm(b)}>🗑️</button>
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
                <div className="modal-overlay" id="add-book-modal-overlay">
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
                                        { field: "category",     label: "Category",    readOnly: false,    type: "text" },
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
                                            max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                                            value={form.date_taken}
                                            onChange={e => setForm({ ...form, date_taken: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="book-return_date">Return Date (Due)</label>
                                        <input id="book-return_date" type="datetime-local"
                                            min={form.date_taken}
                                            value={form.return_date}
                                            onChange={e => setForm({ ...form, return_date: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="book-fine">Fine (₹) <span className="field-hint">(Auto-calculated)</span></label>
                                        <input id="book-fine" type="number"
                                            value={form.fine || 0}
                                            readOnly 
                                            className="form-readonly"
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
                <div className="modal-overlay">
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
                                    ["Category",     detailBook.category || "General"],
                                    ["Publisher",    detailBook.publisher || "—"],
                                    ["Librarian ID", detailBook.lib_id ?? "—"],
                                    ["Status",       detailBook.status === 'requested' ? "Requested" : detailBook.user_id ? "Borrowed" : "Available"],
                                    ["Borrower",     detailBook.borrowed_by || (detailBook.user_id ? `UID: ${detailBook.user_id}` : "—")],
                                    ["User ID",      detailBook.user_id ?? "—"],
                                    ["Date Taken",   fmtDateTime(detailBook.date_taken)],
                                    ["Return By",    fmtDateTime(detailBook.return_date)],
                                    ["Fine",         (detailBook.current_fine || detailBook.fine) > 0 ? `₹${Number(detailBook.current_fine || detailBook.fine).toFixed(2)}` : "₹0.00"],
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
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🗑️ Delete Book?</h2>
                            <button className="modal-close" onClick={() => setDelConfirm(null)}>✕</button>
                        </div>
                        <p style={{ color: "var(--ink-4)", margin: "0.5rem 0 1.5rem", fontSize: "0.95rem" }}>
                            {delConfirm.status === 'available' ? (
                                <>Are you sure you want to delete <strong style={{ color: "var(--ink)" }}>"{delConfirm.title}"</strong>?</>
                            ) : (
                                <span style={{ color: "var(--coral)", fontWeight: 500 }}>
                                    ⚠️ This book is currently <strong>{delConfirm.status}</strong> and cannot be deleted. 
                                    Please return or cancel the request first.
                                </span>
                            )}
                        </p>
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setDelConfirm(null)}>
                                {delConfirm.status === 'available' ? 'Cancel' : 'Close'}
                            </button>
                            {delConfirm.status === 'available' && (
                                <button className="btn btn-red" id="confirm-delete-btn" onClick={() => handleDelete(delConfirm.ISBN, delConfirm.bookno)}>
                                    Yes, Delete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManageBooks;
