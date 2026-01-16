// Student dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Load student's grades
    loadStudentGrades();

    // Load grade summary
    loadGradeSummary();

    // Load announcements
    loadAnnouncements();

    // Check for new grades since last visit
    checkForNewGrades();
});

// Function to check for new grades since last visit
async function checkForNewGrades() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    if (role !== 'student') {
        return;
    }

    const studentId = username;
    if (!studentId) {
        return;
    }

    try {
        // Get last visit timestamp from localStorage
        const lastVisit = localStorage.getItem('lastVisit');
        const now = new Date().toISOString();

        // Update last visit timestamp
        localStorage.setItem('lastVisit', now);

        // Fetch grades that were added/updated after last visit
        const response = await fetch(`/api/grades/student/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const allGrades = await response.json();

            // Get last visit timestamp
            const lastVisit = localStorage.getItem('lastVisit');

            if (lastVisit) {
                // Filter grades that were created after last visit
                const lastVisitTime = new Date(lastVisit).getTime();

                const newGrades = allGrades.filter(grade => {
                    // Assuming the grade object contains a created_at field
                    // If the API doesn't return created_at, we'll need to modify the server
                    const gradeTime = new Date(grade.created_at).getTime();
                    return gradeTime > lastVisitTime;
                });

                // Show notification if there are new grades
                if (newGrades.length > 0) {
                    showGradeNotification(newGrades.length);
                }
            } else {
                // First visit - don't show notification about existing grades
                // Just store the current time as last visit
                localStorage.setItem('lastVisit', now);
            }
        }
    } catch (error) {
        console.error('Error checking for new grades:', error);
    }
}

// Function to show grade notification
function showGradeNotification(count) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'alert alert-info alert-dismissible fade show position-fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.innerHTML = `
        <strong>New Grades!</strong> You have ${count} new grade${count > 1 ? 's' : ''} posted.
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto-hide after 10 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 10000);
}

