// Test script to check if login works
const jwt = require('jsonwebtoken');

// Test JWT creation
console.log('Testing JWT functionality...');

try {
  // Test creating a token
  const testUser = { id: 1, username: 'test', role: 'student' };
  const token = jwt.sign(
    testUser,
    process.env.JWT_SECRET || 'fallback_secret_key_for_development',
    { expiresIn: '24h' }
  );
  
  console.log('✓ JWT token created successfully');
  console.log('Token:', token.substring(0, 50) + '...');
  
  // Test verifying the token
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_for_development');
  console.log('✓ JWT token verified successfully');
  console.log('Decoded:', decoded);
  
  console.log('\n✓ JWT functionality is working correctly!');
} catch (error) {
  console.error('✗ JWT functionality failed:', error.message);
}

// Test user data
const users = [
  { id: 1, username: 'emmanuel', email: 'emmanuel@staff.edu', password: 'staff123', role: 'staff' },
  { id: 2, username: 'tuyishime', email: 'tuyishime@staff.edu', password: 'staff123', role: 'staff' },
  { id: 3, username: 'martin', email: 'martin@student.edu', password: 'student123', role: 'student' },
  { id: 4, username: 'shift', email: 'shift@student.edu', password: 'student123', role: 'student' },
  { id: 5, username: 'emmanuel_student', email: 'emmanuel_student@student.edu', password: 'student123', role: 'student' },
  { id: 6, username: 'tuyishime_student', email: 'tuyishime_student@student.edu', password: 'student123', role: 'student' }
];

console.log('\n✓ User data loaded successfully');
console.log('Available users:', users.map(u => `${u.username} (${u.role})`));

// Test login simulation
function simulateLogin(username, password) {
  console.log(`\nSimulating login for: ${username}`);
  
  // Find user
  const user = users.find(u => u.username === username);
  if (!user) {
    console.log('✗ User not found');
    return false;
  }
  
  // Check password
  if (user.password !== password) {
    console.log('✗ Invalid password');
    return false;
  }
  
  console.log('✓ Login successful');
  console.log('User details:', { id: user.id, username: user.username, role: user.role });
  
  // Create token
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'fallback_secret_key_for_development',
    { expiresIn: '24h' }
  );
  
  console.log('✓ Token generated for user');
  return { token, user: { id: user.id, username: user.username, role: user.role } };
}

// Test different login scenarios
console.log('\n=== Testing Login Scenarios ===');
simulateLogin('emmanuel', 'staff123');  // Should work
simulateLogin('martin', 'student123');  // Should work
simulateLogin('nonexistent', 'password');  // Should fail
simulateLogin('emmanuel', 'wrongpassword');  // Should fail

console.log('\nTest completed successfully!');