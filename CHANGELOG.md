# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-03-23

### Added
- **Global Reporting Module:** Professional PDF and CSV export functionality implemented across **every management page** (Books, Users, Borrowed, Requests, and Activity Records).
- **PDF Export Suite:** Integrated `jsPDF` and `jsPDF-AutoTable` for high-quality, branded document generation with auto-formatting and timestamps.
- **Enhanced CSV Reporting:** Added **UTF-8 BOM support** to ensure exports open perfectly in Microsoft Excel without character corruption.
- **Human-Readable Auditing:** All tables and reports now prioritize **Librarian Names** and **Borrower Names** over obscure ID numbers.
- **Detailed Configuration:** Updated `README.md` with complete instructions for `MAIL_USERNAME` and Gmail **App Password** setup.

### Fixed
- **Mobile Header Harmony:** Fixed layout issues on mobile devices where buttons in headers (like CSV/PDF/Add) had mismatched heights.
- **Excel Symbol Corruption:** Replaced special characters like `—` and `₹` in CSVs with standard ASCII alternatives (`-` and `Rs`) to prevent encoding bugs.
- **Robust Date Parsing:** Switched all CSV date exports to the universal `YYYY-MM-DD` standard for reliable sorting across different spreadsheet locales.
- **Reporting Bugfix:** Resolved `doc.autoTable is not a function` JS runtime error by updating the AutoTable integration pattern.

## [1.1.0] - 2025-03-11

### Added
- **SmartStack Branding:** Complete rename from "Library MS" to "SmartStack".
- **Librarian Registration:** Existing librarians can now add new librarian accounts via the UI and API.
- **Glassmorphic UI v3:** Enhanced all pages with a premium dark-themed design.
- **Animations:** Added page-level entrance animations, staggered card reveals, and glowing hover states.
- **Project Documentation:** Added `README.md`, `LICENSE`, `CONTRIBUTING.md`, and `CHANGELOG.md`.

### Fixed
- **CORS Issues:** Resolved cross-origin request issues between frontend (3001) and backend (5000).
- **Environment Variables:** Implemented `.env` support for secure database and JWT configuration.
- **Stat Cards:** Polished stat card layout and added trend indicators.

## [1.0.0] - 2024-03-10
- Initial release of the Library Automation System.
- Basic CRUD for books and users.
- Borrowing and returning logic.
