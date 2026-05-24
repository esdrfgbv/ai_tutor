import sqlite3
conn = sqlite3.connect('local_dev.db')
cursor = conn.cursor()
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='students'")
print(cursor.fetchone()[0])
