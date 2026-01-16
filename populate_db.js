const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) {
                reject(err);
            } else {
                resolve(hash);
            }
        });
    });
}

function insertUser(username, email, passwordHash, role, callback) {
    const insertQuery = `
        INSERT OR IGNORE INTO users (username, email, password_hash, role)
        VALUES (?, ?, ?, ?)
    `;

    db.run(insertQuery, [username, email, passwordHash, role], function(err) {
        if (err) {
            console.error(`Error inserting ${role}:`, err);
        } else {
            console.log(`Added ${role}: ${username}`);
        }
        callback();
    });
}
function insertStudentToTable(studentId, name, email, className, callback) {
    const insertQuery = `
        INSERT OR IGNORE INTO students (student_id, name, email, class)
        VALUES (?, ?, ?, ?)
    `;

    db.run(insertQuery, [studentId, name, email, className], function(err) {
        if (err) {
            console.error('Error inserting student to students table:', err);
        } else {
            console.log(`Added student to students table: ${studentId}`);
        }
        callback();
    });
}

function insertTeacherToTable(teacherId, name, email, subject, callback) {
    const insertQuery = `
        INSERT OR IGNORE INTO teachers (teacher_id, name, email, subject)
        VALUES (?, ?, ?, ?)
    `;

    db.run(insertQuery, [teacherId, name, email, subject], function(err) {
        if (err) {
            console.error('Error inserting teacher to teachers table:', err);
        } else {
            console.log(`Added teacher to teachers table: ${teacherId}`);
        }
        callback();
    });
}

async function populateDatabase() {
    console.log('Starting database population...');

    const studentPasswordHash = await hashPassword('123456');
    const adminPasswordHash = await hashPassword('78910');

    console.log('Adding 20 students...');
    for (let i = 1; i <= 20; i++) {
        const username = `student${i}`;
        const email = `student${i}@school.edu`;

        await new Promise(resolve => insertUser(username, email, studentPasswordHash, 'student', resolve));

        await new Promise(resolve => insertStudentToTable(`STU${i.toString().padStart(3, '0')}`, `Student ${i}`, email, `Class ${Math.floor(i/5) + 1}`, resolve));
    }

    console.log('Adding 30 admin users...');
    for (let i = 1; i <= 30; i++) {
        const username = `admin${i}`;
        const email = `admin${i}@school.edu`;

        await new Promise(resolve => insertUser(username, email, adminPasswordHash, 'admin', resolve));
    }

    console.log('Adding 30 teacher users...');
    for (let i = 1; i <= 30; i++) {
        const username = `teacher${i}`;
        const email = `teacher${i}@school.edu`;

        await new Promise(resolve => insertUser(username, email, adminPasswordHash, 'teacher', resolve));

        const subjects = ['Mathematics', 'Science', 'English', 'History', 'Geography', 'Physics', 'Chemistry', 'Biology', 'Literature', 'Art'];
        const subject = subjects[i % subjects.length];

        await new Promise(resolve => insertTeacherToTable(`TEACH${i.toString().padStart(3, '0')}`, `Teacher ${i}`, email, subject, resolve));
    }

    console.log('Database population completed!');

    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
    });
}

populateDatabase().catch(console.error);