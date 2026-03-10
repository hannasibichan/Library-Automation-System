import React, { createContext, useContext, useState, useCallback } from "react";
import "../styles/Toast.css";

const ToastContext = createContext(null);

const ICONS = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
const TITLES = { success: "Success", error: "Error", info: "Info", warning: "Warning" };

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const toast = useCallback((msg, type = "success", duration = 3500) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 280);
        }, duration);
    }, []);

    const remove = (id) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 280);
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}${t.removing ? " removing" : ""}`}>
                        <span className="toast-icon">{ICONS[t.type]}</span>
                        <div className="toast-body">
                            <div className="toast-title">{TITLES[t.type]}</div>
                            <div className="toast-msg">{t.msg}</div>
                        </div>
                        <button className="toast-close" onClick={() => remove(t.id)}>✕</button>
                        <div className="toast-progress"></div>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside ToastProvider");
    return ctx;
};
