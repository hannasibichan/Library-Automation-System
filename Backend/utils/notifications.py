import datetime
from flask_mail import Message
from utils.db import get_db
import mysql.connector

DB_CONFIG = {}

def send_due_date_reminders(app, mail):
    """
    Background task to find books due Today (0 days) and in 2 days.
    """
    with app.app_context():
        try:
            # We connect directly since we are outside a request context
            load_dotenv_settings() # Helper below to get config
            db = mysql.connector.connect(**DB_CONFIG)
            cur = db.cursor(dictionary=True)
            
            # Cases to check: Due Today (0) and Due in 2 days
            for days in [0, 2]:
                target_date = (datetime.datetime.now() + datetime.timedelta(days=days)).date()
                
                # Find users with books due on that date
                query = """
                    SELECT b.title, b.return_date, u.email, u.name 
                    FROM book b
                    JOIN user u ON b.user_id = u.user_id
                    WHERE DATE(b.return_date) = %s AND b.status = 'borrowed'
                """
                cur.execute(query, (target_date,))
                reminders = cur.fetchall()
                
                for r in reminders:
                    is_today = (days == 0)
                    send_reminder_email(mail, r['email'], r['name'], r['title'], r['return_date'], is_today)
                    
            cur.close()
            db.close()
        except Exception as e:
            print(f"Notification Task Error: {e}")

def check_expired_reservations(app):
    """
    Releases books that were requested but not picked up within the time limit.
    """
    with app.app_context():
        try:
            load_dotenv_settings()
            db = mysql.connector.connect(**DB_CONFIG)
            cur = db.cursor()
            
            now = datetime.datetime.now()
            query = "UPDATE book SET user_id=NULL, status='available', request_expiry=NULL WHERE status='requested' AND request_expiry < %s"
            cur.execute(query, (now,))
            
            if cur.rowcount > 0:
                print(f"Released {cur.rowcount} expired reservations.")
                db.commit()
                
            cur.close()
            db.close()
        except Exception as e:
            print(f"Reservation Expiry Task Error: {e}")

def send_reminder_email(mail, email, name, title, due_date, is_today=False):
    formatted_date = due_date.strftime('%B %d, %Y')
    
    subject = "⚠️ Bibliotheca - Book Due TODAY" if is_today else "⏰ Bibliotheca - Return Date Reminder"
    
    msg = Message(
        subject=subject,
        recipients=[email]
    )
    
    status_text = "is due for return <b>TODAY</b>:" if is_today else f"is due for return on:"
    sub_text = "Please return it as soon as possible to avoid fines." if is_today else "Please return it by the due date to avoid the tiered fine penalty."

    msg.html = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: { '#dc2626' if is_today else '#6d28d9' };">{ "IMPORTANT: Return Today" if is_today else "Return Date Reminder" }</h2>
        <p>Hi <b>{name}</b>,</p>
        <p>This is a reminder that the book <b>"{title}"</b> {status_text}</p>
        <div style="margin: 20px 0; padding: 15px; border-radius: 8px; background-color: { '#fff1f2' if is_today else '#fef2f2' }; border: 1px solid { '#fecaca' if is_today else '#fecaca' }; text-align: center;">
            <span style="font-size: 18px; font-weight: bold; color: #dc2626;">{formatted_date}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">{sub_text}</p>
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
