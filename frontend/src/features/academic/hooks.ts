import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { classesApi, studentsApi, subjectsApi, teachersApi } from '@/features/academic/api'
import type {
  ClassInput,
  ClassUpdateInput,
  StudentInput,
  TeacherUpdateInput,
} from '@/features/academic/types'

export const academicKeys = {
  teachers: (params: unknown) => ['teachers', params] as const,
  teacher: (id: string) => ['teachers', id] as const,
  students: (params: unknown) => ['students', params] as const,
  student: (id: string) => ['students', id] as const,
  myStudent: ['students', 'me'] as const,
  myStudentClasses: ['students', 'me', 'classes'] as const,
  classes: (params: unknown) => ['classes', params] as const,
  class: (id: string) => ['classes', id] as const,
  classStudents: (id: string) => ['classes', id, 'students'] as const,
  classLogs: (id: string) => ['classes', id, 'status-logs'] as const,
  classEvents: (id: string) => ['classes', id, 'close-events'] as const,
  subjects: (q: string) => ['subjects', q] as const,
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

export function useUpdateTeacher(staffId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TeacherUpdateInput) => teachersApi.update(staffId, input),
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

export function useClasses(params: {
  page?: number
  size?: number
  q?: string
  status?: string
  selectable?: boolean
  needsReassignment?: boolean
}) {
  return useQuery({
    queryKey: academicKeys.classes(params),
    queryFn: () => classesApi.list(params),
    placeholderData: (previous) => previous,
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

export function useSubjects(q = '') {
  return useQuery({
    queryKey: academicKeys.subjects(q),
    queryFn: () => subjectsApi.list(q || undefined),
    staleTime: 5 * 60_000,
  })
}
