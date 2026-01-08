const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

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

// Placeholder API routes
app.post('/api/users/login', (req, res) => {
  // In a real implementation, this would validate credentials and return a JWT
  res.json({ 
    message: 'Login successful', 
    token: 'fake-jwt-token-for-demo',
    user: { id: 1, username: 'demo_user', role: 'teacher' }
  });
});

app.get('/api/grades/student/:studentId', (req, res) => {
  // In a real implementation, this would fetch grades from the database
  res.json([
    { id: 1, subject: 'Mathematics', exam_type: 'exam', grade: 85, date: '2023-12-15', teacher_name: 'Mr. Smith' },
    { id: 2, subject: 'Science', exam_type: 'quiz', grade: 92, date: '2023-12-10', teacher_name: 'Ms. Johnson' },
    { id: 3, subject: 'English', exam_type: 'assignment', grade: 78, date: '2023-12-05', teacher_name: 'Mrs. Williams' }
  ]);
});

app.post('/api/grades', (req, res) => {
  // In a real implementation, this would save the grade to the database
  res.status(201).json({ id: 100, ...req.body, message: 'Grade added successfully' });
});

app.get('/api/students', (req, res) => {
  // In a real implementation, this would fetch students from the database
  res.json([
    { id: 1, student_id: 'STU001', name: 'John Doe', email: 'john@example.com', class: 'Grade 10A' },
    { id: 2, student_id: 'STU002', name: 'Jane Smith', email: 'jane@example.com', class: 'Grade 10B' },
    { id: 3, student_id: 'STU003', name: 'Bob Johnson', email: 'bob@example.com', class: 'Grade 10A' }
  ]);
});

app.get('/api/staff/statistics', (req, res) => {
  // In a real implementation, this would fetch statistics from the database
  res.json({
    totalStudents: 150,
    totalTeachers: 12,
    totalClasses: 10,
    averageGrade: 82.5
  });
});

app.get('/api/staff/announcements', (req, res) => {
  // In a real implementation, this would fetch announcements from the database
  res.json([
    { id: 1, title: 'School Event', content: 'Annual sports day is scheduled for next month', date: '2023-12-01', author_name: 'Admin' },
    { id: 2, title: 'Holiday Notice', content: 'Winter break starts from Dec 20th', date: '2023-12-10', author_name: 'Principal' }
  ]);
});

app.post('/api/staff/announcements', (req, res) => {
  // In a real implementation, this would save the announcement to the database
  res.status(201).json({ id: 10, ...req.body, message: 'Announcement posted successfully' });
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