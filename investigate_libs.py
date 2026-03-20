import mysql.connector
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), 'Backend', '.env')
load_dotenv(env_path)

try:
    db = mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', 'admin123'),
        database=os.getenv('DB_NAME', 'library_db')
    )
    cur = db.cursor()
    cur.execute("DESCRIBE librarian")
    cols = cur.fetchall()
    print("--- LIBRARIAN TABLE ---")
    for c in cols:
        print(c)
        
    cur.execute("SELECT * FROM librarian")
    libs = cur.fetchall()
    print("\n--- LIBRARIANS ---")
    for l in libs:
        print(l)
        
    cur.close()
    db.close()
except Exception as e:
    print(f"Error: {e}")
