const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'attendance.db');
const db = new sqlite3.Database(dbPath);

async function seed() {
    console.log("Starting database rebuild with real data...");
    const saltRounds = 10;
    
    // We will use a generic password 'password123' for all accounts for testing
    const defaultPassword = await bcrypt.hash('password123', saltRounds);

    db.serialize(() => {
        // Clear existing data (optional, but good for a fresh start)
        db.run('DELETE FROM attendance');
        db.run('DELETE FROM enrollments');
        db.run('DELETE FROM subjects');
        db.run('DELETE FROM users');
        
        // Reset auto-increments
        db.run("DELETE FROM sqlite_sequence WHERE name IN ('attendance', 'enrollments', 'subjects', 'users')");

        // 1. Insert Faculty
        const stmtUser = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
        
        // Faculty (IDs 1-4)
        stmtUser.run("Mrs. Blessy", "wt@gmail.com", defaultPassword, "faculty");
        stmtUser.run("Mr. Ramakrishna", "cd@gmail.com", defaultPassword, "faculty");
        stmtUser.run("Mrs. Jyothi", "coa@gmail.com", defaultPassword, "faculty");
        stmtUser.run("Mr. Lakshmikanth", "dsp@gmail.com", defaultPassword, "faculty");

        // Students (IDs 5-7)
        stmtUser.run("B Lavanya", "lavanya@gmail.com", defaultPassword, "student");
        stmtUser.run("K Vaishika", "vaishika@gmail.com", defaultPassword, "student");
        stmtUser.run("K Susmitha", "susmitha@gmail.com", defaultPassword, "student");
        
        stmtUser.finalize();

        // 2. Insert Subjects (Faculty IDs match insertion order: 1=Blessy, 2=Rama, 3=Jyothi, 4=Lakshmi)
        const stmtSubject = db.prepare("INSERT INTO subjects (name, faculty_id) VALUES (?, ?)");
        stmtSubject.run("WT", 1);
        stmtSubject.run("CD", 2);
        stmtSubject.run("COA", 3);
        stmtSubject.run("DSP", 4);
        stmtSubject.finalize();

        // 3. Insert Enrollments (All students enrolled in all subjects)
        const stmtEnrollment = db.prepare("INSERT INTO enrollments (student_id, subject_id) VALUES (?, ?)");
        const studentIds = [5, 6, 7];
        const subjectIds = [1, 2, 3, 4];

        for (const studentId of studentIds) {
            for (const subjectId of subjectIds) {
                stmtEnrollment.run(studentId, subjectId);
            }
        }
        stmtEnrollment.finalize();

        console.log("Database seeded successfully with your real faculty, subjects, and students!");
        console.log("All accounts have been created with the default password: 'password123'");
    });
}

seed();
