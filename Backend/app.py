import os
import mysql.connector
from flask import Flask, g
from flask_cors import CORS
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv()

# ── MySQL Configuration ───────────────────────────────────────────────────────
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

def create_app():
    app = Flask(__name__)

    # JWT Secret
    app.config['JWT_SECRET'] = os.getenv('JWT_SECRET', 'library_secret_key_change_in_production')

    # Global CORS policy for dev - Ensuring headers are always present
    CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"]}}, supports_credentials=True)

    # Register DB cleanup
    app.teardown_appcontext(close_db)

    # Blueprints
    from routes.auth    import auth_bp
    from routes.books   import books_bp
    from routes.borrow  import borrow_bp
    from routes.records import records_bp
    from routes.users   import users_bp

    app.register_blueprint(auth_bp,    url_prefix='/api/auth')
    app.register_blueprint(books_bp,   url_prefix='/api/books')
    app.register_blueprint(borrow_bp,  url_prefix='/api')
    app.register_blueprint(records_bp, url_prefix='/api/records')
    app.register_blueprint(users_bp,   url_prefix='/api/users')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
