import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, role }) {
    const token = sessionStorage.getItem("token");
    const userStr = sessionStorage.getItem("user");

    // Case 1: Not logged in at all
    if (!token || !userStr) {
        return <Navigate to={role === "librarian" ? "/librarian/login" : "/login"} replace />;
    }

    try {
        const user = JSON.parse(userStr);
        if (!user) throw new Error("Null user object");

        const userRole = (user.role || "").toLowerCase();
        const requiredRole = (role || "").toLowerCase();

        // Case 2: Role mismatch (Student trying to enter Librarian area)
        if (requiredRole === "librarian" && userRole !== "librarian") {
            // If they are a student/faculty, move them to their own dashboard instead of login
            if (userRole === "student" || userRole === "faculty") {
                return <Navigate to="/dashboard" replace />;
            }
            return <Navigate to="/librarian/login" replace />;
        }

        // Case 3: Role mismatch (Librarian trying to enter Student area)
        if (requiredRole === "user" && (userRole === "student" || userRole === "faculty")) {
            // Valid user
        } else if (requiredRole === "user") {
            // Probably a librarian or invalid role
            if (userRole === "librarian") {
                return <Navigate to="/librarian/dashboard" replace />;
            }
            return <Navigate to="/login" replace />;
        }

        // Case 4: Profile or other "any" routes
        if (requiredRole === "any") return children;

    } catch (err) {
        console.error("Auth validation failed:", err);
        sessionStorage.clear();
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;
