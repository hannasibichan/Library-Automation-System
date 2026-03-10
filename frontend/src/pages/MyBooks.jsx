import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import { SkeletonCard } from "../components/SkeletonLoader";
import { useToast } from "../components/Toast";
import "../styles/MyBooks.css";

const API = "http://localhost:5000/api";

function MyBooks() {
    const toast = useToast();
    const token = localStorage.getItem("token");
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [returnConfirm, setReturnConfirm] = useState(null); // book to confirm

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
            const res = await fetch(`${API}/return/${ISBN}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Failed to return", "error"); return; }
            toast(`"${title}" returned successfully!`, "success");
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
                    <div className="books-grid">
                        {books.map(book => (
                            <div className="book-card" key={book.ISBN} id={`mybook-${book.ISBN}`}>
                                <div className="book-card-title">{book.title}</div>
                                <div className="book-card-meta">
                                    <span className="chip">✍️ {book.author}</span>
                                    {book.publisher && <span className="chip">🏢 {book.publisher}</span>}
                                    <span className="chip borrowed">📖 Borrowed</span>
                                </div>
                                <div style={{ color: "rgba(200,190,255,0.4)", fontSize: "0.72rem" }}>
                                    ISBN: {book.ISBN} · #{book.bookno}
                                </div>
                                <div className="book-card-actions">
                                    <button className="btn btn-yellow btn-sm" id={`return-${book.ISBN}`}
                                        onClick={() => setReturnConfirm(book)}>
                                        📤 Return Book
                                    </button>
                                </div>
                            </div>
                        ))}
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
