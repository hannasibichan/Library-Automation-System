from flask import Blueprint, request, jsonify
from utils.db import get_db
from utils.jwt_utils import token_required, librarian_required
import datetime

books_bp = Blueprint('books', __name__)


def dc(conn):
    return conn.cursor(dictionary=True)


def _serialize(books_list):
    """Convert datetime fields to ISO strings for JSON serialisation."""
    for b in books_list:
        for field in ('date_taken', 'return_date'):
            if isinstance(b.get(field), datetime.datetime):
                b[field] = b[field].isoformat()
    return books_list


# ─── List / Search books ──────────────────────────────────────────────────────
@books_bp.route('', methods=['GET'])
def get_books():
    search    = request.args.get('search', '')
    author    = request.args.get('author', '')
    publisher = request.args.get('publisher', '')

    query  = ('SELECT b.*, l.name AS librarian_name, u.name AS borrowed_by '
              'FROM book b LEFT JOIN librarian l ON b.lib_id = l.lib_id '
              'LEFT JOIN user u ON b.user_id = u.user_id WHERE 1=1')
    params = []

    if search:
        query  += ' AND (b.title LIKE %s OR b.author LIKE %s OR b.ISBN LIKE %s OR b.bookno LIKE %s)'
        params += [f'%{search}%'] * 4
    if author:
        query  += ' AND b.author LIKE %s'
        params.append(f'%{author}%')
    if publisher:
        query  += ' AND b.publisher LIKE %s'
        params.append(f'%{publisher}%')

    query += ' ORDER BY b.title'
    db  = get_db()
    cur = dc(db)
    cur.execute(query, params)
    books = cur.fetchall()
    cur.close()
    return jsonify(_serialize(books)), 200


# ─── Get single book ──────────────────────────────────────────────────────────
@books_bp.route('/<isbn>', methods=['GET'])
def get_book(isbn):
    db  = get_db()
    cur = dc(db)
    cur.execute(
        'SELECT b.*, l.name AS librarian_name, u.name AS borrowed_by '
        'FROM book b LEFT JOIN librarian l ON b.lib_id = l.lib_id '
        'LEFT JOIN user u ON b.user_id = u.user_id WHERE b.ISBN = %s',
        (isbn,)
    )
    book = cur.fetchone()
    cur.close()
    if not book:
        return jsonify({'error': 'Book not found'}), 404
    _serialize([book])
    return jsonify(book), 200


# ─── Add book (librarian only) ─────────────────────────────────────────────────
@books_bp.route('', methods=['POST'])
@librarian_required
def add_book():
    data      = request.get_json()
    isbn      = data.get('ISBN', '').strip()
    bookno    = data.get('bookno', '').strip()
    title     = data.get('title', '').strip()
    author    = data.get('author', '').strip()
    publisher = data.get('publisher', '').strip()
    lib_id    = data.get('lib_id') or request.current_user['lib_id']
    cover_image = data.get('cover_image') or None

    # Optional borrow fields (when adding a book that is already borrowed)
    user_id     = data.get('user_id') or None
    date_taken  = data.get('date_taken') or None
    return_date = data.get('return_date') or None
    fine        = data.get('fine') or 0.00

    if not all([isbn, bookno, title, author]):
        return jsonify({'error': 'ISBN, bookno, title, and author are required'}), 400

    db  = get_db()
    cur = dc(db)
    try:
        cur.execute(
            'INSERT INTO book (ISBN, bookno, title, author, publisher, lib_id, user_id, date_taken, return_date, fine, cover_image) '
            'VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
            (isbn, bookno, title, author, publisher, lib_id, user_id, date_taken, return_date, fine, cover_image)
        )
        cur.execute(
            'UPDATE book_record SET total_books_available = total_books_available + 1, '
            'add_record = %s WHERE lib_id = %s ORDER BY book_record_id DESC LIMIT 1',
            (datetime.datetime.now(), lib_id)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        if 'Duplicate entry' in str(e) or '1062' in str(e):
            return jsonify({'error': 'ISBN or bookno already exists'}), 409
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Book added successfully'}), 201


# ─── Update book (librarian only) ─────────────────────────────────────────────
@books_bp.route('/<isbn>', methods=['PUT'])
@librarian_required
def update_book(isbn):
    data      = request.get_json()
    title     = data.get('title', '').strip()
    author    = data.get('author', '').strip()
    publisher = data.get('publisher', '').strip()
    bookno    = data.get('bookno', '').strip()
    lib_id    = data.get('lib_id') or request.current_user['lib_id']
    cover_image = data.get('cover_image')  # None means no change sent; empty string means clear

    # Optional borrow fields – librarian can manually set/clear them
    user_id     = data.get('user_id') or None
    date_taken  = data.get('date_taken') or None
    return_date = data.get('return_date') or None
    fine        = data.get('fine') if data.get('fine') is not None else 0.00

    db  = get_db()
    cur = dc(db)
    try:
        cur.execute(
            'UPDATE book SET title=%s, author=%s, publisher=%s, bookno=%s, lib_id=%s, '
            'user_id=%s, date_taken=%s, return_date=%s, fine=%s, cover_image=%s WHERE ISBN=%s',
            (title, author, publisher, bookno, lib_id,
             user_id, date_taken, return_date, fine, cover_image, isbn)
        )
        cur.execute(
            'UPDATE book_record SET update_record = %s WHERE lib_id = %s ORDER BY book_record_id DESC LIMIT 1',
            (datetime.datetime.now(), lib_id)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Book updated successfully'}), 200


# ─── Delete book (librarian only) ─────────────────────────────────────────────
@books_bp.route('/<isbn>', methods=['DELETE'])
@librarian_required
def delete_book(isbn):
    lib_id = request.current_user['lib_id']
    db  = get_db()
    cur = dc(db)
    try:
        cur.execute('DELETE FROM book WHERE ISBN = %s', (isbn,))
        cur.execute(
            'UPDATE book_record SET total_books_available = GREATEST(total_books_available - 1, 0), '
            'delete_record = %s WHERE lib_id = %s ORDER BY book_record_id DESC LIMIT 1',
            (datetime.datetime.now(), lib_id)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Book deleted successfully'}), 200
