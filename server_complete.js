// Complete school portal server with admin functionality
const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const session = require('express-session');
const jwt = require('jsonwebtoken');
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_session_secret_for_development',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, './public')));

// In-memory data storage
let users = [
  { id: 1, username: 'admin', email: 'admin@school.edu', password: 'admin123', role: 'admin', created_at: new Date().toISOString() },
  { id: 2, username: 'emmanuel', email: 'emmanuel@staff.edu', password: 'staff123', role: 'staff', created_at: new Date().toISOString() },
  { id: 3, username: 'tuyishime', email: 'tuyishime@staff.edu', password: 'staff123', role: 'staff', created_at: new Date().toISOString() },
  { id: 4, username: 'martin', email: 'martin@student.edu', password: 'student123', role: 'student', created_at: new Date().toISOString() },
  { id: 5, username: 'shift', email: 'shift@student.edu', password: 'student123', role: 'student', created_at: new Date().toISOString() },
  { id: 6, username: 'emmanuel_student', email: 'emmanuel_student@student.edu', password: 'student123', role: 'student', created_at: new Date().toISOString() },
  { id: 7, username: 'tuyishime_student', email: 'tuyishime_student@student.edu', password: 'student123', role: 'student', created_at: new Date().toISOString() }
];

let grades = [];
let students = [
  { id: 1, student_id: 'STU001', name: 'Martin Smith', email: 'martin@example.com', class: 'Grade 10A' },
  { id: 2, student_id: 'STU002', name: 'Shift Johnson', email: 'shift@example.com', class: 'Grade 10B' },
  { id: 3, student_id: 'STU003', name: 'Emmanuel Student', email: 'emmanuel_student@example.com', class: 'Grade 11A' },
  { id: 4, student_id: 'STU004', name: 'Tuyishime Student', email: 'tuyishime_student@example.com', class: 'Grade 11B' }
];
let announcements = [
  { id: 1, title: 'School Event', content: 'Annual sports day coming up!', date: '2026-01-15', author_name: 'Admin' },
  { id: 2, title: 'Exam Schedule', content: 'Final exams will be held next month', date: '2026-01-10', author_name: 'Staff' }
];
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
    return res.status(401).json({ message: 'Access token required' });
  }
  next();
};

const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.session.userRole || !allowedRoles.includes(req.session.userRole)) {
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
  if (req.session.userRole !== 'staff' && req.session.userRole !== 'admin') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  res.sendFile(path.join(__dirname, './public/staff.html'));
});

app.get('/admin', authenticateUser, (req, res) => {
  if (req.session.userRole !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  res.sendFile(path.join(__dirname, './public/admin.html'));
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

// Admin user management routes
app.get('/api/admin/users', authenticateUser, authorizeRole(['admin']), (req, res) => {
  // Return all users (except passwords)
  const usersWithoutPasswords = users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    created_at: user.created_at
  }));

  res.json(usersWithoutPasswords);
});

