const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./db');
const { authenticateToken, authorizeRole } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/js', express.static(path.join(__dirname, '../public/js')));
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// Main routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

app.get('/teacher', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/teacher.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student.html'));
});

app.get('/staff', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/staff.html'));
});

// Authentication routes
app.post('/api/users/login', (req, res) => {
  const { username, password, userType } = req.body;

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
  // This would need to be updated to fetch grades by teacher ID
  // For now, returning a placeholder
  res.json([]);
});

app.post('/api/grades', authenticateToken, authorizeRole(['teacher', 'staff']), (req, res) => {
  const { studentId, subject, examType, grade, date, teacherId } = req.body;

  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const query = `
    INSERT INTO grades (student_id, subject, exam_type, grade, date, teacher_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [studentId, subject, examType, grade, date, teacherId], function(err) {
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
      teacher_id: teacherId,
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

// PUT and DELETE routes for announcements (if needed)
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