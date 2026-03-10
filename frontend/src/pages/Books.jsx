import React, { useEffect, useState, useCallback, useRef } from "react";
import Navbar from "../components/Navbar";
import { SkeletonCard } from "../components/SkeletonLoader";
import { useToast } from "../components/Toast";
import "../styles/Books.css";

const API = "http://localhost:5000/api";

function BookDetailModal({ book, onClose, onBorrow, isBorrowed, isMyBook }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal book-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📖 Book Details</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="book-detail-header">
                    <div className="book-cover-placeholder">📚</div>
                    <div>
                        <div className="book-detail-title">{book.title}</div>
                        <div className="book-detail-author">by {book.author}</div>
                        <span className={`chip ${book.user_id ? "borrowed" : "available"}`}>
                            <span className={`avail-dot ${book.user_id ? "borrowed" : "available"}`}></span>
                            {book.user_id ? "Borrowed" : "Available"}
                        </span>
                    </div>
                </div>

                <div className="divider" style={{ margin: "1rem 0 0.5rem" }}></div>

                {[
                    ["ISBN", book.ISBN],
                    ["Book No.", "#" + book.bookno],
                    ["Publisher", book.publisher || "—"],
                    ["Added by", book.librarian_name || "Library"],
                    ["Status", book.user_id ? (isMyBook ? "Borrowed by you" : "Borrowed by another user") : "Available to borrow"],
                ].map(([k, v]) => (
                    <div className="book-detail-row" key={k}>
                        <span className="book-detail-key">{k}</span>
                        <span className="book-detail-val">{v}</span>
                    </div>
                ))}

                <div className="modal-actions">
                    <button className="btn btn-outline" onClick={onClose}>Close</button>
                    {isMyBook ? (
                        <span className="chip borrowed" style={{ padding: "0.5rem 1rem" }}>You borrowed this</span>
                    ) : !book.user_id ? (
                        <button className="btn btn-green" id={`modal-borrow-${book.ISBN}`}
                            onClick={() => { onBorrow(book.ISBN, book.title); onClose(); }}>
                            📥 Borrow Book
                        </button>
                    ) : (
                        <span className="chip" style={{ opacity: 0.55, padding: "0.5rem 1rem" }}>Unavailable</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function Books() {
    const toast = useToast();
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : {};

    const [books, setBooks] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [page, setPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState("all");
    const debounceRef = useRef(null);
    const PER_PAGE = 12;

    const fetchBooks = useCallback((q = "") => {
        setLoading(true);
        fetch(`${API}/books${q ? `?search=${encodeURIComponent(q)}` : ""}`)
            .then(r => r.json())
            .then(data => { setBooks(Array.isArray(data) ? data : []); setPage(1); })
            .catch(() => toast("Could not load books", "error"))
            .finally(() => setLoading(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchBooks(); }, [fetchBooks]);

    // Debounced search
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchBooks(val), 350);
    };

    const handleBorrow = async (isbn, title) => {
        try {
            const res = await fetch(`${API}/borrow/${isbn}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Failed to borrow", "error"); return; }
            toast(`"${title}" borrowed successfully!`, "success");
            fetchBooks(search);
        } catch { toast("Server error", "error"); }
    };

    // Filter
    const filtered = books.filter(b => {
        if (activeFilter === "available") return !b.user_id;
        if (activeFilter === "borrowed") return !!b.user_id;
        if (activeFilter === "mine") return b.user_id === user.user_id;
        return true;
    });

    // Pagination
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">

                <div className="section-header">
                    <h2>📚 Library Catalog</h2>
                    <span className="chip">{filtered.length} book{filtered.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Search */}
                <div className="search-bar">
                    <input id="book-search-input" type="text"
                        placeholder="🔍  Search by title, author, ISBN, publisher…"
                        value={search} onChange={handleSearchChange} />
                    {search && (
                        <button className="btn btn-outline btn-sm" onClick={() => { setSearch(""); fetchBooks(); }}>
                            Clear ✕
                        </button>
                    )}
                </div>

                {/* Filter chips */}
                <div className="filter-chips">
                    {[
                        { key: "all", label: `All (${books.length})` },
                        { key: "available", label: `Available (${books.filter(b => !b.user_id).length})` },
                        { key: "borrowed", label: `Borrowed (${books.filter(b => !!b.user_id).length})` },
                        { key: "mine", label: `My Borrows (${books.filter(b => b.user_id === user.user_id).length})` },
                    ].map(f => (
                        <button key={f.key} className={`filter-chip ${activeFilter === f.key ? "active" : ""}`}
                            onClick={() => { setActiveFilter(f.key); setPage(1); }}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="books-grid">
                        {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : paginated.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">🔍</span>
                        <p>No books match your search or filter.</p>
                        <button className="btn btn-outline" onClick={() => { setSearch(""); setActiveFilter("all"); fetchBooks(); }}>
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="books-grid">
                            {paginated.map(book => {
                                const isBorrowed = !!book.user_id;
                                const isMyBook = book.user_id === user.user_id;
                                return (
                                    <div className="book-card" key={book.ISBN} id={`book-${book.ISBN}`}
                                        onClick={() => setDetail(book)}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div className="book-card-title">{book.title}</div>
                                            <span className={`avail-dot ${isBorrowed ? "borrowed" : "available"}`} style={{ flexShrink: 0, marginTop: 4 }}></span>
                                        </div>
                                        <div className="book-card-meta">
                                            <span className="chip">✍️ {book.author}</span>
                                            {book.publisher && <span className="chip">🏢 {book.publisher}</span>}
                                            <span className={`chip ${isBorrowed ? "borrowed" : "available"}`}>
                                                {isBorrowed ? "Borrowed" : "Available"}
                                            </span>
                                        </div>
                                        <div style={{ color: "rgba(200,190,255,0.45)", fontSize: "0.72rem" }}>
                                            ISBN: {book.ISBN}
                                        </div>
                                        <div className="book-card-actions" onClick={e => e.stopPropagation()}>
                                            {isMyBook ? (
                                                <span className="chip borrowed">✔ You borrowed this</span>
                                            ) : !isBorrowed ? (
                                                <button className="btn btn-green btn-sm" id={`borrow-${book.ISBN}`}
                                                    onClick={() => handleBorrow(book.ISBN, book.title)}>
                                                    📥 Borrow
                                                </button>
                                            ) : (
                                                <span className="chip" style={{ opacity: 0.45 }}>Unavailable</span>
                                            )}
                                            <button className="btn btn-ghost btn-sm" onClick={() => setDetail(book)}>Details</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button className="btn btn-ghost btn-sm" disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}>← Prev</button>
                                <span className="page-info">Page {page} of {totalPages}</span>
                                <button className="btn btn-ghost btn-sm" disabled={page === totalPages}
                                    onClick={() => setPage(p => p + 1)}>Next →</button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {detail && (
                <BookDetailModal
                    book={detail}
                    onClose={() => setDetail(null)}
                    onBorrow={handleBorrow}
                    isBorrowed={!!detail.user_id}
                    isMyBook={detail.user_id === user.user_id}
                />
            )}
        </div>
    );
}

export default Books;
