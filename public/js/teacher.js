// Teacher dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Set up the grade upload form
    const gradeUploadForm = document.getElementById('gradeUploadForm');
    if (gradeUploadForm) {
        gradeUploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const studentId = document.getElementById('studentId').value;
            const subject = document.getElementById('subject').value;
            const examType = document.getElementById('examType').value;
            const grade = document.getElementById('grade').value;
            const date = document.getElementById('date').value;
            
            // Get teacher ID from user data stored in localStorage
            const teacherId = localStorage.getItem('userId') || 1; // Fallback to 1 if not found
            
            try {
                const response = await fetch('/api/grades', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        studentId: parseInt(studentId),
                        subject: subject,
                        examType: examType,
                        grade: parseFloat(grade),
                        date: date,
                        teacherId: teacherId
                    })
                });
                
                if (response.ok) {
                    const newGrade = await response.json();
                    alert('Grade uploaded successfully!');
                    gradeUploadForm.reset();
                    
                    // Optionally, update the recent grades list
                    loadRecentGrades();
                } else {
                    const error = await response.json();
                    alert('Error uploading grade: ' + error.message);
                }
            } catch (error) {
                console.error('Error uploading grade:', error);
                alert('Error uploading grade: ' + error.message);
            }
        });
    }
    
    // Load recent grades
    loadRecentGrades();
    
    // Load students
    loadStudents();
});

// Function to load recent grades
async function loadRecentGrades() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        // For this example, we'll fetch grades for the teacher
        // In a real implementation, we'd have an endpoint to get teacher's grades
        const response = await fetch('/api/grades/teacher', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const grades = await response.json();
            const gradesContainer = document.getElementById('recentGrades');
            
            if (grades.length === 0) {
                gradesContainer.innerHTML = '<p>No grades uploaded yet.</p>';
                return;
            }
            
            let gradesHtml = '<ul class="list-group">';
            grades.forEach(grade => {
                gradesHtml += `
                    <li class="list-group-item">
                        <strong>Student:</strong> ${grade.student_name || 'N/A'} |
                        <strong>Subject:</strong> ${grade.subject} |
                        <strong>Type:</strong> ${grade.exam_type} |
                        <strong>Grade:</strong> ${grade.grade} |
                        <strong>Date:</strong> ${new Date(grade.date).toLocaleDateString()}
                    </li>
                `;
            });
            gradesHtml += '</ul>';
            
            gradesContainer.innerHTML = gradesHtml;
        } else {
            console.error('Error loading grades:', await response.text());
        }
    } catch (error) {
        console.error('Error loading grades:', error);
    }
}

// Function to load students
async function loadStudents() {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch('/api/students', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const students = await response.json();
            const tableBody = document.querySelector('#studentsTable tbody');
            
            if (students.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No students found</td></tr>';
                return;
            }
            
            tableBody.innerHTML = '';
            students.forEach(student => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.student_id}</td>
                    <td>${student.name}</td>
                    <td>${student.email}</td>
                    <td>${student.class}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewGrades('${student.student_id}')">View Grades</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            console.error('Error loading students:', await response.text());
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

// Function to view a student's grades
async function viewGrades(studentId) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
        const response = await fetch(`/api/grades/student/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const grades = await response.json();
            
            // Create a modal or new page to show grades
            let gradesHtml = '<h5>Grades for Student: ' + studentId + '</h5>';
            gradesHtml += '<table class="table"><thead><tr><th>Subject</th><th>Type</th><th>Grade</th><th>Date</th></tr></thead><tbody>';
            
            grades.forEach(grade => {
                gradesHtml += `
                    <tr>
                        <td>${grade.subject}</td>
                        <td>${grade.exam_type}</td>
                        <td>${grade.grade}</td>
                        <td>${new Date(grade.date).toLocaleDateString()}</td>
                    </tr>
                `;
            });
            
            gradesHtml += '</tbody></table>';
            
            // Show grades in a modal or alert
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'gradesModal';
            modal.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Student Grades</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${gradesHtml}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
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
        } else {
            alert('Error loading grades: ' + await response.text());
        }
    } catch (error) {
        console.error('Error loading grades:', error);
        alert('Error loading grades: ' + error.message);
    }
}