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
});

// Function to load student's grades
async function loadStudentGrades() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Get student ID from user data stored in localStorage
    // For this example, we'll use the username as student ID if no specific student ID is stored
    const studentId = localStorage.getItem('studentId') || localStorage.getItem('username') || '1';
    
    try {
        const response = await fetch(`/api/grades/student/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const grades = await response.json();
            const tableBody = document.querySelector('#gradesTable tbody');
            
            if (grades.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No grades found</td></tr>';
                return;
            }
            
            tableBody.innerHTML = '';
            grades.forEach(grade => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${grade.subject}</td>
                    <td>${grade.exam_type}</td>
                    <td>${grade.grade}</td>
                    <td>${new Date(grade.date).toLocaleDateString()}</td>
                    <td>${grade.teacher_name || 'N/A'}</td>
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

// Function to load grade summary
async function loadGradeSummary() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Get student ID from user data stored in localStorage
    const studentId = localStorage.getItem('studentId') || localStorage.getItem('username') || '1';
    
    try {
        const response = await fetch(`/api/grades/student/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const grades = await response.json();
            const summaryContainer = document.getElementById('gradeSummary');
            
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