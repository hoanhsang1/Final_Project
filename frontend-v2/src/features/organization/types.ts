export interface Department {
  id: string
  name: string
  description: string | null
  createdAt: string
  modules: string[]
}

export interface DepartmentInput {
  name: string
  description?: string
  moduleCodes: string[]
}

export interface Position {
  id: string
  name: string
  description: string | null
  createdAt: string
  permissions: string[]
  profileType: 'TEACHER' | 'GENERAL' | 'MANAGER' | 'STAFF' | null
  bundleCodes: string[]
  scope: 'ORGANIZATION' | 'DEPARTMENT'
  departmentId: string | null
}

export interface Specialty {
  id: string
  name: string
}

export interface Member {
  userId: string
  username: string
  departmentId: string
  role: 'OWNER' | 'MANAGER' | 'STAFF'
  status: 'ACTIVE' | 'RESIGNED'
  appointedBy: string | null
  appointedAt: string
  positionIds: string[]
  permissions: string[]
}

export interface AssignmentHistoryItem {
  id: string
  positionId: string
  positionName: string
  scopeType: 'ORGANIZATION' | 'DEPARTMENT'
  departmentId: string | null
  effectiveFrom: string
  effectiveTo: string | null
  status: 'ACTIVE' | 'REVOKED'
  assignedByName: string | null
  assignedAt: string
  reason: string | null
  revokedAt: string | null
  revokedByName: string | null
  revokedReason: string | null
}

export interface MemberDetail extends Member {
  departmentName: string
  fullName: string | null
  email: string | null
  phone: string | null
  staffCode: string | null
  teacher: boolean
  contractType: 'CO_HUU' | 'THINH_GIANG' | null
  teachingStatus: 'DANG_DAY' | 'TAM_NGHI' | 'NGHI_VIEC' | null
  classCount: number
  classLabel: string | null
  assignmentHistory: AssignmentHistoryItem[]
}

export interface CreateMemberInput {
  departmentId: string
  username: string
  email: string
  role: 'MANAGER' | 'STAFF'
  positionIds: string[]
  staffCode?: string
  fullName?: string
  phone?: string
  teacherProfile?: {
    specialtyIds: string[]
    contractType?: 'CO_HUU' | 'THINH_GIANG'
  }
}

export interface CreatedMember {
  member: Member
  temporaryPassword: string
  mustChangePassword: boolean
}

export interface TransferStep {
  step: 'SOURCE_HEAD' | 'TARGET_HEAD' | 'HR' | 'EMPLOYEE'
  decision: 'PENDING' | 'APPROVED' | 'REJECTED'
  decidedBy: string | null
  decidedByName: string | null
  decidedAt: string | null
  note: string | null
}

export interface TransferRequest {
  id: string
  userId: string
  username: string
  fullName: string | null
  fromDepartmentId: string
  fromDepartmentName: string
  toDepartmentId: string
  toDepartmentName: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  requestedByName: string
  requestedAt: string
  appliedAt: string | null
  steps: TransferStep[]
  actionableSteps: TransferStep['step'][]
}

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  entityType: string
  entityId: string
  readAt: string | null
  createdAt: string
}

/** Dòng tổng hợp cho danh bạ nhân sự toàn tổ chức. */
export interface EmployeeRow extends Member {
  departmentName: string
  fullName?: string | null
  staffCode?: string | null
  email?: string | null
  teacher: boolean
  teachingStatus: MemberDetail['teachingStatus']
  positionNames: string[]
  enriched: boolean
}

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Chủ tổ chức',
  MANAGER: 'Quản lý phòng ban',
  STAFF: 'Nhân viên',
}

export const MEMBER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Đang làm việc',
  RESIGNED: 'Đã nghỉ việc',
}

export const TEACHING_STATUS_LABELS: Record<string, string> = {
  DANG_DAY: 'Đang dạy',
  TAM_NGHI: 'Tạm nghỉ',
  NGHI_VIEC: 'Nghỉ việc',
}

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  CO_HUU: 'Cơ hữu',
  THINH_GIANG: 'Thỉnh giảng',
}

export const TRANSFER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Đang chờ duyệt',
  APPROVED: 'Đã áp dụng',
  REJECTED: 'Bị từ chối',
  CANCELLED: 'Đã huỷ',
}

export const TRANSFER_STEP_LABELS: Record<string, string> = {
  SOURCE_HEAD: 'Trưởng phòng cũ',
  TARGET_HEAD: 'Trưởng phòng mới',
  HR: 'Nhân sự',
  EMPLOYEE: 'Nhân viên xác nhận',
}

export const TRANSFER_STEP_ORDER: TransferStep['step'][] = [
  'SOURCE_HEAD',
  'TARGET_HEAD',
  'HR',
  'EMPLOYEE',
]
