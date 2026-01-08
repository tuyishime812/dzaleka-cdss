import express, { Request, Response } from 'express';
import { initializeDatabase } from '../models/Database';
import { Student, StudentInput } from '../models/Student';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get all students (only for staff and teachers)
router.get('/', authenticateToken, requireRole(['staff', 'teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const db = await initializeDatabase();
    
    const students = await db.all<Student>(
      'SELECT * FROM students ORDER BY name'
    );
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific student by ID
router.get('/:studentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const db = await initializeDatabase();
    
    let student: Student | undefined;
    
    // Check permissions
    if (req.user?.role === 'student') {
      // Students can only view their own record
      const userStudent = await db.get<Student>(
        'SELECT * FROM students WHERE student_id = ? AND id = ?',
        [studentId, req.user.id]
      );
      
      if (!userStudent) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      student = userStudent;
    } else {
      // Teachers, staff, and admin can view any student record
      student = await db.get<Student>(
        'SELECT * FROM students WHERE student_id = ?',
        [studentId]
      );
    }
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add a new student (only for staff and admin)
router.post('/', authenticateToken, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const studentData: StudentInput = req.body;
    const { studentId, name, email, class: className, dateOfBirth, parentId } = studentData;
    
    // Validate required fields
    if (!studentId || !name || !email || !className) {
      return res.status(400).json({ message: 'Student ID, name, email, and class are required' });
    }
    
    const db = await initializeDatabase();
    
    // Check if student ID or email already exists
    const existingStudent = await db.get(
      'SELECT * FROM students WHERE student_id = ? OR email = ?',
      [studentId, email]
    );
    
    if (existingStudent) {
      return res.status(409).json({ message: 'Student ID or email already exists' });
    }
    
    // Check if parent exists (if provided)
    if (parentId) {
      const parent = await db.get('SELECT id FROM users WHERE id = ?', [parentId]);
      if (!parent) {
        return res.status(404).json({ message: 'Parent not found' });
      }
    }
    
    // Insert the new student
    const result = await db.run(
      `INSERT INTO students (student_id, name, email, class, date_of_birth, parent_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [studentId, name, email, className, dateOfBirth || null, parentId || null]
    );
    
    // Return the newly created student
    const newStudent = await db.get<Student>(
      'SELECT * FROM students WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(newStudent);
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a student (only for staff and admin)
router.put('/:studentId', authenticateToken, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const studentData: Partial<StudentInput> = req.body;
    
    const db = await initializeDatabase();
    
    // Check if student exists
    const existingStudent = await db.get('SELECT * FROM students WHERE student_id = ?', [studentId]);
    if (!existingStudent) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Update the student
    await db.run(
      `UPDATE students 
       SET name = COALESCE(?, name),
           email = COALESCE(?, email),
           class = COALESCE(?, class),
           date_of_birth = COALESCE(?, date_of_birth),
           parent_id = COALESCE(?, parent_id)
       WHERE student_id = ?`,
      [
        studentData.name,
        studentData.email,
        studentData.class,
        studentData.dateOfBirth,
        studentData.parentId,
        studentId
      ]
    );
    
    // Return the updated student
    const updatedStudent = await db.get<Student>(
      'SELECT * FROM students WHERE student_id = ?',
      [studentId]
    );
    
    res.json(updatedStudent);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a student (only for staff and admin)
router.delete('/:studentId', authenticateToken, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const db = await initializeDatabase();
    
    // Check if student exists
    const student = await db.get('SELECT * FROM students WHERE student_id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Delete associated grades first (due to foreign key constraint)
    await db.run('DELETE FROM grades WHERE student_id = (SELECT id FROM students WHERE student_id = ?)', [studentId]);
    
    // Delete the student
    await db.run('DELETE FROM students WHERE student_id = ?', [studentId]);
    
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as studentRoutes };