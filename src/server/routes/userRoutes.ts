import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { initializeDatabase } from '../models/Database';
import { User, LoginCredentials } from '../models/User';
import { generateToken } from '../middleware/auth';

const router = express.Router();

// Login route
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password, userType }: LoginCredentials = req.body;

    if (!username || !password || !userType) {
      return res.status(400).json({ message: 'Username, password, and user type are required' });
    }

    const db = await initializeDatabase();
    
    // Query the database for the user
    const user = await db.get<User>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if the user's role matches the requested user type
    if (user.role !== userType) {
      return res.status(401).json({ message: 'Invalid user type for this account' });
    }

    // Compare the provided password with the hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Register route
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'Username, email, password, and role are required' });
    }

    // Validate role
    const validRoles = ['student', 'teacher', 'staff', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const db = await initializeDatabase();

    // Check if username or email already exists
    const existingUser = await db.get<User>(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert the new user
    const result = await db.run(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role]
    );

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.lastID
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as userRoutes };