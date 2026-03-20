import React from "react";
import { Navigate } from "react-router-dom";

/**
 * PublicRoute prevents logged-in users from accessing guest pages (Login, Register, etc.)
 * It redirects them to their respective dashboard instead.
 */
function PublicRoute({ children }) {
    const token = sessionStorage.getItem("token");
    const userStr = sessionStorage.getItem("user");

    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.role === "librarian") {
                return <Navigate to="/librarian/dashboard" replace />;
            } else {
                return <Navigate to="/dashboard" replace />;
            }
        } catch {
            sessionStorage.clear();
        }
    }

    return children;
}

export default PublicRoute;
