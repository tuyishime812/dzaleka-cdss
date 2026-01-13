# Dzaleka School Portal

A comprehensive school management system with student grade tracking, staff management, and administrative features.

## Features

- **Student Dashboard**: View grades, exam results, and academic progress
- **Staff Dashboard**: Upload grades, manage students, and track performance
- **Admin Dashboard**: User management, system analytics, and reporting
- **Grade Analytics**: Charts, trends, and performance insights
- **Security**: JWT authentication, rate limiting, input validation

## Tech Stack

- Node.js / Express.js
- PostgreSQL (for production)
- SQLite (for development) 
- Bootstrap 5
- Chart.js for analytics
- JWT for authentication

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dzaleka-school-portal.git
cd dzaleka-school-portal
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` and set your JWT_SECRET and database credentials.

4. Start the application:
```bash
npm start
```

## Deployment

### Deploy to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set the build command: `npm install`
4. Set the start command: `npm start`
5. Add environment variables:
   - `JWT_SECRET`: A strong secret key
   - `DATABASE_URL`: PostgreSQL connection string (Render provides this automatically when you add a PostgreSQL database)

### Environment Variables

- `JWT_SECRET`: Secret key for JWT tokens (required)
- `DATABASE_URL`: PostgreSQL connection string (for production)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Separate DB config (alternative to DATABASE_URL)

## Default Accounts

After first run, the following accounts are created:

- **Admin**: Username: `admin`, Password: `admin123`
- **Staff**: Username: `emmanuel`, Password: `staff123`
- **Student**: Username: `martin`, Password: `student123`

## API Endpoints

- `GET /api/grades/student/:studentId` - Get student grades
- `GET /api/grades/staff` - Get all grades (staff only)
- `POST /api/grades` - Add a grade (staff only)
- `GET /api/students` - Get all students
- `POST /api/students` - Add a student (staff only)
- `GET /api/admin/users` - Get all users (admin only)
- `POST /api/admin/users` - Create user (admin only)

## Security Features

- Rate limiting to prevent brute force attacks
- Input validation and sanitization
- JWT-based authentication
- Role-based access control
- SQL injection prevention
- Password strength enforcement

## License

MIT