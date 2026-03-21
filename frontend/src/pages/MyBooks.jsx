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
    const token = sessionStorage.getItem("token");
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMyBooks = useCallback(() => {
        setLoading(true);
        fetch(`${API}/my-books`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => setBooks(Array.isArray(data) ? data : []))
            .catch(() => toast("Could not load your books", "error"))
            .finally(() => setLoading(false));
    }, [token, toast]);

    useEffect(() => { fetchMyBooks(); }, [fetchMyBooks]);
    const handleCancelRequest = async (book) => {
        if (!window.confirm(`Cancel your reservation for "${book.title}"?`)) return;
        try {
            const res = await fetch(`${API}/cancel-request/${book.ISBN}/${book.bookno}`, { 
                method: "POST", 
                headers: { Authorization: `Bearer ${token}` } 
            });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Failed to cancel", "error"); return; }
            toast("Reservation cancelled", "success");
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
                            const returnDate = new Date(book.return_date);
                            const isOverdue = book.return_date && new Date(returnDate.setHours(23, 59, 59, 999)) < new Date();
                            const activeFine = book.current_fine; // Prioritize calculated fine
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
                                                {book.status === 'requested' ? (
                                                    <span className="chip" style={{ background: "var(--amber-light)", color: "#92400E" }}>⏳ Requested</span>
                                                ) : (
                                                    <span className="chip borrowed">📖 Borrowed</span>
                                                )}
                                                {isOverdue && <span className="chip danger">⚠️ Overdue</span>}
                                            </div>
                                        </div>

                                        {/* Book info sub-line */}
                                        <div className="mybook-bookinfo">
                                            <span>✍️ {book.author}</span>
                                            <span className="mybook-isbn">ISBN: {book.ISBN} · #{book.bookno}</span>
                                        </div>

                                        {/* ── Borrowing/Request Details ── */}
                                        <div className="borrow-details-grid">
                                            {book.status === 'requested' ? (
                                                <>
                                                    <div className="borrow-detail-item">
                                                        <span className="borrow-detail-label">🕒 Requested At</span>
                                                        <span className="borrow-detail-value">
                                                            {book.date_requested ? new Date(book.date_requested).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                                                        </span>
                                                    </div>
                                                    <div className="borrow-detail-item">
                                                        <span className="borrow-detail-label" style={{ color: "#dc2626" }}>⌛ Pick up by</span>
                                                        <span className="borrow-detail-value" style={{ color: "#dc2626" }}>
                                                            {new Date(book.request_expiry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
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
                                                </>
                                            )}
                                            <div className="borrow-detail-item">
                                                <span className="borrow-detail-label">💰 Fine</span>
                                                <span className={`borrow-detail-value ${activeFine > 0 ? "fine-text" : ""}`}>
                                                    {activeFine > 0 ? `₹${Number(activeFine).toFixed(2)}` : "₹0.00"}
                                                </span>
                                            </div>
                                            <div className="borrow-detail-item">
                                                <span className="borrow-detail-label">📚 Issued By</span>
                                                <span className="borrow-detail-value">
                                                    {book.status === 'requested' ? "Waiting..." : (book.librarian_name || "—")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="mybook-actions">
                                            {book.status === 'requested' ? (
                                                <button className="btn btn-outline btn-sm" onClick={() => handleCancelRequest(book)}>
                                                    Cancel Request
                                                </button>
                                            ) : (
                                                <span className="chip" style={{ opacity: 0.6 }}>📢 Visit library to return</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MyBooks;
