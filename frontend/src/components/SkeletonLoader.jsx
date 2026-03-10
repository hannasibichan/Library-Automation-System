import React from "react";
import "../styles/Global.css";

export function SkeletonCard() {
    return (
        <div className="skeleton-card">
            <div className="skeleton skeleton-line h-lg w-3/4"></div>
            <div className="skeleton skeleton-line w-full"></div>
            <div className="skeleton skeleton-line w-1/2 h-sm"></div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                <div className="skeleton skeleton-line h-sm" style={{ width: 60, borderRadius: 999 }}></div>
                <div className="skeleton skeleton-line h-sm" style={{ width: 80, borderRadius: 999 }}></div>
            </div>
        </div>
    );
}

export function SkeletonTable({ rows = 5 }) {
    return (
        <div className="data-table-wrapper">
            <table className="data-table">
                <thead>
                    <tr>
                        {[20, 60, 80, 60, 60, 80].map((w, i) => (
                            <th key={i}><div className="skeleton skeleton-line h-sm" style={{ width: w }}></div></th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <tr key={r}>
                            {[20, 60, 80, 60, 60, 80].map((w, i) => (
                                <td key={i}><div className="skeleton skeleton-line h-sm" style={{ width: w }}></div></td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function SkeletonStatCards({ count = 4 }) {
    return (
        <div className="stats-grid" style={{ marginBottom: "2rem" }}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="stat-card">
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                        <div className="skeleton" style={{ width: 46, height: 46, borderRadius: 12 }}></div>
                        <div className="skeleton skeleton-line h-sm" style={{ width: 50, borderRadius: 999 }}></div>
                    </div>
                    <div className="skeleton skeleton-line h-lg" style={{ width: "60%", marginBottom: "0.4rem" }}></div>
                    <div className="skeleton skeleton-line h-sm" style={{ width: "80%" }}></div>
                </div>
            ))}
        </div>
    );
}
