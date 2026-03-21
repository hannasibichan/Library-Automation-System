# 📖 SmartStack — Smart Library Automation System

SmartStack is a premium, modern library management system designed for students, faculty, and librarians. It features a sleek glassmorphic UI, real-time notifications, and a robust Flask-MySQL backend.

![SmartStack Hero](https://img.shields.io/badge/UI-Glassmorphism-blueviolet?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Flask%20%7C%20MySQL-blue?style=for-the-badge)

## ✨ Features

- **For Students & Faculty:**
  - Browse available books with advanced search.
  - Borrow and return books with a single click.
  - Real-time notifications for book events.
  - Profile tracking for borrowed books and history.
- **For Librarians (Admin):**
  - Powerful dashboard with library statistics.
  - Manage book inventory (Add, Edit, Remove).
  - Manage users and track borrowing records.
  - Add new librarians to the system.
- **Visuals & UX:**
  - Premium Dark Mode with ambient glow effects.
  - Smooth page transitions and staggered entrance animations.
  - Fully responsive design for all devices.

## 🛠️ Technology Stack

- **Frontend:** React, HTML5, Vanilla CSS3 (Custom Design System).
- **Backend:** Flask (Python), JWT Authentication, Bcrypt hashing.
- **Database:** MySQL.
- **Styling:** Custom Vanilla CSS with CSS Variables.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js & npm
- MySQL Server

### 1. Database Setup
1. Create a database named `library_db` in MySQL.
2. Run the schema migrations:
   ```bash
   mysql -u root -p library_db < Backend/schema.sql
   ```

### 2. Backend Configuration
1. Navigate to the Backend folder: `cd Backend`
2. Create a `.env` file based on `.env.example`:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_DATABASE=library_db
   JWT_SECRET=your_secret_key
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   python app.py
   ```

### 3. Frontend Configuration
1. Navigate to the frontend folder: `cd frontend`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React app:
   ```bash
   npm start
   ```

---

## 🔐 Administrative Access
- **Default Librarian Login:**
  - Email: `admin@library.com`
  - Password: `admin123`

---

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License.
