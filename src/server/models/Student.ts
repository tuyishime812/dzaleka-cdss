export interface Student {
  id: number;
  studentId: string;
  name: string;
  email: string;
  class: string;
  dateOfBirth?: Date;
  parentId?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentInput {
  studentId: string;
  name: string;
  email: string;
  class: string;
  dateOfBirth?: Date;
  parentId?: number;
}