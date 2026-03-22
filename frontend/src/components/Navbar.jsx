import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/Navbar.css";
import config from "../config";

function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const userStr = sessionStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const userRole = (user?.role || "").toLowerCase().trim();
    const isLib = userRole === "librarian";
    const isUser = userRole === "student" || userRole === "faculty";
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [requestCount, setRequestCount] = useState(0);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", handler);
        return () => window.removeEventListener("scroll", handler);
    }, []);

    // Close menu on route change
    useEffect(() => setOpen(false), [location]);

    useEffect(() => {
        if (isLib) {
            const fetchCount = () => {
                fetch(`${config.API_BASE_URL}/requests/count`, {
                    headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
                })
                .then(r => r.json())
                .then(data => setRequestCount(data.count || 0))
                .catch(() => {});
            };
            fetchCount();
            const interval = setInterval(fetchCount, 60000); // refresh every minute
            return () => clearInterval(interval);
        }
    }, [isLib]);

    const handleLogout = () => {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        navigate(isLib ? "/librarian/login" : "/login");
    };

    const isActive = (p) => location.pathname === p ? "active" : "";
    const initials = user?.name ? user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) : "?";

    const userLinks = (
        <>
            <li><Link className={isActive("/dashboard")} to="/dashboard">🏠 Dashboard</Link></li>
            <li><Link className={isActive("/books")} to="/books">📚 Books</Link></li>
            <li><Link className={isActive("/my-books")} to="/my-books">🔖 My Books</Link></li>
            <li><Link className={isActive("/profile")} to="/profile">👤 Profile</Link></li>
        </>
    );

    const libLinks = (
        <>
            <li><Link className={isActive("/librarian/dashboard")} to="/librarian/dashboard">🏠 Dashboard</Link></li>
            <li><Link className={isActive("/librarian/manage-books")} to="/librarian/manage-books">📖 Books</Link></li>
            <li>
                <Link className={isActive("/librarian/requests")} to="/librarian/requests" style={{ position: "relative" }}>
                    ⏳ Requests
                    {requestCount > 0 && (
                        <span className="nav-badge">{requestCount}</span>
                    )}
                </Link>
            </li>
            <li><Link className={isActive("/librarian/borrowed")} to="/librarian/borrowed">📖 Borrowed</Link></li>
            <li><Link className={isActive("/librarian/manage-records")} to="/librarian/manage-records">📊 Records</Link></li>
            <li><Link className={isActive("/librarian/manage-users")} to="/librarian/manage-users">👥 Users</Link></li>
            {user?.lib_id === 1 && (
                <li><Link className={isActive("/librarian/manage-admins")} to="/librarian/manage-admins">🛡️ Admins</Link></li>
            )}
            <li><Link className={isActive("/profile")} to="/profile">👤 Profile</Link></li>
        </>
    );

    const guestLinks = (
        <>
            <li><Link className={isActive("/")} to="/">Home</Link></li>
            <li><Link className={isActive("/login")} to="/login">Login</Link></li>
            <li><Link className={isActive("/register")} to="/register">Register</Link></li>
        </>
    );

    return (
        <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
            <button
                className={`navbar-toggle ${open ? "open" : ""}`}
                onClick={() => setOpen(!open)}
                id="menu-toggle"
                aria-label={open ? "Close menu" : "Open menu"}
            >
                <span></span><span></span><span></span>
            </button>

            <Link to={user ? (isLib ? "/librarian/dashboard" : "/dashboard") : "/"} className="navbar-brand">
                <span className="navbar-logo">📖</span>
                <span className="navbar-title">SmartStack</span>
            </Link>

            <ul className={`navbar-links ${open ? "open" : ""}`}>
                {user ? (isLib ? libLinks : isUser ? userLinks : guestLinks) : guestLinks}
            </ul>

            {user && (
                <div className="navbar-right">
                    <div className="navbar-avatar" title={user.name}>{initials}</div>
                    <span className="navbar-username">{user.name}</span>
                    <button className="navbar-logout" id="logout-btn" onClick={handleLogout}>
                        Sign Out
                    </button>
                </div>
            )}
        </nav>
    );
}

export default Navbar;
