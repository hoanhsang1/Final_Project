import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  classSubjectsApi,
  classesApi,
  curriculaApi,
  specialtySubjectsApi,
  studentsApi,
  subjectCategoriesApi,
  subjectsApi,
  teacherSubjectsApi,
  teachersApi,
} from '@/features/academic/api'
import type {
  ApplyCurriculumRequest,
  ClassInput,
  ClassSubjectCreateRequest,
  ClassSubjectUpdateRequest,
  ClassUpdateInput,
  CurriculumCreateRequest,
  CurriculumSubjectCreateRequest,
  CurriculumSubjectUpdateRequest,
  CurriculumUpdateRequest,
  PrimarySubjectChangeRequest,
  SpecialtySubjectUpdateRequest,
  StudentInput,
  SubjectCreateRequest,
  SubjectInput,
  SubjectUpdateRequest,
  TeacherSubjectCreateRequest,
  TeacherSubjectUpdateRequest,
  TeacherUpdateInput,
} from '@/features/academic/types'

export const academicKeys = {
  myTeacher: ['teachers', 'me'] as const,
  teachers: (params: unknown) => ['teachers', params] as const,
  teacher: (id: string) => ['teachers', id] as const,
  students: (params: unknown) => ['students', params] as const,
  student: (id: string) => ['students', id] as const,
  myStudent: ['students', 'me'] as const,
  myStudentClasses: ['students', 'me', 'classes'] as const,
  classes: (params: unknown) => ['classes', params] as const,
  myClasses: (params: unknown) => ['classes', 'me', params] as const,
  myClassStudents: (id: string) => ['classes', 'me', id, 'students'] as const,
  class: (id: string) => ['classes', id] as const,
  classStudents: (id: string) => ['classes', id, 'students'] as const,
  classLogs: (id: string) => ['classes', id, 'status-logs'] as const,
  classEvents: (id: string) => ['classes', id, 'close-events'] as const,
  subjects: (params: unknown) => ['subjects', params] as const,
  subjectUsage: (id: string) => ['subjects', id, 'usage'] as const,
  subjectCategories: (params: unknown) => ['subject-categories', params] as const,
  curricula: (params: unknown) => ['curricula', params] as const,
  curriculum: (id: string) => ['curricula', id] as const,
  curriculumSubjects: (id: string) => ['curricula', id, 'subjects'] as const,
  classSubjects: (classId: string) => ['classes', classId, 'subjects'] as const,
  classSubjectHistory: (classId: string, params: unknown) =>
    ['classes', classId, 'subject-history', params] as const,
  teacherSubjects: (staffId: string) => ['teachers', staffId, 'subjects'] as const,
  teachableSubjects: (staffId: string) => ['teachers', staffId, 'teachable-subjects'] as const,
  eligibleTeachers: (subjectId: string) => ['subjects', subjectId, 'eligible-teachers'] as const,
  specialtySubjects: (specialtyId: string) => ['specialties', specialtyId, 'subjects'] as const,
}

export function useTeachers(params: {
  page?: number
  size?: number
  q?: string
  specialtyId?: string
  teachingStatus?: string
}) {
  return useQuery({
    queryKey: academicKeys.teachers(params),
    queryFn: () => teachersApi.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useAssignableTeachers(q: string, enabled = true) {
  return useQuery({
    queryKey: ['teachers', 'assignable', q],
    queryFn: () => teachersApi.assignable({ q: q || undefined, size: 20 }),
    enabled,
  })
}

export function useTeacher(staffId: string | undefined) {
  return useQuery({
    queryKey: academicKeys.teacher(staffId ?? ''),
    queryFn: () => teachersApi.byId(staffId!),
    enabled: Boolean(staffId),
  })
}

export function useMyTeacherProfile(enabled = true) {
  return useQuery({
    queryKey: academicKeys.myTeacher,
    queryFn: () => teachersApi.me(),
    enabled,
    retry: false,
  })
}

export function useUpdateTeacher(staffId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TeacherUpdateInput) => teachersApi.update(staffId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teachers'] })
    },
  })
}

