import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app

def generate_token(payload: dict) -> str:
    payload['exp'] = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    return jwt.encode(payload, current_app.config['JWT_SECRET'], algorithm='HS256')

def token_required(f):
    """Protect routes: requires a valid user or librarian JWT."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            data = jwt.decode(token, current_app.config['JWT_SECRET'], algorithms=['HS256'])
            request.current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated

def librarian_required(f):
    """Protect routes: requires a librarian JWT."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            data = jwt.decode(token, current_app.config['JWT_SECRET'], algorithms=['HS256'])
            if data.get('role') != 'librarian':
                return jsonify({'error': 'Librarian access required'}), 403
            request.current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated
