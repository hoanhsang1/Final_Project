export interface StudentItem {
  id: string;
  orgId: string;
  studentCode: string;
  fullName: string;
  dateOfBirth?: string | null;
  email?: string | null;
  phone?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  classId?: string | null;
  classCode?: string | null;
  className?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface StudentPayload {
  studentCode: string;
  fullName: string;
  dateOfBirth?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string;
}

export interface StudentUpdatePayload {
  fullName: string;
  dateOfBirth?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string;
}

export interface StudentListQuery {
  page?: number;
  size?: number;
  status?: string;
  classId?: string;
  q?: string;
}

export interface SchoolClassItem {
  id: string;
  orgId: string;
  classCode: string;
  name: string;
  academicYear?: string | null;
  status: 'active' | 'inactive' | 'archived';
  studentCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface SchoolClassPayload {
  classCode: string;
  name: string;
  academicYear?: string | null;
  status?: string;
}

export interface SchoolClassUpdatePayload {
  name: string;
  academicYear?: string | null;
  status?: string;
}

export interface SchoolClassListQuery {
  page?: number;
  size?: number;
  q?: string;
  status?: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  modules: string[];
}

export interface DepartmentPayload {
  name: string;
  description?: string | null;
  moduleCodes: string[];
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