export function useChangeTeacherStatus(staffId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (status: 'DANG_DAY' | 'TAM_NGHI' | 'NGHI_VIEC') =>
      teachersApi.changeStatus(staffId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teachers'] })
    },
  })
}

export function useStudents(params: {
  page?: number
  size?: number
  status?: string
  classId?: string
  q?: string
}) {
  return useQuery({
    queryKey: academicKeys.students(params),
    queryFn: () => studentsApi.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: academicKeys.student(id ?? ''),
    queryFn: () => studentsApi.byId(id!),
    enabled: Boolean(id),
  })
}

export function useMyStudent() {
  return useQuery({
    queryKey: academicKeys.myStudent,
    queryFn: () => studentsApi.me(),
  })
}

export function useMyStudentClasses() {
  return useQuery({
    queryKey: academicKeys.myStudentClasses,
    queryFn: () => studentsApi.myClasses(),
  })
}

export function useStudentMutations() {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['students'] })
    await queryClient.invalidateQueries({ queryKey: ['classes'] })
  }
  return {
    create: useMutation({
      mutationFn: (input: StudentInput) => studentsApi.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: StudentInput }) =>
        studentsApi.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => studentsApi.remove(id),
      onSuccess: invalidate,
    }),
    createAccount: useMutation({
      mutationFn: (id: string) => studentsApi.createAccount(id),
      onSuccess: invalidate,
    }),
  }
}

export function useClasses(
  params: {
    page?: number
    size?: number
    q?: string
    status?: string
    selectable?: boolean
    needsReassignment?: boolean
  },
  enabled = true,
) {
  return useQuery({
    queryKey: academicKeys.classes(params),
    queryFn: () => classesApi.list(params),
    enabled,
    placeholderData: (previous) => previous,
  })
}

export function useMyClasses(params: { page?: number; size?: number; q?: string; status?: string }) {
  return useQuery({
    queryKey: academicKeys.myClasses(params),
    queryFn: () => classesApi.mine(params),
    placeholderData: (previous) => previous,
  })
}

export function useMyClassStudents(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: academicKeys.myClassStudents(id ?? ''),
    queryFn: () => classesApi.myStudents(id!),
    enabled: Boolean(id) && enabled,
  })
}

export function useClass(id: string | undefined) {
  return useQuery({
    queryKey: academicKeys.class(id ?? ''),
    queryFn: () => classesApi.byId(id!),
    enabled: Boolean(id),
  })
}

export function useClassStudents(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: academicKeys.classStudents(id ?? ''),
    queryFn: () => classesApi.students(id!),
    enabled: Boolean(id) && enabled,
  })
}

export function useClassHistory(id: string | undefined) {
  return useQuery({
    queryKey: academicKeys.classLogs(id ?? ''),
    queryFn: () => classesApi.statusLogs(id!),
    enabled: Boolean(id),
  })
}

export function useClassCloseEvents(id: string | undefined) {
  return useQuery({
    queryKey: academicKeys.classEvents(id ?? ''),
    queryFn: () => classesApi.closeEvents(id!),
    enabled: Boolean(id),
  })
}

