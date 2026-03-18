import os
import mysql.connector
from flask import g
from dotenv import load_dotenv

# Ensure .env is loaded if this is called before app.py
load_dotenv()

DB_CONFIG = {
    'host':     os.getenv('DB_HOST', 'localhost'),
    'user':     os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_DATABASE', 'library_db'),
    'charset':  'utf8mb4',
    'collation': 'utf8mb4_general_ci',
}

def get_db():
    """Return a per-request MySQL connection (stored in Flask's 'g')."""
    if 'db' not in g:
        g.db = mysql.connector.connect(**DB_CONFIG, autocommit=False)
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None and db.is_connected():
        db.close()
