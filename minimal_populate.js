const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Database initialization
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Hash password and add a few users
bcrypt.hash('123456', 10, (err, studentHash) => {
    if (err) {
        console.error('Error hashing student password:', err);
        return;
    }
    
    bcrypt.hash('78910', 10, (err, adminHash) => {
        if (err) {
            console.error('Error hashing admin password:', err);
            return;
        }
        
        console.log('Starting to add users...');
        
        // Add 1 student
        const username = 'student1';
        const email = 'student1@school.edu';
        
        db.run("INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)", 
               [username, email, studentHash, 'student'], 
               function(err) {
                   if (err) {
                       console.error('Error inserting student:', err);
                   } else {
                       console.log('Successfully added student1');
                   }
                   
                   // Add 1 admin
                   db.run("INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)", 
                          ['admin1', 'admin1@school.edu', adminHash, 'admin'], 
                          function(err) {
                              if (err) {
                                  console.error('Error inserting admin:', err);
                              } else {
                                  console.log('Successfully added admin1');
                              }
                              
                              // Add 1 teacher
                              db.run("INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)", 
                                     ['teacher1', 'teacher1@school.edu', adminHash, 'teacher'], 
                                     function(err) {
                                         if (err) {
                                             console.error('Error inserting teacher:', err);
                                         } else {
                                             console.log('Successfully added teacher1');
                                         }
                                         
                                         // Close database after a delay
                                         setTimeout(() => {
                                             console.log('Closing database.');
                                             db.close();
                                         }, 1000);
                                     });
                          });
               });
    });
});