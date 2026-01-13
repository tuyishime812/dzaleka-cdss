// Barebones server for Vercel deployment - absolutely minimal
const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create Express app
const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

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

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, './public')));

// Hardcoded users - NO ENCRYPTION, NO COMPLEXITY
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

// Token blacklist for logout functionality
const tokenBlacklist = new Set();

// Authentication middleware - SIMPLIFIED
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

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_for_development');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Main routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, './public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, './public/login.html'));
});

app.get('/student', authenticateToken, (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Student access required' });
  }
  res.sendFile(path.join(__dirname, './public/student.html'));
});

app.get('/staff', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  res.sendFile(path.join(__dirname, './public/staff.html'));
});

// LOGIN ROUTE - ABSOLUTELY SIMPLIFIED
app.post('/api/users/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Find user - DIRECT COMPARISON
  let foundUser = null;
  for (let i = 0; i < users.length; i++) {
    if (users[i].username === username && users[i].password === password) {
      foundUser = users[i];
      break;
    }
  }

  if (!foundUser) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Create JWT token - SIMPLE
  const token = jwt.sign(
    { 
      id: foundUser.id, 
      username: foundUser.username, 
      role: foundUser.role 
    },
    process.env.JWT_SECRET || 'fallback_secret_key_for_development',
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Login successful',
    token: token,
    user: {
      id: foundUser.id,
      username: foundUser.username,
      role: foundUser.role
    }
  });
});

// Student grades routes
app.get('/api/grades/student/:studentId', authenticateToken, (req, res) => {
  const { studentId } = req.params;

  // Students can only access their own grades
  if (req.user.role === 'student' && req.user.username !== studentId) {
    return res.status(403).json({ message: 'Students can only access their own grades' });
  }

  // Filter grades for the specific student
  const studentGrades = grades.filter(grade => grade.student_id === studentId);

  // Add teacher names to grades
  const gradesWithTeachers = studentGrades.map(grade => {
    let teacherName = 'N/A';
    for (let i = 0; i < users.length; i++) {
      if (users[i].id === grade.teacher_id) {
        teacherName = users[i].username;
        break;
      }
    }
    return {
      ...grade,
      teacher_name: teacherName
    };
  });

  res.json(gradesWithTeachers);
});

// Staff grades routes
app.get('/api/grades/staff', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  // Add student names to grades
  const gradesWithInfo = grades.map(grade => {
    let studentName = 'N/A';
    for (let i = 0; i < students.length; i++) {
      if (students[i].student_id === grade.student_id) {
        studentName = students[i].name;
        break;
      }
    }
    return {
      ...grade,
      student_name: studentName
    };
  });

  res.json(gradesWithInfo);
});

app.post('/api/grades', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  const { studentId, subject, examType, grade, date } = req.body;

  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate inputs
  const sanitizedStudentId = String(studentId).trim();
  const sanitizedSubject = String(subject).trim();
  const sanitizedExamType = String(examType).trim();
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
  let studentExists = false;
  for (let i = 0; i < students.length; i++) {
    if (students[i].student_id === sanitizedStudentId) {
      studentExists = true;
      break;
    }
  }
  if (!studentExists) {
    return res.status(404).json({ message: 'Student not found' });
  }

  // Check if subject exists
  let subjectExists = false;
  for (let i = 0; i < subjects.length; i++) {
    if (subjects[i].name === sanitizedSubject) {
      subjectExists = true;
      break;
    }
  }
  if (!subjectExists) {
    return res.status(404).json({ message: 'Subject not found' });
  }

  const newGrade = {
    id: grades.length + 1,
    student_id: sanitizedStudentId,
    subject: sanitizedSubject,
    exam_type: sanitizedExamType,
    grade: validatedGrade,
    date: date,
    teacher_id: req.user.id
  };

  grades.push(newGrade);

  res.status(201).json({
    ...newGrade,
    message: 'Grade added successfully'
  });
});

// PUT route to update a grade
app.put('/api/grades/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  const { id } = req.params;
  const { studentId, subject, examType, grade, date } = req.body;

  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate inputs
  const sanitizedId = parseInt(id);
  const sanitizedStudentId = String(studentId).trim();
  const sanitizedSubject = String(subject).trim();
  const sanitizedExamType = String(examType).trim();
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

  let gradeIndex = -1;
  for (let i = 0; i < grades.length; i++) {
    if (grades[i].id == sanitizedId) {
      gradeIndex = i;
      break;
    }
  }
  
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
app.delete('/api/grades/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  const { id } = req.params;

  const sanitizedId = parseInt(id);
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid grade ID' });
  }

  let gradeIndex = -1;
  for (let i = 0; i < grades.length; i++) {
    if (grades[i].id == sanitizedId) {
      gradeIndex = i;
      break;
    }
  }
  
  if (gradeIndex === -1) {
    return res.status(404).json({ message: 'Grade not found' });
  }

  grades.splice(gradeIndex, 1);

  res.json({ message: 'Grade deleted successfully' });
});

// Students routes
app.get('/api/students', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  res.json(students);
});

app.post('/api/students', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  const { studentId, name, email, class: studentClass } = req.body;

  if (!studentId || !name || !email || !studentClass) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate inputs
  const sanitizedStudentId = String(studentId).trim();
  const sanitizedName = String(name).trim();
  const sanitizedEmail = String(email).trim();
  const sanitizedClass = String(studentClass).trim();
  
  // Additional validation
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
  let studentExists = false;
  for (let i = 0; i < students.length; i++) {
    if (students[i].student_id === sanitizedStudentId || students[i].email === sanitizedEmail) {
      studentExists = true;
      break;
    }
  }
  if (studentExists) {
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
app.get('/api/staff', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  const staffList = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].role === 'staff') {
      staffList.push({
        id: users[i].id,
        username: users[i].username,
        email: users[i].email
      });
    }
  }

  res.json(staffList);
});

