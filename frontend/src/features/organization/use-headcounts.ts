import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { departmentsApi } from '@/features/organization/api'
import { useDepartments } from '@/features/organization/hooks'
import { useDepartmentScope } from '@/features/organization/use-scope'
import { queryKeys } from '@/lib/query-keys'

export interface DepartmentHeadcount {
  departmentId: string
  name: string
  total: number
  active: number
}

/**
 * Đếm nhân sự theo phòng ban từ danh sách thành viên.
 * Chỉ tải phòng ban trong phạm vi của người dùng: backend chặn 403 nếu
 * người có scope DEPARTMENT gọi thành viên phòng khác.
 */
export function useHeadcounts() {
  const departmentsQuery = useDepartments()
  const departments = useMemo(() => departmentsQuery.data ?? [], [departmentsQuery.data])
  const { isScoped, scopedDepartmentId } = useDepartmentScope()

  const targetDepartments = useMemo(
    () =>
      isScoped ? departments.filter((department) => department.id === scopedDepartmentId) : departments,
    [departments, isScoped, scopedDepartmentId],
  )

  const memberQueries = useQueries({
    queries: targetDepartments.map((department) => ({
      queryKey: queryKeys.members(department.id),
      queryFn: () => departmentsApi.members(department.id),
      enabled: departmentsQuery.isSuccess,
      staleTime: 60_000,
    })),
  })

  const byDepartment: DepartmentHeadcount[] = useMemo(
    () =>
      targetDepartments.map((department, index) => {
        const members = memberQueries[index]?.data ?? []
        return {
          departmentId: department.id,
          name: department.name,
          total: members.length,
          active: members.filter((member) => member.status === 'ACTIVE').length,
        }
      }),
    [memberQueries, targetDepartments],
  )

  const totalEmployees = byDepartment.reduce((sum, item) => sum + item.total, 0)
  const activeEmployees = byDepartment.reduce((sum, item) => sum + item.active, 0)

  return {
    departments,
    byDepartment,
    totalEmployees,
    activeEmployees,
    isScoped,
    scopedDepartmentId,
    isLoading: departmentsQuery.isLoading || memberQueries.some((query) => query.isLoading),
    isError: departmentsQuery.isError || memberQueries.some((query) => query.isError),
    error: departmentsQuery.error ?? memberQueries.find((query) => query.error)?.error,
    refetch: () => {
      void departmentsQuery.refetch()
      memberQueries.forEach((query) => void query.refetch())
    },
  }
}
