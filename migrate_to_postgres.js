/**
 * Migration script to convert SQLite queries to PostgreSQL
 * Run this script to update the remaining database queries in api/index.js
 */

const fs = require('fs');
const path = require('path');

// Read the current API file
const apiFilePath = path.join(__dirname, 'api', 'index.js');
let apiContent = fs.readFileSync(apiFilePath, 'utf8');

console.log('Starting migration from SQLite to PostgreSQL...');

// 1. Replace database connection initialization
apiContent = apiContent.replace(
  /const sqlite = require\('sqlite'\);\s*const sqlite3 = require\('sqlite3'\);/,
  'const { Pool } = require(\'pg\');'
);

// 2. Replace database variable declarations
apiContent = apiContent.replace(
  /let db;/,
  'const pool = new Pool({\n  connectionString: process.env.DATABASE_URL || \n    `postgresql://${process.env.DB_USER || \'postgres\'}:${process.env.DB_PASSWORD || \'postgres\'}@${process.env.DB_HOST || \'localhost\'}:${process.env.DB_PORT || \'5432\'}/${process.env.DB_NAME || \'school_portal\'}`,\n  ssl: process.env.NODE_ENV === \'production\' ? { rejectUnauthorized: false } : false\n});'
);

// 3. Replace database initialization
apiContent = apiContent.replace(
  /async function initializeDatabase\(\) \{\s*try \{\s*db = await sqlite\.open\(\{[\s\S]*?}\);?\s*\}\s*}/,
  `async function initializeDatabase() {
  try {
    // Tables are created via SQL queries above
    console.log('PostgreSQL tables initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}`
);

// 4. Replace all .get() calls with pool.query()
apiContent = apiContent.replace(/db\.get\(/g, 'pool.query(');
apiContent = apiContent.replace(/\.get\(/g, '.query(');

// 5. Replace all .all() calls with pool.query()
apiContent = apiContent.replace(/db\.all\(/g, 'pool.query(');
apiContent = apiContent.replace(/\.all\(/g, '.query(');

// 6. Replace all .run() calls with pool.query()
apiContent = apiContent.replace(/db\.run\(/g, 'pool.query(');
apiContent = apiContent.replace(/\.run\(/g, '.query(');

// 7. Replace parameter placeholders: ? -> $1, $2, etc.
apiContent = apiContent.replace(/\?/g, (match, offset, str) => {
  // Count the number of ? before this position to determine the parameter number
  const before = str.substring(0, offset);
  const count = (before.match(/\?/g) || []).length;
  return `$${count + 1}`;
});

// 8. Fix the result access - change .rows[0] for get queries
apiContent = apiContent.replace(/const (\w+) = result;/g, 'const $1 = result.rows[0];');
apiContent = apiContent.replace(/const (\w+) = result\.rows\[0\]\.(\w+);/g, 'const $1 = parseInt(result.rows[0].$2);');

// 9. Fix INSERT statements to return the inserted ID
apiContent = apiContent.replace(
  /const result = await pool\.query\("INSERT INTO (\w+) \([^)]+\) VALUES \([^)]+\)"\s*,\s*(\[[^\]]+\])\);/g,
  `const result = await pool.query("INSERT INTO $1 DEFAULT VALUES RETURNING id", []);
const insertedId = result.rows[0].id;`
);

// 10. Handle specific cases for different query types
// For SELECT COUNT(*) queries
apiContent = apiContent.replace(
  /const result = await pool\.query\("SELECT COUNT\(\*\) as count FROM (\w+)"\s*,\s*\[\]\);[\s\n\r]*const (\w+) = result;/g,
  `const result = await pool.query("SELECT COUNT(*) as count FROM $1", []);
const $2 = parseInt(result.rows[0].count);`
);

// Write the updated content back to the file
fs.writeFileSync(apiFilePath, apiContent);

console.log('Migration script completed!');
console.log('Please review api/index.js for any remaining manual corrections needed.');
console.log('Key areas to check:');
console.log('- Result handling (use .rows property)');
console.log('- Parameter placeholders (use $1, $2 instead of ?)');
console.log('- Error handling patterns');
console.log('- Any remaining SQLite-specific methods');