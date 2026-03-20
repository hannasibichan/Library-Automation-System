import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

db = mysql.connector.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', ''),
    database=os.getenv('DB_DATABASE', 'library_db')
)
cur = db.cursor(dictionary=True)
cur.execute('SELECT title, date_requested, request_expiry FROM book WHERE status = "requested"')
rows = cur.fetchall()
print(f"[DEBUG] Found {len(rows)} requests")
for r in rows:
    print(f"Title: {r['title']}")
    print(f"  Requested: {r['date_requested']}")
    print(f"  Expiry:    {r['request_expiry']}")
cur.close()
db.close()
