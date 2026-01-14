// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in and auto-logout if they navigate back to login
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
        // User is already logged in, so log them out before proceeding
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        localStorage.removeItem('studentId');

        // Optionally show a message
        console.log('Previous session cleared. You must log in again.');
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const userType = document.getElementById('userType').value; // Get the selected user type

            try {
                const response = await fetch('/api/users/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                if (response.ok) {
                    const result = await response.json();

                    // Store the token in localStorage
                    localStorage.setItem('token', result.token);

                    // Store user info
                    localStorage.setItem('userId', result.user.id);
                    localStorage.setItem('username', result.user.username);
                    localStorage.setItem('role', result.user.role);

                    // For students, we'll use their username as their student ID
                    if (result.user.role === 'student') {
                        localStorage.setItem('studentId', result.user.username);
                    }

                    // Redirect based on user role
                    switch(result.user.role) {
                        case 'student':
                            window.location.href = '/student';
                            break;
                        case 'staff':
                            window.location.href = '/staff';
                            break;
                        case 'admin':
                            window.location.href = '/admin';
                            break;
                        default:
                            alert('Unknown user role');
                            break;
                    }
                } else {
                    const error = await response.json();
                    alert('Login failed: ' + error.message);
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed: ' + error.message);
            }
        });
    }
});