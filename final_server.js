const express = require('express');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Database initialization
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL, -- 'student', 'teacher', 'staff', 'admin'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Students table
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    class TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Teachers table
  db.run(`CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Grades table
  db.run(`CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    exam_type TEXT NOT NULL, -- 'exam', 'quiz', 'assignment', 'project'
    grade REAL NOT NULL,
    date DATE NOT NULL,
    teacher_id INTEGER,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Announcements table
  db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date DATE NOT NULL,
    author_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert default admin user if none exists
  const saltRounds = 10;
  const defaultPassword = 'admin123';
  bcrypt.hash(defaultPassword, saltRounds, (err, hash) => {
    if (err) {
      console.error('Error hashing default password:', err);
    } else {
      db.run(
        `INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
        ['admin', 'admin@school.edu', hash, 'admin'],
        function(err) {
          if (err) {
            console.error('Error inserting default admin:', err);
          } else {
            console.log('Default admin user checked/created');
          }
        }
      );
    }
  });
});

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Main routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.get('/teacher', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/teacher.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/student.html'));
});

app.get('/staff', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/staff.html'));
});

app.get('/logout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/logout.html'));
});

// Authentication routes
app.post('/api/users/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  const query = 'SELECT id, username, password_hash, role FROM users WHERE username = ?';
  
  db.get(query, [username], async (err, user) => {
    if (err) {
      console.error('Database error during login:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    try {
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'fallback_secret_key',
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token: token,
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        }
      });
    } catch (error) {
      console.error('Error during password comparison:', error);
      res.status(500).json({ message: 'Authentication error' });
    }
  });
});

// Student grades routes
app.get('/api/grades/student/:studentId', authenticateToken, (req, res) => {
  const { studentId } = req.params;

  const query = `
    SELECT g.id, g.subject, g.exam_type, g.grade, g.date, t.name as teacher_name
    FROM grades g
    LEFT JOIN teachers t ON g.teacher_id = t.id
    WHERE g.student_id = ?
    ORDER BY g.date DESC
  `;

  db.all(query, [studentId], (err, rows) => {
    if (err) {
      console.error('Database error fetching grades:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(rows);
  });
});

// Teacher grades routes
app.get('/api/grades/teacher', authenticateToken, authorizeRole(['teacher']), (req, res) => {
  // This would fetch grades associated with the logged-in teacher
  const teacherId = req.user.id; // Assuming user ID corresponds to teacher ID
  
  const query = `
    SELECT g.id, g.student_id, s.name as student_name, g.subject, g.exam_type, g.grade, g.date
    FROM grades g
    LEFT JOIN students s ON g.student_id = s.student_id
    WHERE g.teacher_id = ?
    ORDER BY g.date DESC
  `;

  db.all(query, [teacherId], (err, rows) => {
    if (err) {
      console.error('Database error fetching teacher grades:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(rows);
  });
});

app.post('/api/grades', authenticateToken, authorizeRole(['teacher', 'staff']), (req, res) => {
  const { studentId, subject, examType, grade, date, teacherId } = req.body;

  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // If teacherId is not provided, use the ID from the token
  const actualTeacherId = teacherId || req.user.id;

  const query = `
    INSERT INTO grades (student_id, subject, exam_type, grade, date, teacher_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [studentId, subject, examType, grade, date, actualTeacherId], function(err) {
    if (err) {
      console.error('Database error inserting grade:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.status(201).json({ 
      id: this.lastID, 
      student_id: studentId,
      subject: subject,
      exam_type: examType,
      grade: grade,
      date: date,
      teacher_id: actualTeacherId,
      message: 'Grade added successfully' 
    });
  });
});

// Students routes
app.get('/api/students', authenticateToken, (req, res) => {
  const query = 'SELECT id, student_id, name, email, class FROM students ORDER BY name';

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching students:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(rows);
  });
});

app.post('/api/students', authenticateToken, authorizeRole(['staff', 'admin']), (req, res) => {
  const { studentId, name, email, class: studentClass } = req.body;

  if (!studentId || !name || !email || !studentClass) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const query = `
    INSERT INTO students (student_id, name, email, class)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [studentId, name, email, studentClass], function(err) {
    if (err) {
      console.error('Database error inserting student:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.status(201).json({ 
      id: this.lastID, 
      student_id: studentId,
      name: name,
      email: email,
      class: studentClass,
      message: 'Student added successfully' 
    });
  });
});

// Teachers routes
app.get('/api/teachers', authenticateToken, (req, res) => {
  const query = 'SELECT id, teacher_id, name, email, subject FROM teachers ORDER BY name';

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching teachers:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(rows);
  });
});

app.post('/api/teachers', authenticateToken, authorizeRole(['staff', 'admin']), (req, res) => {
  const { teacherId, name, email, subject } = req.body;

  if (!teacherId || !name || !email || !subject) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const query = `
    INSERT INTO teachers (teacher_id, name, email, subject)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [teacherId, name, email, subject], function(err) {
    if (err) {
      console.error('Database error inserting teacher:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.status(201).json({ 
      id: this.lastID, 
      teacher_id: teacherId,
      name: name,
      email: email,
      subject: subject,
      message: 'Teacher added successfully' 
    });
  });
});

