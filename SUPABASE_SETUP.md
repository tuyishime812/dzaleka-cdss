# School Portal with Supabase

This is a school portal application that uses Supabase as the backend database and authentication system.

## Setup Instructions

### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Note down your Project URL and Anonymous Key (anon key)

### 2. Configure Database Schema
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the schema from `supabase_schema.sql` to create the necessary tables

### 3. Environment Variables
Create a `.env` file in the root directory with the following:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Run the Application
```bash
npm start
```

## Features

- Student dashboard to view grades
- Staff dashboard to manage student grades
- Admin dashboard to manage users and announcements
- Secure authentication with Supabase Auth
- Real-time data synchronization
- Responsive design for all devices

## API Endpoints

- `/api/users/login` - User login
- `/api/users/register` - User registration
- `/api/grades/student/:studentId` - Get student grades
- `/api/grades/staff` - Get all grades (for staff)
- `/api/grades` - Add new grade (POST)
- `/api/grades/:id` - Update/delete grade (PUT/DELETE)
- `/api/students` - Manage students
- `/api/subjects` - Manage subjects
- `/api/staff/announcements` - Manage announcements

## Database Tables

- `students` - Student information
- `teachers` - Teacher information
- `grades` - Student grades
- `announcements` - School announcements
- `subjects` - Available subjects
- `users` - User accounts (managed through Supabase Auth)

## Authentication

The application uses Supabase Auth for user authentication. Users can register and login using their email and password. Different roles (student, staff, admin) have different access levels to the system.

## Security

- All API endpoints require authentication
- Role-based access control
- Input validation and sanitization
- Rate limiting to prevent abuse