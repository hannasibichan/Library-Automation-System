from flask import Blueprint, request, jsonify
from utils.db import get_db
from utils.jwt_utils import token_required, librarian_required
from utils.fine_utils import calculate_gradual_fine
from utils.notifications import notify_librarians_on_request
import datetime
from utils.request_cleanup import cleanup_expired_requests

borrow_bp = Blueprint('borrow', __name__)

BORROW_DAYS = 14               # loan period in days
RESERVATION_HOURS = 4          # user has 4h to pick up the book
FINE_PER_DAY = 2.00            # ₹2 per overdue day


def dc(conn):
    return conn.cursor(dictionary=True)


# ─── Request to borrow (User) ───────────────────────────────────────────────────
@borrow_bp.route('/borrow/<isbn>', methods=['POST'])
@token_required
def request_book(isbn):
    user_id = request.current_user.get('user_id')
    if not user_id:
        return jsonify({'error': 'Only users can request books'}), 403

    db  = get_db()
    cur = dc(db)
    
    # 1. Check if user already has a REQUEST or BORROW for this ISBN
    cur.execute('SELECT status FROM book WHERE ISBN = %s AND user_id = %s', (isbn, user_id))
    existing = cur.fetchone()
    if existing:
        return jsonify({'error': f"You already have this book ({existing['status']})."}), 400

    # 2. Find any available copy
    cur.execute("SELECT * FROM book WHERE ISBN = %s AND status = 'available' LIMIT 1", (isbn,))
    book = cur.fetchone()

    if not book:
        cur.close()
        return jsonify({'error': 'No available copies left for this book.'}), 404

    # 3. Check borrow limit (max 5)
    cur.execute('SELECT return_date, status FROM book WHERE user_id = %s', (user_id,))
    user_books = cur.fetchall()
    
    if len(user_books) >= 5:
        cur.close()
        return jsonify({'error': 'Borrow limit reached (max 5 books)'}), 400
        
    # 4. Check for overdue books
    now = datetime.datetime.now()
    for b in user_books:
        if b['status'] == 'borrowed' and b['return_date']:
            # Compare dates (treat whole return day as valid)
            if b['return_date'].date() < now.date():
                cur.close()
                return jsonify({'error': 'ACCESS DENIED: You have overdue books. Please return them and settle your fines before borrowing more.'}), 403

    now    = datetime.datetime.now()
    expiry = now + datetime.timedelta(hours=RESERVATION_HOURS)

    try:
        cur.execute(
            "UPDATE book SET user_id=%s, status='requested', request_expiry=%s, date_requested=%s WHERE ISBN=%s AND bookno=%s",
            (user_id, expiry, now, isbn, book['bookno'])
        )
        db.commit()
        
        # 4. Notify librarians immediately
        from app import mail
        notify_librarians_on_request(mail, request.current_user.get('name'), book['title'], expiry)

    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({
        'message': f'Book "{book["title"]}" requested! Please pick it up by {expiry.strftime("%I:%M %p")}.',
        'request_expiry': expiry.isoformat(),
    }), 200


