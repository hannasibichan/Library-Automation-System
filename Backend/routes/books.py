from flask import Blueprint, request, jsonify
from utils.db import get_db
from utils.jwt_utils import token_required, librarian_required
from utils.fine_utils import calculate_gradual_fine
import datetime

books_bp = Blueprint('books', __name__)


def dc(conn):
    return conn.cursor(dictionary=True)


import os
import base64
import uuid

def _save_image(base64_str):
    """Saves base64 image string to a file and returns the filename."""
    if not base64_str or not isinstance(base64_str, str):
        return None
    
    # If it's already a filename (doesn't contain base64 signature), return as is
    if not base64_str.startswith('data:image'):
        # Check if it's just raw base64 (very long, no spaces)
        if len(base64_str) > 100 and ',' not in base64_str:
            pass # We'll try to process it as raw base64 below
        else:
            return base64_str

    try:
        if ',' in base64_str:
            header, encoded = base64_str.split(",", 1)
            ext = header.split("/")[1].split(";")[0] # e.g. 'png'
        else:
            encoded = base64_str
            ext = 'png' # default
            
        data = base64.b64decode(encoded)
        filename = f"{uuid.uuid4()}.{ext}"
        
        # Ensure uploads folder exists
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
        if not os.path.exists(uploads_dir):
            os.makedirs(uploads_dir)
            
        filepath = os.path.join(uploads_dir, filename)
        with open(filepath, "wb") as f:
            f.write(data)
        return filename
    except Exception as e:
        print(f"Error saving image: {e}")
        return None

def _serialize(books_list):
    """Convert datetime fields to ISO strings and fix image paths."""
    for b in books_list:
        for field in ('date_taken', 'return_date', 'date_requested', 'request_expiry', 'date_added'):
            if isinstance(b.get(field), datetime.datetime):
                b[field] = b[field].isoformat()
        
        # If cover_image is a filename, prepend the storage path
        img = b.get('cover_image')
        if img and not img.startswith('data:image') and not img.startswith('http'):
            b['cover_image'] = f"http://localhost:5000/uploads/{img}"
        
        # Add dynamic current_fine calculation
        if b.get('status') == 'borrowed':
            b['current_fine'] = calculate_gradual_fine(b.get('return_date'))
        else:
            b['current_fine'] = 0.00
            
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


