from flask import Blueprint, request, jsonify
from utils.db import get_db
from utils.jwt_utils import token_required, librarian_required
from utils.fine_utils import calculate_gradual_fine
import bcrypt

users_bp = Blueprint('users', __name__)


def dc(conn):
    return conn.cursor(dictionary=True)


# ─── List all users (librarian only) ──────────────────────────────────────────
@users_bp.route('', methods=['GET'])
@librarian_required
def get_users():
    db  = get_db()
    cur = dc(db)
    cur.execute(
        'SELECT u.user_id, u.name, u.email, u.address, u.role, u.created_at, '
        'COUNT(b.ISBN) AS books_borrowed '
        'FROM user u LEFT JOIN book b ON b.user_id = u.user_id '
        'GROUP BY u.user_id ORDER BY u.name'
    )
    users = cur.fetchall()
    cur.close()
    for u in users:
        if u.get('created_at') and not isinstance(u['created_at'], str):
            u['created_at'] = u['created_at'].isoformat()
    return jsonify(users), 200


# ─── Get single user ───────────────────────────────────────────────────────────
@users_bp.route('/<int:user_id>', methods=['GET'])
@token_required
def get_user(user_id):
    db  = get_db()
    cur = dc(db)
    cur.execute(
        'SELECT user_id, name, email, address, role, created_at FROM user WHERE user_id = %s',
        (user_id,)
    )
    user = cur.fetchone()
    if not user:
        cur.close()
        return jsonify({'error': 'User not found'}), 404

    cur.execute('SELECT ISBN, title, author, publisher, cover_image FROM book WHERE user_id = %s', (user_id,))
    books = cur.fetchall()
    cur.close()

    from .books import _serialize
    if user.get('created_at') and not isinstance(user['created_at'], str):
        user['created_at'] = user['created_at'].isoformat()
    user['borrowed_books'] = _serialize(books)
    return jsonify(user), 200


# ─── Full profile + borrowed books (for Profile page) ─────────────────────────
@users_bp.route('/me/profile', methods=['GET'])
@token_required
def my_profile():
    user_id = request.current_user.get('user_id')
    lib_id  = request.current_user.get('lib_id')

    if not user_id and not lib_id:
        return jsonify({'error': 'Unauthorized'}), 401

    import datetime
    db  = get_db()
    cur = dc(db)

    user = None
    books = []

    if user_id:
        # Fetch User Details
        cur.execute(
            'SELECT user_id, name, email, address, role, created_at FROM user WHERE user_id = %s',
            (user_id,)
        )
        user = cur.fetchone()
        
        # Borrowed Books
        if user:
            cur.execute(
                'SELECT b.ISBN, b.bookno, b.title, b.author, b.publisher, '
                '       b.date_taken, b.return_date, b.fine, b.lib_id, b.cover_image, '
                '       l.name AS librarian_name '
                'FROM book b '
                'LEFT JOIN librarian l ON b.lib_id = l.lib_id '
                'WHERE b.user_id = %s ORDER BY b.date_taken DESC',
                (user_id,)
            )
            books = cur.fetchall()
    else:
        # Fetch Librarian Details
        cur.execute(
            'SELECT lib_id, name, email, mobileno AS address, created_at FROM librarian WHERE lib_id = %s',
            (lib_id,)
        )
        user = cur.fetchone()
        if user:
            user['role'] = 'librarian'

    cur.close()

    if not user:
        return jsonify({'error': 'Profile not found'}), 404

    # Serialise datetimes
    if user.get('created_at') and not isinstance(user['created_at'], str):
        user['created_at'] = user['created_at'].isoformat()

    FINE_PER_DAY = 2.00
    from .books import _serialize
    FINE_PER_DAY = 2.00
    now = datetime.datetime.now()
    for b in books:
        # live tiered fine computation
        b['current_fine'] = calculate_gradual_fine(b.get('return_date'))

    user['borrowed_books'] = _serialize(books)
    user['books_borrowed']  = len(books)
    user['borrow_limit']    = 5
    return jsonify(user), 200


# ─── User stats (for user dashboard) ──────────────────────────────────────────
@users_bp.route('/me/stats', methods=['GET'])
@token_required
def my_stats():
    user_id = request.current_user.get('user_id')
    if not user_id:
        return jsonify({'error': 'User only endpoint'}), 403

    db  = get_db()
    cur = dc(db)
    cur.execute('SELECT COUNT(*) AS borrowed FROM book WHERE user_id = %s', (user_id,))
    borrowed = cur.fetchone()['borrowed']

    cur.execute('SELECT COUNT(*) AS total_books FROM book')
    total_books = cur.fetchone()['total_books']

    cur.execute('SELECT COUNT(*) AS available FROM book WHERE user_id IS NULL')
    available = cur.fetchone()['available']
    cur.close()

    return jsonify({
        'books_borrowed': borrowed,
        'total_books': total_books,
        'available_books': available,
        'borrow_limit': 5,
        'remaining_borrows': max(0, 5 - borrowed)
    }), 200


# ─── Update profile details (Name, email, address) ────────────────────────────
@users_bp.route('/me/profile', methods=['PUT'])
@token_required
def update_profile():
    user_id = request.current_user.get('user_id')
    lib_id  = request.current_user.get('lib_id')

    if not user_id and not lib_id:
        return jsonify({'error': 'Unauthorized'}), 401

    data    = request.get_json()
    name    = data.get('name', '').strip()
    email   = data.get('email', '').strip().lower()
    address = data.get('address', '').strip() # address for users, mobileno for libs

    if not name or not email:
        return jsonify({'error': 'Name and email are required'}), 400

    db  = get_db()
    cur = dc(db)

    try:
        if user_id:
            # Check for email conflicts in user table
            cur.execute('SELECT user_id FROM user WHERE email = %s AND user_id != %s', (email, user_id))
            if cur.fetchone():
                return jsonify({'error': 'Email is already taken by another account'}), 409
            
            cur.execute(
                'UPDATE user SET name=%s, email=%s, address=%s WHERE user_id=%s',
                (name, email, address, user_id)
            )
        else:
            # Check for email conflicts in librarian table
            cur.execute('SELECT lib_id FROM librarian WHERE email = %s AND lib_id != %s', (email, lib_id))
            if cur.fetchone():
                return jsonify({'error': 'Email is already taken by another account'}), 409

            cur.execute(
                'UPDATE librarian SET name=%s, email=%s, mobileno=%s WHERE lib_id=%s',
                (name, email, address, lib_id)
            )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Profile updated successfully'}), 200


# ─── Change password ────────────────────────────────────────────────────────────
@users_bp.route('/me/password', methods=['PUT'])
@token_required
def change_password():
    user_id = request.current_user.get('user_id')
    if not user_id:
        return jsonify({'error': 'User only endpoint'}), 403

    data             = request.get_json()
    current_password = data.get('current_password', '')
    new_password     = data.get('new_password', '')

    if not current_password or not new_password:
        return jsonify({'error': 'Both current and new password are required'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    db  = get_db()
    cur = dc(db)
    cur.execute('SELECT password_hash FROM user WHERE user_id = %s', (user_id,))
    row = cur.fetchone()

    if not row or not bcrypt.checkpw(current_password.encode(), row['password_hash'].encode()):
        cur.close()
        return jsonify({'error': 'Current password is incorrect'}), 401

    new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    try:
        cur.execute('UPDATE user SET password_hash = %s WHERE user_id = %s', (new_hash, user_id))
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Password updated successfully'}), 200
