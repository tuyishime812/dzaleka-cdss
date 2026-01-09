const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Database initialization
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Simple function to add one student
function addOneStudent() {
    console.log('Adding one student to test...');
    
    // Hash the password
    bcrypt.hash('123456', 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return;
        }
        
        console.log('Password hashed successfully');
        
        // Insert student
        const stmt = db.prepare("INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)");
        stmt.run(["student1", "student1@school.edu", hash, "student"], function(err) {
            if (err) {
                console.error('Error inserting student:', err);
            } else {
                console.log('Student inserted successfully, ID:', this.lastID);
            }
            
            // Close database
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database closed');
                }
            });
        });
        stmt.finalize();
    });
}

addOneStudent();