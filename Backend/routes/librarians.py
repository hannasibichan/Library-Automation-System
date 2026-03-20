from flask import Blueprint, request, jsonify
from utils.db import get_db
from utils.jwt_utils import main_librarian_required
import bcrypt

librarians_bp = Blueprint('librarians', __name__)

def dict_cursor(connection):
    return connection.cursor(dictionary=True)

@librarians_bp.route('', methods=['GET'])
@main_librarian_required
def list_librarians():
    db = get_db()
    cur = dict_cursor(db)
    cur.execute("SELECT lib_id, name, email, mobileno, created_at FROM librarian")
    libs = cur.fetchall()
    cur.close()
    
    # Format dates
    for lib in libs:
        if lib['created_at']:
            lib['created_at'] = lib['created_at'].isoformat()
            
    return jsonify(libs), 200

@librarians_bp.route('/<int:lib_id>', methods=['PUT'])
@main_librarian_required
def update_librarian(lib_id):
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    mobileno = data.get('mobileno')
    password = data.get('password')

    if not name or not email:
        return jsonify({'error': 'Name and Email are required'}), 400

    db = get_db()
    cur = dict_cursor(db)
    
    try:
        if password:
            pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            cur.execute(
                "UPDATE librarian SET name=%s, email=%s, mobileno=%s, password_hash=%s WHERE lib_id=%s",
                (name, email, mobileno, pw_hash, lib_id)
            )
        else:
            cur.execute(
                "UPDATE librarian SET name=%s, email=%s, mobileno=%s WHERE lib_id=%s",
                (name, email, mobileno, lib_id)
            )
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Librarian updated successfully'}), 200

@librarians_bp.route('/<int:lib_id>', methods=['DELETE'])
@main_librarian_required
def delete_librarian(lib_id):
    if lib_id == 1:
        return jsonify({'error': 'Main Admin cannot be deleted'}), 400

    db = get_db()
    cur = dict_cursor(db)
    try:
        # Before deleting, check if librarian has any records associated
        # Actually, librarian ID is linked in 'book' table. We might need to NULL them out or something.
        # For safety, let's just delete. If there's FK constraint, it will fail.
        cur.execute("DELETE FROM librarian WHERE lib_id = %s", (lib_id,))
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': 'Cannot delete librarian. They might have existing records assigned.'}), 500
    finally:
        cur.close()

    return jsonify({'message': 'Librarian deleted successfully'}), 200
