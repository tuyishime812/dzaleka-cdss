// Simple test server to verify login functionality
require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test users
const users = [
  { id: 1, username: 'emmanuel', email: 'emmanuel@staff.edu', password: 'staff123', role: 'staff' },
  { id: 2, username: 'tuyishime', email: 'tuyishime@staff.edu', password: 'staff123', role: 'staff' },
  { id: 3, username: 'martin', email: 'martin@student.edu', password: 'student123', role: 'student' },
  { id: 4, username: 'shift', email: 'shift@student.edu', password: 'student123', role: 'student' },
  { id: 5, username: 'emmanuel_student', email: 'emmanuel_student@student.edu', password: 'student123', role: 'student' },
  { id: 6, username: 'tuyishime_student', email: 'tuyishime_student@student.edu', password: 'student123', role: 'student' }
];

// Login route
app.post('/api/users/login', (req, res) => {
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

  // Create JWT token
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
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Simple test server is running!', status: 'ok' });
});

// Use a fixed port to avoid conflicts
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Simple test server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /api/users/login - Login with username and password');
  console.log('');
  console.log('Test credentials:');
  console.log('  Staff: emmanuel / staff123');
  console.log('  Student: martin / student123');
});