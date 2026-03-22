import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import { useToast } from "../components/Toast";
import { SkeletonTable } from "../components/SkeletonLoader";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/ManageRecords.css";

import config from "../config";
const API = config.API_BASE_URL;

function ManageRecords() {
    const toast = useToast();
    const token = sessionStorage.getItem("token");
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRecords = useCallback(() => {
        setLoading(true);
        fetch(`${API}/records`, { headers })
            .then(r => r.json())
            .then(data => setRecords(Array.isArray(data) ? data : []))
            .catch(() => toast("Failed to load records", "error"))
            .finally(() => setLoading(false));
    }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    const fmt = (dt) => dt
        ? new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : "-";

    const handleExportCSV = () => {
        if (!records.length) return toast("No records to export", "error");
        
        const headers = ["Record ID", "Librarian", "Activity Type", "Book Title", "Total Available", "Event Time"];
        const rows = records.map(r => [
            r.book_record_id,
            r.librarian_name || "-",
            r.delete_record ? 'Deletion' : (r.update_record ? 'Update' : 'Addition'),
            r.book_title || "-",
            r.total_books_available,
            fmt(r.delete_record || r.update_record || r.add_record)
        ]);

        const csvContent = [headers, ...rows]
            .map(e => e.map(val => `"${val}"`).join(","))
            .join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast("Report downloaded successfully!", "success");
    };

    const handleExportPDF = () => {
        if (!records.length) return toast("No records to export", "error");
        
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(18);
        doc.text("Librarian Activity Audit Report", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 30);
        
        const tableHeaders = [["ID", "Librarian", "Activity Type", "Book Title", "Count", "Event Time"]];
        const tableRows = records.map(r => [
            `#${r.book_record_id}`,
            r.librarian_name || "-",
            r.delete_record ? 'Deletion' : (r.update_record ? 'Update' : 'Addition'),
            r.book_title || "-",
            r.total_books_available,
            fmt(r.delete_record || r.update_record || r.add_record)
        ]);

        autoTable(doc, {
            startY: 35,
            head: tableHeaders,
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], textColor: 255 },
            styles: { fontSize: 8.5 },
            alternateRowStyles: { fillColor: [245, 243, 255] },
            margin: { top: 35 }
        });

        doc.save(`inventory_audit_${new Date().toISOString().split('T')[0]}.pdf`);
        toast("Audit PDF generated!", "success");
    };

    return (
        <div className="page-wrapper">
            <Navbar />
            <div className="dashboard-content">

                <div className="section-header">
                    <h2>📊 Librarian Activity Records</h2>
                    <div className="header-actions">
                        <button className="btn btn-outline" onClick={handleExportCSV}>
                            📥 CSV
                        </button>
                        <button className="btn btn-outline" id="pdf-export-records" onClick={handleExportPDF} style={{ background: "white", color: "var(--brand-dark)" }}>
                            📄 PDF
                        </button>
                    </div>
                </div>

                {loading ? (
                    <SkeletonTable rows={8} />
                ) : records.length === 0 ? (
                    <div className="empty-state"><span className="empty-icon">📋</span><p>No audit records yet.</p></div>
                ) : (
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th><th>Librarian</th><th className="header-activity">Type</th><th>Book Title</th><th className="header-count">Total Available</th>
                                    <th>Event Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((r, i) => (
                                    <tr key={r.book_record_id} style={{ animationDelay: `${i * 0.03}s` }} className="fade-in-row">
                                        <td className="record-id-cell">#{r.book_record_id}</td>
                                        <td className="librarian-cell">{r.librarian_name || "—"}</td>
                                        <td>
                                            <span className={`chip ${r.delete_record ? 'danger' : (r.update_record ? 'borrowed' : 'available')}`}>
                                                {r.delete_record ? '🗑️ Deletion' : (r.update_record ? '✏️ Update' : '➕ Addition')}
                                            </span>
                                        </td>
                                        <td className="book-title-cell">{r.book_title || "—"}</td>
                                        <td className="total-available-cell">
                                            {r.total_books_available}
                                        </td>
                                        <td className="datetime-cell">
                                            {fmt(r.delete_record || r.update_record || r.add_record)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ManageRecords;
