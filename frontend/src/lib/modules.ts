/** Mã module — khớp seed DB và bảng ánh xạ ở kế hoạch 0.1. */
import type { ModuleState } from '@/types/session'

export type ModuleCode =
  | 'STUDENT_MANAGEMENT'
  | 'TEACHER_MANAGEMENT'
  | 'CLASS_MANAGEMENT'
  | 'SCHEDULE_MANAGEMENT'
  | 'FACILITY_MANAGEMENT'
  | 'ROOM_MANAGEMENT'
  | 'EQUIPMENT_MANAGEMENT'

export interface ModuleMeta {
  code: ModuleCode
  label: string
  description: string
  /** Module lõi không thể tắt (quyết định DEC-01). */
  core: boolean
  /**
   * Có quyền nghiệp vụ gắn module này hay không, tức là gán được cho phòng ban.
   * Khớp `DepartmentService.validateModules` — backend chỉ nhận module xuất hiện
   * trong danh mục quyền: STUDENT / SCHEDULE / FACILITY_MANAGEMENT.
   */
  gatesPermissions: boolean
  bundle?: 'STUDENT_MANAGEMENT' | 'TEACHER_MANAGEMENT' | 'CLASS_MANAGEMENT' | 'SCHEDULE_MANAGEMENT' | 'FACILITY_MANAGEMENT'
}

export const MODULE_CATALOG: ModuleMeta[] = [
  {
    code: 'STUDENT_MANAGEMENT',
    label: 'Quản lý sinh viên',
    description: 'Hồ sơ sinh viên, lớp học, môn học và cấp tài khoản.',
    core: true,
    gatesPermissions: true,
  },
  {
    code: 'TEACHER_MANAGEMENT',
    label: 'Quản lý giáo viên',
    description: 'Hồ sơ giáo viên, chuyên môn và trạng thái giảng dạy.',
    core: true,
    gatesPermissions: false,
  },
  {
    // Giữ dòng danh mục để khớp seed `module` cũ; không còn quyền nào thuộc module này.
    // `class.*` do backend gắn STUDENT_MANAGEMENT, FE cũng phải theo module đó.
    code: 'CLASS_MANAGEMENT',
    label: 'Quản lý lớp học',
    description: 'Danh mục cũ — quyền lớp học nay thuộc Quản lý sinh viên.',
    core: true,
    gatesPermissions: false,
  },
  {
    code: 'SCHEDULE_MANAGEMENT',
    label: 'Quản lý lịch học',
    description: 'Xếp lịch, phòng học, điểm danh và đổi lịch.',
    core: true,
    gatesPermissions: true,
  },
  {
    code: 'FACILITY_MANAGEMENT',
    label: 'Cơ sở vật chất',
    description: 'Phòng học, thiết bị và xử lý sự cố.',
    core: false,
    gatesPermissions: true,
  },
  {
    code: 'ROOM_MANAGEMENT',
    label: 'Quản lý phòng học',
    description: 'Danh mục phòng và trạng thái sử dụng.',
    core: false,
    gatesPermissions: false,
  },
  {
    code: 'EQUIPMENT_MANAGEMENT',
    label: 'Quản lý thiết bị',
    description: 'Danh mục thiết bị gắn với phòng học.',
    core: false,
    gatesPermissions: false,
  },
]

/** Module được phép gán cho phòng ban (phải có quyền gắn theo để lọc hiệu lực). */
export const DEPARTMENT_MODULE_CATALOG = MODULE_CATALOG.filter((module) => module.gatesPermissions)

export function moduleLabel(code: string): string {
  return MODULE_CATALOG.find((module) => module.code === code)?.label ?? code
}

/** Backend dùng `active` cho module đang bật; mọi trạng thái khác đều coi là tắt. */
export function enabledModuleCodes(rows: { code: string; status: string }[]): string[] {
  return rows.filter((row) => row.status === 'active').map((row) => row.code)
}

/** Bản đồ trạng thái đầy đủ để phân biệt active/disabled/locked/chưa đăng ký. */
export function moduleStatesFrom(
  rows: { code: string; status?: string | null }[],
): Record<string, ModuleState> {
  const states: Record<string, ModuleState> = {}
  for (const row of rows) {
    const status = row.status ?? 'not_registered'
    states[row.code] =
      status === 'active' || status === 'disabled' || status === 'locked'
        ? status
        : 'not_registered'
  }
  return states
}