// Staff statistics routes
app.get('/api/staff/statistics', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  let totalStaff = 0;
  for (let i = 0; i < users.length; i++) {
    if (users[i].role === 'staff') {
      totalStaff++;
    }
  }
  
  const stats = {
    totalStudents: students.length,
    totalStaff: totalStaff,
    totalClasses: [...new Set(students.map(s => s.class))].length,
    averageGrade: grades.length > 0
      ? parseFloat((grades.reduce((sum, g) => sum + g.grade, 0) / grades.length).toFixed(2))
      : 0
  };

  res.json(stats);
});

// Announcements routes
app.get('/api/staff/announcements', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  res.json(announcements);
});

app.post('/api/staff/announcements', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  const { title, content, date } = req.body;

  if (!title || !content || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate inputs
  const sanitizedTitle = String(title).trim();
  const sanitizedContent = String(content).trim();
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
app.put('/api/staff/announcements/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  const { id } = req.params;
  const { title, content, date } = req.body;

  if (!title || !content || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Validate inputs
  const sanitizedId = parseInt(id);
  const sanitizedTitle = String(title).trim();
  const sanitizedContent = String(content).trim();
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

  let announcementIndex = -1;
  for (let i = 0; i < announcements.length; i++) {
    if (announcements[i].id == sanitizedId) {
      announcementIndex = i;
      break;
    }
  }
  
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

app.delete('/api/staff/announcements/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  const { id } = req.params;

  const sanitizedId = parseInt(id);
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid announcement ID' });
  }

  let announcementIndex = -1;
  for (let i = 0; i < announcements.length; i++) {
    if (announcements[i].id == sanitizedId) {
      announcementIndex = i;
      break;
    }
  }
  
  if (announcementIndex === -1) {
    return res.status(404).json({ message: 'Announcement not found' });
  }

  announcements.splice(announcementIndex, 1);

  res.json({ message: 'Announcement deleted successfully' });
});

// Subject management routes
app.get('/api/subjects', authenticateToken, (req, res) => {
  res.json(subjects);
});

app.post('/api/subjects', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Subject name is required' });
  }

  // Validate input
  const sanitizedName = String(name).trim();
  
  // Additional validation
  if (sanitizedName.length < 2 || sanitizedName.length > 100) {
    return res.status(400).json({ message: 'Subject name must be between 2 and 100 characters' });
  }

  // Check if subject already exists
  let subjectExists = false;
  for (let i = 0; i < subjects.length; i++) {
    if (subjects[i].name.toLowerCase() === sanitizedName.toLowerCase()) {
      subjectExists = true;
      break;
    }
  }
  if (subjectExists) {
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

app.put('/api/subjects/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Subject name is required' });
  }

  // Validate inputs
  const sanitizedId = parseInt(id);
  const sanitizedName = String(name).trim();
  
  // Additional validation
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid subject ID' });
  }
  
  if (sanitizedName.length < 2 || sanitizedName.length > 100) {
    return res.status(400).json({ message: 'Subject name must be between 2 and 100 characters' });
  }

  // Check if another subject with the same name exists (excluding current subject)
  let existingSubject = false;
  for (let i = 0; i < subjects.length; i++) {
    if (subjects[i].name.toLowerCase() === sanitizedName.toLowerCase() && subjects[i].id != sanitizedId) {
      existingSubject = true;
      break;
    }
  }
  if (existingSubject) {
    return res.status(409).json({ message: 'Subject name already exists' });
  }

  let subjectIndex = -1;
  for (let i = 0; i < subjects.length; i++) {
    if (subjects[i].id == sanitizedId) {
      subjectIndex = i;
      break;
    }
  }
  
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

app.delete('/api/subjects/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required' });
  }
  
  const { id } = req.params;

  const sanitizedId = parseInt(id);
  if (isNaN(sanitizedId) || sanitizedId <= 0) {
    return res.status(400).json({ message: 'Invalid subject ID' });
  }

  let subjectIndex = -1;
  for (let i = 0; i < subjects.length; i++) {
    if (subjects[i].id == sanitizedId) {
      subjectIndex = i;
      break;
    }
  }
  
  if (subjectIndex === -1) {
    return res.status(404).json({ message: 'Subject not found' });
  }

  // Check if any grades are associated with this subject
  let associatedGrades = 0;
  for (let i = 0; i < grades.length; i++) {
    if (grades[i].subject === subjects[subjectIndex].name) {
      associatedGrades++;
    }
  }
  if (associatedGrades > 0) {
    return res.status(409).json({ message: 'Cannot delete subject: grades are associated with it' });
  }

  subjects.splice(subjectIndex, 1);

  res.json({ message: 'Subject deleted successfully' });
});

// Logout route
app.post('/api/users/logout', authenticateToken, (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token) {
    // Add token to blacklist
    tokenBlacklist.add(token);
  }

  res.json({ message: 'Logged out successfully' });
});

// Password change route
app.put('/api/users/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }

  // Validate new password strength
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters long' });
  }

  // Get current user
  let user = null;
  for (let i = 0; i < users.length; i++) {
    if (users[i].id === req.user.id) {
      user = users[i];
      break;
    }
  }
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Verify current password (direct comparison)
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

// Export for Vercel
module.exports = app;