app.post('/api/admin/users', authenticateUser, authorizeRole(['admin']), (req, res) => {
  const { username, email, role, password } = req.body;

  if (!username || !email || !role || !password) {
    return res.status(400).json({ message: 'Username, email, role, and password are required' });
  }

  // Validate and sanitize inputs
  const sanitizedUsername = validator.escape(username.toString().trim());
  const sanitizedEmail = validator.escape(email.toString().trim());
  const sanitizedRole = validator.escape(role.toString().trim());
  const sanitizedPassword = password.toString(); // Don't escape password but validate it

  // Additional validation
  if (!validator.isEmail(sanitizedEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (sanitizedUsername.length < 2 || sanitizedUsername.length > 50) {
    return res.status(400).json({ message: 'Username must be between 2 and 50 characters' });
  }

  if (sanitizedRole !== 'student' && sanitizedRole !== 'staff' && sanitizedRole !== 'admin') {
    return res.status(400).json({ message: 'Role must be student, staff, or admin' });
  }

  if (sanitizedPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  // Check if user already exists
  const existingUser = users.find(u => 
    u.username === sanitizedUsername || u.email === sanitizedEmail
  );
  if (existingUser) {
    return res.status(409).json({ message: 'User with this username or email already exists' });
  }

  const newUser = {
    id: users.length + 1,
    username: sanitizedUsername,
    email: sanitizedEmail,
    password: sanitizedPassword, // Plain text for simplicity
    role: sanitizedRole,
    created_at: new Date().toISOString()
  };

  users.push(newUser);

  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    role: newUser.role,
    message: 'User created successfully'
  });
});

app.put('/api/admin/users/:id', authenticateUser, authorizeRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { username, email, role } = req.body;

  if (!username || !email || !role) {
    return res.status(400).json({ message: 'Username, email, and role are required' });
  }

  const sanitizedId = parseInt(id);
  const sanitizedUsername = validator.escape(username.toString().trim());
  const sanitizedEmail = validator.escape(email.toString().trim());
  const sanitizedRole = validator.escape(role.toString().trim());

  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  if (sanitizedRole !== 'student' && sanitizedRole !== 'staff' && sanitizedRole !== 'admin') {
    return res.status(400).json({ message: 'Role must be student, staff, or admin' });
  }

  if (!validator.isEmail(sanitizedEmail)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  // Find user index
  const userIndex = users.findIndex(u => u.id === sanitizedId);
  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Check if another user with the same username/email exists (excluding current user)
  const existingUser = users.find(u => 
    (u.username === sanitizedUsername || u.email === sanitizedEmail) && u.id !== sanitizedId
  );
  if (existingUser) {
    return res.status(409).json({ message: 'Another user with this username or email already exists' });
  }

  // Update user
  users[userIndex] = {
    ...users[userIndex],
    username: sanitizedUsername,
    email: sanitizedEmail,
    role: sanitizedRole
  };

  res.json({
    id: users[userIndex].id,
    username: users[userIndex].username,
    email: users[userIndex].email,
    role: users[userIndex].role,
    message: 'User updated successfully'
  });
});

app.delete('/api/admin/users/:id', authenticateUser, authorizeRole(['admin']), (req, res) => {
  const { id } = req.params;

  const sanitizedId = parseInt(id);
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  // Don't allow admin to delete themselves
  if (sanitizedId === req.session.userId) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }

  const userIndex = users.findIndex(u => u.id === sanitizedId);
  if (userIndex === -1) {
    return res.status(404).json({ message: 'User not found' });
  }

  users.splice(userIndex, 1);

  res.json({ message: 'User deleted successfully' });
});

