import bcrypt
import secrets
import timefrom flask 
import Blueprint, request, jsonifyfrom app 
import get_dbfrom utils.jwt_utils 
import generate_token, librarian_required

auth_bp = Blueprint('auth', __name__)

# ── In-memory password-reset store ────────────────────────────────────────────
# { email: {'otp': str, 'expires': float, 'account_type': 'user'|'librarian'} }
_reset_store: dict = {}


def dict_cursor(connection):
    return connection.cursor(dictionary=True)


# ─── User Register ────────────────────────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    data     = request.get_json()
    name     = data.get('name', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    address  = data.get('address', '').strip()
    role     = data.get('role', 'student')

    if not all([name, email, password]):
        return jsonify({'error': 'Name, email, and password are required'}), 400
    if role not in ('student', 'faculty'):
        return jsonify({'error': 'Role must be student or faculty'}), 400

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    db = get_db()
    cur = dict_cursor(db)
    try:
        cur.execute(
            'INSERT INTO user (name, email, address, role, password_hash) VALUES (%s,%s,%s,%s,%s)',
            (name, email, address, role, pw_hash)
        )
        db.commit()
        user_id = cur.lastrowid
    except Exception as e:
        db.rollback()
        if 'Duplicate entry' in str(e):
            return jsonify({'error': 'Email already registered'}), 409
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    token = generate_token({'user_id': user_id, 'name': name, 'email': email, 'role': role})
    return jsonify({'token': token, 'user': {'user_id': user_id, 'name': name, 'email': email, 'role': role}}), 201


# ─── User Login ───────────────────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not all([email, password]):
        return jsonify({'error': 'Email and password are required'}), 400

    db = get_db()
    cur = dict_cursor(db)
    cur.execute('SELECT * FROM user WHERE email = %s', (email,))
    user = cur.fetchone()
    cur.close()

    if not user or not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = generate_token({
        'user_id': user['user_id'], 'name': user['name'],
        'email': user['email'], 'role': user['role']
    })
    return jsonify({
        'token': token,
        'user': {'user_id': user['user_id'], 'name': user['name'], 'email': user['email'], 'role': user['role']}
    }), 200


# ─── Librarian Login ──────────────────────────────────────────────────────────
@auth_bp.route('/librarian/login', methods=['POST'])
def librarian_login():
    data     = request.get_json()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not all([email, password]):
        return jsonify({'error': 'Email and password are required'}), 400

    db = get_db()
    cur = dict_cursor(db)
    cur.execute('SELECT * FROM librarian WHERE email = %s', (email,))
    lib = cur.fetchone()
    cur.close()

    if not lib or not bcrypt.checkpw(password.encode(), lib['password_hash'].encode()):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = generate_token({
        'lib_id': lib['lib_id'], 'name': lib['name'],
        'email': lib['email'], 'role': 'librarian'
    })
    return jsonify({
        'token': token,
        'user': {'lib_id': lib['lib_id'], 'name': lib['name'], 'email': lib['email'], 'role': 'librarian'}
    }), 200


# ─── Add Librarian (existing librarian only) ──────────────────────────────────
@auth_bp.route('/librarian/register', methods=['POST'])
@librarian_required
def add_librarian():
    data     = request.get_json()
    name     = data.get('name', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')
    mobileno = data.get('mobileno', '').strip()

    if not all([name, email, password]):
        return jsonify({'error': 'Name, email, and password are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    db  = get_db()
    cur = dict_cursor(db)
    try:
        cur.execute(
            'INSERT INTO librarian (name, email, mobileno, password_hash) VALUES (%s,%s,%s,%s)',
            (name, email, mobileno, pw_hash)
        )
        db.commit()
        lib_id = cur.lastrowid
        # Create a matching book_record entry for this librarian
        cur.execute(
            'INSERT INTO book_record (lib_id, total_books_available) VALUES (%s, 0)',
            (lib_id,)
        )
        db.commit()
    except Exception as e:
        db.rollback()
        if 'Duplicate entry' in str(e):
            return jsonify({'error': 'Email already registered'}), 409
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    return jsonify({'message': f'Librarian {name} added successfully', 'lib_id': lib_id}), 201


# ─── Forgot Password ───────────────────────────────────────────────────────────
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data  = request.get_json()
    email = data.get('email', '').strip().lower()

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    db  = get_db()
    cur = dict_cursor(db)

    # Check user table first
    cur.execute('SELECT email FROM user WHERE email = %s', (email,))
    user = cur.fetchone()

    account_type = None
    if user:
        account_type = 'user'
    else:
        # Check librarian table
        cur.execute('SELECT email FROM librarian WHERE email = %s', (email,))
        lib = cur.fetchone()
        if lib:
            account_type = 'librarian'
    cur.close()

    if not account_type:
        # Always return 200 to avoid email enumeration
        return jsonify({'message': 'If that email is registered, a reset code has been sent.'}), 200

    # Generate a 6-digit OTP valid for 15 minutes
    otp = str(secrets.randbelow(900000) + 100000)  # 100000–999999
    _reset_store[email] = {
        'otp': otp,
        'expires': time.time() + 900,   # 15 min
        'account_type': account_type
    }

    # In production you would email this; for dev we return it directly
    return jsonify({
        'message': 'Reset code generated. Check your email.',
        'reset_code': otp,          # expose for demo / development
        'account_type': account_type
    }), 200


# ─── Reset Password ────────────────────────────────────────────────────────────
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data         = request.get_json()
    email        = data.get('email', '').strip().lower()
    otp          = data.get('otp', '').strip()
    new_password = data.get('new_password', '')

    if not all([email, otp, new_password]):
        return jsonify({'error': 'Email, reset code, and new password are required'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    record = _reset_store.get(email)
    if not record:
        return jsonify({'error': 'No reset request found for this email. Please request a new code.'}), 400
    if time.time() > record['expires']:
        _reset_store.pop(email, None)
        return jsonify({'error': 'Reset code has expired. Please request a new one.'}), 400
    if record['otp'] != otp:
        return jsonify({'error': 'Invalid reset code.'}), 400

    pw_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    db  = get_db()
    cur = dict_cursor(db)
    try:
        if record['account_type'] == 'user':
            cur.execute('UPDATE user SET password_hash = %s WHERE email = %s', (pw_hash, email))
        else:
            cur.execute('UPDATE librarian SET password_hash = %s WHERE email = %s', (pw_hash, email))
        db.commit()
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cur.close()

    _reset_store.pop(email, None)  # invalidate token after use
    return jsonify({'message': 'Password reset successfully! You can now log in.'}), 200
