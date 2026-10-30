import { apiClient } from '../../lib/api';
import type {
  CreateMemberPayload,
  CreatedMemberResult,
  DepartmentItem,
  DepartmentMemberItem,
  DepartmentPayload,
  PageResponse,
  PermissionItem,
  PositionItem,
  PositionPayload,
  SchoolClassItem,
  SchoolClassListQuery,
  SchoolClassPayload,
  SchoolClassUpdatePayload,
  StudentItem,
  StudentListQuery,
  StudentPayload,
  StudentUpdatePayload,
} from './types';

export class PortalApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, status: number | null, code: string | null = null) {
    super(message);
    this.name = 'PortalApiError';
    this.status = status;
    this.code = code;
  }
}

function toPortalError(error: unknown): PortalApiError {
  const err = error as {
    response?: {
      status?: number;
      data?: { message?: string; code?: string; error?: string } | null;
    };
    request?: unknown;
  };
  const status = err?.response?.status ?? null;
  const code = err?.response?.data?.code ?? null;
  const rawMsg = err?.response?.data?.message || err?.response?.data?.error;

  if (typeof rawMsg === 'string' && rawMsg.length > 0) {
    if (code === 'PASSWORD_CHANGE_REQUIRED' || rawMsg.includes('temporary password')) {
      return new PortalApiError(
        'Tài khoản đang mang mật khẩu tạm thời. Vui lòng đổi mật khẩu trước khi thao tác nghiệp vụ.',
        status,
        code,
      );
    }
    return new PortalApiError(
      code ? `[${code}] ${rawMsg}` : rawMsg,
      status,
      code,
    );
  }

  if (status === 403) {
    return new PortalApiError(
      'Bạn không có quyền thực hiện thao tác này (403 Forbidden). Vui lòng kiểm tra lại quyền của tài khoản.',
      status,
      code,
    );
  }

  if (status === 502 || status === 503) {
    return new PortalApiError(
      'Dịch vụ máy chủ đang khởi động hoặc tạm thời gián đoạn. Vui lòng thử lại sau giây lát.',
      status,
      code,
    );
  }

  if (err?.request) {
    return new PortalApiError('Không thể kết nối tới máy chủ.', status);
  }
  return new PortalApiError('Đã xảy ra lỗi, vui lòng thử lại.', status);
}

