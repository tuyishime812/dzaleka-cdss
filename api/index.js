// api/index.js - Vercel serverless function entry point
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize SQLite database
const dbPath = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');

    // Create tables if they don't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        class TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
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

    db.run(`
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
    initializeDefaultUsers();

    // Initialize default subjects if they don't exist
    initializeDefaultSubjects();
  }
});

// Initialize default users
const initializeDefaultUsers = async () => {
  // Check if default users already exist
  db.get("SELECT COUNT(*) as count FROM users", [], (err, row) => {
    if (err) {
      console.error('Error checking users:', err);
      return;
    }

    if (row.count === 0) {
      // Hash passwords and insert default users
      const staffHash = bcrypt.hashSync('staff123', 10);
      const studentHash = bcrypt.hashSync('student123', 10);

      const defaultUsers = [
        { username: 'emmanuel', email: 'emmanuel@staff.edu', password_hash: staffHash, role: 'staff' },
        { username: 'tuyishime', email: 'tuyishime@staff.edu', password_hash: staffHash, role: 'staff' },
        { username: 'martin', email: 'martin@student.edu', password_hash: studentHash, role: 'student' },
        { username: 'shift', email: 'shift@student.edu', password_hash: studentHash, role: 'student' },
        { username: 'emmanuel_student', email: 'emmanuel_student@student.edu', password_hash: studentHash, role: 'student' },
        { username: 'tuyishime_student', email: 'tuyishime_student@student.edu', password_hash: studentHash, role: 'student' }
      ];

      const stmt = db.prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)");
      defaultUsers.forEach(user => {
        stmt.run([user.username, user.email, user.password_hash, user.role]);
      });
      stmt.finalize();
      console.log('Default users inserted');
    }
  });
};

// Initialize default subjects
const initializeDefaultSubjects = () => {
  // Check if default subjects already exist
  db.get("SELECT COUNT(*) as count FROM subjects", [], (err, row) => {
    if (err) {
      console.error('Error checking subjects:', err);
      return;
    }

    if (row.count === 0) {
      const defaultSubjects = [
        'Mathematics', 'English', 'Science', 'History', 'Geography'
      ];

      const stmt = db.prepare("INSERT INTO subjects (name) VALUES (?)");
      defaultSubjects.forEach(subject => {
        stmt.run([subject]);
      });
      stmt.finalize();
      console.log('Default subjects inserted');
    }
  });
};

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

// Authentication routes
app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Query the database for the user
  db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
    if (err) {
      console.error('Database error during login:', err);
      return res.status(500).json({ message: 'Internal server error' });
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

  // Query the database for grades for the specific student
  const query = `
    SELECT g.*, u.username as teacher_name
    FROM grades g
    LEFT JOIN users u ON g.teacher_id = u.id
    WHERE g.student_id = ?
    ORDER BY g.created_at DESC
  `;

  db.all(query, [studentId], (err, rows) => {
    if (err) {
      console.error('Database error fetching student grades:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    res.json(rows);
  });
});

// Staff grades routes - staff can view all grades
app.get('/api/grades/staff', authenticateToken, authorizeRole(['staff']), (req, res) => {
  // Query the database for all grades with student information
  const query = `
    SELECT g.*, s.name as student_name, u.username as teacher_name
    FROM grades g
    LEFT JOIN students s ON g.student_id = s.student_id
    LEFT JOIN users u ON g.teacher_id = u.id
    ORDER BY g.created_at DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error fetching all grades:', err);
      return res.status(500).json({ message: 'Internal server error' });
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

  // Insert the new grade into the database
  const query = `
    INSERT INTO grades (student_id, subject, exam_type, grade, date, teacher_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [studentId, subject, examType, grade, date, staffId], function(err) {
    if (err) {
      console.error('Database error inserting grade:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Return the newly created grade
    const newGrade = {
      id: this.lastID,
      student_id: studentId,
      subject: subject,
      exam_type: examType,
      grade: grade,
      date: date,
      teacher_id: staffId
    };

    res.status(201).json({
      ...newGrade,
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

  // Update the grade in the database
  const query = `
    UPDATE grades
    SET student_id = ?, subject = ?, exam_type = ?, grade = ?, date = ?
    WHERE id = ?
  `;

  db.run(query, [studentId, subject, examType, grade, date, id], function(err) {
    if (err) {
      console.error('Database error updating grade:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    // Return the updated grade
    const updatedGrade = {
      id: parseInt(id),
      student_id: studentId,
      subject: subject,
      exam_type: examType,
      grade: grade,
      date: date
    };

    res.json({
      ...updatedGrade,
      message: 'Grade updated successfully'
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

  // Insert the new student into the database
  const query = "INSERT INTO students (student_id, name, email, class) VALUES (?, ?, ?, ?)";

  db.run(query, [studentId, name, email, studentClass], function(err) {
    if (err) {
      console.error('Database error inserting student:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Return the newly created student
    const newStudent = {
      id: this.lastID,
      student_id: studentId,
      name: name,
      email: email,
      class: studentClass
    };

    res.status(201).json({
      ...newStudent,
      message: 'Student added successfully'
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

  // Get author name from token
  const authorName = req.user.username;

  // Insert the new announcement into the database
  const query = "INSERT INTO announcements (title, content, date, author_name) VALUES (?, ?, ?, ?)";

  db.run(query, [title, content, date, authorName], function(err) {
    if (err) {
      console.error('Database error inserting announcement:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Return the newly created announcement
    const newAnnouncement = {
      id: this.lastID,
      title: title,
      content: content,
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

  // Update the announcement in the database
  const query = "UPDATE announcements SET title = ?, content = ?, date = ? WHERE id = ?";

  db.run(query, [title, content, date, id], function(err) {
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

  // Check if subject already exists
  const checkQuery = "SELECT id FROM subjects WHERE LOWER(name) = LOWER(?)";
  db.get(checkQuery, [name], (err, row) => {
    if (err) {
      console.error('Database error checking subject existence:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (row) {
      return res.status(409).json({ message: 'Subject already exists' });
    }

    // Insert the new subject into the database
    const insertQuery = "INSERT INTO subjects (name) VALUES (?)";

    db.run(insertQuery, [name], function(err) {
      if (err) {
        console.error('Database error inserting subject:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // Return the newly created subject
      const newSubject = {
        id: this.lastID,
        name: name
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

  // Check if another subject with the same name exists (excluding current subject)
  const checkQuery = "SELECT id FROM subjects WHERE LOWER(name) = LOWER(?) AND id != ?";
  db.get(checkQuery, [name, id], (err, row) => {
    if (err) {
      console.error('Database error checking subject existence:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (row) {
      return res.status(409).json({ message: 'Subject name already exists' });
    }

    // Update the subject in the database
    const updateQuery = "UPDATE subjects SET name = ? WHERE id = ?";

    db.run(updateQuery, [name, id], function(err) {
      if (err) {
        console.error('Database error updating subject:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      // Return the updated subject
      const updatedSubject = {
        id: parseInt(id),
        name: name
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