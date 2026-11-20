import { api } from '@/services/http'
import type {
  ApplyCurriculumRequest,
  ClassCloseEvent,
  ClassInput,
  ClassStatusLog,
  ClassSubject,
  ClassSubjectCreateRequest,
  ClassSubjectHistoryResponse,
  ClassSubjectListResponse,
  ClassSubjectUpdateRequest,
  ClassUpdateInput,
  Curriculum,
  CurriculumCreateRequest,
  CurriculumSubject,
  CurriculumSubjectCreateRequest,
  CurriculumSubjectUpdateRequest,
  CurriculumSummary,
  CurriculumUpdateRequest,
  PageResponse,
  PrimarySubjectChangeRequest,
  PrimarySubjectChangeResponse,
  SchoolClass,
  SpecialtySubject,
  SpecialtySubjectUpdateRequest,
  Student,
  StudentAccount,
  StudentClass,
  StudentInput,
  Subject,
  SubjectCodeCheckResponse,
  SubjectCreateRequest,
  SubjectInput,
  SubjectUpdateRequest,
  SubjectUsageResponse,
  TeacherDetail,
  TeacherItem,
  TeacherSubject,
  TeacherSubjectCreateRequest,
  TeacherSubjectListResponse,
  TeacherSubjectUpdateRequest,
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
  /** D-13: GET /subjects trả mảng không phân trang */
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

  async create(input: SubjectCreateRequest | SubjectInput): Promise<Subject> {
    const { data } = await api.post<Subject>('/api/subjects', input)
    return data
  },

  async update(id: string, input: SubjectUpdateRequest | SubjectInput): Promise<Subject> {
    const { data } = await api.put<Subject>(`/api/subjects/${id}`, input)
    return data
  },

  async setActive(id: string, active: boolean): Promise<Subject> {
    const { data } = await api.patch<Subject>(`/api/subjects/${id}/status`, { active })
    return data
  },

  /** Đề xuất kiểm tra trùng mã môn học (Phase 1 BR-SUB-F06) */
  async checkCode(code: string, excludeId?: string): Promise<SubjectCodeCheckResponse> {
    const { data } = await api.get<SubjectCodeCheckResponse>('/api/subjects/check-code', {
      params: { code, excludeId: excludeId || undefined },
    })
    return data
  },

  /** Đề xuất lấy thông tin sử dụng môn học trong các lớp (Phase 1) */
  async usage(id: string): Promise<SubjectUsageResponse> {
    const { data } = await api.get<SubjectUsageResponse>(`/api/subjects/${id}/usage`)
    return data
  },
}

// ============================================================================
// Phase 1 — Academic Setup APIs (D-01 to D-15)
// ============================================================================

/**
 * Curricula API — Quản lý chương trình đào tạo và môn học trong CTĐT
 * Backend Dependency: Cần cấu hình route Gateway /api/curricula/** (WP4)
 */
export const curriculaApi = {
  async list(params?: {
    q?: string
    isActive?: boolean
    page?: number // 1-based
    size?: number
  }): Promise<PageResponse<CurriculumSummary>> {
    const { data } = await api.get<PageResponse<CurriculumSummary>>('/api/curricula', {
      params: {
        q: params?.q || undefined,
        isActive: params?.isActive !== undefined ? params.isActive : undefined,
        page: params?.page ?? 1,
        size: params?.size ?? 20,
      },
    })
    return data
  },

  async byId(id: string): Promise<Curriculum> {
    const { data } = await api.get<Curriculum>(`/api/curricula/${id}`)
    return data
  },

  async create(input: CurriculumCreateRequest): Promise<Curriculum> {
    const { data } = await api.post<Curriculum>('/api/curricula', input)
    return data
  },

  async update(id: string, input: CurriculumUpdateRequest): Promise<Curriculum> {
    const { data } = await api.put<Curriculum>(`/api/curricula/${id}`, input)
    return data
  },

  async setActive(id: string, active: boolean): Promise<Curriculum> {
    const { data } = await api.patch<Curriculum>(`/api/curricula/${id}/status`, { active })
    return data
  },

  async subjects(curriculumId: string): Promise<CurriculumSubject[]> {
    const { data } = await api.get<CurriculumSubject[]>(`/api/curricula/${curriculumId}/subjects`)
    return data
  },

  async addSubject(
    curriculumId: string,
    input: CurriculumSubjectCreateRequest,
  ): Promise<CurriculumSubject> {
    const { data } = await api.post<CurriculumSubject>(
      `/api/curricula/${curriculumId}/subjects`,
      input,
    )
    return data
  },

  async updateSubject(
    curriculumId: string,
    subjectId: string,
    input: CurriculumSubjectUpdateRequest,
  ): Promise<CurriculumSubject> {
    const { data } = await api.put<CurriculumSubject>(
      `/api/curricula/${curriculumId}/subjects/${subjectId}`,
      input,
    )
    return data
  },

  async removeSubject(curriculumId: string, subjectId: string): Promise<void> {
    await api.delete(`/api/curricula/${curriculumId}/subjects/${subjectId}`)
  },
}

