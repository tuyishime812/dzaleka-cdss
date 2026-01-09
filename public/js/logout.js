// Logout functionality
document.addEventListener('DOMContentLoaded', function() {
    // Clear all stored tokens and user data
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('studentId');

    // Redirect to home page after a short delay
    setTimeout(function() {
        window.location.href = '/';
    }, 2000); // Wait 2 seconds before redirecting
});