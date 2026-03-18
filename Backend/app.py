import os
import mysql.connector
from flask import Flask, g
from flask_cors import CORS
from dotenv import load_dotenv
from flask_mail import Mail
from flask_apscheduler import APScheduler
from utils.db import close_db
from utils.notifications import send_due_date_reminders

# Load env variables from .env file
load_dotenv()

mail = Mail()
scheduler = APScheduler()

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

    # Initialize Scheduler
    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        scheduler.init_app(app)
        scheduler.start()
        
        # Schedule the notification task to run every day
        @scheduler.task('interval', id='due_date_job', days=1)
        def scheduled_notification_job():
            send_due_date_reminders(app, mail)
            print("Due Date Notification Task Executed Successfully.")

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

    # Debug route to manually trigger notifications
    from flask import jsonify
    @app.route('/api/debug/test-notifications', methods=['POST'])
    def manual_notification_trigger():
        send_due_date_reminders(app, mail)
        return jsonify({'message': 'Manual notification scan triggered.'}), 200

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
