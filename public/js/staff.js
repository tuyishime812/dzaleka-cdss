// Staff dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Load statistics
    loadStatistics();
    
    // Load announcements
    loadAnnouncements();
    
    // Set up event listeners for forms
    setupEventListeners();
});

// Function to set up event listeners
function setupEventListeners() {
    // Student form submission
    const studentForm = document.getElementById('studentForm');
    if (studentForm) {
        studentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('studentName').value;
            const email = document.getElementById('studentEmail').value;
            const classValue = document.getElementById('studentClass').value;
            const studentId = document.getElementById('studentId').value;
            
            try {
                const response = await fetch('/api/students', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        studentId: studentId,
                        name: name,
                        email: email,
                        class: classValue
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    alert('Student added successfully!');
                    studentForm.reset();
                } else {
                    const error = await response.json();
                    alert('Error adding student: ' + error.message);
                }
            } catch (error) {
                console.error('Error adding student:', error);
                alert('Error adding student: ' + error.message);
            }
        });
    }
    
    // Teacher form submission
    const teacherForm = document.getElementById('teacherForm');
    if (teacherForm) {
        teacherForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('teacherName').value;
            const email = document.getElementById('teacherEmail').value;
            const subject = document.getElementById('teacherSubject').value;
            const teacherId = document.getElementById('teacherId').value;
            
            try {
                const response = await fetch('/api/teachers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        teacherId: teacherId,
                        name: name,
                        email: email,
                        subject: subject
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    alert('Teacher added successfully!');
                    teacherForm.reset();
                } else {
                    const error = await response.json();
                    alert('Error adding teacher: ' + error.message);
                }
            } catch (error) {
                console.error('Error adding teacher:', error);
                alert('Error adding teacher: ' + error.message);
            }
        });
    }
    
    // Announcement form submission
    const announcementForm = document.getElementById('announcementForm');
    if (announcementForm) {
        announcementForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const title = document.getElementById('announcementTitle').value;
            const content = document.getElementById('announcementContent').value;
            const date = document.getElementById('announcementDate').value;
            
            try {
                const response = await fetch('/api/staff/announcements', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        title: title,
                        content: content,
                        date: date
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    alert('Announcement posted successfully!');
                    announcementForm.reset();
                    
                    // Reload announcements
                    loadAnnouncements();
                } else {
                    const error = await response.json();
                    alert('Error posting announcement: ' + error.message);
                }
            } catch (error) {
                console.error('Error posting announcement:', error);
                alert('Error posting announcement: ' + error.message);
            }
        });
    }
}

// Function to load statistics
async function loadStatistics() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/staff/statistics', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            
            document.getElementById('totalStudents').textContent = stats.totalStudents;
            document.getElementById('totalTeachers').textContent = stats.totalTeachers;
            document.getElementById('totalClasses').textContent = stats.totalClasses;
            document.getElementById('avgGrade').textContent = stats.averageGrade + '%';
        } else {
            console.error('Error loading statistics:', await response.text());
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
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
                announcementsContainer.innerHTML = '<p>No announcements found</p>';
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
                        <div class="mt-2">
                            <button class="btn btn-sm btn-warning me-2" onclick="editAnnouncement(${announcement.id})">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement(${announcement.id})">Delete</button>
                        </div>
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

// Function to edit an announcement
async function editAnnouncement(announcementId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Prompt for new values (in a real app, this would be a modal form)
    const newTitle = prompt('Enter new title:');
    if (newTitle === null) return; // User cancelled
    
    const newContent = prompt('Enter new content:');
    if (newContent === null) return; // User cancelled
    
    const newDate = prompt('Enter new date (YYYY-MM-DD):');
    if (newDate === null) return; // User cancelled
    
    try {
        const response = await fetch(`/api/staff/announcements/${announcementId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: newTitle,
                content: newContent,
                date: newDate
            })
        });
        
        if (response.ok) {
            alert('Announcement updated successfully!');
            loadAnnouncements(); // Refresh the list
        } else {
            const error = await response.json();
            alert('Error updating announcement: ' + error.message);
        }
    } catch (error) {
        console.error('Error updating announcement:', error);
        alert('Error updating announcement: ' + error.message);
    }
}

// Function to delete an announcement
async function deleteAnnouncement(announcementId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    if (!confirm('Are you sure you want to delete this announcement?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/staff/announcements/${announcementId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            alert('Announcement deleted successfully!');
            loadAnnouncements(); // Refresh the list
        } else {
            const error = await response.json();
            alert('Error deleting announcement: ' + error.message);
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        alert('Error deleting announcement: ' + error.message);
    }
}