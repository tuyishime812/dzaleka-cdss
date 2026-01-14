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

    // Load subjects
    loadSubjects();

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
        const response = await fetch('/api/grades/staff', {
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
                    (grade.student_name && grade.student_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                    grade.subject.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            let gradesHtml = '<div class="table-responsive"><table class="table table-striped"><thead><tr><th>Student ID</th><th>Student Name</th><th>Subject</th><th>Type</th><th>Grade</th><th>Date</th><th>Teacher</th><th>Actions</th></tr></thead><tbody>';

            filteredGrades.forEach(grade => {
                gradesHtml += `
                    <tr>
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

// Function to load subjects
async function loadSubjects() {
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
            const subjectSelect = document.getElementById('subject');
            const editSubjectSelect = document.getElementById('editSubject');

            // Clear existing options except the first one
            if (subjectSelect) {
                subjectSelect.innerHTML = '<option value="">Select Subject</option>';
                subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject.name;
                    option.textContent = subject.name;
                    subjectSelect.appendChild(option);
                });
            }

            if (editSubjectSelect) {
                editSubjectSelect.innerHTML = '<option value="">Select Subject</option>';
                subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject.name;
                    option.textContent = subject.name;
                    editSubjectSelect.appendChild(option);
                });
            }
        } else {
            console.error('Error loading subjects:', await response.text());
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

// Function to add a new subject
async function addSubject() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSubjectInput = document.getElementById('newSubject');
    if (!newSubjectInput) return;

    const subjectName = newSubjectInput.value.trim();
    if (!subjectName) {
        alert('Please enter a subject name');
        return;
    }

    try {
        const response = await fetch('/api/subjects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: subjectName })
        });

        if (response.ok) {
            const newSubject = await response.json();
            alert('Subject added successfully!');
            newSubjectInput.value = ''; // Clear the input

            // Reload subjects to include the new one
            loadSubjects();
        } else {
            const error = await response.json();
            alert('Error adding subject: ' + error.message);
        }
    } catch (error) {
        console.error('Error adding subject:', error);
        alert('Error adding subject: ' + error.message);
    }
}

// Function to load students for the dropdown
async function loadStudentsForDropdown() {
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
            const studentSelect = document.getElementById('studentId');
            const editStudentSelect = document.getElementById('editStudentId');

            // Clear existing options except the first one
            if (studentSelect) {
                studentSelect.innerHTML = '<option value="">Select Student</option>';
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.student_id;
                    option.textContent = `${student.name} (${student.student_id})`;
                    studentSelect.appendChild(option);
                });
            }

            if (editStudentSelect) {
                editStudentSelect.innerHTML = '<option value="">Select Student</option>';
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.student_id;
                    option.textContent = `${student.name} (${student.student_id})`;
                    editStudentSelect.appendChild(option);
                });
            }
        } else {
            console.error('Error loading students:', await response.text());
        }
    } catch (error) {
        console.error('Error loading students:', error);
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
                            <select class="form-control" id="editStudentId" required>
                                <option value="">Select Student</option>
                                <!-- Options will be loaded dynamically -->
                            </select>
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

    // Load students and subjects into the dropdowns with current values selected
    setTimeout(() => {
        loadStudentsForEdit(studentId);
        loadSubjectsForEdit(subject);
    }, 100); // Small delay to ensure DOM is ready

    // Remove modal when hidden
    modal.addEventListener('hidden.bs.modal', function() {
        modal.remove();
    });
}

// Function to load students for the edit form with the current value selected
async function loadStudentsForEdit(currentStudentId) {
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
            const studentSelect = document.getElementById('editStudentId');

            if (studentSelect) {
                studentSelect.innerHTML = '<option value="">Select Student</option>';
                students.forEach(student => {
                    const option = document.createElement('option');
                    option.value = student.student_id;
                    option.textContent = `${student.name} (${student.student_id})`;
                    if (student.student_id === currentStudentId) {
                        option.selected = true;
                    }
                    studentSelect.appendChild(option);
                });
            }
        } else {
            console.error('Error loading students for edit:', await response.text());
        }
    } catch (error) {
        console.error('Error loading students for edit:', error);
    }
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
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            });

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

// Function to load subjects
async function loadSubjects() {
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
            const subjectSelect = document.getElementById('subject');
            const examTypeSelect = document.getElementById('examType');
            const editSubjectSelect = document.getElementById('editSubject');
            const editExamTypeSelect = document.getElementById('editExamType');

            // Populate subject dropdowns
            if (subjectSelect) {
                subjectSelect.innerHTML = '<option value="">Select Subject</option>';
                subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject.name;
                    option.textContent = subject.name;
                    subjectSelect.appendChild(option);
                });
            }

            if (editSubjectSelect) {
                editSubjectSelect.innerHTML = '<option value="">Select Subject</option>';
                subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject.name;
                    option.textContent = subject.name;
                    editSubjectSelect.appendChild(option);
                });
            }

            // Populate exam type dropdowns with default options
            const examTypes = ['Exam', 'Quiz', 'Assignment', 'Project'];

            if (examTypeSelect) {
                examTypeSelect.innerHTML = '<option value="">Select Exam Type</option>';
                examTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.toLowerCase();
                    option.textContent = type;
                    examTypeSelect.appendChild(option);
                });
            }

            if (editExamTypeSelect) {
                editExamTypeSelect.innerHTML = '<option value="">Select Exam Type</option>';
                examTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.toLowerCase();
                    option.textContent = type;
                    editExamTypeSelect.appendChild(option);
                });
            }

            // Load subjects list in the management section
            loadSubjectsList();
        } else {
            console.error('Error loading subjects:', await response.text());
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

// Function to load subjects list for management
async function loadSubjectsList() {
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
            const subjectsListContainer = document.getElementById('subjectsList');

            if (!subjectsListContainer) {
                console.error('Subjects list container not found');
                return;
            }

            if (subjects.length === 0) {
                subjectsListContainer.innerHTML = '<p class="text-muted">No subjects available.</p>';
                return;
            }

            let subjectsHtml = '<div class="list-group">';
            subjects.forEach(subject => {
                subjectsHtml += `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${subject.name}</span>
                        <div>
                            <button class="btn btn-sm btn-warning me-1" onclick="editSubject(${subject.id}, '${subject.name.replace(/'/g, "\\'")}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteSubject(${subject.id}, '${subject.name.replace(/'/g, "\\'")}')">Delete</button>
                        </div>
                    </div>
                `;
            });
            subjectsHtml += '</div>';

            subjectsListContainer.innerHTML = subjectsHtml;
        } else {
            console.error('Error loading subjects list:', await response.text());
        }
    } catch (error) {
        console.error('Error loading subjects list:', error);
    }
}

// Function to add a new subject
async function addSubject() {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSubjectInput = document.getElementById('newSubject');
    if (!newSubjectInput) return;

    const subjectName = newSubjectInput.value.trim();
    if (!subjectName) {
        alert('Please enter a subject name');
        return;
    }

    try {
        const response = await fetch('/api/subjects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: subjectName })
        });

        if (response.ok) {
            const newSubject = await response.json();
            alert('Subject added successfully!');
            newSubjectInput.value = ''; // Clear the input

            // Reload subjects to include the new one
            loadSubjects();
        } else {
            const error = await response.json();
            alert('Error adding subject: ' + error.message);
        }
    } catch (error) {
        console.error('Error adding subject:', error);
        alert('Error adding subject: ' + error.message);
    }
}

// Function to edit a subject
async function editSubject(subjectId, currentName) {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newName = prompt('Enter new name for the subject:', currentName);
    if (!newName || newName.trim() === '') {
        alert('Subject name cannot be empty');
        return;
    }

    try {
        const response = await fetch(`/api/subjects/${subjectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: newName.trim() })
        });

        if (response.ok) {
            const result = await response.json();
            alert('Subject updated successfully!');

            // Reload subjects to reflect the change
            loadSubjects();
        } else {
            const error = await response.json();
            alert('Error updating subject: ' + error.message);
        }
    } catch (error) {
        console.error('Error updating subject:', error);
        alert('Error updating subject: ' + error.message);
    }
}

// Function to delete a subject
async function deleteSubject(subjectId, subjectName) {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (!confirm(`Are you sure you want to delete the subject "${subjectName}"? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/subjects/${subjectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            alert('Subject deleted successfully!');

            // Reload subjects to reflect the change
            loadSubjects();
        } else {
            const error = await response.json();
            alert('Error deleting subject: ' + error.message);
        }
    } catch (error) {
        console.error('Error deleting subject:', error);
        alert('Error deleting subject: ' + error.message);
    }
}