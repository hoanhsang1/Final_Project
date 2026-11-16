/** Mã module — khớp seed DB và bảng ánh xạ ở kế hoạch 0.1. */
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
  bundle?: 'STUDENT_MANAGEMENT' | 'TEACHER_MANAGEMENT' | 'CLASS_MANAGEMENT' | 'SCHEDULE_MANAGEMENT' | 'FACILITY_MANAGEMENT'
}

export const MODULE_CATALOG: ModuleMeta[] = [
  {
    code: 'STUDENT_MANAGEMENT',
    label: 'Quản lý sinh viên',
    description: 'Hồ sơ sinh viên, trạng thái học tập và cấp tài khoản.',
    core: true,
  },
  {
    code: 'TEACHER_MANAGEMENT',
    label: 'Quản lý giáo viên',
    description: 'Hồ sơ giáo viên, chuyên môn và trạng thái giảng dạy.',
    core: true,
  },
  {
    code: 'CLASS_MANAGEMENT',
    label: 'Quản lý lớp học',
    description: 'Vòng đời lớp, phân công giáo viên và sĩ số.',
    core: true,
  },
  {
    code: 'SCHEDULE_MANAGEMENT',
    label: 'Quản lý lịch học',
    description: 'Xếp lịch, phòng học, điểm danh và đổi lịch.',
    core: true,
  },
  {
    code: 'FACILITY_MANAGEMENT',
    label: 'Cơ sở vật chất',
    description: 'Phòng học, thiết bị và xử lý sự cố.',
    core: false,
  },
  {
    code: 'ROOM_MANAGEMENT',
    label: 'Quản lý phòng học',
    description: 'Danh mục phòng và trạng thái sử dụng.',
    core: false,
  },
  {
    code: 'EQUIPMENT_MANAGEMENT',
    label: 'Quản lý thiết bị',
    description: 'Danh mục thiết bị gắn với phòng học.',
    core: false,
  },
]

export function moduleLabel(code: string): string {
  return MODULE_CATALOG.find((module) => module.code === code)?.label ?? code
}

/** Backend dùng `active` cho module đang bật; mọi trạng thái khác đều coi là tắt. */
export function enabledModuleCodes(rows: { code: string; status: string }[]): string[] {
  return rows.filter((row) => row.status === 'active').map((row) => row.code)
}
