// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

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