// api/index.js - Vercel serverless function entry point
const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
require('dotenv').config();

// Create Express app
const app = express();

// Security middleware
app.use(helmet()); // Sets security headers

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: {
    error: 'Too many login attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize SQLite database
const dbPath = path.join(__dirname, '../database.db');

// Open database connection
let db;

async function initializeDatabase() {
  try {
    db = await sqlite.open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Create tables if they don't exist
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        class TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        exam_type TEXT NOT NULL,
        grade REAL NOT NULL,
        date DATE NOT NULL,
        teacher_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES users(id)
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        date DATE NOT NULL,
        author_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Initialize default users if they don't exist
    await initializeDefaultUsers();

    // Initialize default subjects if they don't exist
    await initializeDefaultSubjects();

    console.log('Connected to SQLite database and initialized tables');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

// Initialize the database
initializeDatabase();

// Initialize default users
const initializeDefaultUsers = async () => {
  // Check if default users already exist
  try {
    const row = await db.get("SELECT COUNT(*) as count FROM users");

    if (row.count === 0) {
      // Hash passwords and insert default users
      const adminHash = bcrypt.hashSync('admin123', 10);
      const staffHash = bcrypt.hashSync('staff123', 10);
      const studentHash = bcrypt.hashSync('student123', 10);

      const defaultUsers = [
        { username: 'admin', email: 'admin@school.edu', password_hash: adminHash, role: 'admin' },
        { username: 'emmanuel', email: 'emmanuel@staff.edu', password_hash: staffHash, role: 'staff' },
        { username: 'tuyishime', email: 'tuyishime@staff.edu', password_hash: staffHash, role: 'staff' },
        { username: 'martin', email: 'martin@student.edu', password_hash: studentHash, role: 'student' },
        { username: 'shift', email: 'shift@student.edu', password_hash: studentHash, role: 'student' },
        { username: 'emmanuel_student', email: 'emmanuel_student@student.edu', password_hash: studentHash, role: 'student' },
        { username: 'tuyishime_student', email: 'tuyishime_student@student.edu', password_hash: studentHash, role: 'student' }
      ];

      for (const user of defaultUsers) {
        await db.run("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
          user.username, user.email, user.password_hash, user.role);
      }
      console.log('Default users inserted');
    }
  } catch (err) {
    console.error('Error checking/inserting default users:', err);
  }
};

// Simple in-memory token blacklist for session management
const tokenBlacklist = new Set();

// Periodically clean up expired tokens from the blacklist (every hour)
setInterval(() => {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const tokensToRemove = [];

  for (const token of tokenBlacklist) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp && decoded.exp < now) {
        tokensToRemove.push(token);
      }
    } catch (err) {
      // If token is malformed, remove it
      tokensToRemove.push(token);
    }
  }

  tokensToRemove.forEach(token => tokenBlacklist.delete(token));

  if (tokensToRemove.length > 0) {
    console.log(`Cleaned up ${tokensToRemove.length} expired tokens from blacklist`);
  }
}, 60 * 60 * 1000); // Run every hour

// Initialize default subjects
const initializeDefaultSubjects = async () => {
  // Check if default subjects already exist
  try {
    const row = await db.get("SELECT COUNT(*) as count FROM subjects");

    if (row.count === 0) {
      const defaultSubjects = [
        'Mathematics', 'English', 'Science', 'History', 'Geography'
      ];

      for (const subject of defaultSubjects) {
        await db.run("INSERT INTO subjects (name) VALUES (?)", subject);
      }
      console.log('Default subjects inserted');
    }
  } catch (err) {
    console.error('Error checking/inserting default subjects:', err);
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  // Check if token is in blacklist
  if (tokenBlacklist.has(token)) {
    return res.status(403).json({ message: 'Token has been invalidated. Please log in again.' });
  }

  // Verify the token with additional security options
  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key', {
    algorithms: ['HS256'],
    ignoreExpiration: false
  }, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ message: 'Token has expired. Please log in again.' });
      } else if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ message: 'Invalid token. Please log in again.' });
      }
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    try {
      // Additional security check: ensure user exists in database
      const userStmt = db.prepare("SELECT id, username, role FROM users WHERE id = ?");
      const dbUser = userStmt.get(user.id);

      if (!dbUser) {
        return res.status(403).json({ message: 'User no longer exists' });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error('Database error during authentication:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
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

// Special middleware for admin access
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Administrative access required' });
  }
  next();
};

// Main routes - serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student.html'));
});

