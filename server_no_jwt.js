// Server without JWT - using simple session-based authentication
const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const session = require('express-session');
const validator = require('validator');
require('dotenv').config();

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

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

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_session_secret_for_development',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, './public')));

// Hardcoded users
const users = [
  { id: 1, username: 'emmanuel', email: 'emmanuel@staff.edu', password: 'staff123', role: 'staff' },
  { id: 2, username: 'tuyishime', email: 'tuyishime@staff.edu', password: 'staff123', role: 'staff' },
  { id: 3, username: 'martin', email: 'martin@student.edu', password: 'student123', role: 'student' },
  { id: 4, username: 'shift', email: 'shift@student.edu', password: 'student123', role: 'student' },
  { id: 5, username: 'emmanuel_student', email: 'emmanuel_student@student.edu', password: 'student123', role: 'student' },
  { id: 6, username: 'tuyishime_student', email: 'tuyishime_student@student.edu', password: 'student123', role: 'student' }
];

// In-memory storage for other data
let grades = [];
let students = [];
let announcements = [];
let subjects = [
  { id: 1, name: 'Mathematics' },
  { id: 2, name: 'English' },
  { id: 3, name: 'Science' },
  { id: 4, name: 'History' },
  { id: 5, name: 'Geography' }
];

// Authentication middleware
const authenticateUser = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Access denied. Please log in.' });
  }
  next();
};

const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.session.userId || !allowedRoles.includes(req.session.userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Main routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, './public/login.html'));
});

app.get('/student', authenticateUser, (req, res) => {
  if (req.session.userRole !== 'student') {
    return res.status(403).json({ message: 'Student access required' });
  }
  res.sendFile(path.join(__dirname, './public/student.html'));
});

app.get('/staff', authenticateUser, (req, res) => {
  if (req.session.userRole !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  res.sendFile(path.join(__dirname, './public/staff.html'));
});

// Login route
app.post('/api/users/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Find user
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Check password
  if (user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Store user info in session
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.userRole = user.role;

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
});

// Logout route
app.post('/api/users/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Student grades routes
app.get('/api/grades/student/:studentId', authenticateUser, (req, res) => {
  const { studentId } = req.params;

  // Students can only access their own grades
  if (req.session.userRole === 'student' && req.session.username !== studentId) {
    return res.status(403).json({ message: 'Students can only access their own grades' });
  }

  // Filter grades for the specific student
  const studentGrades = grades.filter(grade => grade.student_id === studentId);

  // Add teacher names to grades
  const gradesWithTeachers = studentGrades.map(grade => {
    const teacher = users.find(u => u.id === grade.teacher_id);
    return {
      ...grade,
      teacher_name: teacher ? teacher.username : 'N/A'
    };
  });

  res.json(gradesWithTeachers);
});

// Staff grades routes
app.get('/api/grades/staff', authenticateUser, authorizeRole(['staff']), (req, res) => {
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

app.post('/api/grades', authenticateUser, authorizeRole(['staff']), (req, res) => {
  const { studentId, subject, examType, grade, date } = req.body;

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

  // Check if student exists
  const student = students.find(s => s.student_id === sanitizedStudentId);
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  // Check if subject exists
  const subjectRecord = subjects.find(s => s.name === sanitizedSubject);
  if (!subjectRecord) {
    return res.status(404).json({ message: 'Subject not found' });
  }

  const newGrade = {
    id: grades.length + 1,
    student_id: sanitizedStudentId,
    subject: sanitizedSubject,
    exam_type: sanitizedExamType,
    grade: validatedGrade,
    date: date,
    teacher_id: req.session.userId
  };

  grades.push(newGrade);

  res.status(201).json({
    ...newGrade,
    message: 'Grade added successfully'
  });
});

// PUT route to update a grade
app.put('/api/grades/:id', authenticateUser, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;
  const { studentId, subject, examType, grade, date } = req.body;

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

  const gradeIndex = grades.findIndex(g => g.id == sanitizedId);
  if (gradeIndex === -1) {
    return res.status(404).json({ message: 'Grade not found' });
  }

  grades[gradeIndex] = {
    ...grades[gradeIndex],
    student_id: sanitizedStudentId,
    subject: sanitizedSubject,
    exam_type: sanitizedExamType,
    grade: validatedGrade,
    date: date
  };

  res.json({
    ...grades[gradeIndex],
    message: 'Grade updated successfully'
  });
});

// DELETE route to delete a grade
app.delete('/api/grades/:id', authenticateUser, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;

  const sanitizedId = parseInt(id);
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid grade ID' });
  }

  const gradeIndex = grades.findIndex(g => g.id == sanitizedId);
  if (gradeIndex === -1) {
    return res.status(404).json({ message: 'Grade not found' });
  }

  grades.splice(gradeIndex, 1);

  res.json({ message: 'Grade deleted successfully' });
});

// Students routes
app.get('/api/students', authenticateUser, authorizeRole(['staff']), (req, res) => {
  res.json(students);
});

app.post('/api/students', authenticateUser, authorizeRole(['staff']), (req, res) => {
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
  const existingStudent = students.find(s => 
    s.student_id === sanitizedStudentId || s.email === sanitizedEmail
  );
  if (existingStudent) {
    return res.status(409).json({ message: 'Student with this ID or email already exists' });
  }

  const newStudent = {
    id: students.length + 1,
    student_id: sanitizedStudentId,
    name: sanitizedName,
    email: sanitizedEmail,
    class: sanitizedClass
  };

  students.push(newStudent);

  res.status(201).json({
    ...newStudent,
    message: 'Student added successfully'
  });
});

// Staff routes
app.get('/api/staff', authenticateUser, authorizeRole(['staff']), (req, res) => {
  const staffUsers = users.filter(user => user.role === 'staff');
  const staffList = staffUsers.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email
  }));

  res.json(staffList);
});