# ─── Get single book by Book No. ──────────────────────────────────────────
@books_bp.route('/copy/<bookno>', methods=['GET'])
def get_book_by_no(bookno):
    db  = get_db()
    cur = dc(db)
    cur.execute(
        'SELECT b.*, l.name AS librarian_name, u.name AS borrowed_by '
        'FROM book b LEFT JOIN librarian l ON b.lib_id = l.lib_id '
        'LEFT JOIN user u ON b.user_id = u.user_id WHERE b.bookno = %s',
        (bookno,)
    )
    book = cur.fetchone()
    cur.close()
    if not book:
        return jsonify({'error': 'Book copy not found'}), 404
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
    # Force the book to be added under the currently logged-in librarian's ID
    lib_id    = request.current_user['lib_id']
    cover_image = data.get('cover_image')
    
    # Save image to file if provided
    image_filename = _save_image(cover_image)

    # Optional borrow fields (when adding a book that is already borrowed)
    user_id     = data.get('user_id') or None
    date_taken  = data.get('date_taken') or None
    return_date = data.get('return_date') or None
    fine        = data.get('fine') or 0.00

    if not all([isbn, bookno, title, author]):
        return jsonify({'error': 'ISBN, bookno, title, and author are required'}), 400

    # Validation for dates
    now = datetime.datetime.now()
    if date_taken:
        try:
            dt_taken = datetime.datetime.fromisoformat(date_taken.replace('Z', ''))
            if dt_taken > now:
                return jsonify({'error': 'Date taken cannot be in the future'}), 400
            
            if return_date:
                dt_return = datetime.datetime.fromisoformat(return_date.replace('Z', ''))
                if dt_return < dt_taken:
                    return jsonify({'error': 'Return date cannot be before date taken'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    # Determine status based on user_id
    status = 'borrowed' if user_id else 'available'

    db  = get_db()
    cur = dc(db)
    
    # Check if user has overdue books before allowing addition with user_id
    if user_id:
        cur.execute("SELECT return_date FROM book WHERE user_id = %s AND status = 'borrowed'", (user_id,))
        borrowed = cur.fetchall()
        for b in borrowed:
            if b['return_date'] and b['return_date'].date() < now.date():
                cur.close()
                return jsonify({'error': 'This user has overdue books. Return them before borrowing more.'}), 403
    try:
        cur.execute(
            'INSERT INTO book (ISBN, bookno, title, author, publisher, lib_id, user_id, date_taken, return_date, fine, cover_image, status) '
            'VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)',
            (isbn, bookno, title, author, publisher, lib_id, user_id, date_taken, return_date, fine, image_filename, status)
        )
        cur.execute(
            'UPDATE book_record SET total_books_available = total_books_available + 1, '
            'add_record = %s WHERE lib_id = %s ORDER BY book_record_id DESC LIMIT 1',
            (datetime.datetime.now(), lib_id)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        err_str = str(e).lower()
        if 'foreign key constraint fails' in err_str and 'user_id' in err_str:
            return jsonify({'error': 'Invalid User ID. This user does not exist.'}), 400
        if 'duplicate entry' in err_str or '1062' in err_str:
            return jsonify({'error': 'Book No. already exists. Each copy must have a unique book number.'}), 409
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Book added successfully'}), 201


# ─── Update book copy (librarian only) ─────────────────────────────────────────
@books_bp.route('/<isbn>/<bookno>', methods=['PUT'])
@librarian_required
def update_book(isbn, bookno):
    data      = request.get_json()
    title     = data.get('title', '').strip()
    author    = data.get('author', '').strip()
    publisher = data.get('publisher', '').strip()
    bookno    = data.get('bookno', '').strip()
    lib_id    = data.get('lib_id') or request.current_user['lib_id']
    cover_image = data.get('cover_image')

    # Optional borrow fields – librarian can manually set/clear them
    user_id     = data.get('user_id') or None
    date_taken  = data.get('date_taken') or None
    return_date = data.get('return_date') or None
    fine        = data.get('fine') if data.get('fine') is not None else 0.00

    # Validation for dates
    now = datetime.datetime.now()
    if date_taken:
        try:
            dt_taken = datetime.datetime.fromisoformat(date_taken.replace('Z', ''))
            if dt_taken > now:
                return jsonify({'error': 'Date taken cannot be in the future'}), 400
            
            if return_date:
                dt_return = datetime.datetime.fromisoformat(return_date.replace('Z', ''))
                if dt_return < dt_taken:
                    return jsonify({'error': 'Return date cannot be before date taken'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    # Save image to file if provided as base64
    image_filename = None
    if cover_image:
        if cover_image.startswith('data:image') or (len(cover_image) > 100 and ',' not in cover_image):
            image_filename = _save_image(cover_image)
        else:
            image_filename = cover_image # Keep existing filename

    # Determine status based on user_id
    status = 'borrowed' if user_id else 'available'

    db  = get_db()
    cur = dc(db)

    # Check if user has overdue books before allowing update with user_id
    if user_id:
        cur.execute("SELECT return_date FROM book WHERE user_id = %s AND status = 'borrowed' AND (ISBN != %s OR bookno != %s)", (user_id, isbn, bookno))
        borrowed = cur.fetchall()
        for b in borrowed:
            if b['return_date'] and b['return_date'].date() < now.date():
                cur.close()
                return jsonify({'error': 'This user has overdue books and must return them first.'}), 403
    try:
        cur.execute(
            'UPDATE book SET title=%s, author=%s, publisher=%s, ISBN=%s, bookno=%s, lib_id=%s, '
            'user_id=%s, date_taken=%s, return_date=%s, fine=%s, cover_image=%s, status=%s '
            'WHERE ISBN=%s AND bookno=%s',
            (title, author, publisher, data.get('ISBN', '').strip(), data.get('bookno', '').strip(), lib_id,
              user_id, date_taken, return_date, fine, image_filename, status, isbn, bookno)
        )
        cur.execute(
            'UPDATE book_record SET update_record = %s WHERE lib_id = %s ORDER BY book_record_id DESC LIMIT 1',
            (datetime.datetime.now(), lib_id)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        err_str = str(e).lower()
        if 'foreign key constraint fails' in err_str and 'user_id' in err_str:
            return jsonify({'error': 'Invalid User ID. This user does not exist.'}), 400
        if 'duplicate entry' in err_str or '1062' in err_str:
            return jsonify({'error': 'A book with this ISBN and Book No. already exists.'}), 409
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Book updated successfully'}), 200


# ─── Delete book copy (librarian only) ─────────────────────────────────────────
@books_bp.route('/<isbn>/<bookno>', methods=['DELETE'])
@librarian_required
def delete_book(isbn, bookno):
    lib_id = request.current_user['lib_id']
    db  = get_db()
    cur = dc(db)
    try:
        cur.execute('DELETE FROM book WHERE ISBN = %s AND bookno = %s', (isbn, bookno))
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
