// Admin dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadUserData();
    loadSystemStats();
    loadCharts();
    loadAnnouncements();
    loadGrades();

    // Set up event listeners
    document.getElementById('addUserForm').addEventListener('submit', addUser);
    document.getElementById('saveUserBtn').addEventListener('click', updateUser);
    document.getElementById('createAnnouncementForm').addEventListener('submit', createAnnouncement);
    document.getElementById('saveAnnouncementBtn').addEventListener('click', updateAnnouncement);

    // Set up section navigation
    setupSectionNavigation();

    // Set up search and filter functionality
    setupSearchAndFilter();

    // Set up real-time updates
    setupRealTimeUpdates();
});

// Function to set up real-time updates
function setupRealTimeUpdates() {
    // Refresh data every 30 seconds
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            // Only update if the tab is visible
            loadSystemStats();
            loadCharts();

            // Only reload data for visible sections
            if (document.getElementById('users-management').style.display !== 'none') {
                loadUserData();
            }
            if (document.getElementById('announcements').style.display !== 'none') {
                loadAnnouncements();
            }
            if (document.getElementById('posts-content').style.display !== 'none') {
                loadPosts();
            }
            if (document.getElementById('grades-management').style.display !== 'none') {
                loadGrades();
            }
        }
    }, 30000); // 30 seconds

    // Listen for visibility change to pause/resume updates
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            // Tab became visible, update data
            loadSystemStats();
            loadCharts();
        }
    });
}

// Function to set up section navigation
function setupSectionNavigation() {
    // Initially show dashboard content
    document.getElementById('dashboard-content').style.display = 'block';

    // Add click handlers for sidebar links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#' && this.onclick) {
                // This is handled by the onclick attribute
                return;
            }
        });
    });
}

// Function to show a specific section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    // Hide dashboard content
    document.getElementById('dashboard-content').style.display = 'none';

    // Show the requested section
    document.getElementById(sectionId).style.display = 'block';

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Find the corresponding nav link and make it active
    const navLinks = document.querySelectorAll('.nav-link');
    for (let link of navLinks) {
        if (link.getAttribute('onclick') && link.getAttribute('onclick').includes(sectionId)) {
            link.classList.add('active');
            break;
        }
    }

    // Load data for the section
    switch(sectionId) {
        case 'users-management':
            loadUserData();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
        case 'posts-content':
            loadPosts();
            break;
        case 'grades-management':
            loadGrades();
            break;
    }
}

// Function to set up search and filter functionality
function setupSearchAndFilter() {
    // User search
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', function() {
            filterUsers(this.value);
        });
    }

    // Role filter
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) {
        roleFilter.addEventListener('change', function() {
            filterUsers('', this.value);
        });
    }

    // Content search
    const contentSearch = document.getElementById('contentSearch');
    if (contentSearch) {
        contentSearch.addEventListener('input', function() {
            filterPosts(this.value);
        });
    }

    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            filterPosts('', this.value);
        });
    }
}

