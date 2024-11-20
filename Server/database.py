import sqlite3
from pathlib import Path

DB_FILE = 'fits_data.db'

def create_database():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS fits_metadata
                (id INTEGER PRIMARY KEY AUTOINCREMENT,
                year TEXT, filename TEXT, min REAL, max REAL, mean REAL, stdev REAL)''')

    conn.commit()
    conn.close()

if __name__ == "__main__":
    create_database()