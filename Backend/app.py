import os
import mysql.connector
from flask import Flask, g
from flask_cors import CORS
from dotenv import load_dotenv
from flask_mail import Mail
from utils.db import close_db

# Load env variables from .env file
load_dotenv()

mail = Mail()

def create_app():
    app = Flask(__name__)

    # JWT Secret
    app.config['JWT_SECRET'] = os.getenv('JWT_SECRET', 'library_secret_key_change_in_production')

    # Flask-Mail Config
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

    mail.init_app(app)

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