// Staff statistics routes
app.get('/api/staff/statistics', authenticateToken, authorizeRole(['staff', 'admin']), (req, res) => {
  // Get counts from database
  const countsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM students) as totalStudents,
      (SELECT COUNT(*) FROM teachers) as totalTeachers,
      (SELECT COUNT(DISTINCT class) FROM students) as totalClasses,
      (SELECT AVG(grade) FROM grades) as averageGrade
  `;

  db.get(countsQuery, [], (err, row) => {
    if (err) {
      console.error('Database error fetching statistics:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    // Ensure averageGrade is a number or 0 if null
    const stats = {
      totalStudents: row.totalStudents || 0,
      totalTeachers: row.totalTeachers || 0,
      totalClasses: row.totalClasses || 0,
      averageGrade: row.averageGrade ? parseFloat(row.averageGrade.toFixed(2)) : 0
    };

    res.json(stats);
  });
});

// Announcements routes
app.get('/api/staff/announcements', authenticateToken, (req, res) => {
  const query = 'SELECT id, title, content, date, author_name FROM announcements ORDER BY date DESC';

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching announcements:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(rows);
  });
});

app.post('/api/staff/announcements', authenticateToken, authorizeRole(['staff', 'admin']), (req, res) => {
  const { title, content, date } = req.body;

  if (!title || !content || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Get author name from token
  const authorName = req.user.username;

  const query = `
    INSERT INTO announcements (title, content, date, author_name)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [title, content, date, authorName], function(err) {
    if (err) {
      console.error('Database error inserting announcement:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.status(201).json({ 
      id: this.lastID, 
      title: title,
      content: content,
      date: date,
      author_name: authorName,
      message: 'Announcement posted successfully' 
    });
  });
});

// PUT and DELETE routes for announcements
app.put('/api/staff/announcements/:id', authenticateToken, authorizeRole(['staff', 'admin']), (req, res) => {
  const { id } = req.params;
  const { title, content, date } = req.body;

  if (!title || !content || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const query = `
    UPDATE announcements 
    SET title = ?, content = ?, date = ?
    WHERE id = ?
  `;

  db.run(query, [title, content, date, id], function(err) {
    if (err) {
      console.error('Database error updating announcement:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({ message: 'Announcement updated successfully' });
  });
});

app.delete('/api/staff/announcements/:id', authenticateToken, authorizeRole(['staff', 'admin']), (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM announcements WHERE id = ?';

  db.run(query, [id], function(err) {
    if (err) {
      console.error('Database error deleting announcement:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted successfully' });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`School Portal Server is running on port ${PORT}`);
});

module.exports = app;