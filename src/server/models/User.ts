export interface User {
  id: number;
  username: string;
  email: string;
  password: string; // This should be hashed
  role: 'student' | 'teacher' | 'staff' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
  userType: string;
}

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: string;
}