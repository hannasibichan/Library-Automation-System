import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import { SkeletonCard } from "../components/SkeletonLoader";
import { useToast } from "../components/Toast";
import "../styles/MyBooks.css";

const API = "http://localhost:5000/api";

const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function MyBooks() {
    const toast = useToast();
    const token = localStorage.getItem("token");
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [returnConfirm, setReturnConfirm] = useState(null);

    const fetchMyBooks = useCallback(() => {
        setLoading(true);
        fetch(`${API}/my-books`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => setBooks(Array.isArray(data) ? data : []))
            .catch(() => toast("Could not load your books", "error"))
            .finally(() => setLoading(false));
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchMyBooks(); }, [fetchMyBooks]);

    const handleReturn = async () => {
        if (!returnConfirm) return;
        const { ISBN, title } = returnConfirm;
        setReturnConfirm(null);
        try {
            const res  = await fetch(`${API}/return/${ISBN}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Failed to return", "error"); return; }
            const msg = data.fine > 0
                ? `"${title}" returned. Fine: ₹${Number(data.fine).toFixed(2)}`
                : `"${title}" returned successfully!`;
            toast(msg, data.fine > 0 ? "warning" : "success");
            fetchMyBooks();
        } catch { toast("Server error", "error"); }
    };

    const used = books.length;

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">

                <div className="section-header">
                    <h2>📖 My Borrowed Books</h2>
                    <span className={`chip ${used >= 5 ? "danger" : used > 0 ? "borrowed" : ""}`}>
                        {used} / 5 slots used
                    </span>
                </div>

                {/* Usage bar */}
                <div className="borrow-usage-bar">
                    <div className="progress-wrap">
                        <div className="progress-bar"
                            style={{
                                width: `${(used / 5) * 100}%`,
                                background: used >= 5 ? "linear-gradient(90deg,#ef4444,#f87171)" : undefined
                            }}>
                        </div>
                    </div>
                    <p className="usage-hint">
                        {used === 0 && "You haven't borrowed any books yet."}
                        {used > 0 && used < 5 && `You can still borrow ${5 - used} more book${5 - used !== 1 ? "s" : ""}.`}
                        {used >= 5 && "You've reached your borrowing limit. Return a book to borrow more."}
                    </p>
                </div>

                {loading ? (
                    <div className="books-grid">
                        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : books.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📭</span>
                        <p>You haven't borrowed any books yet.</p>
                    </div>
                ) : (
                    <div className="mybooks-list">
                        {books.map(book => {
                            const isOverdue = book.return_date && new Date(book.return_date) < new Date();
                            const activeFine = book.current_fine > 0 ? book.current_fine : book.fine;
                            return (
                                <div
                                    className={`mybook-card ${isOverdue ? "overdue-card" : ""}`}
                                    key={book.ISBN}
                                    id={`mybook-${book.ISBN}`}
                                >
                                    {/* ── Left: Cover image ── */}
                                    <div className="mybook-cover">
                                        {book.cover_image ? (
                                            <img
                                                src={book.cover_image}
                                                alt={book.title}
                                                className="mybook-cover-img"
                                            />
                                        ) : (
                                            <div className="mybook-cover-placeholder">📚</div>
                                        )}
                                    </div>

                                    {/* ── Right: Content ── */}
                                    <div className="mybook-body">

                                        {/* Title + status badges */}
                                        <div className="mybook-title-row">
                                            <span className="mybook-title">{book.title}</span>
                                            <div className="mybook-badges">
                                                <span className="chip borrowed">📖 Borrowed</span>
                                                {isOverdue && <span className="chip danger">⚠️ Overdue</span>}
                                            </div>
                                        </div>

                                        {/* Book info sub-line (from Book Information section) */}
                                        <div className="mybook-bookinfo">
                                            <span>✍️ {book.author}</span>
                                            {book.publisher && <span>🏢 {book.publisher}</span>}
                                            <span className="mybook-isbn">ISBN: {book.ISBN} · #{book.bookno}</span>
                                        </div>

                                        {/* ── Borrowing Details (maps to form section) ── */}
                                        <div className="borrow-details-grid">
                                            <div className="borrow-detail-item">
                                                <span className="borrow-detail-label">📅 Date Taken</span>
                                                <span className="borrow-detail-value">{fmtDate(book.date_taken)}</span>
                                            </div>
                                            <div className="borrow-detail-item">
                                                <span className="borrow-detail-label">🔔 Return By</span>
                                                <span className={`borrow-detail-value ${isOverdue ? "overdue-text" : ""}`}>
                                                    {fmtDate(book.return_date)}
                                                </span>
                                            </div>
                                            <div className="borrow-detail-item">
                                                <span className="borrow-detail-label">💰 Fine</span>
                                                <span className={`borrow-detail-value ${activeFine > 0 ? "fine-text" : ""}`}>
                                                    {activeFine > 0 ? `₹${Number(activeFine).toFixed(2)}` : "₹0.00"}
                                                </span>
                                            </div>
                                            <div className="borrow-detail-item">
                                                <span className="borrow-detail-label">📚 Issued By</span>
                                                <span className="borrow-detail-value">
                                                    {book.librarian_name || (book.lib_id ? `Lib #${book.lib_id}` : "—")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Return action */}
                                        <div className="mybook-actions">
                                            <button
                                                className="btn btn-yellow btn-sm"
                                                id={`return-${book.ISBN}`}
                                                onClick={() => setReturnConfirm(book)}
                                            >
                                                📤 Return Book
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Return confirmation modal */}
            {returnConfirm && (
                <div className="modal-overlay" onClick={() => setReturnConfirm(null)}>
                    <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📤 Return Book?</h2>
                            <button className="modal-close" onClick={() => setReturnConfirm(null)}>✕</button>
                        </div>
                        <p style={{ color: "rgba(200,190,255,0.75)", lineHeight: 1.6, marginBottom: "0.5rem" }}>
                            You are about to return{" "}
                            <strong style={{ color: "#e2e0ff" }}>"{returnConfirm.title}"</strong>.
                            Once returned, another user may borrow it.
                        </p>
                        {returnConfirm.current_fine > 0 && (
                            <div className="fine-warning">
                                ⚠️ This book is overdue. A fine of{" "}
                                <strong>₹{Number(returnConfirm.current_fine).toFixed(2)}</strong>{" "}
                                will be applied.
                            </div>
                        )}
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setReturnConfirm(null)}>Cancel</button>
                            <button className="btn btn-yellow" id="confirm-return-btn" onClick={handleReturn}>
                                Yes, Return It
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyBooks;
