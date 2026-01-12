// Admin dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated and has admin role
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token || role !== 'admin') {
        alert('Access denied. Administrative privileges required.');
        window.location.href = '/login';
        return;
    }

    // Load initial data
    loadUserData();
    loadSystemStats();
    loadCharts();
    
    // Set up event listeners
    document.getElementById('addUserForm').addEventListener('submit', addUser);
    document.getElementById('saveUserBtn').addEventListener('click', updateUser);
});

// Function to load user data
async function loadUserData() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const users = await response.json();
            const tableBody = document.querySelector('#usersTable tbody');

            if (!tableBody) {
                console.error('Users table not found');
                return;
            }

            if (users.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td><span class="badge bg-${getRoleBadgeColor(user.role)}">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span></td>
                    <td>
                        <button class="btn btn-sm btn-warning me-1" onclick="editUser(${user.id}, '${user.username}', '${user.email}', '${user.role}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id}, '${user.username}')">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            console.error('Error loading users:', await response.text());
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Helper function to get role badge color
function getRoleBadgeColor(role) {
    switch(role) {
        case 'admin':
            return 'danger';
        case 'staff':
            return 'primary';
        case 'student':
            return 'success';
        default:
            return 'secondary';
    }
}

// Function to add a new user
async function addUser(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    if (!token) return;

    const username = document.getElementById('newUsername').value;
    const email = document.getElementById('newEmail').value;
    const role = document.getElementById('newRole').value;
    const password = document.getElementById('newPassword').value;

    if (!username || !email || !role || !password) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch('/api/admin/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                username: username,
                email: email,
                role: role,
                password: password
            })
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message);
            
            // Reset form
            document.getElementById('addUserForm').reset();
            
            // Reload user data
            loadUserData();
            loadSystemStats();
        } else {
            const error = await response.json();
            alert(error.message || 'Error adding user');
        }
    } catch (error) {
        console.error('Error adding user:', error);
        alert('Error adding user: ' + error.message);
    }
}

// Function to edit a user
async function editUser(userId, username, email, role) {
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUsername').value = username;
    document.getElementById('editEmail').value = email;
    document.getElementById('editRole').value = role;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
    modal.show();
}

// Function to update a user
async function updateUser() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const userId = document.getElementById('editUserId').value;
    const username = document.getElementById('editUsername').value;
    const email = document.getElementById('editEmail').value;
    const role = document.getElementById('editRole').value;

    if (!username || !email || !role) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                username: username,
                email: email,
                role: role
            })
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message);
            
            // Hide the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
            if (modal) {
                modal.hide();
            }
            
            // Reload user data
            loadUserData();
            loadSystemStats();
        } else {
            const error = await response.json();
            alert(error.message || 'Error updating user');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        alert('Error updating user: ' + error.message);
    }
}

// Function to delete a user
async function deleteUser(userId, username) {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message);
            
            // Reload user data
            loadUserData();
            loadSystemStats();
        } else {
            const error = await response.json();
            alert(error.message || 'Error deleting user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
    }
}

// Function to load system statistics
async function loadSystemStats() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        // Get all users
        const usersResponse = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (usersResponse.ok) {
            const users = await usersResponse.json();
            
            // Count users by role
            const totalUsers = users.length;
            const totalStudents = users.filter(user => user.role === 'student').length;
            const totalStaff = users.filter(user => user.role === 'staff').length;
            
            // Update the counters
            document.getElementById('totalUsersCount').textContent = totalUsers;
            document.getElementById('totalStudentsCount').textContent = totalStudents;
            document.getElementById('totalStaffCount').textContent = totalStaff;
        }

        // Get grades count
        const gradesResponse = await fetch('/api/grades/staff', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (gradesResponse.ok) {
            const grades = await gradesResponse.json();
            document.getElementById('totalGradesCount').textContent = grades.length;
        }
    } catch (error) {
        console.error('Error loading system stats:', error);
    }
}

// Function to load charts
async function loadCharts() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        // Get all users
        const usersResponse = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (usersResponse.ok) {
            const users = await usersResponse.json();

            // Count users by role
            const roleCounts = {
                admin: users.filter(user => user.role === 'admin').length,
                staff: users.filter(user => user.role === 'staff').length,
                student: users.filter(user => user.role === 'student').length
            };

            // Create role distribution chart
            const roleCtx = document.getElementById('roleDistributionChart').getContext('2d');
            new Chart(roleCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Admin', 'Staff', 'Student'],
                    datasets: [{
                        data: [roleCounts.admin, roleCounts.staff, roleCounts.student],
                        backgroundColor: [
                            '#dc3545', // Red for admin
                            '#0d6efd', // Blue for staff
                            '#198754'  // Green for student
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

        // Get grade summary for performance chart
        const gradeSummaryResponse = await fetch('/api/admin/grade-summary', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (gradeSummaryResponse.ok) {
            const gradeSummary = await gradeSummaryResponse.json();

            // Create performance chart with subject averages
            const subjects = gradeSummary.subject_averages.map(item => item.subject);
            const averages = gradeSummary.subject_averages.map(item => Math.round(item.avg_grade));

            const perfCtx = document.getElementById('performanceChart').getContext('2d');
            new Chart(perfCtx, {
                type: 'bar',
                data: {
                    labels: subjects,
                    datasets: [{
                        label: 'Average Grade (%)',
                        data: averages,
                        backgroundColor: 'rgba(13, 110, 253, 0.5)',
                        borderColor: 'rgba(13, 110, 253, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });

            // Create top subjects chart (horizontal bar)
            const topSubjectsCtx = document.getElementById('topSubjectsChart').getContext('2d');
            new Chart(topSubjectsCtx, {
                type: 'bar',
                data: {
                    labels: subjects.slice(0, 5), // Top 5 subjects
                    datasets: [{
                        label: 'Average Grade (%)',
                        data: averages.slice(0, 5),
                        backgroundColor: 'rgba(40, 167, 69, 0.5)',
                        borderColor: 'rgba(40, 167, 69, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });

            // Load top students list
            const topStudentsList = document.getElementById('topStudentsList');
            if (topStudentsList && gradeSummary.top_students.length > 0) {
                let topStudentsHtml = '<ul class="list-group">';
                gradeSummary.top_students.forEach((student, index) => {
                    topStudentsHtml += `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <div><strong>${student.student_name}</strong></div>
                                <small class="text-muted">${student.student_id}</small>
                            </div>
                            <span class="badge bg-primary rounded-pill">${student.avg_grade ? student.avg_grade.toFixed(1) : 'N/A'}%</span>
                        </li>
                    `;
                });
                topStudentsHtml += '</ul>';
                topStudentsList.innerHTML = topStudentsHtml;
            }
        }

        // Get grade trends
        const gradeTrendsResponse = await fetch('/api/admin/grade-trends', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (gradeTrendsResponse.ok) {
            const gradeTrends = await gradeTrendsResponse.json();

            // Prepare data for trend chart (reverse to show chronological order)
            const dates = gradeTrends.map(item => item.date).reverse();
            const avgGrades = gradeTrends.map(item => Math.round(item.avg_grade)).reverse();

            const trendCtx = document.getElementById('gradeTrendsChart').getContext('2d');
            new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Average Grade (%)',
                        data: avgGrades,
                        fill: false,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading charts:', error);
    }
}