app.get('/staff', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/staff.html'));
});

app.get('/admin', authenticateToken, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Authentication routes
app.post('/api/users/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Sanitize inputs
  const sanitizedUsername = validator.escape(username.trim());

  try {
    // Query the database for the user
    const userStmt = db.prepare("SELECT * FROM users WHERE username = ?");
    const user = userStmt.get(sanitizedUsername);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    try {
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token with additional security claims
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          iat: Math.floor(Date.now() / 1000), // issued at time
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // expires in 24 hours
        },
        process.env.JWT_SECRET || 'fallback_secret_key',
        {
          expiresIn: '24h',
          algorithm: 'HS256'
        }
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
  } catch (err) {
    console.error('Database error during login:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Student grades routes
app.get('/api/grades/student/:studentId', authenticateToken, (req, res) => {
  const { studentId } = req.params;

  // Validate studentId parameter
  if (!studentId || typeof studentId !== 'string' || studentId.trim().length === 0) {
    return res.status(400).json({ message: 'Invalid student ID' });
  }

  // Sanitize studentId
  const sanitizedStudentId = validator.escape(studentId.trim());

  // Check if the requesting user is a student and only allow them to access their own grades
  if (req.user.role === 'student') {
    // For students, only allow them to access grades with their own username as student_id
    if (req.user.username !== sanitizedStudentId) {
      return res.status(403).json({ message: 'Students can only access their own grades' });
    }
  }

  try {
    // Query the database for grades for the specific student
    const query = `
      SELECT g.*, u.username as teacher_name
      FROM grades g
      LEFT JOIN users u ON g.teacher_id = u.id
      WHERE g.student_id = ?
      ORDER BY g.created_at DESC
    `;

    const stmt = db.prepare(query);
    const rows = stmt.all(sanitizedStudentId);

    res.json(rows);
  } catch (err) {
    console.error('Database error fetching student grades:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Staff grades routes - staff can view all grades
app.get('/api/grades/staff', authenticateToken, authorizeRole(['staff']), (req, res) => {
  try {
    // Query the database for all grades with student information
    const query = `
      SELECT g.*, s.name as student_name, u.username as teacher_name
      FROM grades g
      LEFT JOIN students s ON g.student_id = s.student_id
      LEFT JOIN users u ON g.teacher_id = u.id
      ORDER BY g.created_at DESC
    `;

    const stmt = db.prepare(query);
    const rows = stmt.all();

    res.json(rows);
  } catch (err) {
    console.error('Database error fetching all grades:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/grades', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { studentId, subject, examType, grade, date } = req.body;

  // Validate required fields
  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate and sanitize inputs
  const sanitizedStudentId = validator.escape(studentId.toString().trim());
  const sanitizedSubject = validator.escape(subject.toString().trim());
  const sanitizedExamType = validator.escape(examType.toString().trim());
  const validatedGrade = parseFloat(grade);
  const validatedDate = new Date(date);

  // Additional validation
  if (isNaN(validatedGrade) || validatedGrade < 0 || validatedGrade > 100) {
    return res.status(400).json({ message: 'Grade must be a number between 0 and 100' });
  }

  if (isNaN(validatedDate.getTime())) {
    return res.status(400).json({ message: 'Invalid date format' });
  }

  try {
    // Check if student exists
    const studentStmt = db.prepare("SELECT id FROM students WHERE student_id = ?");
    const student = studentStmt.get(sanitizedStudentId);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if subject exists
    const subjectStmt = db.prepare("SELECT id FROM subjects WHERE name = ?");
    const subjectRecord = subjectStmt.get(sanitizedSubject);

    if (!subjectRecord) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    // Staff member who is adding the grade
    const staffId = req.user.id;

    // Insert the new grade into the database
    const insertQuery = `
      INSERT INTO grades (student_id, subject, exam_type, grade, date, teacher_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const insertStmt = db.prepare(insertQuery);
    const result = insertStmt.run(sanitizedStudentId, sanitizedSubject, sanitizedExamType, validatedGrade, date, staffId);

    // Return the newly created grade
    const newGrade = {
      id: result.lastInsertRowid,
      student_id: sanitizedStudentId,
      subject: sanitizedSubject,
      exam_type: sanitizedExamType,
      grade: validatedGrade,
      date: date,
      teacher_id: staffId
    };

    res.status(201).json({
      ...newGrade,
      message: 'Grade added successfully'
    });
  } catch (err) {
    console.error('Database error in POST grades:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT route to update a grade
app.put('/api/grades/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;
  const { studentId, subject, examType, grade, date } = req.body;

  // Validate required fields
  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate and sanitize inputs
  const sanitizedId = parseInt(id);
  const sanitizedStudentId = validator.escape(studentId.toString().trim());
  const sanitizedSubject = validator.escape(subject.toString().trim());
  const sanitizedExamType = validator.escape(examType.toString().trim());
  const validatedGrade = parseFloat(grade);
  const validatedDate = new Date(date);

  // Additional validation
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid grade ID' });
  }

  if (isNaN(validatedGrade) || validatedGrade < 0 || validatedGrade > 100) {
    return res.status(400).json({ message: 'Grade must be a number between 0 and 100' });
  }

  if (isNaN(validatedDate.getTime())) {
    return res.status(400).json({ message: 'Invalid date format' });
  }

  // Check if student exists
  db.get("SELECT id FROM students WHERE student_id = ?", [sanitizedStudentId], (err, student) => {
    if (err) {
      console.error('Database error checking student:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if subject exists
    db.get("SELECT id FROM subjects WHERE name = ?", [sanitizedSubject], (err, subjectRecord) => {
      if (err) {
        console.error('Database error checking subject:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (!subjectRecord) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      // Update the grade in the database
      const query = `
        UPDATE grades
        SET student_id = ?, subject = ?, exam_type = ?, grade = ?, date = ?
        WHERE id = ?
      `;

      db.run(query, [sanitizedStudentId, sanitizedSubject, sanitizedExamType, validatedGrade, date, sanitizedId], function(err) {
        if (err) {
          console.error('Database error updating grade:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: 'Grade not found' });
        }

        // Return the updated grade
        const updatedGrade = {
          id: sanitizedId,
          student_id: sanitizedStudentId,
          subject: sanitizedSubject,
          exam_type: sanitizedExamType,
          grade: validatedGrade,
          date: date
        };

        res.json({
          ...updatedGrade,
          message: 'Grade updated successfully'
        });
      });
    });
  });
});

// DELETE route to delete a grade
app.delete('/api/grades/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;

  // Delete the grade from the database
  const query = "DELETE FROM grades WHERE id = ?";

  db.run(query, [id], function(err) {
    if (err) {
      console.error('Database error deleting grade:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    res.json({ message: 'Grade deleted successfully' });
  });
});

// Students routes
app.get('/api/students', authenticateToken, (req, res) => {
  // Query the database for all students
  const query = "SELECT * FROM students ORDER BY created_at DESC";

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching students:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json(rows);
  });
});

app.post('/api/students', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { studentId, name, email, class: studentClass } = req.body;

  if (!studentId || !name || !email || !studentClass) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate and sanitize inputs
  const sanitizedStudentId = validator.escape(studentId.toString().trim());
  const sanitizedName = validator.escape(name.toString().trim());
  const sanitizedEmail = validator.escape(email.toString().trim());
  const sanitizedClass = validator.escape(studentClass.toString().trim());

  // Additional validation
  if (!validator.isEmail(sanitizedEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (sanitizedName.length < 2 || sanitizedName.length > 100) {
    return res.status(400).json({ message: 'Name must be between 2 and 100 characters' });
  }

  if (sanitizedStudentId.length < 2 || sanitizedStudentId.length > 50) {
    return res.status(400).json({ message: 'Student ID must be between 2 and 50 characters' });
  }

  if (sanitizedClass.length < 1 || sanitizedClass.length > 50) {
    return res.status(400).json({ message: 'Class must be between 1 and 50 characters' });
  }

  // Check if student already exists
  db.get("SELECT id FROM students WHERE student_id = ? OR email = ?", [sanitizedStudentId, sanitizedEmail], (err, existingStudent) => {
    if (err) {
      console.error('Database error checking existing student:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (existingStudent) {
      return res.status(409).json({ message: 'Student with this ID or email already exists' });
    }

    // Insert the new student into the database
    const query = "INSERT INTO students (student_id, name, email, class) VALUES (?, ?, ?, ?)";

    db.run(query, [sanitizedStudentId, sanitizedName, sanitizedEmail, sanitizedClass], function(err) {
      if (err) {
        console.error('Database error inserting student:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // Return the newly created student
      const newStudent = {
        id: this.lastID,
        student_id: sanitizedStudentId,
        name: sanitizedName,
        email: sanitizedEmail,
        class: sanitizedClass
      };

      res.status(201).json({
        ...newStudent,
        message: 'Student added successfully'
      });
    });
  });
});

// Staff routes
app.get('/api/staff', authenticateToken, (req, res) => {
  // Query the database for all staff users
  const query = "SELECT id, username, email FROM users WHERE role = 'staff'";

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching staff:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json(rows);
  });
});

// Staff statistics routes
app.get('/api/staff/statistics', authenticateToken, authorizeRole(['staff']), (req, res) => {
  // Get counts from the database
  const queries = {
    totalStudents: "SELECT COUNT(*) as count FROM students",
    totalStaff: "SELECT COUNT(*) as count FROM users WHERE role = 'staff'",
    totalClasses: "SELECT COUNT(DISTINCT class) as count FROM students",
    averageGrade: "SELECT AVG(grade) as avg_grade FROM grades"
  };

  // Execute all queries
  db.get(queries.totalStudents, [], (err, studentsRow) => {
    if (err) {
      console.error('Database error getting student count:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    db.get(queries.totalStaff, [], (err, staffRow) => {
      if (err) {
        console.error('Database error getting staff count:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      db.get(queries.totalClasses, [], (err, classesRow) => {
        if (err) {
          console.error('Database error getting class count:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        db.get(queries.averageGrade, [], (err, gradeRow) => {
          if (err) {
            console.error('Database error getting average grade:', err);
            return res.status(500).json({ message: 'Internal server error' });
          }

          const stats = {
            totalStudents: studentsRow.count,
            totalStaff: staffRow.count,
            totalClasses: classesRow.count,
            averageGrade: gradeRow.avg_grade ? parseFloat(gradeRow.avg_grade.toFixed(2)) : 0
          };

          res.json(stats);
        });
      });
    });
  });
});

// Announcements routes
app.get('/api/staff/announcements', authenticateToken, (req, res) => {
  // Query the database for all announcements
  const query = "SELECT * FROM announcements ORDER BY created_at DESC";

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching announcements:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json(rows);
  });
});

app.post('/api/staff/announcements', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { title, content, date } = req.body;

  if (!title || !content || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate and sanitize inputs
  const sanitizedTitle = validator.escape(title.toString().trim());
  const sanitizedContent = validator.escape(content.toString().trim());
  const validatedDate = new Date(date);

  // Additional validation
  if (sanitizedTitle.length < 2 || sanitizedTitle.length > 200) {
    return res.status(400).json({ message: 'Title must be between 2 and 200 characters' });
  }

  if (sanitizedContent.length < 5 || sanitizedContent.length > 2000) {
    return res.status(400).json({ message: 'Content must be between 5 and 2000 characters' });
  }

  if (isNaN(validatedDate.getTime())) {
    return res.status(400).json({ message: 'Invalid date format' });
  }

  // Get author name from token
  const authorName = req.user.username;

  // Insert the new announcement into the database
  const query = "INSERT INTO announcements (title, content, date, author_name) VALUES (?, ?, ?, ?)";

  db.run(query, [sanitizedTitle, sanitizedContent, date, authorName], function(err) {
    if (err) {
      console.error('Database error inserting announcement:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Return the newly created announcement
    const newAnnouncement = {
      id: this.lastID,
      title: sanitizedTitle,
      content: sanitizedContent,
      date: date,
      author_name: authorName
    };

    res.status(201).json({
      ...newAnnouncement,
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

  // Validate inputs
  const sanitizedId = parseInt(id);
  const sanitizedTitle = validator.escape(title.toString().trim());
  const sanitizedContent = validator.escape(content.toString().trim());
  const validatedDate = new Date(date);

  // Additional validation
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid announcement ID' });
  }

  if (sanitizedTitle.length < 2 || sanitizedTitle.length > 200) {
    return res.status(400).json({ message: 'Title must be between 2 and 200 characters' });
  }

  if (sanitizedContent.length < 5 || sanitizedContent.length > 2000) {
    return res.status(400).json({ message: 'Content must be between 5 and 2000 characters' });
  }

  if (isNaN(validatedDate.getTime())) {
    return res.status(400).json({ message: 'Invalid date format' });
  }

  // Update the announcement in the database
  const query = "UPDATE announcements SET title = ?, content = ?, date = ? WHERE id = ?";

  db.run(query, [sanitizedTitle, sanitizedContent, date, sanitizedId], function(err) {
    if (err) {
      console.error('Database error updating announcement:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({ message: 'Announcement updated successfully' });
  });
});

app.delete('/api/staff/announcements/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;

  // Delete the announcement from the database
  const query = "DELETE FROM announcements WHERE id = ?";

  db.run(query, [id], function(err) {
    if (err) {
      console.error('Database error deleting announcement:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted successfully' });
  });
});

// Subject management routes
app.get('/api/subjects', authenticateToken, (req, res) => {
  // Query the database for all subjects
  const query = "SELECT * FROM subjects ORDER BY name ASC";

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching subjects:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json(rows);
  });
});

app.post('/api/subjects', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Subject name is required' });
  }

  // Validate and sanitize input
  const sanitizedName = validator.escape(name.toString().trim());

  // Additional validation
  if (sanitizedName.length < 2 || sanitizedName.length > 100) {
    return res.status(400).json({ message: 'Subject name must be between 2 and 100 characters' });
  }

  // Check if subject already exists
  const checkQuery = "SELECT id FROM subjects WHERE LOWER(name) = LOWER(?)";
  db.get(checkQuery, [sanitizedName], (err, row) => {
    if (err) {
      console.error('Database error checking subject existence:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (row) {
      return res.status(409).json({ message: 'Subject already exists' });
    }

    // Insert the new subject into the database
    const insertQuery = "INSERT INTO subjects (name) VALUES (?)";

    db.run(insertQuery, [sanitizedName], function(err) {
      if (err) {
        console.error('Database error inserting subject:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // Return the newly created subject
      const newSubject = {
        id: this.lastID,
        name: sanitizedName
      };

      res.status(201).json({
        ...newSubject,
        message: 'Subject added successfully'
      });
    });
  });
});

app.put('/api/subjects/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Subject name is required' });
  }

  // Validate inputs
  const sanitizedId = parseInt(id);
  const sanitizedName = validator.escape(name.toString().trim());

  // Additional validation
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid subject ID' });
  }

  if (sanitizedName.length < 2 || sanitizedName.length > 100) {
    return res.status(400).json({ message: 'Subject name must be between 2 and 100 characters' });
  }

  // Check if another subject with the same name exists (excluding current subject)
  const checkQuery = "SELECT id FROM subjects WHERE LOWER(name) = LOWER(?) AND id != ?";
  db.get(checkQuery, [sanitizedName, sanitizedId], (err, row) => {
    if (err) {
      console.error('Database error checking subject existence:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (row) {
      return res.status(409).json({ message: 'Subject name already exists' });
    }

    // Update the subject in the database
    const updateQuery = "UPDATE subjects SET name = ? WHERE id = ?";

    db.run(updateQuery, [sanitizedName, sanitizedId], function(err) {
      if (err) {
        console.error('Database error updating subject:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      // Return the updated subject
      const updatedSubject = {
        id: sanitizedId,
        name: sanitizedName
      };

      res.json({
        ...updatedSubject,
        message: 'Subject updated successfully'
      });
    });
  });
});

app.delete('/api/subjects/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;

  // Check if any grades are associated with this subject
  const checkGradesQuery = "SELECT COUNT(*) as count FROM grades WHERE subject = (SELECT name FROM subjects WHERE id = ?)";
  db.get(checkGradesQuery, [id], (err, row) => {
    if (err) {
      console.error('Database error checking associated grades:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (row.count > 0) {
      return res.status(409).json({ message: 'Cannot delete subject: grades are associated with it' });
    }

    // Delete the subject from the database
    const deleteQuery = "DELETE FROM subjects WHERE id = ?";

    db.run(deleteQuery, [id], function(err) {
      if (err) {
        console.error('Database error deleting subject:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      res.json({ message: 'Subject deleted successfully' });
    });
  });
});

// CSRF Protection - Generate CSRF Token
app.get('/api/csrf-token', authenticateToken, (req, res) => {
  // In a real implementation, you would generate a unique token
  // For this implementation, we'll rely on JWT and CORS policies
  // The JWT token itself provides protection against CSRF
  res.json({
    csrfToken: 'csrf_protection_enabled_via_jwt'
  });
});

// Logout route - add token to blacklist
app.post('/api/users/logout', authenticateToken, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token) {
    // Add token to blacklist (until expiration)
    tokenBlacklist.add(token);
  }

  res.json({ message: 'Logged out successfully' });
});

// Admin routes for user management
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const query = "SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC";

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching users:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json(rows);
  });
});

app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { username, email, role, password } = req.body;

  if (!username || !email || !role || !password) {
    return res.status(400).json({ message: 'Username, email, role, and password are required' });
  }

  // Validate and sanitize inputs
  const sanitizedUsername = validator.escape(username.toString().trim());
  const sanitizedEmail = validator.escape(email.toString().trim());
  const sanitizedRole = validator.escape(role.toString().trim());

  // Validate role
  if (!['student', 'staff', 'admin'].includes(sanitizedRole)) {
    return res.status(400).json({ message: 'Invalid role. Must be student, staff, or admin' });
  }

  // Validate email
  if (!validator.isEmail(sanitizedEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' });
  }

  // Check if user already exists
  db.get("SELECT id FROM users WHERE username = ? OR email = ?", [sanitizedUsername, sanitizedEmail], (err, existingUser) => {
    if (err) {
      console.error('Database error checking existing user:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (existingUser) {
      return res.status(409).json({ message: 'User with this username or email already exists' });
    }

    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 12);

    // Insert the new user into the database
    const query = "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)";

    db.run(query, [sanitizedUsername, sanitizedEmail, hashedPassword, sanitizedRole], function(err) {
      if (err) {
        console.error('Database error inserting user:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // Return the newly created user (without password hash)
      const newUser = {
        id: this.lastID,
        username: sanitizedUsername,
        email: sanitizedEmail,
        role: sanitizedRole
      };

      res.status(201).json({
        ...newUser,
        message: 'User created successfully'
      });
    });
  });
});

app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, email, role } = req.body;

  if (!username || !email || !role) {
    return res.status(400).json({ message: 'Username, email, and role are required' });
  }

  // Validate and sanitize inputs
  const sanitizedId = parseInt(id);
  const sanitizedUsername = validator.escape(username.toString().trim());
  const sanitizedEmail = validator.escape(email.toString().trim());
  const sanitizedRole = validator.escape(role.toString().trim());

  // Validate role
  if (!['student', 'staff', 'admin'].includes(sanitizedRole)) {
    return res.status(400).json({ message: 'Invalid role. Must be student, staff, or admin' });
  }

  // Validate email
  if (!validator.isEmail(sanitizedEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  // Check if user exists
  db.get("SELECT id FROM users WHERE id = ?", [sanitizedId], (err, user) => {
    if (err) {
      console.error('Database error checking user:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if another user with the same username or email exists (excluding current user)
    db.get("SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?", [sanitizedUsername, sanitizedEmail, sanitizedId], (err, existingUser) => {
      if (err) {
        console.error('Database error checking existing user:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (existingUser) {
        return res.status(409).json({ message: 'Another user with this username or email already exists' });
      }

      // Update the user in the database
      const query = "UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?";

      db.run(query, [sanitizedUsername, sanitizedEmail, sanitizedRole, sanitizedId], function(err) {
        if (err) {
          console.error('Database error updating user:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Return the updated user
        const updatedUser = {
          id: sanitizedId,
          username: sanitizedUsername,
          email: sanitizedEmail,
          role: sanitizedRole
        };

        res.json({
          ...updatedUser,
          message: 'User updated successfully'
        });
      });
    });
  });
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const sanitizedId = parseInt(id);

  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  // Prevent admin from deleting themselves
  if (sanitizedId === req.user.id) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }

  // Delete the user from the database
  const query = "DELETE FROM users WHERE id = ?";

  db.run(query, [sanitizedId], function(err) {
    if (err) {
      console.error('Database error deleting user:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  });
});

// Grade analytics and reporting routes
app.get('/api/admin/grade-analytics', authenticateToken, requireAdmin, (req, res) => {
  // Get comprehensive grade analytics
  const query = `
    SELECT
      s.name as student_name,
      g.subject,
      g.exam_type,
      g.grade,
      g.date,
      u.username as teacher_name
    FROM grades g
    LEFT JOIN students s ON g.student_id = s.student_id
    LEFT JOIN users u ON g.teacher_id = u.id
    ORDER BY g.date DESC
    LIMIT 100
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching grade analytics:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json(rows);
  });
});

app.get('/api/admin/grade-summary', authenticateToken, requireAdmin, (req, res) => {
  // Get grade summary statistics
  const summaryQuery = `
    SELECT
      COUNT(*) as total_grades,
      AVG(grade) as average_grade,
      MIN(grade) as min_grade,
      MAX(grade) as max_grade,
      COUNT(DISTINCT subject) as total_subjects,
      COUNT(DISTINCT student_id) as total_students
    FROM grades
  `;

  const subjectAvgQuery = `
    SELECT
      subject,
      AVG(grade) as avg_grade,
      COUNT(*) as grade_count
    FROM grades
    GROUP BY subject
    ORDER BY avg_grade DESC
  `;

  const studentAvgQuery = `
    SELECT
      s.name as student_name,
      s.student_id,
      AVG(g.grade) as avg_grade,
      COUNT(g.id) as total_grades
    FROM students s
    LEFT JOIN grades g ON s.student_id = g.student_id
    GROUP BY s.student_id
    HAVING total_grades > 0
    ORDER BY avg_grade DESC
    LIMIT 10
  `;

  // Execute all queries
  db.get(summaryQuery, [], (err, summary) => {
    if (err) {
      console.error('Database error fetching grade summary:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    db.all(subjectAvgQuery, [], (err, subjectAverages) => {
      if (err) {
        console.error('Database error fetching subject averages:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      db.all(studentAvgQuery, [], (err, topStudents) => {
        if (err) {
          console.error('Database error fetching top students:', err);
          return res.status(500).json({ message: 'Internal server error' });
        }

        const result = {
          summary: summary,
          subject_averages: subjectAverages,
          top_students: topStudents
        };

        res.json(result);
      });
    });
  });
});

// Grade trend analysis
app.get('/api/admin/grade-trends', authenticateToken, requireAdmin, (req, res) => {
  // Get grade trends over time
  const trendsQuery = `
    SELECT
      DATE(date) as date,
      AVG(grade) as avg_grade,
      COUNT(*) as grade_count
    FROM grades
    GROUP BY DATE(date)
    ORDER BY date DESC
    LIMIT 30
  `;

  db.all(trendsQuery, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching grade trends:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json(rows);
  });
});

// Password change route
app.put('/api/users/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  // Validate new password strength
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long' });
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
    return res.status(400).json({ message: 'New password must contain at least one uppercase letter, one lowercase letter, and one number' });
  }

  // Get current user from database
  db.get("SELECT * FROM users WHERE id = ?", [req.user.id], async (err, user) => {
    if (err) {
      console.error('Database error fetching user:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash the new password
    const newHashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the password in the database
    const updateQuery = "UPDATE users SET password_hash = ? WHERE id = ?";
    db.run(updateQuery, [newHashedPassword, req.user.id], function(err) {
      if (err) {
        console.error('Database error updating password:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'Password changed successfully' });
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler - serve index.html for any other routes to enable client-side routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Export for Vercel
module.exports = app;