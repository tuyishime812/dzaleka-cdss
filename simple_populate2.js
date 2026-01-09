const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Database initialization
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Hash password and add a few users
bcrypt.hash('123456', 10, (err, studentHash) => {
    if (err) throw err;
    
    bcrypt.hash('78910', 10, (err, adminHash) => {
        if (err) throw err;
        
        console.log('Starting to add users...');
        
        // Add 5 students
        for (let i = 1; i <= 5; i++) {
            const username = `student${i}`;
            const email = `student${i}@school.edu`;
            
            db.run("INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)", 
                   [username, email, studentHash, 'student'], 
                   function(err) {
                       if (err) {
                           console.error(`Error inserting student${i}:`, err);
                       } else {
                           console.log(`Added student${i}: ${username}`);
                       }
                   });
        }
        
        // Add 5 admins
        for (let i = 1; i <= 5; i++) {
            const username = `admin${i}`;
            const email = `admin${i}@school.edu`;
            
            db.run("INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)", 
                   [username, email, adminHash, 'admin'], 
                   function(err) {
                       if (err) {
                           console.error(`Error inserting admin${i}:`, err);
                       } else {
                           console.log(`Added admin${i}: ${username}`);
                       }
                   });
        }
        
        // Add 5 teachers
        for (let i = 1; i <= 5; i++) {
            const username = `teacher${i}`;
            const email = `teacher${i}@school.edu`;
            
            db.run("INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)", 
                   [username, email, adminHash, 'teacher'], 
                   function(err) {
                       if (err) {
                           console.error(`Error inserting teacher${i}:`, err);
                       } else {
                           console.log(`Added teacher${i}: ${username}`);
                       }
                   });
        }
        
        // Close database after a delay to allow operations to complete
        setTimeout(() => {
            console.log('All users added. Closing database.');
            db.close();
        }, 2000);
    });
});