import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv('Backend/.env')

db = mysql.connector.connect(
    host=os.getenv('DB_HOST'),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_DATABASE')
)

cur = db.cursor()
# This is the correct hash for 'admin123'
correct_hash = '$2b$12$L5i2sZCo77cCYp5tAGstV.lSvoHDkJRcMzB6rRNx6WHQr7iHlMmKe'
email = 'admin@library.com'

cur.execute("UPDATE librarian SET password_hash = %s WHERE email = %s", (correct_hash, email))
db.commit()

print(f"Librarian {email} password hash updated successfully.")

cur.close()
db.close()
