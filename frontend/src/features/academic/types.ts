export interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages?: number
}

export interface Specialty {
  id: string
  name: string
}

export interface TeacherItem {
  userId: string
  staffCode: string | null
  fullName: string
  email: string | null
  phone: string | null
  departmentId: string
  specialties: Specialty[]
  contractType: string | null
  teachingStatus: string | null
  classCount: number
  noClass: boolean
  classLabel: string | null
}

export interface TeacherClass {
  id: string
  classCode: string
  name: string
  status: string
  closeState: string | null
  closeLabel: string | null
  needsReassignment: boolean
  reassignmentReason: string | null
}

export interface TeacherHistory {
  id: string
  action: string
  actorUserId: string | null
  actorName: string | null
  createdAt: string
  details: unknown
}

export interface TeacherDetail extends TeacherItem {
  positionIds: string[]
  classes: TeacherClass[]
  version: number
  createdAt: string | null
  updatedAt: string | null
  history: TeacherHistory[]
}

export interface TeacherUpdateInput {
  fullName: string
  email?: string
  phone?: string
  specialtyIds: string[]
  contractType?: 'CO_HUU' | 'THINH_GIANG'
  version: number
  confirm?: boolean
}

export interface Student {
  id: string
  orgId: string
  studentCode: string
  fullName: string
  dateOfBirth: string | null
  email: string | null
  phone: string | null
  status: string
  classId: string | null
  classCode: string | null
  className: string | null
  createdBy: string | null
  createdAt: string | null
  updatedAt: string | null
  accountUsername: string | null
  accountCreatedAt: string | null
}

export interface StudentInput {
  studentCode?: string
  fullName: string
  dateOfBirth?: string
  email?: string
  phone?: string
  status?: 'active' | 'inactive' | 'suspended'
}

export interface StudentAccount {
  studentId: string
  username: string
  temporaryPassword: string
}

export interface StudentClass {
  id: string
  classCode: string
  name: string
  academicYear: string | null
  startDate: string | null
  endDate: string | null
  status: string
  closeState: string | null
  teacherName: string | null
  subjectName: string | null
}

export interface ClassTeacher {
  id: string
  code: string | null
  fullName: string
}

export interface SchoolClass {
  id: string
  orgId: string
  classCode: string
  name: string
  academicYear: string | null
  startDate: string | null
  endDate: string | null
  status: string
  teacher: ClassTeacher | null
  closeState: string | null
  version: number
  studentCount: number
  createdBy: string | null
  createdAt: string | null
  updatedAt: string | null
  cancelReason: string | null
  closeRequestNote: string | null
  closeRejectReason: string | null
  needsReassignment: boolean
  reassignmentReason: string | null
  subjectId: string | null
  subjectName: string | null
  cancelState: string | null
  cancelRequestReason: string | null
}

export interface ClassInput {
  classCode: string
  name: string
  academicYear?: string
  subjectId?: string
  startDate?: string
  endDate?: string
  status?: 'active' | 'inactive' | 'archived'
}

export interface ClassUpdateInput {
  name: string
  academicYear?: string
  subjectId?: string
  startDate?: string
  endDate?: string
  version: number
}

export interface ClassStatusLog {
  id: string
  classId: string
  fromStatus: string | null
  toStatus: string
  reason: string | null
  changedBy: string | null
  changedAt: string
  actorName: string | null
}

export interface ClassCloseEvent {
  id: string
  classId: string
  action: string
  actorId: string | null
  actorName: string | null
  reason: string | null
  note: string | null
  createdAt: string
}

export interface Subject {
  id: string
  name: string
}

export const CLASS_STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  inactive: 'Tạm dừng',
  archived: 'Đã lưu trữ',
  DANG_HOAT_DONG: 'Đang hoạt động',
  TAM_DUNG: 'Tạm dừng',
  DA_KET_THUC: 'Đã kết thúc',
  DA_HUY: 'Đã huỷ',
}

export const CLOSE_STATE_LABELS: Record<string, string> = {
  NONE: 'Bình thường',
  PENDING: 'Chờ duyệt đóng',
  CLOSED: 'Đã đóng',
  REJECTED: 'Bị từ chối đóng',
}

export const CANCEL_STATE_LABELS: Record<string, string> = {
  NONE: 'Bình thường',
  PENDING: 'Chờ duyệt huỷ',
  APPROVED: 'Đã huỷ',
  REJECTED: 'Bị từ chối huỷ',
}

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  CO_HUU: 'Cơ hữu',
  THINH_GIANG: 'Thỉnh giảng',
}

export const TEACHING_STATUS_LABELS: Record<string, string> = {
  DANG_DAY: 'Đang dạy',
  TAM_NGHI: 'Tạm nghỉ',
  DA_NGHI: 'Đã nghỉ',
}

export const STUDENT_STATUS_LABELS: Record<string, string> = {
  active: 'Đang học',
  inactive: 'Tạm dừng',
  suspended: 'Đình chỉ',
}