// Admin analytics routes
app.get('/api/admin/analytics', authenticateUser, authorizeRole(['admin']), (req, res) => {
  // Get comprehensive analytics
  const analytics = {
    total_users: users.length,
    total_students: users.filter(u => u.role === 'student').length,
    total_staff: users.filter(u => u.role === 'staff').length,
    total_admins: users.filter(u => u.role === 'admin').length,
    total_grades: grades.length,
    total_subjects: subjects.length,
    total_announcements: announcements.length,
    average_grade: grades.length > 0 
      ? parseFloat((grades.reduce((sum, g) => sum + g.grade, 0) / grades.length).toFixed(2))
      : 0
  };

  res.json(analytics);
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
app.get('/api/grades/staff', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
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

app.post('/api/grades', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
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
app.put('/api/grades/:id', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
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
app.delete('/api/grades/:id', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
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
app.get('/api/students', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
  res.json(students);
});

app.post('/api/students', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
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
app.get('/api/staff', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
  const staffUsers = users.filter(u => u.role === 'staff');
  const staffList = staffUsers.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email
  }));

  res.json(staffList);
});

// Announcements routes
app.get('/api/staff/announcements', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
  res.json(announcements);
});

app.post('/api/staff/announcements', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
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
app.put('/api/staff/announcements/:id', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
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

app.delete('/api/staff/announcements/:id', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
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

// Subjects routes
app.get('/api/subjects', authenticateUser, (req, res) => {
  res.json(subjects);
});

app.post('/api/subjects', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
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
  const existingSubject = subjects.find(s =>
    s.name.toLowerCase() === sanitizedName.toLowerCase()
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

app.put('/api/subjects/:id', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
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
  const existingSubject = subjects.find(s =>
    s.name.toLowerCase() === sanitizedName.toLowerCase() && s.id != sanitizedId
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

app.delete('/api/subjects/:id', authenticateUser, authorizeRole(['staff', 'admin']), (req, res) => {
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

// Posts management routes
let posts = [
  { id: 1, title: 'Welcome to School Portal', content: 'This is the official school portal where students can check grades and staff can manage academic records.', category: 'news', date: '2026-01-01', author: 'Admin' },
  { id: 2, title: 'New Academic Year Begins', content: 'The new academic year starts on January 15th. All students and staff should be prepared for the new semester.', category: 'event', date: '2026-01-10', author: 'Admin' },
  { id: 3, title: 'Library Resources Updated', content: 'Our digital library has been updated with new resources for students. Check it out for study materials.', category: 'resource', date: '2026-01-05', author: 'Staff' }
];

// Get all posts
app.get('/api/posts', authenticateUser, authorizeRole(['admin', 'staff']), (req, res) => {
  res.json(posts);
});

// Get a specific post
app.get('/api/posts/:id', authenticateUser, authorizeRole(['admin', 'staff']), (req, res) => {
  const { id } = req.params;
  const sanitizedId = parseInt(id);

  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid post ID' });
  }

  const post = posts.find(p => p.id == sanitizedId);
  if (!post) {
    return res.status(404).json({ message: 'Post not found' });
  }

  res.json(post);
});

// Create a new post
app.post('/api/posts', authenticateUser, authorizeRole(['admin', 'staff']), (req, res) => {
  const { title, content, category, date } = req.body;

  if (!title || !content || !category || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate and sanitize inputs
  const sanitizedTitle = validator.escape(title.toString().trim());
  const sanitizedContent = validator.escape(content.toString().trim());
  const sanitizedCategory = validator.escape(category.toString().trim());
  const validatedDate = new Date(date);

  // Additional validation
  if (sanitizedTitle.length < 2 || sanitizedTitle.length > 200) {
    return res.status(400).json({ message: 'Title must be between 2 and 200 characters' });
  }

  if (sanitizedContent.length < 5 || sanitizedContent.length > 2000) {
    return res.status(400).json({ message: 'Content must be between 5 and 2000 characters' });
  }

  if (!['news', 'event', 'notice', 'resource'].includes(sanitizedCategory)) {
    return res.status(400).json({ message: 'Category must be news, event, notice, or resource' });
  }

  if (isNaN(validatedDate.getTime())) {
    return res.status(400).json({ message: 'Invalid date format' });
  }

  // Get author name from session
  const authorName = req.session.username;

  const newPost = {
    id: posts.length + 1,
    title: sanitizedTitle,
    content: sanitizedContent,
    category: sanitizedCategory,
    date: date,
    author: authorName
  };

  posts.push(newPost);

  res.status(201).json({
    ...newPost,
    message: 'Post created successfully'
  });
});

// Update a post
app.put('/api/posts/:id', authenticateUser, authorizeRole(['admin', 'staff']), (req, res) => {
  const { id } = req.params;
  const { title, content, category, date } = req.body;

  if (!title || !content || !category || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate inputs
  const sanitizedId = parseInt(id);
  const sanitizedTitle = validator.escape(title.toString().trim());
  const sanitizedContent = validator.escape(content.toString().trim());
  const sanitizedCategory = validator.escape(category.toString().trim());
  const validatedDate = new Date(date);

  // Additional validation
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid post ID' });
  }

  if (sanitizedTitle.length < 2 || sanitizedTitle.length > 200) {
    return res.status(400).json({ message: 'Title must be between 2 and 200 characters' });
  }

  if (sanitizedContent.length < 5 || sanitizedContent.length > 2000) {
    return res.status(400).json({ message: 'Content must be between 5 and 2000 characters' });
  }

  if (!['news', 'event', 'notice', 'resource'].includes(sanitizedCategory)) {
    return res.status(400).json({ message: 'Category must be news, event, notice, or resource' });
  }

  if (isNaN(validatedDate.getTime())) {
    return res.status(400).json({ message: 'Invalid date format' });
  }

  const postIndex = posts.findIndex(p => p.id == sanitizedId);
  if (postIndex === -1) {
    return res.status(404).json({ message: 'Post not found' });
  }

  posts[postIndex] = {
    ...posts[postIndex],
    title: sanitizedTitle,
    content: sanitizedContent,
    category: sanitizedCategory,
    date: date
  };

  res.json({
    ...posts[postIndex],
    message: 'Post updated successfully'
  });
});

// Delete a post
app.delete('/api/posts/:id', authenticateUser, authorizeRole(['admin', 'staff']), (req, res) => {
  const { id } = req.params;

  const sanitizedId = parseInt(id);
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid post ID' });
  }

  const postIndex = posts.findIndex(p => p.id == sanitizedId);
  if (postIndex === -1) {
    return res.status(404).json({ message: 'Post not found' });
  }

  posts.splice(postIndex, 1);

  res.json({ message: 'Post deleted successfully' });
});

// Grade summary endpoints for admin dashboard
app.get('/api/admin/grade-summary', authenticateUser, authorizeRole(['admin']), (req, res) => {
  // Calculate subject averages
  const subjectAverages = {};
  grades.forEach(grade => {
    if (!subjectAverages[grade.subject]) {
      subjectAverages[grade.subject] = { total: 0, count: 0 };
    }
    subjectAverages[grade.subject].total += grade.grade;
    subjectAverages[grade.subject].count++;
  });

  const subjectAvgArray = Object.keys(subjectAverages).map(subject => ({
    subject: subject,
    avg_grade: subjectAverages[subject].total / subjectAverages[subject].count
  }));

  // Calculate top students
  const studentGrades = {};
  grades.forEach(grade => {
    const student = students.find(s => s.student_id === grade.student_id);
    const studentName = student ? student.name : 'Unknown';

    if (!studentGrades[grade.student_id]) {
      studentGrades[grade.student_id] = { total: 0, count: 0, name: studentName };
    }
    studentGrades[grade.student_id].total += grade.grade;
    studentGrades[grade.student_id].count++;
  });

  const topStudents = Object.entries(studentGrades)
    .map(([studentId, data]) => ({
      student_id: studentId,
      student_name: data.name,
      avg_grade: data.total / data.count
    }))
    .sort((a, b) => b.avg_grade - a.avg_grade)
    .slice(0, 5);

  res.json({
    subject_averages: subjectAvgArray,
    top_students: topStudents
  });
});

// Grade trends endpoint for admin dashboard
app.get('/api/admin/grade-trends', authenticateUser, authorizeRole(['admin']), (req, res) => {
  // Group grades by date and calculate average for each date
  const dateGrades = {};
  grades.forEach(grade => {
    const date = new Date(grade.date).toISOString().split('T')[0]; // YYYY-MM-DD format

    if (!dateGrades[date]) {
      dateGrades[date] = { total: 0, count: 0 };
    }
    dateGrades[date].total += grade.grade;
    dateGrades[date].count++;
  });

  const trends = Object.keys(dateGrades)
    .map(date => ({
      date: date,
      avg_grade: dateGrades[date].total / dateGrades[date].count
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort chronologically

  res.json(trends);
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.sendFile(path.join(__dirname, './public/index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`School Portal Server is running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /api/users/login - Login with username and password');
  console.log('  GET /api/grades/student/:studentId - Get student grades (requires authentication)');
  console.log('  GET /api/grades/staff - Get all grades (staff access required)');
  console.log('  POST /api/grades - Add a new grade (staff access required)');
  console.log('  PUT /api/grades/:id - Update a grade (staff access required)');
  console.log('  DELETE /api/grades/:id - Delete a grade (staff access required)');
  console.log('  GET /api/admin/users - Get all users (admin access required)');
  console.log('  POST /api/admin/users - Create a new user (admin access required)');
  console.log('  PUT /api/admin/users/:id - Update a user (admin access required)');
  console.log('  DELETE /api/admin/users/:id - Delete a user (admin access required)');
  console.log('  GET /api/admin/analytics - Get system analytics (admin access required)');
  console.log('');
  console.log('Test credentials:');
  console.log('  Admin: admin / admin123');
  console.log('  Staff: emmanuel / staff123 or tuyishime / staff123');
  console.log('  Student: martin / student123, shift / student123, etc.');
});

// Export for Vercel/Render
module.exports = app;