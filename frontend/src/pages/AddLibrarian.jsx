import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../components/Toast";
import "../styles/AddLibrarian.css";

const API = "http://localhost:5000/api";

function AddLibrarian() {
    const toast = useToast();
    const token = sessionStorage.getItem("token");

    const [form, setForm] = useState({ name: "", email: "", mobileno: "", password: "", confirm: "" });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm) { toast("Passwords do not match", "error"); return; }
        if (form.password.length < 6) { toast("Password must be at least 6 characters", "error"); return; }

        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/librarian/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: form.name, email: form.email, mobileno: form.mobileno, password: form.password }),
            });
            const data = await res.json();
            if (!res.ok) { toast(data.error || "Failed to add librarian", "error"); return; }
            toast(`Librarian "${form.name}" added successfully! 🎉`, "success");
            setForm({ name: "", email: "", mobileno: "", password: "", confirm: "" });
        } catch {
            toast("Cannot reach server. Is the backend running?", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="add-lib-page">
            {/* Animated background orbs */}
            <div className="lib-orb lib-orb-1" />
            <div className="lib-orb lib-orb-2" />
            <div className="lib-orb lib-orb-3" />

            <div className="add-lib-card">
                {/* Header */}
                <div className="add-lib-header">
                    <Link to="/librarian/dashboard" className="back-btn">← Back</Link>
                    <div className="add-lib-badge">🏛️ Admin Action</div>
                    <h1>Add New Librarian</h1>
                    <p>Create credentials for a new library staff member</p>
                </div>

                <form className="add-lib-form" onSubmit={handleSubmit} id="add-librarian-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="lib-name">Full Name</label>
                            <input id="lib-name" type="text" name="name"
                                placeholder="e.g. Jane Smith"
                                value={form.name} onChange={handleChange} required
                                autoComplete="off" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="lib-mobileno">Mobile Number</label>
                            <input id="lib-mobileno" type="tel" name="mobileno"
                                placeholder="e.g. 9876543210"
                                value={form.mobileno} onChange={handleChange}
                                autoComplete="off" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="lib-email">Email Address</label>
                        <input id="lib-email" type="email" name="email"
                            placeholder="librarian@library.com"
                            value={form.email} onChange={handleChange} required
                            autoComplete="off" />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="lib-password">Password</label>
                            <input id="lib-password" type="password" name="password"
                                placeholder="Min. 6 characters"
                                value={form.password} onChange={handleChange} required
                                autoComplete="new-password" />
                        </div>
                        <div className="form-group">
                            <label htmlFor="lib-confirm">Confirm Password</label>
                            <input id="lib-confirm" type="password" name="confirm"
                                placeholder="Repeat password"
                                value={form.confirm} onChange={handleChange} required
                                autoComplete="new-password" />
                        </div>
                    </div>

                    <div className="add-lib-hint">
                        <span>🔐</span>
                        <span>The new librarian can log in at <strong>/librarian/login</strong> using these credentials.</span>
                    </div>

                    <button className="btn-primary add-lib-submit" type="submit" id="add-lib-btn" disabled={loading}>
                        {loading ? (
                            <><span className="btn-spinner" />  Adding Librarian…</>
                        ) : (
                            "Add Librarian Account →"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AddLibrarian;