/**
 * Class Subjects API — Quản lý môn học của lớp, đổi môn chính và lịch sử
 * Backend Dependency: PeopleService WP5 endpoints
 */
export const classSubjectsApi = {
  async list(classId: string): Promise<ClassSubjectListResponse> {
    const { data } = await api.get<ClassSubjectListResponse>(`/api/classes/${classId}/subjects`)
    return data
  },

  async applyCurriculum(
    classId: string,
    input: ApplyCurriculumRequest,
  ): Promise<ClassSubjectListResponse> {
    const { data } = await api.put<ClassSubjectListResponse>(
      `/api/classes/${classId}/curriculum`,
      input,
    )
    return data
  },

  async addSubject(classId: string, input: ClassSubjectCreateRequest): Promise<ClassSubject> {
    const { data } = await api.post<ClassSubject>(`/api/classes/${classId}/subjects`, input)
    return data
  },

  async updateSubject(
    classId: string,
    subjectId: string,
    input: ClassSubjectUpdateRequest,
  ): Promise<ClassSubject> {
    const { data } = await api.put<ClassSubject>(
      `/api/classes/${classId}/subjects/${subjectId}`,
      input,
    )
    return data
  },

  async removeSubject(classId: string, subjectId: string): Promise<void> {
    await api.delete(`/api/classes/${classId}/subjects/${subjectId}`)
  },

  /** D-08, D-15: Đổi môn học chính của lớp kèm lưu lịch sử và kiểm tra version/idempotency */
  async changePrimarySubject(
    classId: string,
    input: PrimarySubjectChangeRequest,
  ): Promise<PrimarySubjectChangeResponse> {
    const { data } = await api.put<PrimarySubjectChangeResponse>(
      `/api/classes/${classId}/subjects/primary`,
      input,
    )
    return data
  },

  /** D-15: Lịch sử thay đổi môn chính của lớp (phân trang 0-based) */
  async history(
    classId: string,
    params?: { page?: number; size?: number },
  ): Promise<ClassSubjectHistoryResponse> {
    const { data } = await api.get<ClassSubjectHistoryResponse>(
      `/api/classes/${classId}/subject-history`,
      {
        params: {
          page: params?.page ?? 0,
          size: params?.size ?? 20,
        },
      },
    )
    return data
  },
}

/**
 * Teacher Subjects API — Quản lý môn học giáo viên được xác nhận đủ điều kiện giảng dạy
 * D-06a: Mặc định APPROVED, không có approve/reject hay trạng thái PENDING
 */
export const teacherSubjectsApi = {
  async list(staffId: string): Promise<TeacherSubjectListResponse> {
    const { data } = await api.get<TeacherSubjectListResponse>(`/api/teachers/${staffId}/subjects`)
    return data
  },

  async addSubject(staffId: string, input: TeacherSubjectCreateRequest): Promise<TeacherSubject> {
    const { data } = await api.post<TeacherSubject>(`/api/teachers/${staffId}/subjects`, input)
    return data
  },

  async replaceSubjects(
    staffId: string,
    input: TeacherSubjectUpdateRequest,
  ): Promise<TeacherSubjectListResponse> {
    const { data } = await api.put<TeacherSubjectListResponse>(
      `/api/teachers/${staffId}/subjects`,
      input,
    )
    return data
  },
}

/**
 * Specialty Subjects API — Quản lý ánh xạ danh mục chuyên môn sang môn học
 * D-06: Đây là danh mục gợi ý, không phải quyền dạy thực tế
 */
export const specialtySubjectsApi = {
  async getSubjects(specialtyId: string): Promise<SpecialtySubject> {
    const { data } = await api.get<SpecialtySubject>(`/api/specialties/${specialtyId}/subjects`)
    return data
  },

  async updateSubjects(
    specialtyId: string,
    input: SpecialtySubjectUpdateRequest,
  ): Promise<SpecialtySubject> {
    const { data } = await api.put<SpecialtySubject>(
      `/api/specialties/${specialtyId}/subjects`,
      input,
    )
    return data
  },
}