export function useClassMutations() {
  const queryClient = useQueryClient()
  const invalidate = async (id?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['classes'] })
    await queryClient.invalidateQueries({ queryKey: ['approval-inbox'] })
    if (id) await queryClient.invalidateQueries({ queryKey: academicKeys.class(id) })
  }
  return {
    create: useMutation({
      mutationFn: (input: ClassInput) => classesApi.create(input),
      onSuccess: () => invalidate(),
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ClassUpdateInput }) =>
        classesApi.update(id, input),
      onSuccess: (_, variables) => invalidate(variables.id),
    }),
    remove: useMutation({
      mutationFn: (id: string) => classesApi.remove(id),
      onSuccess: () => invalidate(),
    }),
    assignTeacher: useMutation({
      mutationFn: ({ id, teacherId, version }: { id: string; teacherId: string; version: number }) =>
        classesApi.assignTeacher(id, teacherId, version),
      onSuccess: (_, variables) => invalidate(variables.id),
    }),
    reassignTeacher: useMutation({
      mutationFn: ({ id, teacherId, version }: { id: string; teacherId: string; version: number }) =>
        classesApi.reassignTeacher(id, teacherId, version),
      onSuccess: (_, variables) => invalidate(variables.id),
    }),
    requestCancel: useMutation({
      mutationFn: ({ id, reason, version }: { id: string; reason: string; version: number }) =>
        classesApi.requestCancel(id, reason, version),
      onSuccess: (_, variables) => invalidate(variables.id),
    }),
    approveCancel: useMutation({
      mutationFn: (id: string) => classesApi.approveCancel(id),
      onSuccess: (_, id) => invalidate(id),
    }),
    rejectCancel: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        classesApi.rejectCancel(id, reason),
      onSuccess: (_, variables) => invalidate(variables.id),
    }),
    requestClose: useMutation({
      mutationFn: ({ id, note }: { id: string; note?: string }) => classesApi.requestClose(id, note),
      onSuccess: (_, variables) => invalidate(variables.id),
    }),
    approveClose: useMutation({
      mutationFn: (id: string) => classesApi.approveClose(id),
      onSuccess: (_, id) => invalidate(id),
    }),
    rejectClose: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) =>
        classesApi.rejectClose(id, reason),
      onSuccess: (_, variables) => invalidate(variables.id),
    }),
    reopen: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
        classesApi.reopen(id, reason),
      onSuccess: (_, variables) => invalidate(variables.id),
    }),
    addStudent: useMutation({
      mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
        classesApi.addStudent(id, studentId),
      onSuccess: async (_, variables) => {
        await invalidate(variables.id)
        await queryClient.invalidateQueries({ queryKey: academicKeys.classStudents(variables.id) })
        await queryClient.invalidateQueries({ queryKey: ['students'] })
      },
    }),
    removeStudent: useMutation({
      mutationFn: ({ id, studentId }: { id: string; studentId: string }) =>
        classesApi.removeStudent(id, studentId),
      onSuccess: async (_, variables) => {
        await invalidate(variables.id)
        await queryClient.invalidateQueries({ queryKey: academicKeys.classStudents(variables.id) })
        await queryClient.invalidateQueries({ queryKey: ['students'] })
      },
    }),
  }
}

export function useSubjects(params: { q?: string; includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: academicKeys.subjects(params),
    queryFn: () => subjectsApi.list(params),
    staleTime: 5 * 60_000,
  })
}

export function useSubjectMutations() {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['subjects'] })
    // Lớp đang hiển thị tên môn — làm mới để đồng bộ khi môn đổi tên/ngừng dùng.
    await queryClient.invalidateQueries({ queryKey: ['classes'] })
    await queryClient.invalidateQueries({ queryKey: ['curricula'] })
    await queryClient.invalidateQueries({ queryKey: ['subject-categories'] })
  }
  return {
    create: useMutation({
      mutationFn: (input: SubjectCreateRequest | SubjectInput) => subjectsApi.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: SubjectUpdateRequest | SubjectInput }) =>
        subjectsApi.update(id, input),
      onSuccess: invalidate,
    }),
    setActive: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        subjectsApi.setActive(id, active),
      onSuccess: invalidate,
    }),
  }
}

export function useSubjectUsage(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: academicKeys.subjectUsage(id ?? ''),
    queryFn: () => subjectsApi.usage(id!),
    enabled: Boolean(id) && enabled,
  })
}

export function useSubjectCategories(includeInactive = false) {
  return useQuery({
    queryKey: academicKeys.subjectCategories({ includeInactive }),
    queryFn: () => subjectCategoriesApi.list({ includeInactive }),
    staleTime: 60_000,
  })
}

