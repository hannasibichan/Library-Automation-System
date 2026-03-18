import bcrypt

password = "admin123"
# Hash from schema.sql
hash_from_db = "$2b$12$KIXyM3nLhGp7FGX3JmRpPO9kT5e.PIFLdFrq0d6YoqXP5e7g8D3AS"

if bcrypt.checkpw(password.encode(), hash_from_db.encode()):
    print("MATCH")
else:
    print("NO MATCH")
