import sqlite3

def run():
    conn = sqlite3.connect('../local_dev.db')
    cursor = conn.cursor()
    
    # Try adding columns. Catch exceptions if they already exist.
    columns = [
        "source_id INTEGER",
        "source_page INTEGER",
        "question_number INTEGER",
        "section_name TEXT",
        "raw_text TEXT",
        "cleaned_text TEXT",
        "question_source_type TEXT NOT NULL DEFAULT 'manual'",
        "year INTEGER",
        "has_image BOOLEAN NOT NULL DEFAULT 0"
    ]
    
    for col in columns:
        try:
            cursor.execute(f"ALTER TABLE question_bank ADD COLUMN {col}")
            print(f"Added column {col}")
        except sqlite3.OperationalError as e:
            print(f"Skipped {col}: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    run()
