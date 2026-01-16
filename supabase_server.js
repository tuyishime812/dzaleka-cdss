const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Main routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

app.get('/student', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/student.html'));
});

app.get('/staff', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/staff.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.get('/logout', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/logout.html'));
});

// Authentication middleware using Supabase
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    req.user = data.user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Authorization middleware
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user has the required role stored in user metadata or a separate table
    // For now, we'll assume role is stored in user's metadata
    const userRole = req.user.user_metadata?.role || req.user.app_metadata?.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    req.user.role = userRole;
    next();
  };
};

// Authentication routes
app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = data.user;
    
    // Get user role from metadata
    const userRole = user.user_metadata?.role || user.app_metadata?.role || 'student';

    res.json({
      message: 'Login successful',
      token: data.session.access_token,
      user: {
        id: user.id,
        email: user.email,
        role: userRole
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
});

// Registration route
app.post('/api/users/register', async (req, res) => {
  const { email, password, username, role = 'student' } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ message: 'Email, password, and username are required' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
          role: role
        }
      }
    });

    if (error) {
      console.error('Registration error:', error);
      return res.status(400).json({ message: error.message });
    }

    res.json({
      message: 'Registration successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        username: data.user.user_metadata?.username
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration error' });
  }
});

// Student grades routes
app.get('/api/grades/student/:studentId', authenticateToken, async (req, res) => {
  const { studentId } = req.params;

  // Check if the requesting user is a student and only allow them to access their own grades
  if (req.user.role === 'student' && req.user.email !== studentId) {
    return res.status(403).json({ message: 'Students can only access their own grades' });
  }

  try {
    let query = supabase
      .from('grades')
      .select(`
        id,
        subject,
        exam_type,
        grade,
        date,
        student_id,
        teachers (name as teacher_name)
      `)
      .eq('student_id', studentId);

    const { data, error } = await query;

    if (error) {
      console.error('Database error fetching grades:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ message: 'Error fetching grades' });
  }
});

// Staff grades routes - staff can view all grades
app.get('/api/grades/staff', authenticateToken, authorizeRole(['staff', 'admin']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('grades')
      .select(`
        id,
        student_id,
        students (name as student_name),
        subject,
        exam_type,
        grade,
        date,
        teachers (name as teacher_name)
      `)
      .order('date', { ascending: false });

    if (error) {
      console.error('Database error fetching grades:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ message: 'Error fetching grades' });
  }
});

app.post('/api/grades', authenticateToken, authorizeRole(['staff', 'admin']), async (req, res) => {
  const { studentId, subject, examType, grade, date } = req.body;

  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('grades')
      .insert([{
        student_id: studentId,
        subject: subject,
        exam_type: examType,
        grade: grade,
        date: date,
        teacher_id: req.user.id // Using Supabase user ID
      }])
      .select();

    if (error) {
      console.error('Database error inserting grade:', error);
      return res.status(500).json({ message: error.message });
    }

    res.status(201).json({
      ...data[0],
      message: 'Grade added successfully'
    });
  } catch (error) {
    console.error('Error adding grade:', error);
    res.status(500).json({ message: 'Error adding grade' });
  }
});

// PUT route to update a grade
app.put('/api/grades/:id', authenticateToken, authorizeRole(['staff', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { studentId, subject, examType, grade, date } = req.body;

  if (!studentId || !subject || !examType || grade === undefined || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('grades')
      .update({
        student_id: studentId,
        subject: subject,
        exam_type: examType,
        grade: grade,
        date: date
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Database error updating grade:', error);
      return res.status(500).json({ message: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ message: 'Grade not found' });
    }

    res.json({
      ...data[0],
      message: 'Grade updated successfully'
    });
  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ message: 'Error updating grade' });
  }
});

// DELETE route to delete a grade
app.delete('/api/grades/:id', authenticateToken, authorizeRole(['staff', 'admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('grades')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database error deleting grade:', error);
      return res.status(500).json({ message: error.message });
    }

    res.json({ message: 'Grade deleted successfully' });
  } catch (error) {
    console.error('Error deleting grade:', error);
    res.status(500).json({ message: 'Error deleting grade' });
  }
});

// Subjects routes
app.get('/api/subjects', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name');

    if (error) {
      console.error('Database error fetching subjects:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ message: 'Error fetching subjects' });
  }
});

app.post('/api/subjects', authenticateToken, authorizeRole(['staff', 'admin']), async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Subject name is required' });
  }

  try {
    const { data, error } = await supabase
      .from('subjects')
      .insert([{ name: name }])
      .select();

    if (error) {
      console.error('Database error inserting subject:', error);
      return res.status(500).json({ message: error.message });
    }

    res.status(201).json({
      ...data[0],
      message: 'Subject added successfully'
    });
  } catch (error) {
    console.error('Error adding subject:', error);
    res.status(500).json({ message: 'Error adding subject' });
  }
});

