export interface Grade {
  id: number;
  studentId: number;
  subject: string;
  examType: 'exam' | 'quiz' | 'assignment' | 'project';
  grade: number; // Numeric grade (0-100)
  date: Date;
  teacherId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GradeInput {
  studentId: number;
  subject: string;
  examType: 'exam' | 'quiz' | 'assignment' | 'project';
  grade: number;
  date: Date;
  teacherId: number;
}