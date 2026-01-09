// Staff dashboard functionality
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

            if (!studentId || !subject || !examType || !grade || !date) {
                alert('Please fill in all fields');
                return;
            }

            try {
                const response = await fetch('/api/grades', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
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
                    const newGrade = await response.json();
                    alert('Grade added successfully!');
                    gradeUploadForm.reset();

                    // Update the grades list
                    loadAllGrades();
                } else {
                    const error = await response.json();
                    alert('Error adding grade: ' + error.message);
                }
            } catch (error) {
                console.error('Error adding grade:', error);
                alert('Error adding grade: ' + error.message);
            }
        });
    }

    // Load all grades
    loadAllGrades();

    // Load students
    loadStudents();

    // Set up search functionality
    const gradeSearch = document.getElementById('gradeSearch');
    if (gradeSearch) {
        gradeSearch.addEventListener('input', function() {
            loadAllGrades(this.value);
        });
    }
});

// Function to load all grades with optional search
async function loadAllGrades(searchTerm = '') {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        let url = '/api/grades/staff';
        if (searchTerm) {
            // For search, we'll need to filter client-side since the API doesn't support search
            url = '/api/grades/staff';
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const grades = await response.json();
            const gradesContainer = document.getElementById('allGrades');

            if (grades.length === 0) {
                gradesContainer.innerHTML = '<p>No grades found.</p>';
                return;
            }

            // Filter grades if search term is provided
            let filteredGrades = grades;
            if (searchTerm) {
                filteredGrades = grades.filter(grade =>
                    grade.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (grade.student_name && grade.student_name.toLowerCase().includes(searchTerm.toLowerCase()))
                );
            }

            let gradesHtml = '<div class="table-responsive"><table class="table table-striped"><thead><tr><th>Student ID</th><th>Student Name</th><th>Subject</th><th>Type</th><th>Grade</th><th>Date</th><th>Actions</th></tr></thead><tbody>';

            filteredGrades.forEach(grade => {
                gradesHtml += `
                    <tr>
                        <td>${grade.student_id}</td>
                        <td>${grade.student_name || 'N/A'}</td>
                        <td>${grade.subject}</td>
                        <td>${grade.exam_type}</td>
                        <td>${grade.grade}</td>
                        <td>${new Date(grade.date).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-sm btn-warning me-1" onclick="editGrade(${grade.id}, '${grade.student_id}', '${grade.subject}', '${grade.exam_type}', ${grade.grade}, '${grade.date}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteGrade(${grade.id})">Delete</button>
                        </td>
                    </tr>
                `;
            });

            gradesHtml += '</tbody></table></div>';

            gradesContainer.innerHTML = gradesHtml;
        } else {
            console.error('Error loading grades:', await response.text());
        }
    } catch (error) {
        console.error('Error loading grades:', error);
    }
}

// Function to edit a grade
async function editGrade(gradeId, studentId, subject, examType, grade, date) {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Create a modal for editing
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'editGradeModal';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Grade</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
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
                            <input type="text" class="form-control" id="editSubject" value="${subject}" required>
                        </div>
                        <div class="mb-3">
                            <label for="editExamType" class="form-label">Exam Type</label>
                            <select class="form-control" id="editExamType">
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

    // Remove modal when hidden
    modal.addEventListener('hidden.bs.modal', function() {
        modal.remove();
    });
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
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
            const modal = document.getElementById('editGradeModal');
            const bsModal = bootstrap.Modal.getInstance(modal);
            bsModal.hide();

            // Refresh the grades list
            loadAllGrades();
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
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            alert('Grade deleted successfully!');

            // Refresh the grades list
            loadAllGrades();
        } else {
            const error = await response.json();
            alert('Error deleting grade: ' + error.message);
        }
    } catch (error) {
        console.error('Error deleting grade:', error);
        alert('Error deleting grade: ' + error.message);
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