// Students routes
app.get('/api/students', authenticateToken, authorizeRole(['staff', 'admin']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('name');

    if (error) {
      console.error('Database error fetching students:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: 'Error fetching students' });
  }
});

app.post('/api/students', authenticateToken, authorizeRole(['staff', 'admin']), async (req, res) => {
  const { studentId, name, email, class: studentClass } = req.body;

  if (!studentId || !name || !email || !studentClass) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('students')
      .insert([{
        student_id: studentId,
        name: name,
        email: email,
        class: studentClass
      }])
      .select();

    if (error) {
      console.error('Database error inserting student:', error);
      return res.status(500).json({ message: error.message });
    }

    res.status(201).json({
      ...data[0],
      message: 'Student added successfully'
    });
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ message: 'Error adding student' });
  }
});

// Staff statistics routes
app.get('/api/staff/statistics', authenticateToken, authorizeRole(['staff', 'admin']), async (req, res) => {
  try {
    // Get counts from database
    const [{ data: totalStudents, error: studentsError }, { data: totalTeachers, error: teachersError }] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('teachers').select('*', { count: 'exact', head: true })
    ]);

    if (studentsError) {
      console.error('Database error fetching student count:', studentsError);
      return res.status(500).json({ message: 'Database error' });
    }

    if (teachersError) {
      console.error('Database error fetching teacher count:', teachersError);
      return res.status(500).json({ message: 'Database error' });
    }

    // Get distinct classes
    const { data: classesData, error: classesError } = await supabase
      .from('students')
      .select('class', { count: 'exact', head: true })
      .not('class', 'is', null);

    if (classesError) {
      console.error('Database error fetching class count:', classesError);
      return res.status(500).json({ message: 'Database error' });
    }

    // Get average grade
    const { data: avgGradeData, error: avgGradeError } = await supabase
      .from('grades')
      .select('grade', { count: 'exact', head: true })
      .gt('grade', 0);

    let averageGrade = 0;
    if (!avgGradeError && avgGradeData) {
      const { count } = avgGradeData;
      if (count > 0) {
        const { data: gradesSum, error: sumError } = await supabase
          .from('grades')
          .select('grade')
          .gt('grade', 0);

        if (!sumError && gradesSum) {
          const total = gradesSum.reduce((sum, grade) => sum + grade.grade, 0);
          averageGrade = parseFloat((total / count).toFixed(2));
        }
      }
    }

    const stats = {
      totalStudents: totalStudents?.count || 0,
      totalTeachers: totalTeachers?.count || 0,
      totalClasses: classesData?.count || 0,
      averageGrade: averageGrade
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
});

// Announcements routes
app.get('/api/staff/announcements', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Database error fetching announcements:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'Error fetching announcements' });
  }
});

app.post('/api/staff/announcements', authenticateToken, authorizeRole(['staff', 'admin']), async (req, res) => {
  const { title, content, date } = req.body;

  if (!title || !content || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert([{
        title: title,
        content: content,
        date: date,
        author_name: req.user.email // Using user's email as author name
      }])
      .select();

    if (error) {
      console.error('Database error inserting announcement:', error);
      return res.status(500).json({ message: error.message });
    }

    res.status(201).json({
      ...data[0],
      message: 'Announcement posted successfully'
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'Error creating announcement' });
  }
});

// PUT and DELETE routes for announcements
app.put('/api/staff/announcements/:id', authenticateToken, authorizeRole(['staff', 'admin']), async (req, res) => {
  const { id } = req.params;
  const { title, content, date } = req.body;

  if (!title || !content || !date) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('announcements')
      .update({
        title: title,
        content: content,
        date: date
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Database error updating announcement:', error);
      return res.status(500).json({ message: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({ message: 'Announcement updated successfully' });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ message: 'Error updating announcement' });
  }
});

app.delete('/api/staff/announcements/:id', authenticateToken, authorizeRole(['staff', 'admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database error deleting announcement:', error);
      return res.status(500).json({ message: error.message });
    }

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: 'Error deleting announcement' });
  }
});

// Admin user management routes
app.get('/api/admin/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching users:', error);
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

app.post('/api/admin/users', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { username, email, role, password } = req.body;

  if (!username || !email || !role || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: username,
        role: role
      }
    });

    if (authError) {
      console.error('Auth error creating user:', authError);
      return res.status(400).json({ message: authError.message });
    }

    const user = authData.user;

    // Insert user into our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        id: user.id,
        username: username,
        email: email,
        role: role
      }])
      .select();

    if (userError) {
      console.error('Database error inserting user:', userError);
      // Clean up the auth user if DB insertion fails
      await supabase.auth.admin.deleteUser(user.id);
      return res.status(500).json({ message: userError.message });
    }

    res.status(201).json({
      ...userData[0],
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.put('/api/admin/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { username, email, role } = req.body;

  if (!username || !email || !role) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Update user metadata in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(id, {
      email: email,
      user_metadata: {
        username: username,
        role: role
      }
    });

    if (authError) {
      console.error('Auth error updating user:', authError);
      return res.status(400).json({ message: authError.message });
    }

    // Update user in our users table
    const { data, error } = await supabase
      .from('users')
      .update({
        username: username,
        email: email,
        role: role
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Database error updating user:', error);
      return res.status(500).json({ message: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;

  try {
    // Delete user from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) {
      console.error('Auth error deleting user:', authError);
      return res.status(400).json({ message: authError.message });
    }

    // Delete user from our users table
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Database error deleting user:', error);
      return res.status(500).json({ message: error.message });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
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
  console.log('Using Supabase as database backend');
});

module.exports = app;