const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create connection to SQLite database
const dbPath = path.resolve(__dirname, 'user_data.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Initialize database
db.serialize(() => {
    // Create profile table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT,
        email TEXT,
        role TEXT,
        phone TEXT,
        location TEXT,
        avatarUrl TEXT
    )`);

    // Check if profile exists, if not create default
    db.get("SELECT * FROM profile WHERE id = 1", (err, row) => {
        if (!row) {
            console.log('Seeding initial profile data...');
            const insert = db.prepare(`INSERT INTO profile (fullName, email, role, phone, location) VALUES (?, ?, ?, ?, ?)`);
            insert.run('Admin User', 'admin@university.edu', 'Department Administrator', '+1 (555) 123-4567', 'Building A, Room 302');
            insert.finalize();
        }
    });
});

module.exports = db;
