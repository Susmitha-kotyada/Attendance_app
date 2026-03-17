const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>{
    console.log("server running on port"+PORT);
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // For serving frontend files later

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Attendance API is running' });
});

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'super-secret-key-for-attendance-app';

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) return res.sendStatus(401);
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Ensure database tables exist and are connected before API calls
app.use((req, res, next) => {
    req.db = db;
    next();
});

// --- API ROUTES ---

// 1. Authentication (Login)
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    req.db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    });
});

// 2. Faculty APIs
app.get('/api/faculty/subjects', authenticateToken, (req, res) => {
    if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Access denied' });

    req.db.all("SELECT id, name FROM subjects WHERE faculty_id = ?", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.get('/api/faculty/students/:subjectId', authenticateToken, (req, res) => {
    if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Access denied' });
    
    const subjectId = req.params.subjectId;
    
    // Check if faculty owns this subject
    req.db.get("SELECT id FROM subjects WHERE id = ? AND faculty_id = ?", [subjectId, req.user.id], (err, subject) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!subject) return res.status(403).json({ error: 'Not authorized for this subject' });
        
        // Get all students enrolled in this subject
        const query = `
            SELECT u.id, u.name, u.email 
            FROM users u
            JOIN enrollments e ON u.id = e.student_id
            WHERE e.subject_id = ? AND u.role = 'student'
        `;
        
        req.db.all(query, [subjectId], (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(rows);
        });
    });
});

app.post('/api/faculty/attendance', authenticateToken, (req, res) => {
    if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Access denied' });
    
    const { date, period, subject_id, attendance_records } = req.body;
    // attendance_records format: [{ student_id: 1, status: 'present' }, ...]
    
    if (!date || !period || !subject_id || !attendance_records || !Array.isArray(attendance_records)) {
        return res.status(400).json({ error: 'Missing or invalid parameters' });
    }

    req.db.serialize(() => {
        req.db.run("BEGIN TRANSACTION");
        
        const stmt = req.db.prepare(`
            INSERT INTO attendance (date, period, subject_id, student_id, status, faculty_id) 
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(date, period, subject_id, student_id) 
            DO UPDATE SET status=excluded.status
        `);

        for (const record of attendance_records) {
            stmt.run([date, period, subject_id, record.student_id, record.status, req.user.id]);
        }
        
        stmt.finalize();
        
        req.db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: 'Failed to commit attendance' });
            res.json({ message: 'Attendance saved successfully' });
        });
    });
});

app.get('/api/faculty/attendance/date', authenticateToken, (req, res) => {
     if (req.user.role !== 'faculty') return res.status(403).json({ error: 'Access denied' });
     
     const { date, period, subject_id } = req.query;
     if (!date || !period || !subject_id) return res.status(400).json({ error: 'Missing parameters' });

     req.db.all(
         "SELECT student_id, status FROM attendance WHERE date = ? AND period = ? AND subject_id = ? AND faculty_id = ?",
         [date, period, subject_id, req.user.id],
         (err, rows) => {
             if (err) return res.status(500).json({ error: 'Database error' });
             res.json(rows);
         }
     );
});

// 3. Student APIs
app.get('/api/student/attendance', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Access denied' });
    
    // Get all attendance for subjects the student is enrolled in
    const query = `
        SELECT a.date, a.period, a.status, s.name as subject_name
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
        WHERE a.student_id = ?
        ORDER BY a.date DESC, a.period ASC
    `;
    
    req.db.all(query, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        // Calculate statistics
        const totalClasses = rows.length;
        const classesPresent = rows.filter(r => r.status === 'present').length;
        const percentage = totalClasses > 0 ? ((classesPresent / totalClasses) * 100).toFixed(2) : 0;
        
        res.json({
            records: rows,
            stats: {
                totalClasses,
                classesPresent,
                percentage
            }
        });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
