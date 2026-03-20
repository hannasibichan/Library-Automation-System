-- Library Automation System Database Schema
-- Run this script to initialize the database

CREATE DATABASE IF NOT EXISTS library_db;
USE library_db;

-- User table (students / faculty who borrow books)
CREATE TABLE IF NOT EXISTS user (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    address VARCHAR(255),
    role ENUM('student', 'faculty') DEFAULT 'student',
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Librarian table (library staff who manage books)
CREATE TABLE IF NOT EXISTS librarian (
    lib_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    mobileno VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Book table
CREATE TABLE IF NOT EXISTS book (
    ISBN VARCHAR(20) NOT NULL,
    bookno VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(150) NOT NULL,
    publisher VARCHAR(150),
    lib_id INT,
    user_id INT DEFAULT NULL,
    date_taken DATETIME DEFAULT NULL,
    return_date DATETIME DEFAULT NULL,
    fine DECIMAL(10,2) DEFAULT 0.00,
    cover_image MEDIUMTEXT DEFAULT NULL,
    PRIMARY KEY (ISBN, bookno),
    FOREIGN KEY (lib_id) REFERENCES librarian(lib_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES user(user_id) ON DELETE SET NULL
);



-- Book_record table (maintained by librarian)
CREATE TABLE IF NOT EXISTS book_record (
    book_record_id INT PRIMARY KEY AUTO_INCREMENT,
    lib_id INT,
    add_record DATETIME DEFAULT CURRENT_TIMESTAMP,
    delete_record DATETIME DEFAULT NULL,
    update_record DATETIME DEFAULT NULL,
    total_books_available INT DEFAULT 0,
    FOREIGN KEY (lib_id) REFERENCES librarian(lib_id) ON DELETE SET NULL
);

-- Insert a default librarian (password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT IGNORE INTO librarian (name, email, mobileno, password_hash)
VALUES ('Admin Librarian', 'admin@library.com', '9999999999',
        '$2b$12$L5i2sZCo77cCYp5tAGstV.lSvoHDkJRcMzB6rRNx6WHQr7iHlMmKe');

-- Insert a default book_record entry
INSERT IGNORE INTO book_record (lib_id, total_books_available)
SELECT lib_id, 0 FROM librarian WHERE email = 'admin@library.com' LIMIT 1;
