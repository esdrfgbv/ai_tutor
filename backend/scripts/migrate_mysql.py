import os
from sqlalchemy import text
from app.db.session import engine

def run():
    sql_file = os.path.join("..", "database", "migrations", "add_question_extraction_tables.sql")
    with open(sql_file, "r") as f:
        sql = f.read()
    
    # Split by semicolon, filter empty
    statements = [s.strip() for s in sql.split(";") if s.strip()]
    
    with engine.connect() as conn:
        for stmt in statements:
            if stmt:
                print(f"Executing: {stmt[:50]}...")
                conn.execute(text(stmt))
        conn.commit()
    print("Migration complete.")

if __name__ == "__main__":
    run()