// Function to load student's grades
async function loadStudentGrades() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Get student ID from user data stored in localStorage
    // For students, we'll use the username as student ID
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    // Only allow students to load their own grades
    if (role !== 'student') {
        console.error('Only students can access this page');
        const tableBody = document.querySelector('#gradesTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Access denied. Only students can view grades.</td></tr>';
        }
        return;
    }

    const studentId = username; // Use username as student ID

    if (!studentId) {
        console.error('No student ID found in localStorage');
        const tableBody = document.querySelector('#gradesTable tbody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No student ID found. Please log in again.</td></tr>';
        }
        return;
    }

    try {
        const response = await fetch(`/api/grades/student/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const grades = await response.json();
            const tableBody = document.querySelector('#gradesTable tbody');

            if (!tableBody) {
                console.error('Grades table not found');
                return;
            }

            if (grades.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No grades found</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            grades.forEach(grade => {
                const row = document.createElement('tr');

                // Determine grade classification
                let gradeClass = '';
                let gradeStatus = '';

                if (grade.grade >= 85) {
                    gradeClass = 'table-success'; // Green for excellent
                    gradeStatus = 'Excellent';
                } else if (grade.grade >= 70) {
                    gradeClass = 'table-primary'; // Blue for good
                    gradeStatus = 'Good';
                } else if (grade.grade >= 50) {
                    gradeClass = 'table-warning'; // Yellow for average
                    gradeStatus = 'Average';
                } else {
                    gradeClass = 'table-danger'; // Red for poor
                    gradeStatus = 'Needs Improvement';
                }

                row.innerHTML = `
                    <td class="${gradeClass}">${grade.subject}</td>
                    <td class="${gradeClass}">${grade.exam_type}</td>
                    <td class="${gradeClass}"><strong>${grade.grade}%</strong></td>
                    <td class="${gradeClass}">${new Date(grade.date).toLocaleDateString()}</td>
                    <td class="${gradeClass}">${grade.teacher_name || 'N/A'}</td>
                    <td class="${gradeClass}"><span class="badge bg-${getGradeBadgeColor(grade.grade)}">${gradeStatus}</span></td>
                `;
                tableBody.appendChild(row);
            });

            // After loading grades, update the statistics
            updateGradeStatistics(grades);
        } else {
            console.error('Error loading grades:', await response.text());
        }
    } catch (error) {
        console.error('Error loading grades:', error);
    }
}

// Helper function to determine badge color based on grade
function getGradeBadgeColor(grade) {
    if (grade >= 85) return 'success';      // Green for excellent
    if (grade >= 70) return 'primary';      // Blue for good
    if (grade >= 50) return 'warning';      // Yellow for average
    return 'danger';                        // Red for needs improvement
}

// Function to calculate and display grade statistics
function updateGradeStatistics(grades) {
    if (!grades || grades.length === 0) {
        document.getElementById('gradeStats').innerHTML = '<p>No grades available to calculate statistics.</p>';
        return;
    }

    // Calculate statistics
    let totalGrades = 0;
    let totalScore = 0;
    let highestGrade = 0;
    let lowestGrade = 100;
    const subjectGrades = {};

    grades.forEach(grade => {
        totalGrades++;
        totalScore += grade.grade;

        if (grade.grade > highestGrade) {
            highestGrade = grade.grade;
        }

        if (grade.grade < lowestGrade) {
            lowestGrade = grade.grade;
        }

        // Track grades by subject
        if (!subjectGrades[grade.subject]) {
            subjectGrades[grade.subject] = {
                count: 0,
                total: 0,
                grades: []
            };
        }

        subjectGrades[grade.subject].count++;
        subjectGrades[grade.subject].total += grade.grade;
        subjectGrades[grade.subject].grades.push(grade.grade);
    });

    const averageGrade = totalScore / totalGrades;

    // Prepare statistics HTML
    let statsHtml = `
        <div class="row">
            <div class="col-md-3">
                <div class="card text-center bg-light">
                    <div class="card-body">
                        <h5 class="card-title">Average Grade</h5>
                        <h3 class="text-primary"><strong>${averageGrade.toFixed(1)}%</strong></h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center bg-light">
                    <div class="card-body">
                        <h5 class="card-title">Highest Grade</h5>
                        <h3 class="text-success"><strong>${highestGrade}%</strong></h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center bg-light">
                    <div class="card-body">
                        <h5 class="card-title">Lowest Grade</h5>
                        <h3 class="text-danger"><strong>${lowestGrade}%</strong></h3>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center bg-light">
                    <div class="card-body">
                        <h5 class="card-title">Total Subjects</h5>
                        <h3 class="text-info"><strong>${Object.keys(subjectGrades).length}</strong></h3>
                    </div>
                </div>
            </div>
        </div>

        <h4 class="mt-4">Grade Distribution by Subject</h4>
        <div class="row">
    `;

    // Add subject-specific statistics
    for (const subject in subjectGrades) {
        const subjectAvg = subjectGrades[subject].total / subjectGrades[subject].count;
        const subjectMax = Math.max(...subjectGrades[subject].grades);
        const subjectMin = Math.min(...subjectGrades[subject].grades);

        statsHtml += `
            <div class="col-md-4">
                <div class="card mb-3">
                    <div class="card-header bg-primary text-white">
                        <h5 class="mb-0">${subject}</h5>
                    </div>
                    <div class="card-body">
                        <p class="card-text">
                            <strong>Average:</strong> ${subjectAvg.toFixed(1)}%<br>
                            <strong>Highest:</strong> ${subjectMax}%<br>
                            <strong>Lowest:</strong> ${subjectMin}%<br>
                            <strong>Exams:</strong> ${subjectGrades[subject].count}
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    statsHtml += '</div>';

    document.getElementById('gradeStats').innerHTML = statsHtml;
}

// Function to load grade summary
async function loadGradeSummary() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Get student ID from user data stored in localStorage
    // For students, we'll use the username as student ID
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    // Only allow students to load their own grades
    if (role !== 'student') {
        console.error('Only students can access this page');
        const summaryContainer = document.getElementById('gradeSummary');
        if (summaryContainer) {
            summaryContainer.innerHTML = '<p>Access denied. Only students can view grades.</p>';
        }
        return;
    }

    const studentId = username; // Use username as student ID

    if (!studentId) {
        console.error('No student ID found in localStorage');
        const summaryContainer = document.getElementById('gradeSummary');
        if (summaryContainer) {
            summaryContainer.innerHTML = '<p>No student ID found. Please log in again.</p>';
        }
        return;
    }

    try {
        const response = await fetch(`/api/grades/student/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const grades = await response.json();
            const summaryContainer = document.getElementById('gradeSummary');

            if (!summaryContainer) {
                console.error('Grade summary container not found');
                return;
            }

            if (grades.length === 0) {
                summaryContainer.innerHTML = '<p>No grades available.</p>';
                return;
            }

            // Calculate statistics
            let totalGrades = 0;
            let totalPoints = 0;
            const subjectGrades = {};

            grades.forEach(grade => {
                totalGrades++;
                totalPoints += grade.grade;

                if (!subjectGrades[grade.subject]) {
                    subjectGrades[grade.subject] = {
                        count: 0,
                        total: 0
                    };
                }

                subjectGrades[grade.subject].count++;
                subjectGrades[grade.subject].total += grade.grade;
            });

            const averageGrade = totalPoints / totalGrades;

            let summaryHtml = `
                <h5>Grade Summary</h5>
                <p><strong>Total Exams/Assignments:</strong> ${totalGrades}</p>
                <p><strong>Average Grade:</strong> ${averageGrade.toFixed(2)}%</p>
                <p><strong>Performance by Subject:</strong></p>
                <ul class="list-group">
            `;

            for (const subject in subjectGrades) {
                const avg = subjectGrades[subject].total / subjectGrades[subject].count;
                summaryHtml += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        ${subject}
                        <span class="badge bg-primary rounded-pill">${avg.toFixed(2)}%</span>
                    </li>
                `;
            }

            summaryHtml += '</ul>';

            summaryContainer.innerHTML = summaryHtml;
        } else {
            console.error('Error loading grade summary:', await response.text());
        }
    } catch (error) {
        console.error('Error loading grade summary:', error);
    }
}

// Function to load announcements
async function loadAnnouncements() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/staff/announcements', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const announcements = await response.json();
            const announcementsContainer = document.getElementById('announcements');

            if (!announcementsContainer) {
                console.error('Announcements container not found');
                return;
            }

            if (announcements.length === 0) {
                announcementsContainer.innerHTML = '<p>No announcements available.</p>';
                return;
            }

            let announcementsHtml = '<div class="list-group">';
            announcements.forEach(announcement => {
                announcementsHtml += `
                    <div class="list-group-item">
                        <div class="d-flex w-100 justify-content-between">
                            <h6 class="mb-1">${announcement.title}</h6>
                            <small>${new Date(announcement.date).toLocaleDateString()}</small>
                        </div>
                        <p class="mb-1">${announcement.content}</p>
                        <small>By: ${announcement.author_name}</small>
                    </div>
                `;
            });
            announcementsHtml += '</div>';

            announcementsContainer.innerHTML = announcementsHtml;
        } else {
            console.error('Error loading announcements:', await response.text());
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}