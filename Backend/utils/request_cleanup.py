import datetime

def cleanup_expired_requests(db):
    """
    Quietly cleans up expired book borrow requests that haven't been picked up.
    This can be called within route handlers to ensure state is fresh.
    """
    try:
        cur = db.cursor()
        now = datetime.datetime.now()
        
        # Mark requested books that passed their expiry as available
        # This is a silent cleanup primarily for UI consistency.
        query = "UPDATE book SET user_id=NULL, status='available', request_expiry=NULL WHERE status='requested' AND request_expiry < %s"
        cur.execute(query, (now,))
        db.commit()
        
        if cur.rowcount > 0:
            print(f"[Request Cleanup] Released {cur.rowcount} expired reservations.")
            
        cur.close()
    except Exception as e:
        print(f"Error during request cleanup: {e}")
