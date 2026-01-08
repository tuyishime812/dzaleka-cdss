const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock database using an object instead of SQLite for testing
const mockDb = {
  users: [
    { id: 1, username: 'admin', email: 'admin@school.edu', password_hash: '$2a$10$8K1p/a0dU/HZq9sZw1qJ7eDyJ8F9Y3p0v7w4n6r5q2o8z1x9c3v7u', role: 'admin' }, // password: admin123
    { id: 2, username: 'teacher1', email: 'teacher@school.edu', password_hash: '$2a$10$8K1p/a0dU/HZq9sZw1qJ7eDyJ8F9Y3p0v7w4n6r5q2o8z1x9c3v7u', role: 'teacher' },
    { id: 3, username: 'student1', email: 'student@school.edu', password_hash: '$2a$10$8K1p/a0dU/HZq9sZw1qJ7eDyJ8F9Y3p0v7w4n6r5q2o8z1x9c3v7u', role: 'student' }
  ],
  students: [
    { id: 1, student_id: 'STU001', name: 'John Doe', email: 'john@example.com', class: 'Grade 10A' },
    { id: 2, student_id: 'STU002', name: 'Jane Smith', email: 'jane@example.com', class: 'Grade 10B' },
    { id: 3, student_id: 'STU003', name: 'Bob Johnson', email: 'bob@example.com', class: 'Grade 10A' }
  ],
  teachers: [
    { id: 1, teacher_id: 'TEACH001', name: 'Mr. Smith', email: 'smith@school.edu', subject: 'Mathematics' },
    { id: 2, teacher_id: 'TEACH002', name: 'Ms. Johnson', email: 'johnson@school.edu', subject: 'Science' }
  ],
  grades: [
    { id: 1, student_id: 'STU001', subject: 'Mathematics', exam_type: 'exam', grade: 85, date: '2023-12-15', teacher_id: 1 },
    { id: 2, student_id: 'STU001', subject: 'Science', exam_type: 'quiz', grade: 92, date: '2023-12-10', teacher_id: 2 },
    { id: 3, student_id: 'STU002', subject: 'English', exam_type: 'assignment', grade: 78, date: '2023-12-05', teacher_id: 1 }
  ],
  announcements: [
    { id: 1, title: 'School Event', content: 'Annual sports day is scheduled for next month', date: '2023-12-01', author_name: 'Admin' },
    { id: 2, title: 'Holiday Notice', content: 'Winter break starts from Dec 20th', date: '2023-12-10', author_name: 'Principal' }
  ]
};

// In-memory "database" operations
const db = {
  get: (query, params, callback) => {
    // Simplified implementation for testing
    if (query.includes('FROM users WHERE username = ?')) {
      const user = mockDb.users.find(u => u.username === params[0]);
      callback(null, user);
    }
  },
  all: (query, params, callback) => {
    // Simplified implementation for testing
    if (query.includes('FROM students')) {
      callback(null, mockDb.students);
    } else if (query.includes('FROM teachers')) {
      callback(null, mockDb.teachers);
    } else if (query.includes('FROM grades')) {
      callback(null, mockDb.grades);
    } else if (query.includes('FROM announcements')) {
      callback(null, mockDb.announcements);
    }
  },
  run: (query, params, callback) => {
    // Simplified implementation for testing
    callback(null, { lastID: mockDb.grades.length + 1 });
  }
};

// Mock auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // For testing, allow all requests
  req.user = { id: 1, username: 'test', role: 'admin' };
  next();
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    next();
  };
};

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

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

  // For testing, return a mock token
  res.json({
    message: 'Login successful',
    token: 'mock-jwt-token-for-testing',
    user: { 
      id: 1, 
      username: username, 
      role: 'teacher' 
    }
  });
});

// Student grades routes
app.get('/api/grades/student/:studentId', authenticateToken, (req, res) => {
  const { studentId } = req.params;

  const grades = mockDb.grades.filter(g => g.student_id === studentId);
  
  // Add teacher names
  const gradesWithTeachers = grades.map(grade => {
    const teacher = mockDb.teachers.find(t => t.id === grade.teacher_id);
    return {
      ...grade,
      teacher_name: teacher ? teacher.name : 'Unknown'
    };
  });

  res.json(gradesWithTeachers);
});

// Teacher grades routes
app.get('/api/grades/teacher', authenticateToken, (req, res) => {
  res.json([]);
});

app.post('/api/grades', authenticateToken, (req, res) => {
  const { studentId, subject, examType, grade, date, teacherId } = req.body;

  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Add to mock database
  const newGrade = {
    id: mockDb.grades.length + 1,
    student_id: studentId,
    subject: subject,
    exam_type: examType,
    grade: grade,
    date: date,
    teacher_id: teacherId
  };
  
  mockDb.grades.push(newGrade);

  res.status(201).json({ 
    ...newGrade,
    message: 'Grade added successfully' 
  });
});

// Students routes
app.get('/api/students', authenticateToken, (req, res) => {
  res.json(mockDb.students);
});

app.post('/api/students', authenticateToken, (req, res) => {
  const { studentId, name, email, class: studentClass } = req.body;

  if (!studentId || !name || !email || !studentClass) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const newStudent = {
    id: mockDb.students.length + 1,
    student_id: studentId,
    name: name,
    email: email,
    class: studentClass
  };
  
  mockDb.students.push(newStudent);

  res.status(201).json({ 
    ...newStudent,
    message: 'Student added successfully' 
  });
});

// Teachers routes
app.get('/api/teachers', authenticateToken, (req, res) => {
  res.json(mockDb.teachers);
});

app.post('/api/teachers', authenticateToken, (req, res) => {
  const { teacherId, name, email, subject } = req.body;

  if (!teacherId || !name || !email || !subject) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const newTeacher = {
    id: mockDb.teachers.length + 1,
    teacher_id: teacherId,
    name: name,
    email: email,
    subject: subject
  };
  
  mockDb.teachers.push(newTeacher);

  res.status(201).json({ 
    ...newTeacher,
    message: 'Teacher added successfully' 
  });
});

// Staff statistics routes
app.get('/api/staff/statistics', authenticateToken, (req, res) => {
  const stats = {
    totalStudents: mockDb.students.length,
    totalTeachers: mockDb.teachers.length,
    totalClasses: [...new Set(mockDb.students.map(s => s.class))].length,
    averageGrade: mockDb.grades.length > 0 
      ? parseFloat((mockDb.grades.reduce((sum, g) => sum + g.grade, 0) / mockDb.grades.length).toFixed(2))
      : 0
  };

  res.json(stats);
});

// Announcements routes
app.get('/api/staff/announcements', authenticateToken, (req, res) => {
  res.json(mockDb.announcements);
});

app.post('/api/staff/announcements', authenticateToken, (req, res) => {
  const { title, content, date } = req.body;

  if (!title || !content || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const newAnnouncement = {
    id: mockDb.announcements.length + 1,
    title: title,
    content: content,
    date: date,
    author_name: 'Test User'
  };
  
  mockDb.announcements.push(newAnnouncement);

  res.status(201).json({ 
    ...newAnnouncement,
    message: 'Announcement posted successfully' 
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