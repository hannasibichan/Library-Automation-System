import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import LibrarianLogin from "./pages/LibrarianLogin";
import LibrarianDashboard from "./pages/LibrarianDashboard";
import Books from "./pages/Books";
import MyBooks from "./pages/MyBooks";
import ManageBooks from "./pages/ManageBooks";
import ManageRecords from "./pages/ManageRecords";
import ManageUsers from "./pages/ManageUsers";
import ManageRequests from "./pages/ManageRequests";
import ManageBorrowed from "./pages/ManageBorrowed";
import Profile from "./pages/Profile";
import AddLibrarian from "./pages/AddLibrarian";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { ToastProvider } from "./components/Toast";

function App() {
    return (
        <ToastProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public/Guest Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={
                        <PublicRoute><Login /></PublicRoute>
                    } />
                    <Route path="/register" element={
                        <PublicRoute><Register /></PublicRoute>
                    } />
                    <Route path="/librarian/login" element={
                        <PublicRoute><LibrarianLogin /></PublicRoute>
                    } />
                    <Route path="/forgot-password" element={
                        <PublicRoute><ForgotPassword /></PublicRoute>
                    } />
                    <Route path="/reset-password" element={
                        <PublicRoute><ResetPassword /></PublicRoute>
                    } />

                    {/* Shared/User-protected (accessible by both) */}
                    <Route path="/profile" element={
                        <ProtectedRoute role="any"><Profile /></ProtectedRoute>
                    } />

                    {/* User-only protected */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute role="user"><Dashboard /></ProtectedRoute>
                    } />
                    <Route path="/books" element={
                        <ProtectedRoute role="user"><Books /></ProtectedRoute>
                    } />
                    <Route path="/my-books" element={
                        <ProtectedRoute role="user"><MyBooks /></ProtectedRoute>
                    } />

                    {/* Librarian-protected */}
                    <Route path="/librarian/dashboard" element={
                        <ProtectedRoute role="librarian"><LibrarianDashboard /></ProtectedRoute>
                    } />
                    <Route path="/librarian/manage-books" element={
                        <ProtectedRoute role="librarian"><ManageBooks /></ProtectedRoute>
                    } />
                    <Route path="/librarian/manage-records" element={
                        <ProtectedRoute role="librarian"><ManageRecords /></ProtectedRoute>
                    } />
                    <Route path="/librarian/manage-users" element={
                        <ProtectedRoute role="librarian"><ManageUsers /></ProtectedRoute>
                    } />
                    <Route path="/librarian/requests" element={
                        <ProtectedRoute role="librarian"><ManageRequests /></ProtectedRoute>
                    } />
                    <Route path="/librarian/borrowed" element={
                        <ProtectedRoute role="librarian"><ManageBorrowed /></ProtectedRoute>
                    } />
                    <Route path="/librarian/add-librarian" element={
                        <ProtectedRoute role="librarian"><AddLibrarian /></ProtectedRoute>
                    } />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </ToastProvider>
    );
}

export default App;
