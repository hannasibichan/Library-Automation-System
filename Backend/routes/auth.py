import bcrypt
import secrets
import time
from flask import Blueprint, request, jsonify, current_app
from flask_mail import Message
from utils.db import get_db
from utils.jwt_utils import generate_token, librarian_required

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
    return jsonify({'token': token, 'user': {'user_id': user_id, 'name': name, 'email': email, 'role': role, 'address': address}}), 201


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
        'user': {
            'user_id': user['user_id'], 'name': user['name'],
            'email': user['email'],    'role': user['role'],
            'address': user.get('address', '')
        }
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

    # Send Email
    try:
        from app import mail
        msg = Message(
            subject="🔐 Bibliotheca - Password Reset Code",
            recipients=[email]
        )
        msg.html = f"""
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #6d28d9; margin: 0; font-size: 24px;">📖 Bibliotheca</h1>
                <p style="color: #64748b; font-size: 14px;">Library Automation System</p>
            </div>
            
            <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px; text-align: center;">
                <h2 style="color: #1e293b; margin-top: 0;">Password Reset Request</h2>
                <p style="color: #475569; font-size: 16px;">You requested a code to reset your password. Use the code below:</p>
                
                <div style="margin: 25px 0; padding: 15px; background-color: #ffffff; border: 2px dashed #a78bfa; border-radius: 8px; display: inline-block;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7c3aed;">{otp}</span>
                </div>
                
                <p style="color: #94a3b8; font-size: 13px; margin-bottom: 0;">This code will expire in <b>15 minutes</b>.<br>If you didn't request this, you can safely ignore this email.</p>
            </div>
            
            <div style="margin-top: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
                &copy; 2024 Bibliotheca Library Management. All rights reserved.
            </div>
        </div>
        """
        mail.send(msg)
    except Exception as e:
        # Log the error in production
        print(f"Failed to send email: {e}")
        return jsonify({'error': 'Failed to send reset email. Please try again later.'}), 500

    return jsonify({
        'message': 'Reset code sent to your email.',
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