export function useSubjectCategoryMutations() {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['subject-categories'] })
    await queryClient.invalidateQueries({ queryKey: ['subjects'] })
  }
  return {
    create: useMutation({
      mutationFn: (name: string) => subjectCategoriesApi.create(name),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, name }: { id: string; name: string }) =>
        subjectCategoriesApi.update(id, name),
      onSuccess: invalidate,
    }),
    setActive: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        subjectCategoriesApi.setActive(id, active),
      onSuccess: invalidate,
    }),
  }
}

// ============================================================================
// Phase 1 — Curriculum Hooks (Screen 2, 3, 4)
// ============================================================================

export function useCurricula(
  params: { q?: string; isActive?: boolean; page?: number; size?: number } = {},
) {
  return useQuery({
    queryKey: academicKeys.curricula(params),
    queryFn: () => curriculaApi.list(params),
    placeholderData: (previous) => previous,
  })
}

export function useCurriculum(id: string | undefined) {
  return useQuery({
    queryKey: academicKeys.curriculum(id ?? ''),
    queryFn: () => curriculaApi.byId(id!),
    enabled: Boolean(id),
  })
}

export function useCurriculumSubjects(curriculumId: string | undefined) {
  return useQuery({
    queryKey: academicKeys.curriculumSubjects(curriculumId ?? ''),
    queryFn: () => curriculaApi.subjects(curriculumId!),
    enabled: Boolean(curriculumId),
  })
}

export function useCurriculumMutations() {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['curricula'] })
  }
  return {
    create: useMutation({
      mutationFn: (input: CurriculumCreateRequest) => curriculaApi.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: CurriculumUpdateRequest }) =>
        curriculaApi.update(id, input),
      onSuccess: async (_, variables) => {
        await invalidate()
        await queryClient.invalidateQueries({ queryKey: academicKeys.curriculum(variables.id) })
      },
    }),
    setActive: useMutation({
      mutationFn: ({ id, active }: { id: string; active: boolean }) =>
        curriculaApi.setActive(id, active),
      onSuccess: async (_, variables) => {
        await invalidate()
        await queryClient.invalidateQueries({ queryKey: academicKeys.curriculum(variables.id) })
      },
    }),
  }
}

export function useCurriculumSubjectMutations(curriculumId: string) {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: academicKeys.curriculumSubjects(curriculumId) })
    await queryClient.invalidateQueries({ queryKey: academicKeys.curriculum(curriculumId) })
    await queryClient.invalidateQueries({ queryKey: ['curricula'] })
  }
  return {
    addSubject: useMutation({
      mutationFn: (input: CurriculumSubjectCreateRequest) =>
        curriculaApi.addSubject(curriculumId, input),
      onSuccess: invalidate,
    }),
    updateSubject: useMutation({
      mutationFn: ({
        subjectId,
        input,
      }: {
        subjectId: string
        input: CurriculumSubjectUpdateRequest
      }) => curriculaApi.updateSubject(curriculumId, subjectId, input),
      onSuccess: invalidate,
    }),
    removeSubject: useMutation({
      mutationFn: (subjectId: string) => curriculaApi.removeSubject(curriculumId, subjectId),
      onSuccess: invalidate,
    }),
  }
}

// ============================================================================
// Phase 1 — Class Subject Hooks (Screen 7, 8, 9)
// ============================================================================

export function useClassSubjects(classId: string | undefined) {
  return useQuery({
    queryKey: academicKeys.classSubjects(classId ?? ''),
    queryFn: () => classSubjectsApi.list(classId!),
    enabled: Boolean(classId),
  })
}

export function useClassSubjectHistory(
  classId: string | undefined,
  params: { page?: number; size?: number } = {},
) {
  return useQuery({
    queryKey: academicKeys.classSubjectHistory(classId ?? '', params),
    queryFn: () => classSubjectsApi.history(classId!, params),
    enabled: Boolean(classId),
    placeholderData: (previous) => previous,
  })
}

