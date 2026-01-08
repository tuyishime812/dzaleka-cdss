export interface Teacher {
  id: number;
  teacherId: string;
  name: string;
  email: string;
  subject: string;
  classAssigned?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherInput {
  teacherId: string;
  name: string;
  email: string;
  subject: string;
  classAssigned?: string;
}