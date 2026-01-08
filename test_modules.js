console.log('Testing basic Node.js functionality...');

try {
  const express = require('express');
  console.log('Express loaded successfully');
  
  const path = require('path');
  console.log('Path loaded successfully');
  
  const cors = require('cors');
  console.log('CORS loaded successfully');
  
  console.log('All modules loaded successfully');
  
  const app = express();
  console.log('Express app created successfully');
  
  app.get('/', (req, res) => {
    res.send('Test successful!');
  });
  
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });
  
  // Stop the server after 5 seconds to prevent hanging
  setTimeout(() => {
    console.log('Stopping test server');
    process.exit(0);
  }, 5000);
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}