import datetime

def cleanup_expired_requests(db):
    """Reverts expired 'requested' books back to 'available'."""
    cur = db.cursor()
    now = datetime.datetime.now()
    cur.execute(
        "UPDATE book SET user_id=NULL, status='available', request_expiry=NULL "
        "WHERE status='requested' AND request_expiry < %s",
        (now,)
    )
    if cur.rowcount > 0:
        try:
            db.commit()
        except:
            db.rollback()
    cur.close()
