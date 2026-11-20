import { api } from '@/services/http'
import type {
  ClassCloseEvent,
  ClassInput,
  ClassStatusLog,
  ClassUpdateInput,
  PageResponse,
  SchoolClass,
  Student,
  StudentAccount,
  StudentClass,
  StudentInput,
  Subject,
  SubjectInput,
  TeacherDetail,
  TeacherItem,
  TeacherUpdateInput,
} from '@/features/academic/types'

export const teachersApi = {
  async list(params: {
    page?: number
    size?: number
    q?: string
    specialtyId?: string
    teachingStatus?: string
  }): Promise<PageResponse<TeacherItem>> {
    const { data } = await api.get<PageResponse<TeacherItem>>('/teachers', { params })
    return data
  },

  /** Hồ sơ giáo viên của chính người đang đăng nhập. */
  async me(): Promise<TeacherDetail> {
    const { data } = await api.get<TeacherDetail>('/teachers/me')
    return data
  },

  async byId(staffId: string): Promise<TeacherDetail> {
    const { data } = await api.get<TeacherDetail>(`/teachers/${staffId}`)
    return data
  },

  async assignable(params: { page?: number; size?: number; q?: string }): Promise<PageResponse<TeacherItem>> {
    const { data } = await api.get<PageResponse<TeacherItem>>('/teachers/assignable', { params })
    return data
  },

  async update(staffId: string, input: TeacherUpdateInput): Promise<TeacherDetail> {
    const { data } = await api.put<TeacherDetail>(`/teachers/${staffId}`, input)
    return data
  },

  async changeStatus(
    staffId: string,
    status: 'DANG_DAY' | 'TAM_NGHI' | 'NGHI_VIEC',
  ): Promise<TeacherDetail> {
    const { data } = await api.put<TeacherDetail>(`/teachers/${staffId}/teaching-status`, { status })
    return data
  },
}

