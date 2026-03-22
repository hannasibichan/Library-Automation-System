# 📖 SmartStack — Smart Library Automation System

SmartStack is a premium, modern library management system designed for students, faculty, and librarians. It features a sleek glassmorphic UI, real-time notifications, and a robust Flask-MySQL backend.

![SmartStack Hero](https://img.shields.io/badge/UI-Glassmorphism-blueviolet?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Flask%20%7C%20MySQL-blue?style=for-the-badge)

## ✨ Features

- **For Students & Faculty:**
  - Browse available books with advanced search.
  - **Request & Pickup:** Reserve books online and visit the library within **4 hours** to confirm the pickup.
  - **Real-time Notifications:** Receive email alerts when your request is ready or if it expires.
  - Profile tracking for borrowed books, due dates, and fine history.
- **For Librarians (Admin):**
  - Powerful dashboard with library statistics.
  - Manage book inventory (Add, Edit, Remove).
  - Manage users and track borrowing records.
  - **Export Reports:** Download CSV and professional PDF reports for inventory, activity logs, registered users, active borrowings, and pending requests.
  - Add new librarians to the system.
- **Visuals & UX:**
  - Premium Light Mode with Warm Neumorphic aesthetics.
  - Smooth page transitions and staggered entrance animations.
  - **Mobile Optimized:** Enhanced responsiveness with consistent button sizing and touch-friendly navigation.

## 🛠️ Technology Stack

- **Frontend:** React, HTML5, Vanilla CSS3 (Custom Design System).
- **Reporting:** jsPDF, jsPDF-AutoTable (PDF Generation).
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
   
   # Email Settings (for notifications)
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USERNAME=your_email@gmail.com
   MAIL_PASSWORD=your_app_password
   MAIL_DEFAULT_SENDER=your_email@gmail.com
   ```

   > [!TIP]
   > **How to get a Gmail App Password:**
   > 1. Go to your [Google Account Settings](https://myaccount.google.com/).
   > 2. Enable **2-Step Verification**.
   > 3. Search for **"App Passwords"** or visit the [App Passwords](https://myaccount.google.com/apppasswords) page.
   > 4. Select **"Other"**, name it "SmartStack", and click **Generate**.
   > 5. Use the 16-character code as your `MAIL_PASSWORD`.

1. Install dependencies:
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
