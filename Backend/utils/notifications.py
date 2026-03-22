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
            
            # Cases to check: Due Today (0), Tomorrow (1), and in 2 days
            for days in [0, 1, 2]:
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
                    if days == 0:
                        status_text = "is due for return <b>TODAY</b>"
                        is_today = True
                    elif days == 1:
                        status_text = "is due for return <b>TOMORROW</b>"
                        is_today = False
                    else:
                        status_text = f"is due for return in <b>{days} days</b>"
                        is_today = False
                    
                    send_reminder_email(mail, r['email'], r['name'], r['title'], r['return_date'], is_today, status_text)
                    
            cur.close()
            db.close()
        except Exception as e:
            print(f"Notification Task Error: {e}")

def check_expired_reservations(app, mail):
    """
    Releases books that were requested but not picked up within the time limit.
    Sends cancellation email to users.
    """
    with app.app_context():
        try:
            load_dotenv_settings()
            db = mysql.connector.connect(**DB_CONFIG)
            cur = db.cursor(dictionary=True)
            
            now = datetime.datetime.now()
            
            # 1. First, find which books are expiring and who they belong to
            query_find = """
                SELECT b.book_id, b.title, u.email, u.name 
                FROM book b
                JOIN user u ON b.user_id = u.user_id
                WHERE b.status = 'requested' AND b.request_expiry < %s
            """
            cur.execute(query_find, (now,))
            expired_requests = cur.fetchall()
            
            if not expired_requests:
                cur.close()
                db.close()
                return

            # 2. Release the books
            query_update = "UPDATE book SET user_id=NULL, status='available', request_expiry=NULL WHERE status='requested' AND request_expiry < %s"
            cur.execute(query_update, (now,))
            db.commit()
            
            print(f"Released {cur.rowcount} expired reservations.")

            # 3. Notify users
            for req in expired_requests:
                send_cancellation_email(mail, req['email'], req['name'], req['title'])
                
            cur.close()
            db.close()
        except Exception as e:
            print(f"Reservation Expiry Task Error: {e}")

def send_cancellation_email(mail, email, name, title):
    """
    Sends mail informing user their borrow request expired.
    """
    msg = Message(
        subject="❌ SmartStack - Borrow Request Expired",
        recipients=[email]
    )
    
    msg.html = f"""
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fffafc;">
        <h2 style="color: #dc2626; margin-top: 0;">Borrow Request Expired</h2>
        <p>Hi <b>{name}</b>,</p>
        <p>Unfortunately, your borrow request for <b>"{title}"</b> has expired because it was not collected within the 4-hour window.</p>
        
        <div style="margin: 20px 0; padding: 15px; border-radius: 8px; background-color: #fef2f2; border: 1px solid #fecaca; text-align: center;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">The book has been returned to the available collection for other users.</p>
        </div>
        
        <p style="font-size: 14px; color: #475569;">You can submit a new request if the book is still available.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">SmartStack Library Automation System</p>
    </div>
    """
    try:
        mail.send(msg)
    except Exception as e:
        print(f"Failed to send cancellation to {email}: {e}")

def send_reminder_email(mail, email, name, title, due_date, is_today=False, status_text=None):
    formatted_date = due_date.strftime('%B %d, %Y')
    
    subject = "⚠️ SmartStack - Book Due TODAY" if is_today else "⏰ SmartStack - Return Date Reminder"
    
    msg = Message(
        subject=subject,
        recipients=[email]
    )
    
    status_text = status_text or ("is due for return <b>TODAY</b>:" if is_today else f"is due for return on:")
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
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">SmartStack Library Automation System</p>
    </div>
    """
    try:
        mail.send(msg)
    except Exception as e:
        print(f"Failed to send reminder to {email}: {e}")

def notify_librarians_on_request(mail, user_name, book_title, expiry_time):
    """
    Sends an immediate email to all librarians when a user requests a book.
    """
    try:
        load_dotenv_settings()
        db = mysql.connector.connect(**DB_CONFIG)
        cur = db.cursor(dictionary=True)
        cur.execute("SELECT email FROM librarian")
        librarians = cur.fetchall()
        cur.close()
        db.close()

        if not librarians:
            return

        recipients = [l['email'] for l in librarians]
        formatted_expiry = expiry_time.strftime('%H:%M %p')

        msg = Message(
            subject=f"🛎️ New Book Request: {book_title}",
            recipients=recipients
        )
        
        msg.html = f"""
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
            <h2 style="color: #4f46e5; margin-top: 0;">🛎️ New Book Request</h2>
            <p>Hello Librarian,</p>
            <p><b>{user_name}</b> has just requested a book from the collection.</p>
            
            <div style="margin: 20px 0; padding: 20px; border-radius: 10px; background-color: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <p style="margin: 0; font-size: 14px; color: #64748b;">Requested Book:</p>
                <p style="margin: 5px 0 15px; font-size: 18px; font-weight: bold; color: #1e293b;">"{book_title}"</p>
                <p style="margin: 0; font-size: 14px; color: #64748b;">Must be picked up by:</p>
                <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #dc2626;">{formatted_expiry}</p>
            </div>
            
            <p style="font-size: 14px; color: #475569;">Please log in to the Librarian Dashboard to manage this request.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">SmartStack Library Automation System</p>
        </div>
        """
        mail.send(msg)
    except Exception as e:
        print(f"Failed to notify librarians: {e}")


# Helper for standalone DB connection
def load_dotenv_settings():
# ...
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
