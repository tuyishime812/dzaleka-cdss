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

  // Insert default staff users
  const saltRounds = 10;

  // Hash passwords for staff
  bcrypt.hash('staff123', saltRounds, (err, staffHash1) => {
    if (err) {
      console.error('Error hashing staff password:', err);
    } else {
      db.run(
        `INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
        ['emmanuel', 'emmanuel@staff.edu', staffHash1, 'staff'],
        function(err) {
          if (err) {
            console.error('Error inserting emmanuel staff:', err);
          } else {
            console.log('Emmanuel staff user checked/created');
          }
        }
      );
    }

    bcrypt.hash('staff123', saltRounds, (err, staffHash2) => {
      if (err) {
        console.error('Error hashing staff password:', err);
      } else {
        db.run(
          `INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
          ['tuyishime', 'tuyishime@staff.edu', staffHash2, 'staff'],
          function(err) {
            if (err) {
              console.error('Error inserting tuyishime staff:', err);
            } else {
              console.log('Tuyishime staff user checked/created');
            }
          }
        );
      }
    });
  });

  // Hash passwords for students
  bcrypt.hash('student123', saltRounds, (err, studentHash1) => {
    if (err) {
      console.error('Error hashing student password:', err);
    } else {
      db.run(
        `INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
        ['martin', 'martin@student.edu', studentHash1, 'student'],
        function(err) {
          if (err) {
            console.error('Error inserting martin student:', err);
          } else {
            console.log('Martin student user checked/created');
          }
        }
      );
    }

    bcrypt.hash('student123', saltRounds, (err, studentHash2) => {
      if (err) {
        console.error('Error hashing student password:', err);
      } else {
        db.run(
          `INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
          ['shift', 'shift@student.edu', studentHash2, 'student'],
          function(err) {
            if (err) {
              console.error('Error inserting shift student:', err);
            } else {
              console.log('Shift student user checked/created');
            }
          }
        );
      }

      bcrypt.hash('student123', saltRounds, (err, studentHash3) => {
        if (err) {
          console.error('Error hashing student password:', err);
        } else {
          db.run(
            `INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
            ['emmanuel_student', 'emmanuel_student@student.edu', studentHash3, 'student'],
            function(err) {
              if (err) {
                console.error('Error inserting emmanuel student:', err);
              } else {
                console.log('Emmanuel student user checked/created');
              }
            }
          );
        }

        bcrypt.hash('student123', saltRounds, (err, studentHash4) => {
          if (err) {
            console.error('Error hashing student password:', err);
          } else {
            db.run(
              `INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
              ['tuyishime_student', 'tuyishime_student@student.edu', studentHash4, 'student'],
              function(err) {
                if (err) {
                  console.error('Error inserting tuyishime student:', err);
                } else {
                  console.log('Tuyishime student user checked/created');
                }
              }
            );
          }
        });
      });
    });
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

  // Check if the requesting user is a student and only allow them to access their own grades
  if (req.user.role === 'student') {
    // For students, only allow them to access grades with their own username as student_id
    if (req.user.username !== studentId) {
      return res.status(403).json({ message: 'Students can only access their own grades' });
    }
  }

  const query = `
    SELECT g.id, g.subject, g.exam_type, g.grade, g.date, u.username as teacher_name
    FROM grades g
    LEFT JOIN users u ON g.teacher_id = u.id
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

// Staff grades routes - staff can view all grades
app.get('/api/grades/staff', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const query = `
    SELECT g.id, g.student_id, s.name as student_name, g.subject, g.exam_type, g.grade, g.date, u.username as teacher_name
    FROM grades g
    LEFT JOIN students s ON g.student_id = s.student_id
    LEFT JOIN users u ON g.teacher_id = u.id
    ORDER BY g.date DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching grades:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(rows);
  });
});

app.post('/api/grades', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { studentId, subject, examType, grade, date } = req.body;

  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Staff member who is adding the grade
  const staffId = req.user.id;

  const query = `
    INSERT INTO grades (student_id, subject, exam_type, grade, date, teacher_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [studentId, subject, examType, grade, date, staffId], function(err) {
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
      teacher_id: staffId,
      message: 'Grade added successfully'
    });
  });
});

// PUT route to update a grade
app.put('/api/grades/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;
  const { studentId, subject, examType, grade, date } = req.body;

  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const query = `
    UPDATE grades
    SET student_id = ?, subject = ?, exam_type = ?, grade = ?, date = ?
    WHERE id = ?
  `;

  db.run(query, [studentId, subject, examType, grade, date, id], function(err) {
    if (err) {
      console.error('Database error updating grade:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    res.json({
      id: parseInt(id),
      student_id: studentId,
      subject: subject,
      exam_type: examType,
      grade: grade,
      date: date,
      message: 'Grade updated successfully'
    });
  });
});

// DELETE route to delete a grade
app.delete('/api/grades/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM grades WHERE id = ?';

  db.run(query, [id], function(err) {
    if (err) {
      console.error('Database error deleting grade:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    res.json({ message: 'Grade deleted successfully' });
  });
});

// Subjects routes
app.get('/api/subjects', authenticateToken, (req, res) => {
  // Return a predefined list of subjects
  const subjects = [
    { id: 1, name: 'Mathematics' },
    { id: 2, name: 'English' },
    { id: 3, name: 'Science' },
    { id: 4, name: 'Social Studies' },
    { id: 5, name: 'Kiswahili' },
    { id: 6, name: 'French' },
    { id: 7, name: 'Computer Science' },
    { id: 8, name: 'Physics' },
    { id: 9, name: 'Chemistry' },
    { id: 10, name: 'Biology' }
  ];

  res.json(subjects);
});

app.post('/api/subjects', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Subject name is required' });
  }

  // In a real application, you would insert into a subjects table
  // For this implementation, we'll just return success
  res.status(201).json({
    id: Date.now(), // Temporary ID
    name: name,
    message: 'Subject added successfully'
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

app.post('/api/students', authenticateToken, authorizeRole(['staff']), (req, res) => {
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


// Staff statistics routes
app.get('/api/staff/statistics', authenticateToken, authorizeRole(['staff']), (req, res) => {
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

app.post('/api/staff/announcements', authenticateToken, authorizeRole(['staff']), (req, res) => {
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
app.put('/api/staff/announcements/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
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

app.delete('/api/staff/announcements/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
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