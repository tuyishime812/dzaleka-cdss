import express, { Request, Response } from 'express';
import { initializeDatabase } from '../models/Database';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get school statistics (only for staff and admin)
router.get('/statistics', authenticateToken, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const db = await initializeDatabase();
    
    // Get total number of students
    const totalStudents = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM students'
    );
    
    // Get total number of teachers
    const totalTeachers = await db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM teachers'
    );
    
    // Get total number of classes
    const totalClasses = await db.get<{ count: number }>(
      `SELECT COUNT(DISTINCT class) as count FROM students`
    );
    
    // Get average grade
    const avgGrade = await db.get<{ avg: number }>(
      'SELECT AVG(grade) as avg FROM grades'
    );
    
    res.json({
      totalStudents: totalStudents?.count || 0,
      totalTeachers: totalTeachers?.count || 0,
      totalClasses: totalClasses?.count || 0,
      averageGrade: avgGrade?.avg ? Math.round(avgGrade.avg * 100) / 100 : 0
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all announcements
router.get('/announcements', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = await initializeDatabase();
    
    // Anyone can view announcements
    const announcements = await db.all(
      `SELECT a.*, u.username as author_name
       FROM announcements a
       JOIN users u ON a.author_id = u.id
       ORDER BY a.date DESC, a.created_at DESC`
    );
    
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new announcement (only for staff and admin)
router.post('/announcements', authenticateToken, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const { title, content, date } = req.body;
    
    if (!title || !content || !date) {
      return res.status(400).json({ message: 'Title, content, and date are required' });
    }
    
    const db = await initializeDatabase();
    
    // Insert the new announcement
    const result = await db.run(
      `INSERT INTO announcements (title, content, date, author_id) 
       VALUES (?, ?, ?, ?)`,
      [title, content, date, req.user?.id]
    );
    
    // Return the newly created announcement
    const newAnnouncement = await db.get(
      `SELECT a.*, u.username as author_name
       FROM announcements a
       JOIN users u ON a.author_id = u.id
       WHERE a.id = ?`,
      [result.lastID]
    );
    
    res.status(201).json(newAnnouncement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update an announcement (only for staff and admin)
router.put('/announcements/:announcementId', authenticateToken, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const { announcementId } = req.params;
    const { title, content, date } = req.body;
    
    const db = await initializeDatabase();
    
    // Check if announcement exists and belongs to the user
    const existingAnnouncement = await db.get(
      'SELECT * FROM announcements WHERE id = ?',
      [announcementId]
    );
    
    if (!existingAnnouncement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    // Update the announcement
    await db.run(
      `UPDATE announcements 
       SET title = COALESCE(?, title),
           content = COALESCE(?, content),
           date = COALESCE(?, date)
       WHERE id = ?`,
      [title, content, date, announcementId]
    );
    
    // Return the updated announcement
    const updatedAnnouncement = await db.get(
      `SELECT a.*, u.username as author_name
       FROM announcements a
       JOIN users u ON a.author_id = u.id
       WHERE a.id = ?`,
      [announcementId]
    );
    
    res.json(updatedAnnouncement);
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete an announcement (only for staff and admin)
router.delete('/announcements/:announcementId', authenticateToken, requireRole(['staff', 'admin']), async (req: Request, res: Response) => {
  try {
    const { announcementId } = req.params;
    const db = await initializeDatabase();
    
    // Check if announcement exists
    const announcement = await db.get('SELECT * FROM announcements WHERE id = ?', [announcementId]);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    
    // Delete the announcement
    await db.run('DELETE FROM announcements WHERE id = ?', [announcementId]);
    
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as staffRoutes };