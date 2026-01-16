-- Create tables for the school portal

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    class VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create teachers table
CREATE TABLE IF NOT EXISTS teachers (
    id SERIAL PRIMARY KEY,
    teacher_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create grades table
CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    exam_type VARCHAR(50) NOT NULL, -- 'exam', 'quiz', 'assignment', 'project'
    grade DECIMAL(5,2) NOT NULL,
    date DATE NOT NULL,
    teacher_id UUID, -- Supabase user ID
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    date DATE NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create users table (for admin/staff management)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'student', 'staff', 'admin'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default subjects
INSERT INTO subjects (name) VALUES 
('Mathematics'),
('English'),
('Science'),
('Social Studies'),
('Kiswahili'),
('French'),
('Computer Science'),
('Physics'),
('Chemistry'),
('Biology')
ON CONFLICT (name) DO NOTHING;

-- Insert default admin user
INSERT INTO users (username, email, role) VALUES 
('admin', 'admin@school.edu', 'admin')
ON CONFLICT (email) DO NOTHING;