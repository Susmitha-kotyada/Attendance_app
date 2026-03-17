const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'attendance.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        
        // Create tables
        db.serialize(() => {
            // Users table (Faculty and Students)
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('faculty', 'student'))
            )`);

            // Subjects table
            db.run(`CREATE TABLE IF NOT EXISTS subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                faculty_id INTEGER,
                FOREIGN KEY(faculty_id) REFERENCES users(id)
            )`);

            // Enrollments (Mapping students to subjects)
            db.run(`CREATE TABLE IF NOT EXISTS enrollments (
                student_id INTEGER,
                subject_id INTEGER,
                PRIMARY KEY (student_id, subject_id),
                FOREIGN KEY(student_id) REFERENCES users(id),
                FOREIGN KEY(subject_id) REFERENCES subjects(id)
            )`);

            // Attendance table
            db.run(`CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                period INTEGER NOT NULL,
                subject_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('present', 'absent')),
                faculty_id INTEGER NOT NULL,
                UNIQUE(date, period, subject_id, student_id),
                FOREIGN KEY(subject_id) REFERENCES subjects(id),
                FOREIGN KEY(student_id) REFERENCES users(id),
                FOREIGN KEY(faculty_id) REFERENCES users(id)
            )`);
            
            console.log('Database tables ensured.');
        });
    }
});

module.exports = db;
