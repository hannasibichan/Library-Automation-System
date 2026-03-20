import mysql.connector
import os
from dotenv import load_dotenv

# Load database credentials
load_dotenv()

def sync_global_ids():
    db = mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=os.getenv('DB_DATABASE', 'library_db')
    )
    cur = db.cursor(dictionary=True)
    
    print("[SEARCH] Fetching all account records...")
    
    # 1. Fetch Librarians
    cur.execute("SELECT lib_id as id, name, created_at FROM librarian ORDER BY created_at")
    libs = cur.fetchall()
    
    # 2. Fetch Users
    cur.execute("SELECT user_id as id, name, created_at FROM user ORDER BY created_at")
    users = cur.fetchall()
    
    # 3. Temporarily disable foreign key checks
    cur.execute("SET FOREIGN_KEY_CHECKS = 0")
    
    print("[RE-SYNC] Resetting Librarian IDs to 1, 2, 3...")
    new_lib_id = 1
    for lib in libs:
        old_id = lib['id']
        cur.execute("UPDATE librarian SET lib_id = %s WHERE lib_id = %s", (new_lib_id, old_id))
        cur.execute("UPDATE book SET lib_id = %s WHERE lib_id = %s", (new_lib_id, old_id))
        cur.execute("UPDATE book_record SET lib_id = %s WHERE lib_id = %s", (new_lib_id, old_id))
        new_lib_id += 1

    print("[RE-SYNC] Resetting User IDs to 1, 2, 3...")
    new_user_id = 1
    for user in users:
        old_id = user['id']
        cur.execute("UPDATE user SET user_id = %s WHERE user_id = %s", (new_user_id, old_id))
        cur.execute("UPDATE book SET user_id = %s WHERE user_id = %s", (new_user_id, old_id))
        new_user_id += 1

    # 4. Re-enable foreign key checks
    cur.execute("SET FOREIGN_KEY_CHECKS = 1")
    
    # 5. Reset Auto-Increment
    cur.execute(f"ALTER TABLE librarian AUTO_INCREMENT = {new_lib_id}")
    cur.execute(f"ALTER TABLE user AUTO_INCREMENT = {new_user_id}")
    
    db.commit()
    cur.close()
    db.close()
    print(f"[SUCCESS] Re-sync complete! Librarians: 1-{new_lib_id-1}, Users: 1-{new_user_id-1}.")

if __name__ == "__main__":
    try:
        sync_global_ids()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[ERROR] Error during sync: {e}")
