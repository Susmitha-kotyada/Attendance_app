const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'attendance.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log('Dropping tables...');
    db.run("DROP TABLE IF EXISTS attendance");
    db.run("DROP TABLE IF EXISTS enrollments");
    db.run("DROP TABLE IF EXISTS subjects");
    db.run("DROP TABLE IF EXISTS users");
    console.log('Tables dropped.');
});