// Function to filter users
function filterUsers(searchTerm = '', roleFilter = '') {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/admin/users', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(users => {
        const tableBody = document.querySelector('#usersTable tbody');

        if (!tableBody) {
            console.error('Users table not found');
            return;
        }

        if (users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }

        // Filter users based on search term and role
        let filteredUsers = users;
        if (searchTerm) {
            filteredUsers = filteredUsers.filter(user =>
                user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (roleFilter) {
            filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
        }

        tableBody.innerHTML = '';
        filteredUsers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td><span class="badge bg-${getRoleBadgeColor(user.role)}">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" onclick="editUser(${user.id}, '${user.username}', '${user.email}', '${user.role}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id}, '${user.username}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        if (filteredUsers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No users match your filters</td></tr>';
        }
    })
    .catch(error => {
        console.error('Error filtering users:', error);
    });
}

// Function to filter posts
function filterPosts(searchTerm = '', categoryFilter = '') {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('/api/posts', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(posts => {
        const tableBody = document.querySelector('#postsTable tbody');

        if (!tableBody) {
            console.error('Posts table not found');
            return;
        }

        if (posts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No posts found</td></tr>';
            return;
        }

        // Filter posts based on search term and category
        let filteredPosts = posts;
        if (searchTerm) {
            filteredPosts = filteredPosts.filter(post =>
                post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                post.content.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (categoryFilter) {
            filteredPosts = filteredPosts.filter(post => post.category === categoryFilter);
        }

        tableBody.innerHTML = '';
        filteredPosts.forEach(post => {
            const contentPreview = post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${post.id}</td>
                <td>${post.title}</td>
                <td>${post.category}</td>
                <td>${contentPreview}</td>
                <td>${new Date(post.date).toLocaleDateString()}</td>
                <td>${post.author}</td>
                <td>
                    <button class="btn btn-sm btn-warning me-1" onclick="editPost(${post.id}, '${post.title}', '${post.content}', '${post.category}', '${post.date}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id}, '${post.title}')">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        if (filteredPosts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No posts match your filters</td></tr>';
        }
    })
    .catch(error => {
        console.error('Error filtering posts:', error);
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading posts</td></tr>';
    });
}

// Function to load user data
async function loadUserData() {
    try {
        const response = await fetch('/api/admin/users');

        if (response.ok) {
            const users = await response.json();
            const tableBody = document.querySelector('#usersTable tbody');

            if (!tableBody) {
                console.error('Users table not found');
                return;
            }

            if (users.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
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
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
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
                'Content-Type': 'application/json'
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
                'Content-Type': 'application/json'
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
                'Content-Type': 'application/json'
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
    try {
        // Get all users
        const usersResponse = await fetch('/api/admin/users');

        if (usersResponse.ok) {
            const users = await usersResponse.json();

            // Count users by role
            const totalUsers = users.length;
            const totalStudents = users.filter(user => user.role === 'student').length;
            const totalStaff = users.filter(user => user.role === 'staff').length;
            const totalAdmins = users.filter(user => user.role === 'admin').length;

            // Update the counters
            document.getElementById('totalUsersCount').textContent = totalUsers;
            document.getElementById('totalStudentsCount').textContent = totalStudents;
            document.getElementById('totalStaffCount').textContent = totalStaff;

            // Also update the grades count
            const gradesResponse = await fetch('/api/grades/staff');

            if (gradesResponse.ok) {
                const grades = await gradesResponse.json();
                document.getElementById('totalGradesCount').textContent = grades.length;

                // Update grades overview section if visible
                if (document.getElementById('grades-management').style.display !== 'none') {
                    document.getElementById('totalGradesCountOverview').textContent = grades.length;

                    // Calculate average, highest, and lowest grades
                    if (grades.length > 0) {
                        const totalGrade = grades.reduce((sum, grade) => sum + grade.grade, 0);
                        const avgGrade = totalGrade / grades.length;
                        const highestGrade = Math.max(...grades.map(grade => grade.grade));
                        const lowestGrade = Math.min(...grades.map(grade => grade.grade));

                        document.getElementById('avgGradeValue').textContent = avgGrade.toFixed(1) + '%';
                        document.getElementById('highestGradeValue').textContent = highestGrade + '%';
                        document.getElementById('lowestGradeValue').textContent = lowestGrade + '%';
                    } else {
                        document.getElementById('avgGradeValue').textContent = '0%';
                        document.getElementById('highestGradeValue').textContent = '0%';
                        document.getElementById('lowestGradeValue').textContent = '0%';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading system stats:', error);
    }
}

// Function to load charts
async function loadCharts() {
    try {
        // Get all users
        const usersResponse = await fetch('/api/admin/users');

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
            if (roleCtx) {
                // Destroy existing chart if it exists
                if (roleCtx.chart) {
                    roleCtx.chart.destroy();
                }

                roleCtx.chart = new Chart(roleCtx, {
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
        }

        // Since we don't have grade-summary endpoint yet, we'll simulate the data
        // In a real scenario, you'd fetch from the actual endpoint
        const gradesResponse = await fetch('/api/grades/staff');

        if (gradesResponse.ok) {
            const grades = await gradesResponse.json();

            // Calculate subject averages
            const subjectAverages = {};
            grades.forEach(grade => {
                if (!subjectAverages[grade.subject]) {
                    subjectAverages[grade.subject] = { total: 0, count: 0 };
                }
                subjectAverages[grade.subject].total += grade.grade;
                subjectAverages[grade.subject].count++;
            });

            const subjects = Object.keys(subjectAverages);
            const averages = subjects.map(subject => Math.round(subjectAverages[subject].total / subjectAverages[subject].count));

            // Create performance chart with subject averages
            const perfCtx = document.getElementById('performanceChart').getContext('2d');
            if (perfCtx) {
                // Destroy existing chart if it exists
                if (perfCtx.chart) {
                    perfCtx.chart.destroy();
                }

                perfCtx.chart = new Chart(perfCtx, {
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
            }

            // Create top subjects chart (horizontal bar)
            const topSubjectsCtx = document.getElementById('topSubjectsChart').getContext('2d');
            if (topSubjectsCtx) {
                // Destroy existing chart if it exists
                if (topSubjectsCtx.chart) {
                    topSubjectsCtx.chart.destroy();
                }

                topSubjectsCtx.chart = new Chart(topSubjectsCtx, {
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
            }

            // Calculate top students
            const studentGrades = {};
            grades.forEach(grade => {
                if (!studentGrades[grade.student_id]) {
                    studentGrades[grade.student_id] = { total: 0, count: 0, name: grade.student_name || 'N/A' };
                }
                studentGrades[grade.student_id].total += grade.grade;
                studentGrades[grade.student_id].count++;
            });

            const topStudents = Object.entries(studentGrades)
                .map(([studentId, data]) => ({
                    student_id: studentId,
                    student_name: data.name,
                    avg_grade: data.total / data.count
                }))
                .sort((a, b) => b.avg_grade - a.avg_grade)
                .slice(0, 5);

            // Load top students list
            const topStudentsList = document.getElementById('topStudentsList');
            if (topStudentsList) {
                if (topStudents.length > 0) {
                    let topStudentsHtml = '<ul class="list-group">';
                    topStudents.forEach((student, index) => {
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
                } else {
                    topStudentsList.innerHTML = '<p class="text-muted">No student data available</p>';
                }
            }
        }

        // Simulate grade trends data
        const trendCtx = document.getElementById('gradeTrendsChart').getContext('2d');
        if (trendCtx) {
            // Destroy existing chart if it exists
            if (trendCtx.chart) {
                trendCtx.chart.destroy();
            }

            // Generate mock data for the last 7 days
            const dates = [];
            const avgGrades = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                dates.push(date.toLocaleDateString());

                // Random grade between 60-95
                avgGrades.push(Math.floor(Math.random() * 36) + 60);
            }

            trendCtx.chart = new Chart(trendCtx, {
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

// Function to load announcements
async function loadAnnouncements() {
    try {
        const response = await fetch('/api/staff/announcements');

        if (response.ok) {
            const announcements = await response.json();
            const tableBody = document.querySelector('#announcementsTable tbody');
            const recentAnnouncements = document.getElementById('recentAnnouncements');

            if (!tableBody) {
                console.error('Announcements table not found');
                return;
            }

            if (announcements.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No announcements found</td></tr>';
                recentAnnouncements.innerHTML = '<p class="text-muted">No recent announcements</p>';
                return;
            }

            // Populate announcements table
            tableBody.innerHTML = '';
            announcements.forEach(announcement => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${announcement.id}</td>
                    <td>${announcement.title}</td>
                    <td>${announcement.content.length > 50 ? announcement.content.substring(0, 50) + '...' : announcement.content}</td>
                    <td>${new Date(announcement.date).toLocaleDateString()}</td>
                    <td>${announcement.author_name}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-1" onclick="editAnnouncement(${announcement.id}, '${announcement.title.replace(/'/g, "\\'")}', '${announcement.content.replace(/'/g, "\\'")}', '${announcement.date}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement(${announcement.id}, '${announcement.title.replace(/'/g, "\\'")}')">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Populate recent announcements (last 5)
            if (recentAnnouncements) {
                recentAnnouncements.innerHTML = '<div class="list-group">';
                const recent = announcements.slice(0, 5);
                recent.forEach(announcement => {
                    recentAnnouncements.innerHTML += `
                        <div class="list-group-item">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${announcement.title}</h6>
                                <small>${new Date(announcement.date).toLocaleDateString()}</small>
                            </div>
                            <p class="mb-1">${announcement.content.length > 100 ? announcement.content.substring(0, 100) + '...' : announcement.content}</p>
                            <small>By: ${announcement.author_name}</small>
                        </div>
                    `;
                });
                recentAnnouncements.innerHTML += '</div>';
            }
        } else {
            console.error('Error loading announcements:', await response.text());
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

// Function to create an announcement
async function createAnnouncement(event) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) return;

    const title = document.getElementById('announcementTitle').value;
    const content = document.getElementById('announcementContent').value;
    const date = document.getElementById('announcementDate').value;

    if (!title || !content || !date) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch('/api/staff/announcements', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                content: content,
                date: date
            })
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message);

            // Reset form
            document.getElementById('createAnnouncementForm').reset();

            // Reload announcements
            loadAnnouncements();
        } else {
            const error = await response.json();
            alert(error.message || 'Error creating announcement');
        }
    } catch (error) {
        console.error('Error creating announcement:', error);
        alert('Error creating announcement: ' + error.message);
    }
}

// Function to edit an announcement
async function editAnnouncement(announcementId, title, content, date) {
    document.getElementById('editAnnouncementId').value = announcementId;
    document.getElementById('editAnnouncementTitle').value = title;
    document.getElementById('editAnnouncementContent').value = content;
    document.getElementById('editAnnouncementDate').value = date;

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('editAnnouncementModal'));
    modal.show();
}

// Function to update an announcement
async function updateAnnouncement() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const announcementId = document.getElementById('editAnnouncementId').value;
    const title = document.getElementById('editAnnouncementTitle').value;
    const content = document.getElementById('editAnnouncementContent').value;
    const date = document.getElementById('editAnnouncementDate').value;

    if (!title || !content || !date) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch(`/api/staff/announcements/${announcementId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                content: content,
                date: date
            })
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message);

            // Hide the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editAnnouncementModal'));
            if (modal) {
                modal.hide();
            }

            // Reload announcements
            loadAnnouncements();
        } else {
            const error = await response.json();
            alert(error.message || 'Error updating announcement');
        }
    } catch (error) {
        console.error('Error updating announcement:', error);
        alert('Error updating announcement: ' + error.message);
    }
}

// Function to delete an announcement
async function deleteAnnouncement(announcementId, title) {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm(`Are you sure you want to delete announcement "${title}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/staff/announcements/${announcementId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message);

            // Reload announcements
            loadAnnouncements();
        } else {
            const error = await response.json();
            alert(error.message || 'Error deleting announcement');
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        alert('Error deleting announcement: ' + error.message);
    }
}

// Function to load posts
async function loadPosts() {
    try {
        const response = await fetch('/api/posts');

        if (response.ok) {
            const posts = await response.json();
            const tableBody = document.querySelector('#postsTable tbody');

            if (!tableBody) {
                console.error('Posts table not found');
                return;
            }

            if (posts.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No posts found</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            posts.forEach(post => {
                const contentPreview = post.content.length > 50 ? post.content.substring(0, 50) + '...' : post.content;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${post.id}</td>
                    <td>${post.title}</td>
                    <td>${post.category}</td>
                    <td>${contentPreview}</td>
                    <td>${new Date(post.date).toLocaleDateString()}</td>
                    <td>${post.author}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-1" onclick="editPost(${post.id}, '${post.title}', '${post.content}', '${post.category}', '${post.date}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id}, '${post.title}')">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            console.error('Error loading posts:', await response.text());
        }
    } catch (error) {
        console.error('Error loading posts:', error);
    }
}

// Function to create a post
async function createPost(event) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) return;

    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const category = document.getElementById('postCategory').value;
    const date = document.getElementById('postDate').value;

    if (!title || !content || !category || !date) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                content: content,
                category: category,
                date: date
            })
        });

        if (response.ok) {
            const result = await response.json();
            alert(result.message);

            // Reset form
            document.getElementById('createPostForm').reset();

            // Reload posts
            loadPosts();
        } else {
            const error = await response.json();
            alert(error.message || 'Error creating post');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Error creating post: ' + error.message);
    }
}

// Function to edit a post
async function editPost(postId, title, content, category, date) {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Create a modal for editing
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'editPostModal';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title"><i class="fas fa-edit me-2"></i>Edit Post</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="editPostForm">
                        <input type="hidden" id="editPostId" value="${postId}">
                        <div class="mb-3">
                            <label for="editPostTitle" class="form-label">Title</label>
                            <input type="text" class="form-control" id="editPostTitle" value="${title}" required>
                        </div>
                        <div class="mb-3">
                            <label for="editPostContent" class="form-label">Content</label>
                            <textarea class="form-control" id="editPostContent" rows="5" required>${content}</textarea>
                        </div>
                        <div class="mb-3">
                            <label for="editPostCategory" class="form-label">Category</label>
                            <select class="form-control" id="editPostCategory" required>
                                <option value="news" ${category === 'news' ? 'selected' : ''}>News</option>
                                <option value="event" ${category === 'event' ? 'selected' : ''}>Event</option>
                                <option value="notice" ${category === 'notice' ? 'selected' : ''}>Notice</option>
                                <option value="resource" ${category === 'resource' ? 'selected' : ''}>Resource</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="editPostDate" class="form-label">Date</label>
                            <input type="date" class="form-control" id="editPostDate" value="${date}" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="updatePost()">Save Changes</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Initialize and show the modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Remove modal when hidden
    modal.addEventListener('hidden.bs.modal', function() {
        modal.remove();
    });
}

// Function to update a post
async function updatePost() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const postId = document.getElementById('editPostId').value;
    const title = document.getElementById('editPostTitle').value;
    const content = document.getElementById('editPostContent').value;
    const category = document.getElementById('editPostCategory').value;
    const date = document.getElementById('editPostDate').value;

    if (!title || !content || !category || !date) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                content: content,
                category: category,
                date: date
            })
        });

        if (response.ok) {
            const updatedPost = await response.json();
            alert('Post updated successfully!');

            // Close the modal
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            });

            // Refresh the posts list
            loadPosts();
        } else {
            const error = await response.json();
            alert('Error updating post: ' + error.message);
        }
    } catch (error) {
        console.error('Error updating post:', error);
        alert('Error updating post: ' + error.message);
    }
}

// Function to delete a post
async function deletePost(postId, title) {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm(`Are you sure you want to delete post "${title}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            alert('Post deleted successfully!');

            // Refresh the posts list
            loadPosts();
        } else {
            const error = await response.json();
            alert('Error deleting post: ' + error.message);
        }
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Error deleting post: ' + error.message);
    }
}

// Function to load grades
async function loadGrades() {
    try {
        const response = await fetch('/api/grades/staff');

        if (response.ok) {
            const grades = await response.json();
            const tableBody = document.querySelector('#gradesTable tbody');

            if (!tableBody) {
                console.error('Grades table not found');
                return;
            }

            if (grades.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No grades found</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            grades.forEach(grade => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${grade.id}</td>
                    <td>${grade.student_id}</td>
                    <td>${grade.student_name || 'N/A'}</td>
                    <td>${grade.subject}</td>
                    <td>${grade.exam_type}</td>
                    <td>${grade.grade}%</td>
                    <td>${new Date(grade.date).toLocaleDateString()}</td>
                    <td>${grade.teacher_name || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-1" onclick="editGrade(${grade.id}, '${grade.student_id}', '${grade.subject}', '${grade.exam_type}', ${grade.grade}, '${grade.date}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteGrade(${grade.id})">Delete</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            console.error('Error loading grades:', await response.text());
        }
    } catch (error) {
        console.error('Error loading grades:', error);
    }
}

// Function to edit a grade
async function editGrade(gradeId, studentId, subject, examType, grade, date) {
    // This function is similar to the one in teacher.js
    const token = localStorage.getItem('token');
    if (!token) return;

    // Create a modal for editing
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'editGradeModal';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title"><i class="fas fa-edit me-2"></i>Edit Grade</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="editGradeForm">
                        <input type="hidden" id="editGradeId" value="${gradeId}">
                        <div class="mb-3">
                            <label for="editStudentId" class="form-label">Student ID</label>
                            <input type="text" class="form-control" id="editStudentId" value="${studentId}" readonly>
                        </div>
                        <div class="mb-3">
                            <label for="editSubject" class="form-label">Subject</label>
                            <select class="form-control" id="editSubject" required>
                                <option value="">Select Subject</option>
                                <!-- Options will be loaded dynamically -->
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="editExamType" class="form-label">Exam Type</label>
                            <select class="form-control" id="editExamType">
                                <option value="">Select Exam Type</option>
                                <option value="exam" ${examType === 'exam' ? 'selected' : ''}>Exam</option>
                                <option value="quiz" ${examType === 'quiz' ? 'selected' : ''}>Quiz</option>
                                <option value="assignment" ${examType === 'assignment' ? 'selected' : ''}>Assignment</option>
                                <option value="project" ${examType === 'project' ? 'selected' : ''}>Project</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="editGrade" class="form-label">Grade</label>
                            <input type="number" class="form-control" id="editGrade" value="${grade}" min="0" max="100" required>
                        </div>
                        <div class="mb-3">
                            <label for="editDate" class="form-label">Date</label>
                            <input type="date" class="form-control" id="editDate" value="${date}" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="updateGrade()">Save Changes</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Initialize and show the modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Load subjects into the dropdown
    loadSubjectsForEdit(grade.subject);

    // Remove modal when hidden
    modal.addEventListener('hidden.bs.modal', function() {
        modal.remove();
    });
}

// Function to load subjects for the edit form with the current value selected
async function loadSubjectsForEdit(currentSubject) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/subjects', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const subjects = await response.json();
            const subjectSelect = document.getElementById('editSubject');

            if (subjectSelect) {
                subjectSelect.innerHTML = '<option value="">Select Subject</option>';
                subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject.name;
                    option.textContent = subject.name;
                    if (subject.name === currentSubject) {
                        option.selected = true;
                    }
                    subjectSelect.appendChild(option);
                });
            }
        } else {
            console.error('Error loading subjects for edit:', await response.text());
        }
    } catch (error) {
        console.error('Error loading subjects for edit:', error);
    }
}

// Function to update a grade
async function updateGrade() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const gradeId = document.getElementById('editGradeId').value;
    const studentId = document.getElementById('editStudentId').value;
    const subject = document.getElementById('editSubject').value;
    const examType = document.getElementById('editExamType').value;
    const grade = document.getElementById('editGrade').value;
    const date = document.getElementById('editDate').value;

    if (!studentId || !subject || !examType || !grade || !date) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch(`/api/grades/${gradeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId: studentId,
                subject: subject,
                examType: examType,
                grade: parseFloat(grade),
                date: date
            })
        });

        if (response.ok) {
            const updatedGrade = await response.json();
            alert('Grade updated successfully!');

            // Close the modal
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            });

            // Refresh the grades list
            loadGrades();
            loadSystemStats(); // Update the stats too
        } else {
            const error = await response.json();
            alert('Error updating grade: ' + error.message);
        }
    } catch (error) {
        console.error('Error updating grade:', error);
        alert('Error updating grade: ' + error.message);
    }
}

// Function to delete a grade
async function deleteGrade(gradeId) {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm('Are you sure you want to delete this grade?')) {
        return;
    }

    try {
        const response = await fetch(`/api/grades/${gradeId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            alert('Grade deleted successfully!');

            // Refresh the grades list
            loadGrades();
            loadSystemStats(); // Update the stats too
        } else {
            const error = await response.json();
            alert('Error deleting grade: ' + error.message);
        }
    } catch (error) {
        console.error('Error deleting grade:', error);
        alert('Error deleting grade: ' + error.message);
    }
}