export function useClassSubjectMutations(classId: string) {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: academicKeys.classSubjects(classId) })
    await queryClient.invalidateQueries({ queryKey: academicKeys.class(classId) })
    await queryClient.invalidateQueries({ queryKey: ['classes'] })
  }
  return {
    applyCurriculum: useMutation({
      mutationFn: (input: ApplyCurriculumRequest) =>
        classSubjectsApi.applyCurriculum(classId, input),
      onSuccess: invalidate,
    }),
    addSubject: useMutation({
      mutationFn: (input: ClassSubjectCreateRequest) => classSubjectsApi.addSubject(classId, input),
      onSuccess: invalidate,
    }),
    updateSubject: useMutation({
      mutationFn: ({ subjectId, input }: { subjectId: string; input: ClassSubjectUpdateRequest }) =>
        classSubjectsApi.updateSubject(classId, subjectId, input),
      onSuccess: invalidate,
    }),
    removeSubject: useMutation({
      mutationFn: (subjectId: string) => classSubjectsApi.removeSubject(classId, subjectId),
      onSuccess: invalidate,
    }),
    changePrimarySubject: useMutation({
      mutationFn: (input: PrimarySubjectChangeRequest) =>
        classSubjectsApi.changePrimarySubject(classId, input),
      onSuccess: async () => {
        await invalidate()
        await queryClient.invalidateQueries({
          queryKey: ['classes', classId, 'subject-history'],
        })
      },
    }),
  }
}

// ============================================================================
// Phase 1 — Teacher Subject & Specialty Subject Hooks (Screen 5, 6)
// ============================================================================

export function useTeacherSubjects(staffId: string | undefined) {
  return useQuery({
    queryKey: academicKeys.teacherSubjects(staffId ?? ''),
    queryFn: () => teacherSubjectsApi.list(staffId!),
    enabled: Boolean(staffId),
  })
}

export function useTeacherSubjectMutations(staffId: string) {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: academicKeys.teacherSubjects(staffId) })
    await queryClient.invalidateQueries({ queryKey: academicKeys.teacher(staffId) })
  }
  return {
    addSubject: useMutation({
      mutationFn: (input: TeacherSubjectCreateRequest) =>
        teacherSubjectsApi.addSubject(staffId, input),
      onSuccess: invalidate,
    }),
    replaceSubjects: useMutation({
      mutationFn: (input: TeacherSubjectUpdateRequest) =>
        teacherSubjectsApi.replaceSubjects(staffId, input),
      onSuccess: invalidate,
    }),
  }
}

export function useSpecialtySubjects(specialtyId: string | undefined) {
  return useQuery({
    queryKey: academicKeys.specialtySubjects(specialtyId ?? ''),
    queryFn: () => specialtySubjectsApi.getSubjects(specialtyId!),
    enabled: Boolean(specialtyId),
  })
}

export function useSpecialtySubjectMutations(specialtyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SpecialtySubjectUpdateRequest) =>
      specialtySubjectsApi.updateSubjects(specialtyId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: academicKeys.specialtySubjects(specialtyId) })
    },
  })
}

// ============================================================================
// Teacher eligibility (D1) — môn dạy được & ngoại lệ
// ============================================================================

/** Môn giáo viên dạy được, kèm lý do CATEGORY (cùng danh mục) hoặc EXCEPTION (ngoại lệ). */
export function useTeachableSubjects(staffId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: academicKeys.teachableSubjects(staffId ?? ''),
    queryFn: () => teacherSubjectsApi.teachable(staffId!),
    enabled: Boolean(staffId) && enabled,
  })
}

export function useTeachableSubjectMutations(staffId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (subjectIds: string[]) => teacherSubjectsApi.replaceExceptions(staffId, subjectIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: academicKeys.teachableSubjects(staffId) })
      await queryClient.invalidateQueries({ queryKey: academicKeys.teacher(staffId) })
      await queryClient.invalidateQueries({ queryKey: ['subjects'] })
    },
  })
}

/** Giáo viên đang dạy và đủ điều kiện dạy môn; dùng cho picker giáo viên của lớp. */
export function useEligibleTeachers(subjectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: academicKeys.eligibleTeachers(subjectId ?? ''),
    queryFn: () => subjectsApi.eligibleTeachers(subjectId!),
    enabled: Boolean(subjectId) && enabled,
    staleTime: 60_000,
  })
}
