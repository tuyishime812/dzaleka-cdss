import express, { Request, Response } from 'express';
import { initializeDatabase } from '../models/Database';
import { Grade, GradeInput } from '../models/Grade';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get grades for a specific student
router.get('/student/:studentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const db = await initializeDatabase();

    // Check if the requesting user has permission to view these grades
    // Teachers can view grades for students in their class
    // Students can only view their own grades
    // Staff can view all grades
    
    let grades: Grade[];
    
    if (req.user?.role === 'student') {
      // Students can only view their own grades
      // We need to match the studentId with the student's record
      const studentRecord = await db.get(
        'SELECT id FROM students WHERE student_id = ?',
        [studentId]
      );
      
      if (!studentRecord || studentRecord.id !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      grades = await db.all<Grade>(
        `SELECT g.*, s.name as student_name, t.name as teacher_name 
         FROM grades g
         JOIN students s ON g.student_id = s.id
         JOIN teachers t ON g.teacher_id = t.id
         WHERE s.student_id = ?
         ORDER BY g.date DESC`,
        [studentId]
      );
    } else if (req.user?.role === 'teacher') {
      // Teachers can view grades for students they taught
      grades = await db.all<Grade>(
        `SELECT g.*, s.name as student_name, t.name as teacher_name 
         FROM grades g
         JOIN students s ON g.student_id = s.id
         JOIN teachers t ON g.teacher_id = t.id
         WHERE s.id IN (
           SELECT DISTINCT g2.student_id 
           FROM grades g2 
           WHERE g2.teacher_id = (
             SELECT id FROM teachers WHERE teacher_id = ?
           )
         ) AND s.student_id = ?
         ORDER BY g.date DESC`,
        [req.user.username, studentId] // Using username as teacher_id temporarily
      );
    } else if (req.user?.role === 'staff' || req.user?.role === 'admin') {
      // Staff and admin can view all grades for the student
      grades = await db.all<Grade>(
        `SELECT g.*, s.name as student_name, t.name as teacher_name 
         FROM grades g
         JOIN students s ON g.student_id = s.id
         JOIN teachers t ON g.teacher_id = t.id
         WHERE s.student_id = ?
         ORDER BY g.date DESC`,
        [studentId]
      );
    } else {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(grades);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add a new grade (only for teachers)
router.post('/', authenticateToken, requireRole(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const gradeData: GradeInput = req.body;
    const { studentId, subject, examType, grade, date, teacherId } = gradeData;

    // Validate input
    if (!studentId || !subject || !examType || grade === undefined || !date || !teacherId) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate grade range
    if (grade < 0 || grade > 100) {
      return res.status(400).json({ message: 'Grade must be between 0 and 100' });
    }

    const db = await initializeDatabase();

    // Verify student exists
    const student = await db.get('SELECT id FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Verify teacher exists
    const teacher = await db.get('SELECT id FROM teachers WHERE id = ?', [teacherId]);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Insert the new grade
    const result = await db.run(
      `INSERT INTO grades (student_id, subject, exam_type, grade, date, teacher_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [studentId, subject, examType, grade, date, teacherId]
    );

    // Return the newly created grade
    const newGrade = await db.get<Grade>(
      `SELECT g.*, s.name as student_name, t.name as teacher_name 
       FROM grades g
       JOIN students s ON g.student_id = s.id
       JOIN teachers t ON g.teacher_id = t.id
       WHERE g.id = ?`,
      [result.lastID]
    );

    res.status(201).json(newGrade);
  } catch (error) {
    console.error('Error adding grade:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a grade (only for teachers)
router.put('/:gradeId', authenticateToken, requireRole(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { gradeId } = req.params;
    const gradeData: Partial<GradeInput> = req.body;

    const db = await initializeDatabase();

    // Check if grade exists
    const existingGrade = await db.get('SELECT * FROM grades WHERE id = ?', [gradeId]);
    if (!existingGrade) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    // Update the grade
    await db.run(
      `UPDATE grades 
       SET subject = COALESCE(?, subject),
           exam_type = COALESCE(?, exam_type),
           grade = COALESCE(?, grade),
           date = COALESCE(?, date)
       WHERE id = ?`,
      [
        gradeData.subject,
        gradeData.examType,
        gradeData.grade,
        gradeData.date,
        gradeId
      ]
    );

    // Return the updated grade
    const updatedGrade = await db.get<Grade>(
      `SELECT g.*, s.name as student_name, t.name as teacher_name 
       FROM grades g
       JOIN students s ON g.student_id = s.id
       JOIN teachers t ON g.teacher_id = t.id
       WHERE g.id = ?`,
      [gradeId]
    );

    res.json(updatedGrade);
  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a grade (only for teachers/admins)
router.delete('/:gradeId', authenticateToken, requireRole(['teacher', 'admin']), async (req: Request, res: Response) => {
  try {
    const { gradeId } = req.params;
    const db = await initializeDatabase();

    // Check if grade exists
    const grade = await db.get('SELECT * FROM grades WHERE id = ?', [gradeId]);
    if (!grade) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    // Delete the grade
    await db.run('DELETE FROM grades WHERE id = ?', [gradeId]);

    res.json({ message: 'Grade deleted successfully' });
  } catch (error) {
    console.error('Error deleting grade:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as gradeRoutes };