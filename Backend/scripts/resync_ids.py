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
    
    print("🔍 Fetching all account records...")
    
    # 1. Fetch Librarians
    cur.execute("SELECT lib_id as id, name, created_at, 'lib' as type FROM librarian")
    libs = cur.fetchall()
    
    # 2. Fetch Users
    cur.execute("SELECT user_id as id, name, created_at, 'user' as type FROM user")
    users = cur.fetchall()
    
    # Combine and sort by original creation time
    all_accounts = libs + users
    all_accounts.sort(key=lambda x: x['created_at'] if x['created_at'] else '')
    
    print(f"📊 Total accounts found: {len(all_accounts)}")
    
    # 3. Temporarily disable foreign key checks
    cur.execute("SET FOREIGN_KEY_CHECKS = 0")
    
    # 4. Map old IDs to new IDs
    # Since we have overlapping OLD ids (lib_id 1 and user_id 1), we need to track them separately in the map
    id_map = {'lib': {}, 'user': {}}
    
    new_id = 1
    for acc in all_accounts:
        type_key = acc['type']
        old_id = acc['id']
        id_map[type_key][old_id] = new_id
        new_id += 1
        
    print("🔄 Re-assigning IDs in database...")
    
    # 5. Update Librarians (lib_id) - we do this one by one to avoid duplicate PK errors during the process
    # Actually, it's safer to use a temporary offset if we have many records, but for a small DB we can just update
    for old_id, new_val in id_map['lib'].items():
        # Update librarian table
        cur.execute("UPDATE librarian SET lib_id = %s WHERE lib_id = %s", (new_val, old_id))
        # Update references in book
        cur.execute("UPDATE book SET lib_id = %s WHERE lib_id = %s", (new_val, old_id))
        # Update references in book_record
        cur.execute("UPDATE book_record SET lib_id = %s WHERE lib_id = %s", (new_val, old_id))
        
    # 6. Update Users (user_id)
    for old_id, new_val in id_map['user'].items():
        # Update user table
        cur.execute("UPDATE user SET user_id = %s WHERE user_id = %s", (new_val, old_id))
        # Update references in book
        cur.execute("UPDATE book SET user_id = %s WHERE user_id = %s", (new_val, old_id))

    # 7. Re-enable foreign key checks
    cur.execute("SET FOREIGN_KEY_CHECKS = 1")
    
    # 8. Reset Auto-Increment to be far ahead
    cur.execute(f"ALTER TABLE librarian AUTO_INCREMENT = {new_id}")
    cur.execute(f"ALTER TABLE user AUTO_INCREMENT = {new_id}")
    
    db.commit()
    cur.close()
    db.close()
    print(f"✅ Re-sync complete! All accounts are now continuous from 1 to {new_id-1}.")
    print("🚀 Next ID will be:", new_id)

if __name__ == "__main__":
    try:
        sync_global_ids()
    except Exception as e:
        print(f"❌ Error during sync: {e}")