export const studentsApi = {
  async list(params: {
    page?: number
    size?: number
    status?: string
    classId?: string
    q?: string
  }): Promise<PageResponse<Student>> {
    const { data } = await api.get<PageResponse<Student>>('/students', { params })
    return data
  },

  async me(): Promise<Student> {
    const { data } = await api.get<Student>('/students/me')
    return data
  },

  async myClasses(): Promise<StudentClass[]> {
    const { data } = await api.get<StudentClass[]>('/students/me/classes')
    return data
  },

  async byId(id: string): Promise<Student> {
    const { data } = await api.get<Student>(`/students/${id}`)
    return data
  },

  async create(input: StudentInput): Promise<Student> {
    const { data } = await api.post<Student>('/students', input)
    return data
  },

  async update(id: string, input: StudentInput): Promise<Student> {
    const { studentCode, ...rest } = input
    void studentCode
    const { data } = await api.put<Student>(`/students/${id}`, rest)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/students/${id}`)
  },

  async createAccount(id: string): Promise<StudentAccount> {
    const { data } = await api.post<StudentAccount>(`/students/${id}/account`)
    return data
  },
}

export const classesApi = {
  async list(params: {
    page?: number
    size?: number
    q?: string
    status?: string
    selectable?: boolean
    needsReassignment?: boolean
  }): Promise<PageResponse<SchoolClass>> {
    const { data } = await api.get<PageResponse<SchoolClass>>('/classes', { params })
    return data
  },

  /** Lớp được phân công cho chính giáo viên đang đăng nhập. */
  async mine(params: { page?: number; size?: number; q?: string; status?: string }): Promise<
    PageResponse<SchoolClass>
  > {
    const { data } = await api.get<PageResponse<SchoolClass>>('/classes/me', { params })
    return data
  },

  /** Sinh viên trong lớp mình phụ trách (chỉ chủ lớp gọi được). */
  async myStudents(id: string): Promise<Student[]> {
    const { data } = await api.get<Student[]>(`/classes/me/${id}/students`)
    return data
  },

  async byId(id: string): Promise<SchoolClass> {
    const { data } = await api.get<SchoolClass>(`/classes/${id}`)
    return data
  },

  async create(input: ClassInput): Promise<SchoolClass> {
    const { data } = await api.post<SchoolClass>('/classes', input)
    return data
  },

  async update(id: string, input: ClassUpdateInput): Promise<SchoolClass> {
    const { data } = await api.put<SchoolClass>(`/classes/${id}`, input)
    return data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/classes/${id}`)
  },

  async assignTeacher(id: string, teacherId: string, version: number): Promise<SchoolClass> {
    const { data } = await api.put<SchoolClass>(`/classes/${id}/teacher`, { teacherId, version })
    return data
  },

  async reassignTeacher(id: string, teacherId: string, version: number): Promise<SchoolClass> {
    const { data } = await api.put<SchoolClass>(`/classes/${id}/teacher/reassign`, {
      teacherId,
      version,
    })
    return data
  },

  async requestCancel(id: string, reason: string, version: number): Promise<SchoolClass> {
    const { data } = await api.post<SchoolClass>(`/classes/${id}/cancel`, { reason, version })
    return data
  },

  async approveCancel(id: string): Promise<SchoolClass> {
    const { data } = await api.post<SchoolClass>(`/classes/${id}/cancel-requests/approve`)
    return data
  },

  async rejectCancel(id: string, reason: string): Promise<SchoolClass> {
    const { data } = await api.post<SchoolClass>(`/classes/${id}/cancel-requests/reject`, {
      reason,
    })
    return data
  },

  async requestClose(id: string, note?: string): Promise<SchoolClass> {
    const { data } = await api.post<SchoolClass>(`/classes/${id}/close-requests`, { note })
    return data
  },

  async approveClose(id: string): Promise<SchoolClass> {
    const { data } = await api.post<SchoolClass>(`/classes/${id}/close-requests/approve`)
    return data
  },

  async rejectClose(id: string, reason: string): Promise<SchoolClass> {
    const { data } = await api.post<SchoolClass>(`/classes/${id}/close-requests/reject`, {
      reason,
    })
    return data
  },

  async reopen(id: string, reason?: string): Promise<SchoolClass> {
    const { data } = await api.post<SchoolClass>(`/classes/${id}/reopen`, { reason })
    return data
  },

  async statusLogs(id: string): Promise<ClassStatusLog[]> {
    const { data } = await api.get<ClassStatusLog[]>(`/classes/${id}/status-logs`)
    return data
  },

  async closeEvents(id: string): Promise<ClassCloseEvent[]> {
    const { data } = await api.get<ClassCloseEvent[]>(`/classes/${id}/close-events`)
    return data
  },

  async students(id: string): Promise<Student[]> {
    const { data } = await api.get<Student[]>(`/classes/${id}/students`)
    return data
  },

  async addStudent(id: string, studentId: string): Promise<void> {
    await api.put(`/classes/${id}/students/${studentId}`)
  },

  async removeStudent(id: string, studentId: string): Promise<void> {
    await api.delete(`/classes/${id}/students/${studentId}`)
  },
}

export const subjectsApi = {
  async list(params?: { q?: string; includeInactive?: boolean }): Promise<Subject[]> {
    const { data } = await api.get<Subject[]>('/api/subjects', {
      params: {
        q: params?.q || undefined,
        includeInactive: params?.includeInactive || undefined,
      },
    })
    return data
  },

  async byId(id: string): Promise<Subject> {
    const { data } = await api.get<Subject>(`/api/subjects/${id}`)
    return data
  },

  async create(input: SubjectInput): Promise<Subject> {
    const { data } = await api.post<Subject>('/api/subjects', input)
    return data
  },

  async update(id: string, input: SubjectInput): Promise<Subject> {
    const { data } = await api.put<Subject>(`/api/subjects/${id}`, input)
    return data
  },

  async setActive(id: string, active: boolean): Promise<Subject> {
    const { data } = await api.patch<Subject>(`/api/subjects/${id}/status`, { active })
    return data
  },
}