// Staff statistics routes
app.get('/api/staff/statistics', authenticateUser, authorizeRole(['staff']), (req, res) => {
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
app.get('/api/staff/announcements', authenticateUser, authorizeRole(['staff']), (req, res) => {
  res.json(announcements);
});

app.post('/api/staff/announcements', authenticateUser, authorizeRole(['staff']), (req, res) => {
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

  // Get author name from session
  const authorName = req.session.username;

  const newAnnouncement = {
    id: announcements.length + 1,
    title: sanitizedTitle,
    content: sanitizedContent,
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
app.put('/api/staff/announcements/:id', authenticateUser, authorizeRole(['staff']), (req, res) => {
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

  const announcementIndex = announcements.findIndex(a => a.id == sanitizedId);
  if (announcementIndex === -1) {
    return res.status(404).json({ message: 'Announcement not found' });
  }

  announcements[announcementIndex] = {
    ...announcements[announcementIndex],
    title: sanitizedTitle,
    content: sanitizedContent,
    date: date
  };

  res.json({ message: 'Announcement updated successfully' });
});

app.delete('/api/staff/announcements/:id', authenticateUser, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;

  const sanitizedId = parseInt(id);
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid announcement ID' });
  }

  const announcementIndex = announcements.findIndex(a => a.id == sanitizedId);
  if (announcementIndex === -1) {
    return res.status(404).json({ message: 'Announcement not found' });
  }

  announcements.splice(announcementIndex, 1);

  res.json({ message: 'Announcement deleted successfully' });
});

// Subject management routes
app.get('/api/subjects', authenticateUser, (req, res) => {
  res.json(subjects);
});

app.post('/api/subjects', authenticateUser, authorizeRole(['staff']), (req, res) => {
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
  const existingSubject = subjects.find(subject => 
    subject.name.toLowerCase() === sanitizedName.toLowerCase()
  );
  if (existingSubject) {
    return res.status(409).json({ message: 'Subject already exists' });
  }

  const newSubject = {
    id: subjects.length + 1,
    name: sanitizedName
  };

  subjects.push(newSubject);

  res.status(201).json({
    ...newSubject,
    message: 'Subject added successfully'
  });
});

app.put('/api/subjects/:id', authenticateUser, authorizeRole(['staff']), (req, res) => {
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
  const existingSubject = subjects.find(subject => 
    subject.name.toLowerCase() === sanitizedName.toLowerCase() && subject.id != sanitizedId
  );
  if (existingSubject) {
    return res.status(409).json({ message: 'Subject name already exists' });
  }

  const subjectIndex = subjects.findIndex(s => s.id == sanitizedId);
  if (subjectIndex === -1) {
    return res.status(404).json({ message: 'Subject not found' });
  }

  subjects[subjectIndex] = {
    ...subjects[subjectIndex],
    name: sanitizedName
  };

  res.json({
    ...subjects[subjectIndex],
    message: 'Subject updated successfully'
  });
});

app.delete('/api/subjects/:id', authenticateUser, authorizeRole(['staff']), (req, res) => {
  const { id } = req.params;

  const sanitizedId = parseInt(id);
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid subject ID' });
  }

  const subjectIndex = subjects.findIndex(s => s.id == sanitizedId);
  if (subjectIndex === -1) {
    return res.status(404).json({ message: 'Subject not found' });
  }

  // Check if any grades are associated with this subject
  const associatedGrades = grades.filter(grade => grade.subject === subjects[subjectIndex].name);
  if (associatedGrades.length > 0) {
    return res.status(409).json({ message: 'Cannot delete subject: grades are associated with it' });
  }

  subjects.splice(subjectIndex, 1);

  res.json({ message: 'Subject deleted successfully' });
});

// Password change route
app.put('/api/users/change-password', authenticateUser, (req, res) => {
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

  // Find current user
  const user = users.find(u => u.id === req.session.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Verify current password
  if (user.password !== currentPassword) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  // Update the password
  user.password = newPassword;

  res.json({ message: 'Password changed successfully' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, './public/index.html'));
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`School Portal Server is running on port ${PORT}`);
});

// Export for Vercel/Render
module.exports = app;