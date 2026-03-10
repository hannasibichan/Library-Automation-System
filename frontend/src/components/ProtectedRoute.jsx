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
        if (role === "any") return children;
        if (role === "librarian" && user.role !== "librarian") {
            return <Navigate to="/librarian/login" replace />;
        }
        if (role === "user" && user.role === "librarian") {
            return <Navigate to="/librarian/dashboard" replace />;
        }
    } catch {
        localStorage.clear();
        return <Navigate to="/login" replace />;
    }


    return children;
}

export default ProtectedRoute;
