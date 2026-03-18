import datetime
from flask_mail import Message
from utils.db import get_db
import mysql.connector

def send_due_date_reminders(app, mail):
    """
    Background task to find books due in 2 days and notify users.
    """
    with app.app_context():
        try:
            # We connect directly since we are outside a request context
            load_dotenv_settings() # Helper below to get config
            db = mysql.connector.connect(**DB_CONFIG)
            cur = db.cursor(dictionary=True)
            
            # Target date: 2 days from now
            target_date = (datetime.datetime.now() + datetime.timedelta(days=2)).date()
            
            # Find users with books due on that date
            query = """
                SELECT b.title, b.return_date, u.email, u.name 
                FROM book b
                JOIN user u ON b.user_id = u.user_id
                WHERE DATE(b.return_date) = %s
            """
            cur.execute(query, (target_date,))
            reminders = cur.fetchall()
            
            for r in reminders:
                send_reminder_email(mail, r['email'], r['name'], r['title'], r['return_date'])
                
            cur.close()
            db.close()
        except Exception as e:
            print(f"Notification Task Error: {e}")

def send_reminder_email(mail, email, name, title, due_date):
    formatted_date = due_date.strftime('%B %d, %Y')
    msg = Message(
        subject="⏰ Bibliotheca - Return Date Reminder",
        recipients=[email]
    )
    msg.html = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #6d28d9;">Return Date Reminder</h2>
        <p>Hi <b>{name}</b>,</p>
        <p>This is a friendly reminder that the book <b>"{title}"</b> is due for return on:</p>
        <div style="margin: 20px 0; padding: 15px; border-radius: 8px; background-color: #fef2f2; border: 1px solid #fecaca; text-align: center;">
            <span style="font-size: 18px; font-weight: bold; color: #dc2626;">{formatted_date}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">Please return it by the due date to avoid the tiered fine penalty.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">Bibliotheca Library Automation System</p>
    </div>
    """
    try:
        mail.send(msg)
    except Exception as e:
        print(f"Failed to send reminder to {email}: {e}")

# Helper for standalone DB connection
def load_dotenv_settings():
    global DB_CONFIG
    import os
    from dotenv import load_dotenv
    load_dotenv()
    DB_CONFIG = {
        'host':     os.getenv('DB_HOST', 'localhost'),
        'user':     os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'database': os.getenv('DB_DATABASE', 'library_db')
    }
