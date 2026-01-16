const express = require('express');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for potential file uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // For API routes, return JSON error
  if (req.originalUrl.startsWith('/api/')) {
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
  } else {
    // For page routes, redirect to login if not authenticated
    if (!token) {
      return res.redirect('/login');
    }

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', (err, user) => {
      if (err) {
        return res.redirect('/login');
      }
      req.user = user;
      next();
    });
  }
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
  // Serve the student dashboard HTML file
  // The JavaScript in the HTML file will check for authentication in localStorage
  res.sendFile(path.join(__dirname, 'public/student.html'));
});

app.get('/staff', (req, res) => {
  // Serve the staff dashboard HTML file
  // The JavaScript in the HTML file will check for authentication in localStorage
  res.sendFile(path.join(__dirname, 'public/staff.html'));
});

app.get('/admin', (req, res) => {
  // Serve the admin dashboard HTML file
  // The JavaScript in the HTML file will check for authentication in localStorage
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.get('/logout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/logout.html'));
});

// Authentication routes
app.post('/api/users/login', (req, res) => {
  let { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Sanitize inputs
  username = username.trim();
  password = password.trim();

  // Additional validation
  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ message: 'Username must be between 3 and 50 characters' });
  }

  if (password.length < 6 || password.length > 128) {
    return res.status(400).json({ message: 'Password must be between 6 and 128 characters' });
  }

  const query = 'SELECT id, username, password_hash, role FROM users WHERE username = ?';

  db.get(query, [username], async (err, user) => {
    if (err) {
      console.error('Database error during login:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (!user) {
      // Add a small delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100));
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

      // Don't expose sensitive information in response
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
  let { studentId, subject, examType, grade, date } = req.body;

  // Input validation and sanitization
  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Sanitize inputs
  studentId = studentId.trim();
  subject = subject.trim();
  examType = examType.trim();
  date = date.trim();

  // Validate inputs
  if (studentId.length < 1 || studentId.length > 50) {
    return res.status(400).json({ message: 'Student ID must be between 1 and 50 characters' });
  }

  if (subject.length < 1 || subject.length > 100) {
    return res.status(400).json({ message: 'Subject must be between 1 and 100 characters' });
  }

  if (!['exam', 'quiz', 'assignment', 'project'].includes(examType.toLowerCase())) {
    return res.status(400).json({ message: 'Exam type must be exam, quiz, assignment, or project' });
  }

  if (typeof grade !== 'number' || grade < 0 || grade > 100) {
    return res.status(400).json({ message: 'Grade must be a number between 0 and 100' });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format' });
  }

  // Validate that date is not in the future
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (inputDate > today) {
    return res.status(400).json({ message: 'Date cannot be in the future' });
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
  let { studentId, subject, examType, grade, date } = req.body;

  // Input validation and sanitization
  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Sanitize inputs
  studentId = studentId.trim();
  subject = subject.trim();
  examType = examType.trim();
  date = date.trim();

  // Validate inputs
  if (studentId.length < 1 || studentId.length > 50) {
    return res.status(400).json({ message: 'Student ID must be between 1 and 50 characters' });
  }

  if (subject.length < 1 || subject.length > 100) {
    return res.status(400).json({ message: 'Subject must be between 1 and 100 characters' });
  }

  if (!['exam', 'quiz', 'assignment', 'project'].includes(examType.toLowerCase())) {
    return res.status(400).json({ message: 'Exam type must be exam, quiz, assignment, or project' });
  }

  if (typeof grade !== 'number' || grade < 0 || grade > 100) {
    return res.status(400).json({ message: 'Grade must be a number between 0 and 100' });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format' });
  }

  // Validate that date is not in the future
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (inputDate > today) {
    return res.status(400).json({ message: 'Date cannot be in the future' });
  }

  // Validate ID parameter
  if (!Number.isInteger(parseInt(id))) {
    return res.status(400).json({ message: 'Invalid grade ID' });
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
  let { studentId, name, email, class: studentClass } = req.body;

  // Input validation and sanitization
  if (!studentId || !name || !email || !studentClass) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Sanitize inputs
  studentId = studentId.trim();
  name = name.trim();
  email = email.trim().toLowerCase();
  studentClass = studentClass.trim();

  // Validate inputs
  if (studentId.length < 1 || studentId.length > 50) {
    return res.status(400).json({ message: 'Student ID must be between 1 and 50 characters' });
  }

  if (name.length < 2 || name.length > 100) {
    return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  if (studentClass.length < 1 || studentClass.length > 50) {
    return res.status(400).json({ message: 'Class must be between 1 and 50 characters' });
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
  let { title, content, date } = req.body;

  // Input validation and sanitization
  if (!title || !content || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Sanitize inputs
  title = title.trim();
  content = content.trim();
  date = date.trim();

  // Validate inputs
  if (title.length < 1 || title.length > 200) {
    return res.status(400).json({ message: 'Title must be between 1 and 200 characters' });
  }

  if (content.length < 1 || content.length > 2000) {
    return res.status(400).json({ message: 'Content must be between 1 and 2000 characters' });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format' });
  }

  // Validate that date is not in the future
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (inputDate > today) {
    return res.status(400).json({ message: 'Date cannot be in the future' });
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
  let { title, content, date } = req.body;

  // Input validation and sanitization
  if (!title || !content || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Sanitize inputs
  title = title.trim();
  content = content.trim();
  date = date.trim();

  // Validate inputs
  if (title.length < 1 || title.length > 200) {
    return res.status(400).json({ message: 'Title must be between 1 and 200 characters' });
  }

  if (content.length < 1 || content.length > 2000) {
    return res.status(400).json({ message: 'Content must be between 1 and 2000 characters' });
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format' });
  }

  // Validate that date is not in the future
  const inputDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (inputDate > today) {
    return res.status(400).json({ message: 'Date cannot be in the future' });
  }

  // Validate ID parameter
  if (!Number.isInteger(parseInt(id))) {
    return res.status(400).json({ message: 'Invalid announcement ID' });
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

// Admin user management routes
app.get('/api/admin/users', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const query = 'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC';

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching users:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(rows);
  });
});

app.post('/api/admin/users', authenticateToken, authorizeRole(['admin']), (req, res) => {
  let { username, email, role, password } = req.body;

  // Input validation and sanitization
  if (!username || !email || !role || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Sanitize inputs
  username = username.trim();
  email = email.trim().toLowerCase();

  // Validate inputs
  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ message: 'Username must be between 3 and 50 characters' });
  }

  // Basic username validation (alphanumeric and underscores/hyphens only)
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ message: 'Username can only contain letters, numbers, underscores, and hyphens' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  if (!['student', 'staff', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Role must be student, staff, or admin' });
  }

  if (password.length < 6 || password.length > 128) {
    return res.status(400).json({ message: 'Password must be between 6 and 128 characters' });
  }

  // Check if user already exists
  const checkQuery = 'SELECT id FROM users WHERE username = ? OR email = ?';
  db.get(checkQuery, [username, email], (err, existingUser) => {
    if (err) {
      console.error('Database error checking existing user:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    // Hash the password
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ message: 'Error creating user' });
      }

      const query = `
        INSERT INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, ?)
      `;

      db.run(query, [username, email, hash, role], function(err) {
        if (err) {
          console.error('Database error inserting user:', err);
          return res.status(500).json({ message: 'Database error' });
        }

        res.status(201).json({
          id: this.lastID,
          username: username,
          email: email,
          role: role,
          message: 'User created successfully'
        });
      });
    });
  });
});

app.put('/api/admin/users/:id', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const { id } = req.params;
  let { username, email, role } = req.body;

  // Input validation and sanitization
  if (!username || !email || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Sanitize inputs
  username = username.trim();
  email = email.trim().toLowerCase();

  // Validate inputs
  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ message: 'Username must be between 3 and 50 characters' });
  }

  // Basic username validation (alphanumeric and underscores/hyphens only)
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ message: 'Username can only contain letters, numbers, underscores, and hyphens' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  if (!['student', 'staff', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Role must be student, staff, or admin' });
  }

  // Validate ID parameter
  if (!Number.isInteger(parseInt(id))) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  // Check if another user already has this username/email
  const checkQuery = 'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?';
  db.get(checkQuery, [username, email, id], (err, existingUser) => {
    if (err) {
      console.error('Database error checking existing user:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    const query = `
      UPDATE users
      SET username = ?, email = ?, role = ?
      WHERE id = ?
    `;

    db.run(query, [username, email, role, id], function(err) {
      if (err) {
        console.error('Database error updating user:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User updated successfully' });
    });
  });
});

app.delete('/api/admin/users/:id', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM users WHERE id = ?';

  db.run(query, [id], function(err) {
    if (err) {
      console.error('Database error deleting user:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  });
});

// Posts management routes (for admin dashboard)
app.get('/api/posts', authenticateToken, authorizeRole(['admin']), (req, res) => {
  // For now, we'll return an empty array since we don't have a posts table
  // In a real implementation, you would have a posts table
  res.json([]);
});

app.post('/api/posts', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const { title, content, category, date } = req.body;

  if (!title || !content || !category || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // For now, we'll just return success since we don't have a posts table
  // In a real implementation, you would insert into a posts table
  res.status(201).json({
    id: Date.now(),
    title: title,
    content: content,
    category: category,
    date: date,
    author: req.user.username,
    message: 'Post created successfully'
  });
});

app.put('/api/posts/:id', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { title, content, category, date } = req.body;

  if (!title || !content || !category || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // For now, we'll just return success since we don't have a posts table
  // In a real implementation, you would update the posts table
  res.json({
    id: parseInt(id),
    title: title,
    content: content,
    category: category,
    date: date,
    message: 'Post updated successfully'
  });
});

app.delete('/api/posts/:id', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const { id } = req.params;

  // For now, we'll just return success since we don't have a posts table
  // In a real implementation, you would delete from the posts table
  res.json({ message: 'Post deleted successfully' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Log the error with more details
  console.error('Error details:', {
    url: req.url,
    method: req.method,
    params: req.params,
    body: req.body,
    error: err.message,
    stack: err.stack
  });

  // Don't expose internal error details in production
  const errorMessage = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(500).json({
    message: errorMessage,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`School Portal Server is running on port ${PORT}`);
});

module.exports = app;