# ─── Confirm Borrow (Librarian) ────────────────────────────────────────────────
@borrow_bp.route('/confirm-borrow/<isbn>/<bookno>/<user_id>', methods=['POST'])
@librarian_required
def confirm_borrow(isbn, bookno, user_id):
    db  = get_db()
    cur = dc(db)
    
    cur.execute("SELECT * FROM book WHERE ISBN = %s AND bookno = %s", (isbn, bookno))
    book = cur.fetchone()
    
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    if book['status'] != 'requested' or str(book['user_id']) != str(user_id):
        return jsonify({'error': 'No active request found for this user/book'}), 400

    # Check if user has other overdue books
    now = datetime.datetime.now()
    cur.execute("SELECT return_date FROM book WHERE user_id = %s AND status = 'borrowed'", (user_id,))
    borrowed = cur.fetchall()
    for b in borrowed:
        if b['return_date'] and b['return_date'].date() < now.date():
            cur.close()
            return jsonify({'error': 'This user has overdue books. They must be returned before new books are issued.'}), 403

    now         = datetime.datetime.now()
    return_date = now + datetime.timedelta(days=BORROW_DAYS)

    try:
        cur.execute(
            "UPDATE book SET status='borrowed', date_taken=%s, return_date=%s, request_expiry=NULL, fine=0.00 WHERE ISBN=%s AND bookno=%s",
            (now, return_date, isbn, bookno)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': f'Borrow confirmed for {book["title"]}'}), 200


# ─── Cancel Request (User or Librarian) ───────────────────────────────────────
@borrow_bp.route('/cancel-request/<isbn>/<bookno>', methods=['POST'])
@token_required
def cancel_request(isbn, bookno):
    user_id = request.current_user.get('user_id')
    lib_id  = request.current_user.get('lib_id')

    db  = get_db()
    cur = dc(db)
    cur.execute("SELECT * FROM book WHERE ISBN=%s AND bookno=%s", (isbn, bookno))
    book = cur.fetchone()

    if not book:
        return jsonify({'error': 'Book not found'}), 404
    
    # Check permission: User can cancel own, Librarian can cancel any
    if not lib_id and book['user_id'] != user_id:
        return jsonify({'error': 'Permission denied'}), 403

    try:
        cur.execute(
            "UPDATE book SET user_id=NULL, status='available', request_expiry=NULL WHERE ISBN=%s AND bookno=%s",
            (isbn, bookno)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Request cancelled successfully.'}), 200


# ─── Return a book ────────────────────────────────────────────────────────────
@borrow_bp.route('/return/<isbn>/<bookno>', methods=['POST'])
@token_required
def return_book(isbn, bookno):
    user_id = request.current_user.get('user_id')
    lib_id  = request.current_user.get('lib_id')

    db  = get_db()
    cur = dc(db)
    cur.execute('SELECT * FROM book WHERE ISBN = %s AND bookno = %s', (isbn, bookno))
    book = cur.fetchone()

    if not book:
        cur.close()
        return jsonify({'error': 'Book not found'}), 404

    # Permission check: librarian or the user who borrowed it
    if not lib_id and book['user_id'] != user_id:
        cur.close()
        return jsonify({'error': 'Permission denied'}), 403

    fine = calculate_gradual_fine(book.get('return_date'))

    try:
        cur.execute(
            "UPDATE book SET status='available', user_id=NULL, date_taken=NULL, return_date=NULL, fine=0 WHERE ISBN=%s AND bookno=%s",
            (isbn, bookno)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Book returned successfully', 'fine': fine}), 200


# ─── List currently borrowed (Librarian) ───────────────────────────────────────
@borrow_bp.route('/borrowed', methods=['GET'])
@token_required
@librarian_required
def list_borrowed():
    db  = get_db()
    cur = dc(db)
    # Join with users to see borrower details (LEFT JOIN to catch invalid/missing user records)
    cur.execute("""
        SELECT b.ISBN, b.bookno, b.title, b.author, b.user_id, b.date_taken, b.return_date, b.fine,
               COALESCE(u.name, 'Unknown User') AS user_name, COALESCE(u.email, '—') AS user_email
        FROM book b
        LEFT JOIN user u ON b.user_id = u.user_id
        WHERE b.status = 'borrowed'
        ORDER BY b.return_date ASC
    """)
    borrowed = cur.fetchall()
    cur.close()
    
    from .books import _serialize
    serialized = _serialize(borrowed)
    for item in serialized:
        item['current_fine'] = calculate_gradual_fine(item.get('return_date'))
        
    return jsonify(serialized), 200


# ─── My books (Including Requests) ────────────────────────────────────────────
@borrow_bp.route('/my-books', methods=['GET'])
@token_required
def my_books():
    user_id = request.current_user.get('user_id')
    db  = get_db()
    cleanup_expired_requests(db)
    cur = dc(db)
    cur.execute(
        'SELECT b.*, l.name AS librarian_name FROM book b '
        'LEFT JOIN librarian l ON b.lib_id = l.lib_id '
        'WHERE b.user_id = %s ORDER BY b.title',
        (user_id,)
    )
    books = cur.fetchall()
    cur.close()

    from .books import _serialize
    for b in books:
        if b['status'] == 'borrowed':
            b['current_fine'] = calculate_gradual_fine(b.get('return_date'))
            
    return jsonify(_serialize(books)), 200


# ─── List all requests (Librarian) ─────────────────────────────────────────────
@borrow_bp.route('/requests', methods=['GET'])
@librarian_required
def list_requests():
    db  = get_db()
    cleanup_expired_requests(db)
    cur = dc(db)
    cur.execute(
        "SELECT b.*, u.name AS user_name, u.email AS user_email FROM book b "
        "JOIN user u ON b.user_id = u.user_id "
        "WHERE b.status = 'requested' ORDER BY b.request_expiry"
    )
    reqs = cur.fetchall()
    cur.close()
    
    from .books import _serialize
    for r in reqs:
        if isinstance(r.get('request_expiry'), datetime.datetime):
            r['request_expiry'] = r['request_expiry'].isoformat()
            
    return jsonify(_serialize(reqs)), 200

@borrow_bp.route('/requests/count', methods=['GET'])
@librarian_required
def get_request_count():
    db = get_db()
    cleanup_expired_requests(db)
    cur = db.cursor()
    cur.execute("SELECT COUNT(*) FROM book WHERE status = 'requested'")
    count = cur.fetchone()[0]
    cur.close()
    return jsonify({'count': count}), 200
