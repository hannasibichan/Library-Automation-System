from flask import Blueprint, request, jsonify
from app import get_db
from utils.jwt_utils import librarian_required
import datetime

records_bp = Blueprint('records', __name__)


def dc(conn):
    return conn.cursor(dictionary=True)


# ─── List all book records ─────────────────────────────────────────────────────
@records_bp.route('', methods=['GET'])
@librarian_required
def get_records():
    db  = get_db()
    cur = dc(db)
    cur.execute(
        'SELECT r.*, l.name AS librarian_name FROM book_record r '
        'LEFT JOIN librarian l ON r.lib_id = l.lib_id '
        'ORDER BY r.book_record_id DESC'
    )
    records = cur.fetchall()
    cur.close()
    # Convert datetime objects to strings for JSON serialisation
    for r in records:
        for k in ('add_record', 'delete_record', 'update_record'):
            if r[k] and not isinstance(r[k], str):
                r[k] = r[k].isoformat()
    return jsonify(records), 200


# ─── Create book record ────────────────────────────────────────────────────────
@records_bp.route('', methods=['POST'])
@librarian_required
def create_record():
    lib_id = request.current_user['lib_id']
    data   = request.get_json()
    total  = data.get('total_books_available', 0)

    db  = get_db()
    cur = dc(db)
    try:
        cur.execute(
            'INSERT INTO book_record (lib_id, total_books_available) VALUES (%s, %s)',
            (lib_id, total)
        )
        db.commit()
        record_id = cur.lastrowid
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Record created', 'book_record_id': record_id}), 201


# ─── Update book record ────────────────────────────────────────────────────────
@records_bp.route('/<int:record_id>', methods=['PUT'])
@librarian_required
def update_record(record_id):
    data   = request.get_json()
    total  = data.get('total_books_available')
    lib_id = request.current_user['lib_id']

    db  = get_db()
    cur = dc(db)
    try:
        cur.execute(
            'UPDATE book_record SET total_books_available = %s, update_record = %s '
            'WHERE book_record_id = %s AND lib_id = %s',
            (total, datetime.datetime.now(), record_id, lib_id)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Record updated'}), 200


# ─── Soft-delete book record ───────────────────────────────────────────────────
@records_bp.route('/<int:record_id>', methods=['DELETE'])
@librarian_required
def delete_record(record_id):
    lib_id = request.current_user['lib_id']
    db  = get_db()
    cur = dc(db)
    try:
        cur.execute(
            'UPDATE book_record SET delete_record = %s WHERE book_record_id = %s AND lib_id = %s',
            (datetime.datetime.now(), record_id, lib_id)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Record marked as deleted'}), 200


# ─── Dashboard stats ───────────────────────────────────────────────────────────
@records_bp.route('/stats', methods=['GET'])
@librarian_required
def get_stats():
    db  = get_db()
    cur = dc(db)

    cur.execute('SELECT COUNT(*) AS total_books FROM book')
    total_books = cur.fetchone()['total_books']

    cur.execute('SELECT COUNT(*) AS borrowed FROM book WHERE user_id IS NOT NULL')
    borrowed = cur.fetchone()['borrowed']

    cur.execute('SELECT COUNT(*) AS total_users FROM user')
    total_users = cur.fetchone()['total_users']

    cur.execute('SELECT COUNT(*) AS available FROM book WHERE user_id IS NULL')
    available = cur.fetchone()['available']
    cur.close()

    return jsonify({
        'total_books': total_books, 'borrowed': borrowed,
        'available': available, 'total_users': total_users
    }), 200
