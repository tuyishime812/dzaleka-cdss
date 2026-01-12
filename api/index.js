// api/index.js - Vercel serverless function entry point
const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// In-memory storage for demo purposes (in production, use a real database)
let users = [
  { id: 1, username: 'emmanuel', email: 'emmanuel@staff.edu', password_hash: '', role: 'staff' },
  { id: 2, username: 'tuyishime', email: 'tuyishime@staff.edu', password_hash: '', role: 'staff' },
  { id: 3, username: 'martin', email: 'martin@student.edu', password_hash: '', role: 'student' },
  { id: 4, username: 'shift', email: 'shift@student.edu', password_hash: '', role: 'student' },
  { id: 5, username: 'emmanuel_student', email: 'emmanuel_student@student.edu', password_hash: '', role: 'student' },
  { id: 6, username: 'tuyishime_student', email: 'tuyishime_student@student.edu', password_hash: '', role: 'student' }
];

// Hash passwords for the default users
const initializeUsers = async () => {
  // Hash staff passwords
  const staffHash = await bcrypt.hash('staff123', 10);
  users[0].password_hash = staffHash;
  users[1].password_hash = staffHash;
  
  // Hash student passwords
  const studentHash = await bcrypt.hash('student123', 10);
  users[2].password_hash = studentHash;
  users[3].password_hash = studentHash;
  users[4].password_hash = studentHash;
  users[5].password_hash = studentHash;
};

// Initialize users
initializeUsers();

// In-memory storage for other data
let grades = [];
let students = [];
let announcements = [];

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

  const user = users.find(u => u.username === username);
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

  // Filter grades for the specific student
  const studentGrades = grades.filter(grade => grade.student_id === studentId);

  // Add teacher names to grades
  const gradesWithTeachers = studentGrades.map(grade => {
    const teacher = users.find(user => user.id === grade.teacher_id);
    return {
      ...grade,
      teacher_name: teacher ? teacher.username : 'N/A'
    };
  });

  res.json(gradesWithTeachers);
});

// Staff grades routes - staff can view all grades
app.get('/api/grades/staff', authenticateToken, authorizeRole(['staff']), (req, res) => {
  // Add student names to grades
  const gradesWithInfo = grades.map(grade => {
    const student = students.find(s => s.student_id === grade.student_id);
    return {
      ...grade,
      student_name: student ? student.name : 'N/A'
    };
  });

  res.json(gradesWithInfo);
});

app.post('/api/grades', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { studentId, subject, examType, grade, date } = req.body;

  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Staff member who is adding the grade
  const staffId = req.user.id;

  const newGrade = {
    id: grades.length + 1,
    student_id: studentId,
    subject: subject,
    exam_type: examType,
    grade: grade,
    date: date,
    teacher_id: staffId
  };

  grades.push(newGrade);

  res.status(201).json({
    ...newGrade,
    message: 'Grade added successfully'
  });
});

// PUT route to update a grade
app.put('/api/grades/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;
  const { studentId, subject, examType, grade, date } = req.body;

  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const gradeIndex = grades.findIndex(g => g.id == id);
  if (gradeIndex === -1) {
    return res.status(404).json({ message: 'Grade not found' });
  }

  grades[gradeIndex] = {
    ...grades[gradeIndex],
    student_id: studentId,
    subject: subject,
    exam_type: examType,
    grade: grade,
    date: date
  };

  res.json({
    ...grades[gradeIndex],
    message: 'Grade updated successfully'
  });
});

// DELETE route to delete a grade
app.delete('/api/grades/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;

  const gradeIndex = grades.findIndex(g => g.id == id);
  if (gradeIndex === -1) {
    return res.status(404).json({ message: 'Grade not found' });
  }

  grades.splice(gradeIndex, 1);

  res.json({ message: 'Grade deleted successfully' });
});

// Students routes
app.get('/api/students', authenticateToken, (req, res) => {
  res.json(students);
});

app.post('/api/students', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { studentId, name, email, class: studentClass } = req.body;

  if (!studentId || !name || !email || !studentClass) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const newStudent = {
    id: students.length + 1,
    student_id: studentId,
    name: name,
    email: email,
    class: studentClass
  };

  students.push(newStudent);

  res.status(201).json({
    ...newStudent,
    message: 'Student added successfully'
  });
});

// Staff routes
app.get('/api/staff', authenticateToken, (req, res) => {
  const staffUsers = users.filter(user => user.role === 'staff');
  const staffList = staffUsers.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email
  }));
  
  res.json(staffList);
});

// Staff statistics routes
app.get('/api/staff/statistics', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const stats = {
    totalStudents: students.length,
    totalStaff: users.filter(u => u.role === 'staff').length,
    totalClasses: [...new Set(students.map(s => s.class))].length,
    averageGrade: grades.length > 0 
      ? parseFloat((grades.reduce((sum, g) => sum + g.grade, 0) / grades.length).toFixed(2))
      : 0
  };

  res.json(stats);
});

// Announcements routes
app.get('/api/staff/announcements', authenticateToken, (req, res) => {
  res.json(announcements);
});

app.post('/api/staff/announcements', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { title, content, date } = req.body;

  if (!title || !content || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Get author name from token
  const authorName = req.user.username;

  const newAnnouncement = {
    id: announcements.length + 1,
    title: title,
    content: content,
    date: date,
    author_name: authorName
  };

  announcements.push(newAnnouncement);

  res.status(201).json({
    ...newAnnouncement,
    message: 'Announcement posted successfully'
  });
});

// PUT and DELETE routes for announcements
app.put('/api/staff/announcements/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;
  const { title, content, date } = req.body;

  if (!title || !content || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const announcementIndex = announcements.findIndex(a => a.id == id);
  if (announcementIndex === -1) {
    return res.status(404).json({ message: 'Announcement not found' });
  }

  announcements[announcementIndex] = {
    ...announcements[announcementIndex],
    title: title,
    content: content,
    date: date
  };

  res.json({ message: 'Announcement updated successfully' });
});

app.delete('/api/staff/announcements/:id', authenticateToken, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;

  const announcementIndex = announcements.findIndex(a => a.id == id);
  if (announcementIndex === -1) {
    return res.status(404).json({ message: 'Announcement not found' });
  }

  announcements.splice(announcementIndex, 1);

  res.json({ message: 'Announcement deleted successfully' });
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