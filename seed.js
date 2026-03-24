const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'attendance.db');
const db = new sqlite3.Database(dbPath);

async function seed() {
    console.log("Starting database rebuild with real data...");
    const saltRounds = 10;

    // We will use separate passwords for faculty, students, and admin
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    const facultyPassword = await bcrypt.hash('faculty123', saltRounds);
    const studentPassword = await bcrypt.hash('student123', saltRounds);

    db.serialize(() => {
        // Clear existing data (optional, but good for a fresh start)
        db.run('DELETE FROM attendance');
        db.run('DELETE FROM enrollments');
        db.run('DELETE FROM subjects');
        db.run('DELETE FROM users');

        // Reset auto-increments
        db.run("DELETE FROM sqlite_sequence WHERE name IN ('attendance', 'enrollments', 'subjects', 'users')");

        // 1. Insert Users (Admin, Faculty, Students)
        const stmtUser = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
        
        // Admin (ID 1)
        stmtUser.run("Admin User", "admin@gmail.com", adminPassword, "admin");

        // Faculty (IDs 2-5)
        stmtUser.run("Mrs. Blessy", "wt@gmail.com", facultyPassword, "faculty");
        stmtUser.run("Mr. Ramakrishna", "cd@gmail.com", facultyPassword, "faculty");
        stmtUser.run("Mrs. Jyothi", "coa@gmail.com", facultyPassword, "faculty");
        stmtUser.run("Mr. Lakshmikanth", "dsp@gmail.com", facultyPassword, "faculty");

        // Students (IDs 6-9)
        stmtUser.run("B Lavanya", "lavanya@gmail.com", studentPassword, "student");
        stmtUser.run("K Vaishika", "vaishika@gmail.com", studentPassword, "student");
        stmtUser.run("K Susmitha", "susmitha@gmail.com", studentPassword, "student");
        stmtUser.run("Anu", "anu@gmail.com", studentPassword, "student");
        
        stmtUser.finalize();

        // 2. Insert Subjects (Faculty IDs match insertion order: 2=Blessy, 3=Rama, 4=Jyothi, 5=Lakshmi)
        const stmtSubject = db.prepare("INSERT INTO subjects (name, faculty_id) VALUES (?, ?)");
        stmtSubject.run("WT", 2);
        stmtSubject.run("DAA", 2);
        stmtSubject.run("CD", 3);
        stmtSubject.run("COA", 4);
        stmtSubject.run("DSP", 5);
        stmtSubject.finalize();

        // 3. Insert Enrollments (All students enrolled in all subjects)
        const stmtEnrollment = db.prepare("INSERT INTO enrollments (student_id, subject_id) VALUES (?, ?)");
        const studentIds = [6, 7, 8, 9];
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
