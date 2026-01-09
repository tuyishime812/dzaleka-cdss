// Simple test to check if modules can be imported
console.log('Testing module imports...');

try {
  const express = require('express');
  console.log('✓ Express imported successfully');
  
  const cors = require('cors');
  console.log('✓ CORS imported successfully');
  
  const sqlite3 = require('sqlite3');
  console.log('✓ SQLite3 imported successfully');
  
  const bcrypt = require('bcryptjs');
  console.log('✓ BcryptJS imported successfully');
  
  const jwt = require('jsonwebtoken');
  console.log('✓ JWT imported successfully');
  
  require('dotenv').config();
  console.log('✓ Dotenv imported and configured successfully');
  
  console.log('All modules imported successfully!');
} catch (error) {
  console.error('Error importing modules:', error.message);
}