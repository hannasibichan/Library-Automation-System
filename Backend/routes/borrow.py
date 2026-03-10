from flask import Blueprint, request, jsonify
from app import get_db
from utils.jwt_utils import token_required

borrow_bp = Blueprint('borrow', __name__)


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

    try:
        cur.execute('UPDATE book SET user_id = %s WHERE ISBN = %s', (user_id, isbn))
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': f'Book "{book["title"]}" borrowed successfully'}), 200


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

    try:
        cur.execute('UPDATE book SET user_id = NULL WHERE ISBN = %s', (isbn,))
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': f'Book "{book["title"]}" returned successfully'}), 200


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
    return jsonify(books), 200
