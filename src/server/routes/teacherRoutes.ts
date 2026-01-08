import express, { Request, Response } from 'express';
import { initializeDatabase } from '../models/Database';
import { Teacher, TeacherInput } from '../models/Teacher';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get all teachers (only for staff and admin)
router.get('/', authenticateToken, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const db = await initializeDatabase();
    
    const teachers = await db.all<Teacher>(
      'SELECT * FROM teachers ORDER BY name'
    );
    
    res.json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific teacher by ID
router.get('/:teacherId', authenticateToken, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const db = await initializeDatabase();
    
    const teacher = await db.get<Teacher>(
      'SELECT * FROM teachers WHERE teacher_id = ?',
      [teacherId]
    );
    
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    res.json(teacher);
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add a new teacher (only for staff and admin)
router.post('/', authenticateToken, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const teacherData: TeacherInput = req.body;
    const { teacherId, name, email, subject, classAssigned } = teacherData;
    
    // Validate required fields
    if (!teacherId || !name || !email || !subject) {
      return res.status(400).json({ message: 'Teacher ID, name, email, and subject are required' });
    }
    
    const db = await initializeDatabase();
    
    // Check if teacher ID or email already exists
    const existingTeacher = await db.get(
      'SELECT * FROM teachers WHERE teacher_id = ? OR email = ?',
      [teacherId, email]
    );
    
    if (existingTeacher) {
      return res.status(409).json({ message: 'Teacher ID or email already exists' });
    }
    
    // Insert the new teacher
    const result = await db.run(
      `INSERT INTO teachers (teacher_id, name, email, subject, class_assigned) 
       VALUES (?, ?, ?, ?, ?)`,
      [teacherId, name, email, subject, classAssigned || null]
    );
    
    // Return the newly created teacher
    const newTeacher = await db.get<Teacher>(
      'SELECT * FROM teachers WHERE id = ?',
      [result.lastID]
    );
    
    res.status(201).json(newTeacher);
  } catch (error) {
    console.error('Error adding teacher:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a teacher (only for staff and admin)
router.put('/:teacherId', authenticateToken, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const teacherData: Partial<TeacherInput> = req.body;
    
    const db = await initializeDatabase();
    
    // Check if teacher exists
    const existingTeacher = await db.get('SELECT * FROM teachers WHERE teacher_id = ?', [teacherId]);
    if (!existingTeacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Update the teacher
    await db.run(
      `UPDATE teachers 
       SET name = COALESCE(?, name),
           email = COALESCE(?, email),
           subject = COALESCE(?, subject),
           class_assigned = COALESCE(?, class_assigned)
       WHERE teacher_id = ?`,
      [
        teacherData.name,
        teacherData.email,
        teacherData.subject,
        teacherData.classAssigned,
        teacherId
      ]
    );
    
    // Return the updated teacher
    const updatedTeacher = await db.get<Teacher>(
      'SELECT * FROM teachers WHERE teacher_id = ?',
      [teacherId]
    );
    
    res.json(updatedTeacher);
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a teacher (only for staff and admin)
router.delete('/:teacherId', authenticateToken, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    const db = await initializeDatabase();
    
    // Check if teacher exists
    const teacher = await db.get('SELECT * FROM teachers WHERE teacher_id = ?', [teacherId]);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Delete associated grades first (due to foreign key constraint)
    await db.run('DELETE FROM grades WHERE teacher_id = (SELECT id FROM teachers WHERE teacher_id = ?)', [teacherId]);
    
    // Delete the teacher
    await db.run('DELETE FROM teachers WHERE teacher_id = ?', [teacherId]);
    
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as teacherRoutes };