from flask import Blueprint, request, jsonify
from utils.db import get_db
from utils.jwt_utils import token_required
import datetime

borrow_bp = Blueprint('borrow', __name__)

BORROW_DAYS = 14          # loan period in days
FINE_PER_DAY = 2.00       # ₹2 per overdue day


def dc(conn):
    return conn.cursor(dictionary=True)


# ─── Borrow a book ────────────────────────────────────────────────────────────
@borrow_bp.route('/borrow/<isbn>', methods=['POST'])
@token_required
def borrow_book(isbn):
    user_id = request.current_user.get('user_id')
    if not user_id:
        return jsonify({'error': 'Only users can borrow books'}), 403

    db  = get_db()
    cur = dc(db)
    cur.execute('SELECT * FROM book WHERE ISBN = %s', (isbn,))
    book = cur.fetchone()

    if not book:
        cur.close()
        return jsonify({'error': 'Book not found'}), 404
    if book['user_id'] is not None:
        cur.close()
        return jsonify({'error': 'Book is already borrowed'}), 409

    cur.execute('SELECT COUNT(*) AS cnt FROM book WHERE user_id = %s', (user_id,))
    count = cur.fetchone()['cnt']
    if count >= 5:
        cur.close()
        return jsonify({'error': 'Borrow limit reached (max 5 books)'}), 400

    now         = datetime.datetime.now()
    return_date = now + datetime.timedelta(days=BORROW_DAYS)

    try:
        cur.execute(
            'UPDATE book SET user_id=%s, date_taken=%s, return_date=%s, fine=0.00 WHERE ISBN=%s',
            (user_id, now, return_date, isbn)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({
        'message':     f'Book "{book["title"]}" borrowed successfully',
        'date_taken':  now.isoformat(),
        'return_date': return_date.isoformat(),
    }), 200


# ─── Return a book ────────────────────────────────────────────────────────────
@borrow_bp.route('/return/<isbn>', methods=['POST'])
@token_required
def return_book(isbn):
    user_id = request.current_user.get('user_id')
    if not user_id:
        return jsonify({'error': 'Only users can return books'}), 403

    db  = get_db()
    cur = dc(db)
    cur.execute('SELECT * FROM book WHERE ISBN = %s', (isbn,))
    book = cur.fetchone()

    if not book:
        cur.close()
        return jsonify({'error': 'Book not found'}), 404
    if book['user_id'] != user_id:
        cur.close()
        return jsonify({'error': 'You have not borrowed this book'}), 403

    # Calculate fine for overdue returns
    now  = datetime.datetime.now()
    fine = 0.00
    if book['return_date'] and now > book['return_date']:
        overdue_days = (now - book['return_date']).days
        fine = round(overdue_days * FINE_PER_DAY, 2)

    try:
        cur.execute(
            'UPDATE book SET user_id=NULL, date_taken=NULL, return_date=NULL, fine=%s WHERE ISBN=%s',
            (fine, isbn)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    msg = f'Book "{book["title"]}" returned successfully'
    if fine > 0:
        msg += f'. Fine: ₹{fine:.2f}'
    return jsonify({'message': msg, 'fine': fine}), 200


# ─── My borrowed books ────────────────────────────────────────────────────────
@borrow_bp.route('/my-books', methods=['GET'])
@token_required
def my_books():
    user_id = request.current_user.get('user_id')
    if not user_id:
        return jsonify({'error': 'Only users can access this'}), 403

    db  = get_db()
    cur = dc(db)
    cur.execute(
        'SELECT b.*, l.name AS librarian_name FROM book b '
        'LEFT JOIN librarian l ON b.lib_id = l.lib_id '
        'WHERE b.user_id = %s ORDER BY b.title',
        (user_id,)
    )
    books = cur.fetchall()
    cur.close()

    # Compute live fine for each book in case it's overdue
    now = datetime.datetime.now()
    for b in books:
        if b.get('return_date') and now > b['return_date']:
            overdue_days = (now - b['return_date']).days
            b['current_fine'] = round(overdue_days * FINE_PER_DAY, 2)
        else:
            b['current_fine'] = 0.00
        # Ensure datetime fields are serialisable
        for field in ('date_taken', 'return_date'):
            if isinstance(b.get(field), datetime.datetime):
                b[field] = b[field].isoformat()

    return jsonify(books), 200
