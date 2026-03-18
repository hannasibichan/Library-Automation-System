import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, role }) {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
        return <Navigate to={role === "librarian" ? "/librarian/login" : "/login"} replace />;
    }

    try {
        const user = JSON.parse(userStr);
        const userRole = (user.role || "").toLowerCase();
        const requiredRole = (role || "").toLowerCase();

        if (requiredRole === "any") return children;

        if (requiredRole === "librarian" && userRole !== "librarian") {
            return <Navigate to="/librarian/login" replace />;
        }
        if (requiredRole === "user" && (userRole === "student" || userRole === "faculty")) {
            // Valid user
        } else if (requiredRole === "user") {
            // Not a student/faculty
            return <Navigate to="/login" replace />;
        }
    } catch {
        localStorage.clear();
        return <Navigate to="/login" replace />;
    }


    return children;
}

export default ProtectedRoute;
