import datetime

def calculate_gradual_fine(return_date):
    """
    Calculates a fine with a fixed base fee plus a daily increment.
    - Base Fine: ₹100
    - Daily Increment: ₹5/day after return date
    """
    if not return_date:
        return 0.00
    
    # Ensure return_date is a datetime object
    if isinstance(return_date, str):
        try:
            # Handle potential 'Z' in some formats
            if return_date.endswith('Z'):
                return_date = return_date[:-1]
            return_date = datetime.datetime.fromisoformat(return_date)
        except ValueError:
            return 0.00

    now = datetime.datetime.now()
    today = now.date()
    # Normalize return_date to just the date for whole-day comparison
    due_date = return_date.date() if hasattr(return_date, 'date') else return_date

    # If today is same or before return date, no fine
    if today <= due_date:
        return 0.00
        
    days_overdue = (today - due_date).days
    
    # 1 day late = 100.00
    # 2 days late = 105.00
    # Formula: 100 + (days_overdue - 1) * 5
    total_fine = 100.00 + (5.00 * (days_overdue - 1))
            
    return round(total_fine, 2)
    
def update_db_fines(app):
    from utils.db import get_db
    with app.app_context():
        db = get_db()
        cur = db.cursor(dictionary=True)
        try:
            cur.execute("SELECT ISBN, bookno, return_date FROM book WHERE status = 'borrowed'")
            books = cur.fetchall()
            for b in books:
                fine = calculate_gradual_fine(b['return_date'])
                cur.execute(
                    "UPDATE book SET fine = %s WHERE ISBN = %s AND bookno = %s",
                    (fine, b['ISBN'], b['bookno'])
                )
            db.commit()
            print(f"💰 Database Fines Synced: Updated {len(books)} books.")
        except Exception as e:
            print(f"❌ Error syncing fines: {e}")
        finally:
            cur.close()
