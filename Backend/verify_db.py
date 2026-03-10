import mysql.connector
from app import DB_CONFIG

def test_connection():
    try:
        print(f"Attempting to connect to database: {DB_CONFIG['database']} at {DB_CONFIG['host']}...")
        conn = mysql.connector.connect(**DB_CONFIG)
        print("✅ Connection successful!")
        
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES")
        tables = [t[0] for t in cursor.fetchall()]
        print(f"Tables found: {', '.join(tables)}")
        
        cursor.close()
        conn.close()
    except mysql.connector.Error as err:
        print(f"❌ Connection FAILED: {err}")
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")

if __name__ == "__main__":
    test_connection()