// ========================
// Sinh viên (Students)
// ========================
export async function fetchStudents(query: StudentListQuery = {}): Promise<PageResponse<StudentItem>> {
  try {
    const { data } = await apiClient.get<PageResponse<StudentItem>>('/students', {
      params: query,
    });
    if (typeof data === 'string' || !data || !Array.isArray(data.items)) {
      return { items: [], total: 0, page: query.page ?? 1, size: query.size ?? 20 };
    }
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function fetchStudentDetail(id: string): Promise<StudentItem> {
  try {
    const { data } = await apiClient.get<StudentItem>(`/students/${id}`);
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function createStudent(payload: StudentPayload): Promise<StudentItem> {
  try {
    const { data } = await apiClient.post<StudentItem>('/students', payload);
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function updateStudent(id: string, payload: StudentUpdatePayload): Promise<StudentItem> {
  try {
    const { data } = await apiClient.put<StudentItem>(`/students/${id}`, payload);
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function deleteStudent(id: string): Promise<void> {
  try {
    await apiClient.delete(`/students/${id}`);
  } catch (error) {
    throw toPortalError(error);
  }
}

// ========================
// Lớp học (School Classes)
// ========================
export async function fetchClasses(query: SchoolClassListQuery = {}): Promise<PageResponse<SchoolClassItem>> {
  try {
    const { data } = await apiClient.get<PageResponse<SchoolClassItem>>('/classes', {
      params: query,
    });
    if (typeof data === 'string' || !data || !Array.isArray(data.items)) {
      return { items: [], total: 0, page: query.page ?? 1, size: query.size ?? 20 };
    }
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function fetchClassDetail(id: string): Promise<SchoolClassItem> {
  try {
    const { data } = await apiClient.get<SchoolClassItem>(`/classes/${id}`);
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function createClass(payload: SchoolClassPayload): Promise<SchoolClassItem> {
  try {
    const { data } = await apiClient.post<SchoolClassItem>('/classes', payload);
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function updateClass(id: string, payload: SchoolClassUpdatePayload): Promise<SchoolClassItem> {
  try {
    const { data } = await apiClient.put<SchoolClassItem>(`/classes/${id}`, payload);
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function deleteClass(id: string): Promise<void> {
  try {
    await apiClient.delete(`/classes/${id}`);
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function fetchClassStudents(classId: string): Promise<StudentItem[]> {
  try {
    const { data } = await apiClient.get<StudentItem[]>(`/classes/${classId}/students`);
    if (typeof data === 'string' || !Array.isArray(data)) {
      return [];
    }
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function enrollStudentInClass(classId: string, studentId: string): Promise<void> {
  try {
    await apiClient.put(`/classes/${classId}/students/${studentId}`);
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function removeStudentFromClass(classId: string, studentId: string): Promise<void> {
  try {
    await apiClient.delete(`/classes/${classId}/students/${studentId}`);
  } catch (error) {
    throw toPortalError(error);
  }
}

// ========================
// Phòng ban (Departments)
// ========================
export async function fetchDepartments(): Promise<DepartmentItem[]> {
  try {
    const { data } = await apiClient.get<DepartmentItem[]>('/departments');
    if (typeof data === 'string' || !Array.isArray(data)) {
      return [];
    }
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function createDepartment(payload: DepartmentPayload): Promise<DepartmentItem> {
  try {
    const { data } = await apiClient.post<DepartmentItem>('/departments', payload);
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function updateDepartment(id: string, payload: DepartmentPayload): Promise<DepartmentItem> {
  try {
    const { data } = await apiClient.put<DepartmentItem>(`/departments/${id}`, payload);
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function deleteDepartment(id: string): Promise<void> {
  try {
    await apiClient.delete(`/departments/${id}`);
  } catch (error) {
    throw toPortalError(error);
  }
}

// ========================
// Quyền & Chức vụ (Permissions & Positions)
// ========================
export async function fetchPermissions(): Promise<PermissionItem[]> {
  try {
    const { data } = await apiClient.get<PermissionItem[]>('/permissions');
    if (typeof data === 'string' || !Array.isArray(data)) {
      return [];
    }
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function fetchPositions(): Promise<PositionItem[]> {
  try {
    const { data } = await apiClient.get<PositionItem[]>('/positions');
    if (typeof data === 'string' || !Array.isArray(data)) {
      return [];
    }
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function createPosition(payload: PositionPayload): Promise<PositionItem> {
  try {
    const { data } = await apiClient.post<PositionItem>('/positions', payload);
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function updatePosition(id: string, payload: PositionPayload): Promise<PositionItem> {
  try {
    const { data } = await apiClient.put<PositionItem>(`/positions/${id}`, payload);
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function deletePosition(id: string): Promise<void> {
  try {
    await apiClient.delete(`/positions/${id}`);
  } catch (error) {
    throw toPortalError(error);
  }
}

// ========================
// Nhân sự phòng ban (Department Members)
// ========================
export async function fetchDepartmentMembers(departmentId: string): Promise<DepartmentMemberItem[]> {
  try {
    const { data } = await apiClient.get<DepartmentMemberItem[]>(`/departments/${departmentId}/members`);
    if (typeof data === 'string' || !Array.isArray(data)) {
      return [];
    }
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function createDepartmentMember(
  departmentId: string,
  payload: CreateMemberPayload,
): Promise<CreatedMemberResult> {
  try {
    const { data } = await apiClient.post<CreatedMemberResult>(`/departments/${departmentId}/members`, payload);
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function updateDepartmentMemberPositions(
  departmentId: string,
  userId: string,
  positionIds: string[],
): Promise<DepartmentMemberItem> {
  try {
    const { data } = await apiClient.put<DepartmentMemberItem>(
      `/departments/${departmentId}/members/${userId}/positions`,
      { positionIds },
    );
    return data;
  } catch (error) {
    throw toPortalError(error);
  }
}

export async function removeDepartmentMember(departmentId: string, userId: string): Promise<void> {
  try {
    await apiClient.delete(`/departments/${departmentId}/members/${userId}`);
  } catch (error) {
    throw toPortalError(error);
  }
}


