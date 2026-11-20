import { PERM } from '@/lib/permissions'
import type {
  ClassSubject,
  ClassSubjectHistory,
  Curriculum,
  CurriculumSubject,
  Subject,
  TeacherSubject,
} from '@/features/academic/types'

export type OrgStatus = 'pending' | 'active' | 'rejected' | 'suspended'
export type OrgType = 'SCHOOL' | 'CENTER'

export interface MockOrganization {
  id: string
  name: string
  org_type: OrgType
  status: OrgStatus
  created_at: string
  owner_username: string
  owner_email: string
  approved_at: string | null
  rejection_reason: string | null
}

export interface MockModule {
  code: string
  name: string
  isActive: boolean
}

export interface MockDepartment {
  id: string
  name: string
  description: string | null
  createdAt: string
  modules: string[]
  orgId: string
}

export interface MockPosition {
  id: string
  name: string
  description: string | null
  createdAt: string
  permissions: string[]
  profileType: 'TEACHER' | 'GENERAL' | null
  bundleCodes: string[]
  scope: 'ORGANIZATION' | 'DEPARTMENT'
  departmentId: string | null
}

export interface MockAssignment {
  id: string
  positionId: string
  positionName: string
  scopeType: 'ORGANIZATION' | 'DEPARTMENT'
  departmentId: string | null
  effectiveFrom: string
  effectiveTo: string | null
  status: 'ACTIVE' | 'REVOKED'
  assignedBy: string
  assignedByName: string
  assignedAt: string
  reason: string | null
  revokedAt: string | null
  revokedBy: string | null
  revokedByName: string | null
  revokedReason: string | null
}

export interface MockMember {
  userId: string
  username: string
  departmentId: string
  role: 'OWNER' | 'MANAGER' | 'STAFF'
  status: 'ACTIVE' | 'RESIGNED'
  appointedBy: string | null
  appointedAt: string
  positionIds: string[]
  permissions: string[]
  /** Các trường dưới đây có ở endpoint chi tiết, không có ở danh sách. */
  fullName: string
  email: string
  phone: string
  staffCode: string
  teacher: boolean
  contractType: 'CO_HUU' | 'THINH_GIANG' | null
  teachingStatus: 'DANG_DAY' | 'TAM_NGHI' | 'NGHI_VIEC' | null
  classCount: number
  classLabel: string | null
  assignmentHistory: MockAssignment[]
}

export interface MockAccount {
  id: string
  username: string
  password: string
  fullName: string
  email: string
  roles: string[]
  permissions: string[]
  orgId: string | null
  departmentId: string | null
  mustChangePassword: boolean
  status: 'active' | 'pending' | 'locked' | 'disabled'
  lastLoginAt: string | null
}

export interface MockNotification {
  id: string
  type: string
  title: string
  body: string
  entityType: string
  entityId: string
  readAt: string | null
  createdAt: string
  orgId: string
}

export interface MockTransferStep {
  step: 'SOURCE_HEAD' | 'TARGET_HEAD' | 'HR' | 'EMPLOYEE'
  decision: 'PENDING' | 'APPROVED' | 'REJECTED'
  decidedBy: string | null
  decidedByName: string | null
  decidedAt: string | null
  note: string | null
}

export interface MockTransfer {
  id: string
  userId: string
  username: string
  fullName: string
  fromDepartmentId: string
  fromDepartmentName: string
  toDepartmentId: string
  toDepartmentName: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  requestedBy: string
  requestedByName: string
  requestedAt: string
  appliedAt: string | null
  appliedBy: string | null
  steps: MockTransferStep[]
  orgId: string
}

export interface MockAuditLog {
  id: string
  created_at: string
  action: string
  actor_username: string
  target_type: 'ORGANIZATION' | 'ACCOUNT'
  target_id: string
  target_name: string
  description: string | null
}

const ALL_PERMISSIONS = Object.values(PERM) as string[]

const HR_PERMISSIONS = [
  PERM.employeeView,
  PERM.employeeViewDetail,
  PERM.employeeCreate,
  PERM.employeeEdit,
  PERM.employeeDelete,
  PERM.employeeResetPassword,
  PERM.employeeAssignPosition,
  PERM.employeeResign,
  PERM.employeeApproveResignation,
  PERM.employeeTransfer,
  PERM.employeeApproveTransfer,
  PERM.positionView,
  PERM.positionManage,
  PERM.departmentView,
  PERM.classView,
  PERM.studentView,
  PERM.scheduleView,
]

const ACADEMIC_PERMISSIONS = [
  PERM.studentView,
  PERM.studentCreate,
  PERM.studentEdit,
  PERM.studentDelete,
  PERM.studentCreateAccount,
  PERM.studentChangeStatus,
  PERM.studentResetAccount,
  PERM.classView,
  PERM.classCreate,
  PERM.classEdit,
  PERM.classDelete,
  PERM.classAssignTeacher,
  PERM.classTeacherReassign,
  PERM.classCancel,
  PERM.classRequestClose,
  PERM.classReopen,
  PERM.classViewReassign,
  PERM.subjectView,
  PERM.subjectManage,
  PERM.scheduleView,
]

const FACILITY_PERMISSIONS = [
  PERM.facilityView,
  PERM.facilityManage,
  PERM.facilityRoomView,
  PERM.facilityRoomCreate,
  PERM.facilityRoomUpdate,
  PERM.facilityRoomDelete,
  PERM.facilityEquipmentView,
  PERM.facilityEquipmentCreate,
  PERM.facilityEquipmentUpdate,
  PERM.facilityEquipmentDelete,
  PERM.facilityIssueReport,
  PERM.facilityIssueResolve,
]

const TEACHER_PERMISSIONS = [
  PERM.classView,
  PERM.studentView,
  PERM.scheduleView,
  PERM.scheduleSelfView,
  PERM.scheduleAttendanceMark,
  PERM.scheduleAttendanceView,
  PERM.scheduleChangeRequestCreate,
  PERM.facilityIssueReport,
]

const HEAD_PERMISSIONS = [
  PERM.classView,
  PERM.classApproveClose,
  PERM.classReopen,
  PERM.scheduleChangeRequestApprove,
  PERM.studentView,
  PERM.employeeView,
  PERM.employeeApproveTransfer,
]

export const DEMO_ORG_ID = '11111111-1111-4111-8111-111111111111'

export const mockModules: MockModule[] = [
  { code: 'STUDENT_MANAGEMENT', name: 'Quản lý học sinh', isActive: true },
  { code: 'TEACHER_MANAGEMENT', name: 'Quản lý giáo viên', isActive: true },
  { code: 'CLASS_MANAGEMENT', name: 'Quản lý lớp học', isActive: true },
  { code: 'SCHEDULE_MANAGEMENT', name: 'Quản lý lịch học', isActive: true },
  { code: 'ROOM_MANAGEMENT', name: 'Quản lý phòng học', isActive: true },
  { code: 'EQUIPMENT_MANAGEMENT', name: 'Quản lý thiết bị', isActive: true },
  { code: 'FACILITY_MANAGEMENT', name: 'Quản lý cơ sở vật chất', isActive: true },
]

const CORE_MODULES = new Set([
  'STUDENT_MANAGEMENT',
  'TEACHER_MANAGEMENT',
  'CLASS_MANAGEMENT',
  'SCHEDULE_MANAGEMENT',
])

/** Module lõi luôn bật; ROOM minh hoạ module bị SUPER_ADMIN khóa. */
export const mockOrgModules = mockModules.map((module) => ({
  code: module.code,
  name: module.name,
  is_core: CORE_MODULES.has(module.code),
  status: CORE_MODULES.has(module.code)
    ? 'active'
    : module.code === 'ROOM_MANAGEMENT'
      ? 'locked'
      : 'not_registered',
  is_locked_by_admin: module.code === 'ROOM_MANAGEMENT',
}))

export const mockAccounts: MockAccount[] = [
  {
    id: 'acc-super-1',
    username: 'platform_admin',
    password: '123456',
    fullName: 'Quản trị hệ thống',
    email: 'admin@your-domain.example',
    roles: ['SUPER_ADMIN'],
    permissions: [],
    orgId: null,
    departmentId: null,
    mustChangePassword: false,
    status: 'active',
    lastLoginAt: '2026-11-16T07:10:00Z',
  },
  {
    id: 'acc-owner-1',
    username: 'sample_owner',
    password: 'Sample@123456',
    fullName: 'Nguyễn Minh Anh',
    email: 'owner@sample-mems.example',
    roles: ['ORG_OWNER', 'OWNER'],
    permissions: ALL_PERMISSIONS,
    orgId: DEMO_ORG_ID,
    departmentId: null,
    mustChangePassword: false,
    status: 'active',
    lastLoginAt: '2026-11-16T08:02:00Z',
  },
  {
    id: 'acc-hr-1',
    username: 'sample_hr',
    password: 'Sample@123456',
    fullName: 'Vũ Thanh Mai',
    email: 'hr@sample-mems.example',
    roles: ['MANAGER'],
    permissions: HR_PERMISSIONS,
    orgId: DEMO_ORG_ID,
    departmentId: 'dept-4',
    mustChangePassword: false,
    status: 'active',
    lastLoginAt: '2026-11-16T07:45:00Z',
  },
  {
    id: 'acc-academic-1',
    username: 'sample_academic',
    password: 'Sample@123456',
    fullName: 'Đỗ Thu Hà',
    email: 'academic@sample-mems.example',
    roles: ['STAFF'],
    permissions: ACADEMIC_PERMISSIONS,
    orgId: DEMO_ORG_ID,
    departmentId: 'dept-3',
    mustChangePassword: false,
    status: 'active',
    lastLoginAt: '2026-11-16T06:58:00Z',
  },
  {
    id: 'acc-teacher-1',
    username: 'sample_teacher',
    password: 'Sample@123456',
    fullName: 'Trần Quốc Bảo',
    email: 'teacher@sample-mems.example',
    roles: ['STAFF'],
    permissions: TEACHER_PERMISSIONS,
    orgId: DEMO_ORG_ID,
    departmentId: 'dept-1',
    mustChangePassword: false,
    status: 'active',
    lastLoginAt: '2026-11-15T14:20:00Z',
  },
  {
    id: 'acc-head-1',
    username: 'sample_head',
    password: 'Sample@123456',
    fullName: 'Đặng Văn Hùng',
    email: 'head@sample-mems.example',
    roles: ['STAFF'],
    permissions: HEAD_PERMISSIONS,
    orgId: DEMO_ORG_ID,
    departmentId: 'dept-1',
    mustChangePassword: false,
    status: 'active',
    lastLoginAt: '2026-11-16T06:30:00Z',
  },
  {
    id: 'acc-facility-1',
    username: 'csvc_lam',
    password: 'Sample@123456',
    fullName: 'Ngô Văn Lâm',
    email: 'csvc@sample-mems.example',
    roles: ['STAFF'],
    permissions: FACILITY_PERMISSIONS,
    orgId: DEMO_ORG_ID,
    departmentId: 'dept-5',
    mustChangePassword: true,
    status: 'active',
    lastLoginAt: null,
  },
]

export const mockOrganizations: MockOrganization[] = [
  {
    id: DEMO_ORG_ID,
    name: 'Trường THPT Mẫu MEMS',
    org_type: 'SCHOOL',
    status: 'active',
    created_at: '2026-08-14T03:20:00Z',
    owner_username: 'sample_owner',
    owner_email: 'owner@sample-mems.example',
    approved_at: '2026-08-14T05:00:00Z',
    rejection_reason: null,
  },
  {
    id: 'org-2',
    name: 'Trung tâm Ngoại ngữ Horizon',
    org_type: 'CENTER',
    status: 'pending',
    created_at: '2026-11-12T02:15:00Z',
    owner_username: 'horizon_owner',
    owner_email: 'owner@horizon.edu.vn',
    approved_at: null,
    rejection_reason: null,
  },
  {
    id: 'org-3',
    name: 'Trường THCS An Bình',
    org_type: 'SCHOOL',
    status: 'pending',
    created_at: '2026-11-14T09:40:00Z',
    owner_username: 'anbinh_owner',
    owner_email: 'hieutruong@anbinh.edu.vn',
    approved_at: null,
    rejection_reason: null,
  },
  {
    id: 'org-4',
    name: 'Trung tâm Tin học Sao Việt',
    org_type: 'CENTER',
    status: 'active',
    created_at: '2026-06-02T08:00:00Z',
    owner_username: 'saoviet_owner',
    owner_email: 'admin@saoviet.vn',
    approved_at: '2026-06-03T02:10:00Z',
    rejection_reason: null,
  },
  {
    id: 'org-5',
    name: 'THPT Nguyễn Du',
    org_type: 'SCHOOL',
    status: 'active',
    created_at: '2026-04-22T04:30:00Z',
    owner_username: 'nguyendu_owner',
    owner_email: 'owner@nguyendu.edu.vn',
    approved_at: '2026-04-23T01:05:00Z',
    rejection_reason: null,
  },
  {
    id: 'org-6',
    name: 'Trung tâm Kỹ năng LifeSkill',
    org_type: 'CENTER',
    status: 'suspended',
    created_at: '2026-02-10T10:00:00Z',
    owner_username: 'lifeskill_owner',
    owner_email: 'contact@lifeskill.vn',
    approved_at: '2026-02-11T03:00:00Z',
    rejection_reason: null,
  },
  {
    id: 'org-7',
    name: 'Trường Tiểu học Hoa Sen',
    org_type: 'SCHOOL',
    status: 'rejected',
    created_at: '2026-10-30T07:20:00Z',
    owner_username: 'hoasen_owner',
    owner_email: 'office@hoasen.edu.vn',
    approved_at: null,
    rejection_reason: 'Hồ sơ chưa đủ thông tin pháp lý.',
  },
  {
    id: 'org-8',
    name: 'THPT Chuyên Lê Quý Đôn',
    org_type: 'SCHOOL',
    status: 'pending',
    created_at: '2026-11-15T11:10:00Z',
    owner_username: 'lequydon_owner',
    owner_email: 'admin@lequydon.edu.vn',
    approved_at: null,
    rejection_reason: null,
  },
  {
    id: 'org-9',
    name: 'Trung tâm Anh ngữ Bright Path',
    org_type: 'CENTER',
    status: 'active',
    created_at: '2026-09-01T03:45:00Z',
    owner_username: 'brightpath_owner',
    owner_email: 'hello@brightpath.vn',
    approved_at: '2026-09-01T06:00:00Z',
    rejection_reason: null,
  },
]

export const mockDepartments: MockDepartment[] = [
  {
    id: 'dept-1',
    name: 'Tổ Toán – Tin',
    description: 'Phụ trách các môn Toán, Tin học và phân công giảng dạy khối tự nhiên.',
    createdAt: '2026-08-14T06:00:00Z',
    modules: ['STUDENT_MANAGEMENT', 'SCHEDULE_MANAGEMENT'],
    orgId: DEMO_ORG_ID,
  },
  {
    id: 'dept-2',
    name: 'Tổ Ngữ văn',
    description: 'Phụ trách môn Ngữ văn và các hoạt động đọc – viết của trường.',
    createdAt: '2026-08-14T06:10:00Z',
    modules: ['STUDENT_MANAGEMENT'],
    orgId: DEMO_ORG_ID,
  },
  {
    id: 'dept-3',
    name: 'Phòng Đào tạo',
    description: 'Quản lý hồ sơ sinh viên, lớp học và kế hoạch đào tạo toàn trường.',
    createdAt: '2026-08-14T06:20:00Z',
    modules: ['STUDENT_MANAGEMENT', 'SCHEDULE_MANAGEMENT', 'CLASS_MANAGEMENT'],
    orgId: DEMO_ORG_ID,
  },
  {
    id: 'dept-4',
    name: 'Phòng Hành chính – Nhân sự',
    description: 'Tuyển dụng, hợp đồng lao động, điều chuyển và nghỉ việc.',
    createdAt: '2026-08-14T06:30:00Z',
    modules: [],
    orgId: DEMO_ORG_ID,
  },
  {
    id: 'dept-5',
    name: 'Phòng Cơ sở vật chất',
    description: 'Quản lý phòng học, thiết bị và xử lý sự cố trong toàn trường.',
    createdAt: '2026-08-14T06:40:00Z',
    modules: ['FACILITY_MANAGEMENT', 'ROOM_MANAGEMENT', 'EQUIPMENT_MANAGEMENT'],
    orgId: DEMO_ORG_ID,
  },
]

export const mockPositions: MockPosition[] = [
  {
    id: 'pos-owner',
    name: 'Quản trị viên tổ chức',
    description: 'Vận hành toàn bộ nghiệp vụ của trường, trừ các quyền cấp Chủ tổ chức.',
    createdAt: '2026-08-14T06:00:00Z',
    permissions: [...HR_PERMISSIONS, ...ACADEMIC_PERMISSIONS, ...FACILITY_PERMISSIONS],
    profileType: null,
    bundleCodes: ['HR_MANAGEMENT', 'ACADEMIC_MANAGEMENT', 'FACILITY_MANAGEMENT'],
    scope: 'ORGANIZATION',
    departmentId: null,
  },
  {
    id: 'pos-gv',
    name: 'Giáo vụ',
    description: 'Quản lý sinh viên, lớp học và môn học trong toàn tổ chức.',
    createdAt: '2026-08-14T06:00:00Z',
    permissions: ACADEMIC_PERMISSIONS,
    profileType: null,
    bundleCodes: ['ACADEMIC_MANAGEMENT'],
    scope: 'ORGANIZATION',
    departmentId: null,
  },
  {
    id: 'pos-teacher',
    name: 'Giáo viên',
    description: 'Xem lớp được phân công, điểm danh và gửi yêu cầu đổi lịch.',
    createdAt: '2026-08-14T06:00:00Z',
    permissions: TEACHER_PERMISSIONS,
    profileType: 'TEACHER',
    bundleCodes: [],
    scope: 'DEPARTMENT',
    departmentId: null,
  },
  {
    id: 'pos-head',
    name: 'Trưởng phòng ban',
    description: 'Duyệt huỷ/đóng lớp và yêu cầu đổi lịch trong phạm vi phòng ban.',
    createdAt: '2026-08-14T06:00:00Z',
    permissions: HEAD_PERMISSIONS,
    profileType: null,
    bundleCodes: [],
    scope: 'DEPARTMENT',
    departmentId: null,
  },
  {
    id: 'pos-hr',
    name: 'Nhân sự phòng ban',
    description: 'Quản lý nhân sự và chức vụ trong phạm vi phòng ban.',
    createdAt: '2026-08-14T06:00:00Z',
    permissions: HR_PERMISSIONS,
    profileType: null,
    bundleCodes: ['HR_MANAGEMENT'],
    scope: 'DEPARTMENT',
    departmentId: null,
  },
  {
    id: 'pos-facility',
    name: 'Nhân viên CSVC',
    description: 'Quản lý phòng học, thiết bị và xử lý sự cố.',
    createdAt: '2026-08-14T06:00:00Z',
    permissions: FACILITY_PERMISSIONS,
    profileType: null,
    bundleCodes: ['FACILITY_MANAGEMENT'],
    scope: 'DEPARTMENT',
    departmentId: null,
  },
  {
    id: 'pos-staff',
    name: 'Nhân viên',
    description: 'Chức vụ khung, không kèm quyền mặc định.',
    createdAt: '2026-08-14T06:00:00Z',
    permissions: [],
    profileType: null,
    bundleCodes: [],
    scope: 'DEPARTMENT',
    departmentId: null,
  },
]

interface MemberSeed {
  userId: string
  username: string
  departmentId: string
  role: 'OWNER' | 'MANAGER' | 'STAFF'
  fullName: string
  email: string
  phone: string
  staffCode: string
  positionIds: string[]
  permissions: string[]
  teacher?: boolean
  contractType?: 'CO_HUU' | 'THINH_GIANG'
  teachingStatus?: 'DANG_DAY' | 'TAM_NGHI' | 'NGHI_VIEC'
  classCount?: number
  appointedAt?: string
  status?: 'ACTIVE' | 'RESIGNED'
}

const MEMBER_SEEDS: MemberSeed[] = [
  {
    userId: 'acc-owner-1',
    username: 'sample_owner',
    departmentId: 'dept-1',
    role: 'OWNER',
    fullName: 'Nguyễn Minh Anh',
    email: 'owner@sample-mems.example',
    phone: '0901 234 567',
    staffCode: 'QT001',
    positionIds: ['pos-owner'],
    permissions: ALL_PERMISSIONS,
    appointedAt: '2026-08-14T06:00:00Z',
  },
  {
    userId: 'acc-head-1',
    username: 'sample_head',
    departmentId: 'dept-1',
    role: 'STAFF',
    fullName: 'Đặng Văn Hùng',
    email: 'head@sample-mems.example',
    phone: '0903 118 224',
    staffCode: 'GV006',
    positionIds: ['pos-head', 'pos-teacher'],
    permissions: [...HEAD_PERMISSIONS, ...TEACHER_PERMISSIONS],
    teacher: true,
    contractType: 'CO_HUU',
    teachingStatus: 'DANG_DAY',
    classCount: 3,
  },
  {
    userId: 'acc-teacher-1',
    username: 'sample_teacher',
    departmentId: 'dept-1',
    role: 'STAFF',
    fullName: 'Trần Quốc Bảo',
    email: 'teacher@sample-mems.example',
    phone: '0912 445 901',
    staffCode: 'GV001',
    positionIds: ['pos-teacher'],
    permissions: TEACHER_PERMISSIONS,
    teacher: true,
    contractType: 'CO_HUU',
    teachingStatus: 'DANG_DAY',
    classCount: 2,
  },
  {
    userId: 'acc-teacher-2',
    username: 'gv_hoa',
    departmentId: 'dept-1',
    role: 'STAFF',
    fullName: 'Lê Thị Hồng',
    email: 'hong.le@sample-mems.example',
    phone: '0987 220 145',
    staffCode: 'GV004',
    positionIds: ['pos-teacher'],
    permissions: TEACHER_PERMISSIONS,
    teacher: true,
    contractType: 'THINH_GIANG',
    teachingStatus: 'DANG_DAY',
    classCount: 1,
  },
  {
    userId: 'acc-teacher-3',
    username: 'gv_khoa',
    departmentId: 'dept-1',
    role: 'STAFF',
    fullName: 'Phạm Văn Khoa',
    email: 'khoa.pham@sample-mems.example',
    phone: '0938 771 002',
    staffCode: 'GV005',
    positionIds: ['pos-teacher'],
    permissions: TEACHER_PERMISSIONS,
    teacher: true,
    contractType: 'CO_HUU',
    teachingStatus: 'TAM_NGHI',
    classCount: 0,
  },
  {
    userId: 'acc-teacher-4',
    username: 'gv_lan',
    departmentId: 'dept-2',
    role: 'STAFF',
    fullName: 'Nguyễn Thị Lan',
    email: 'lan.nguyen@sample-mems.example',
    phone: '0909 334 778',
    staffCode: 'GV007',
    positionIds: ['pos-teacher'],
    permissions: TEACHER_PERMISSIONS,
    teacher: true,
    contractType: 'CO_HUU',
    teachingStatus: 'DANG_DAY',
    classCount: 2,
  },
  {
    userId: 'acc-teacher-5',
    username: 'gv_minh',
    departmentId: 'dept-2',
    role: 'STAFF',
    fullName: 'Hoàng Nhật Minh',
    email: 'minh.hoang@sample-mems.example',
    phone: '0966 812 004',
    staffCode: 'GV008',
    positionIds: ['pos-teacher'],
    permissions: TEACHER_PERMISSIONS,
    teacher: true,
    contractType: 'THINH_GIANG',
    teachingStatus: 'DANG_DAY',
    classCount: 1,
  },
  {
    userId: 'acc-teacher-6',
    username: 'gv_thu',
    departmentId: 'dept-2',
    role: 'STAFF',
    fullName: 'Bùi Anh Thư',
    email: 'thu.bui@sample-mems.example',
    phone: '0918 006 233',
    staffCode: 'GV009',
    positionIds: ['pos-teacher'],
    permissions: TEACHER_PERMISSIONS,
    teacher: true,
    contractType: 'CO_HUU',
    teachingStatus: 'NGHI_VIEC',
    classCount: 0,
    status: 'RESIGNED',
  },
  {
    userId: 'acc-academic-1',
    username: 'sample_academic',
    departmentId: 'dept-3',
    role: 'STAFF',
    fullName: 'Đỗ Thu Hà',
    email: 'academic@sample-mems.example',
    phone: '0977 345 112',
    staffCode: 'NV004',
    positionIds: ['pos-gv'],
    permissions: ACADEMIC_PERMISSIONS,
  },
  {
    userId: 'acc-academic-2',
    username: 'gv_vu',
    departmentId: 'dept-3',
    role: 'STAFF',
    fullName: 'Ngô Thanh Vũ',
    email: 'vu.ngo@sample-mems.example',
    phone: '0902 118 776',
    staffCode: 'NV003',
    positionIds: ['pos-gv'],
    permissions: ACADEMIC_PERMISSIONS,
  },
  {
    userId: 'acc-hr-1',
    username: 'sample_hr',
    departmentId: 'dept-4',
    role: 'MANAGER',
    fullName: 'Vũ Thanh Mai',
    email: 'hr@sample-mems.example',
    phone: '0913 552 880',
    staffCode: 'NS001',
    positionIds: ['pos-hr'],
    permissions: HR_PERMISSIONS,
  },
  {
    userId: 'acc-hr-2',
    username: 'hr_phuc',
    departmentId: 'dept-4',
    role: 'STAFF',
    fullName: 'Lý Gia Phúc',
    email: 'phuc.ly@sample-mems.example',
    phone: '0932 447 118',
    staffCode: 'NS002',
    positionIds: ['pos-hr'],
    permissions: HR_PERMISSIONS,
  },
  {
    userId: 'acc-facility-1',
    username: 'csvc_lam',
    departmentId: 'dept-5',
    role: 'STAFF',
    fullName: 'Ngô Văn Lâm',
    email: 'csvc@sample-mems.example',
    phone: '0908 221 337',
    staffCode: 'CS001',
    positionIds: ['pos-facility'],
    permissions: FACILITY_PERMISSIONS,
  },
  {
    userId: 'acc-facility-2',
    username: 'csvc_tuan',
    departmentId: 'dept-5',
    role: 'STAFF',
    fullName: 'Trịnh Anh Tuấn',
    email: 'tuan.trinh@sample-mems.example',
    phone: '0944 008 661',
    staffCode: 'CS002',
    positionIds: ['pos-facility'],
    permissions: FACILITY_PERMISSIONS,
  },
]

function buildAssignments(seed: MemberSeed): MockAssignment[] {
  return seed.positionIds.map((positionId, index) => {
    const position = mockPositions.find((item) => item.id === positionId)
    return {
      id: `asg-${seed.userId}-${index}`,
      positionId,
      positionName: position?.name ?? positionId,
      scopeType: position?.scope ?? 'DEPARTMENT',
      departmentId: position?.scope === 'ORGANIZATION' ? null : seed.departmentId,
      effectiveFrom: seed.appointedAt ?? '2026-08-14T06:00:00Z',
      effectiveTo: null,
      status: 'ACTIVE',
      assignedBy: 'Nguyễn Minh Anh',
      assignedByName: 'Nguyễn Minh Anh',
      assignedAt: seed.appointedAt ?? '2026-08-14T06:00:00Z',
      reason: null,
      revokedAt: null,
      revokedBy: null,
      revokedByName: null,
      revokedReason: null,
    }
  })
}

export const mockMembers: MockMember[] = MEMBER_SEEDS.map((seed) => ({
  userId: seed.userId,
  username: seed.username,
  departmentId: seed.departmentId,
  role: seed.role,
  status: seed.status ?? 'ACTIVE',
  appointedBy: seed.role === 'OWNER' ? null : 'acc-owner-1',
  appointedAt: seed.appointedAt ?? '2026-09-01T02:00:00Z',
  positionIds: seed.positionIds,
  permissions: seed.permissions,
  fullName: seed.fullName,
  email: seed.email,
  phone: seed.phone,
  staffCode: seed.staffCode,
  teacher: seed.teacher ?? false,
  contractType: seed.contractType ?? null,
  teachingStatus: seed.teachingStatus ?? null,
  classCount: seed.classCount ?? 0,
  classLabel: (seed.classCount ?? 0) === 0 ? 'Chưa có lớp' : `${seed.classCount} lớp`,
  assignmentHistory: buildAssignments(seed),
}))

export const mockNotifications: MockNotification[] = [
  {
    id: 'ntf-1',
    type: 'TRANSFER_PENDING',
    title: 'Yêu cầu chuyển phòng đang chờ duyệt',
    body: 'Hoàng Nhật Minh (Tổ Ngữ văn) đang chờ Trưởng phòng Tổ Toán – Tin xác nhận.',
    entityType: 'TRANSFER_REQUEST',
    entityId: 'tr-1',
    readAt: null,
    createdAt: '2026-11-16T06:40:00Z',
    orgId: DEMO_ORG_ID,
  },
  {
    id: 'ntf-2',
    type: 'CLASS_NEEDS_REASSIGNMENT',
    title: '2 lớp cần phân công lại giáo viên',
    body: 'Giáo viên Bùi Anh Thư đã nghỉ việc. Cần phân công lại cho lớp 10A2 và 11B1.',
    entityType: 'CLASS',
    entityId: 'class-10a2',
    readAt: null,
    createdAt: '2026-11-15T09:12:00Z',
    orgId: DEMO_ORG_ID,
  },
  {
    id: 'ntf-3',
    type: 'ORG_MODULES_UPDATED',
    title: 'Module cơ sở vật chất đã được bật',
    body: 'Quản trị hệ thống đã bật module Cơ sở vật chất cho tổ chức.',
    entityType: 'ORGANIZATION',
    entityId: DEMO_ORG_ID,
    readAt: '2026-11-14T10:00:00Z',
    createdAt: '2026-11-14T09:30:00Z',
    orgId: DEMO_ORG_ID,
  },
  {
    id: 'ntf-4',
    type: 'EMPLOYEE_CREATED',
    title: 'Nhân sự mới đã được tạo',
    body: 'Trịnh Anh Tuấn đã được thêm vào Phòng Cơ sở vật chất.',
    entityType: 'EMPLOYEE',
    entityId: 'acc-facility-2',
    readAt: '2026-11-13T03:00:00Z',
    createdAt: '2026-11-13T02:45:00Z',
    orgId: DEMO_ORG_ID,
  },
  {
    id: 'ntf-5',
    type: 'RESIGNATION_APPROVED',
    title: 'Nghỉ việc đã được duyệt',
    body: 'Bùi Anh Thư (Tổ Ngữ văn) đã hoàn tất bàn giao và chuyển sang trạng thái nghỉ việc.',
    entityType: 'RESIGNATION',
    entityId: 'res-1',
    readAt: '2026-11-10T08:20:00Z',
    createdAt: '2026-11-10T08:00:00Z',
    orgId: DEMO_ORG_ID,
  },
  {
    id: 'ntf-6',
    type: 'SCHEDULE_CHANGED',
    title: 'Lịch dạy thay đổi',
    body: 'Buổi học lớp 10A1 ngày 18/11 đổi sang phòng 204.',
    entityType: 'SESSION',
    entityId: 'session-118',
    readAt: null,
    createdAt: '2026-11-09T14:05:00Z',
    orgId: DEMO_ORG_ID,
  },
]

function step(
  name: MockTransferStep['step'],
  decision: MockTransferStep['decision'],
  decidedByName: string | null,
  decidedAt: string | null,
  note: string | null = null,
): MockTransferStep {
  return {
    step: name,
    decision,
    decidedBy: decision === 'PENDING' ? null : `acc-${name.toLowerCase()}`,
    decidedByName,
    decidedAt,
    note,
  }
}

export const mockTransfers: MockTransfer[] = [
  {
    id: 'tr-1',
    userId: 'acc-teacher-5',
    username: 'gv_minh',
    fullName: 'Hoàng Nhật Minh',
    fromDepartmentId: 'dept-2',
    fromDepartmentName: 'Tổ Ngữ văn',
    toDepartmentId: 'dept-1',
    toDepartmentName: 'Tổ Toán – Tin',
    reason: 'Nguyện vọng chuyển sang dạy Tin học theo chuyên môn đào tạo.',
    status: 'PENDING',
    requestedBy: 'acc-hr-1',
    requestedByName: 'Vũ Thanh Mai',
    requestedAt: '2026-11-14T02:30:00Z',
    appliedAt: null,
    appliedBy: null,
    steps: [
      step('SOURCE_HEAD', 'APPROVED', 'Nguyễn Thị Lan', '2026-11-14T08:10:00Z', 'Đồng ý cho chuyển.'),
      step('TARGET_HEAD', 'PENDING', null, null),
      step('HR', 'PENDING', null, null),
      step('EMPLOYEE', 'PENDING', null, null),
    ],
    orgId: DEMO_ORG_ID,
  },
  {
    id: 'tr-2',
    userId: 'acc-facility-2',
    username: 'csvc_tuan',
    fullName: 'Trịnh Anh Tuấn',
    fromDepartmentId: 'dept-5',
    fromDepartmentName: 'Phòng Cơ sở vật chất',
    toDepartmentId: 'dept-4',
    toDepartmentName: 'Phòng Hành chính – Nhân sự',
    reason: 'Điều chuyển nội bộ theo kế hoạch tái cơ cấu.',
    status: 'PENDING',
    requestedBy: 'acc-hr-1',
    requestedByName: 'Vũ Thanh Mai',
    requestedAt: '2026-11-12T03:00:00Z',
    appliedAt: null,
    appliedBy: null,
    steps: [
      step('SOURCE_HEAD', 'APPROVED', 'Ngô Văn Lâm', '2026-11-12T07:00:00Z', 'Bàn giao xong thiết bị.'),
      step('TARGET_HEAD', 'APPROVED', 'Vũ Thanh Mai', '2026-11-13T02:15:00Z', null),
      step('HR', 'PENDING', null, null),
      step('EMPLOYEE', 'PENDING', null, null),
    ],
    orgId: DEMO_ORG_ID,
  },
  {
    id: 'tr-3',
    userId: 'acc-academic-2',
    username: 'gv_vu',
    fullName: 'Ngô Thanh Vũ',
    fromDepartmentId: 'dept-1',
    fromDepartmentName: 'Tổ Toán – Tin',
    toDepartmentId: 'dept-3',
    toDepartmentName: 'Phòng Đào tạo',
    reason: 'Chuyển sang phụ trách đào tạo theo phân công mới.',
    status: 'APPROVED',
    requestedBy: 'acc-hr-1',
    requestedByName: 'Vũ Thanh Mai',
    requestedAt: '2026-10-20T02:00:00Z',
    appliedAt: '2026-10-24T09:30:00Z',
    appliedBy: 'Hệ thống',
    steps: [
      step('SOURCE_HEAD', 'APPROVED', 'Đặng Văn Hùng', '2026-10-21T03:00:00Z', null),
      step('TARGET_HEAD', 'APPROVED', 'Đỗ Thu Hà', '2026-10-22T02:00:00Z', null),
      step('HR', 'APPROVED', 'Vũ Thanh Mai', '2026-10-23T01:30:00Z', null),
      step('EMPLOYEE', 'APPROVED', 'Ngô Thanh Vũ', '2026-10-24T09:00:00Z', 'Tôi đồng ý.'),
    ],
    orgId: DEMO_ORG_ID,
  },
]

export const mockAuditLogs: MockAuditLog[] = [
  {
    id: 'aud-1',
    created_at: '2026-11-15T11:12:00Z',
    action: 'ORG_MODULES_UPDATED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: 'org-8',
    target_name: 'THPT Chuyên Lê Quý Đôn',
    description: null,
  },
  {
    id: 'aud-2',
    created_at: '2026-11-15T09:20:00Z',
    action: 'ORG_SUSPENDED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: 'org-6',
    target_name: 'Trung tâm Kỹ năng LifeSkill',
    description: null,
  },
  {
    id: 'aud-3',
    created_at: '2026-11-14T09:42:00Z',
    action: 'ORG_APPROVED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: 'org-9',
    target_name: 'Trung tâm Anh ngữ Bright Path',
    description: null,
  },
  {
    id: 'aud-4',
    created_at: '2026-11-14T05:00:00Z',
    action: 'ACCOUNT_STATUS_CHANGED',
    actor_username: 'platform_admin',
    target_type: 'ACCOUNT',
    target_id: 'acc-owner-1',
    target_name: 'sample_owner',
    description: null,
  },
  {
    id: 'aud-5',
    created_at: '2026-11-12T02:18:00Z',
    action: 'ORG_REJECTED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: 'org-7',
    target_name: 'Trường Tiểu học Hoa Sen',
    description: null,
  },
  {
    id: 'aud-6',
    created_at: '2026-11-10T08:20:00Z',
    action: 'ORG_REACTIVATED',
    actor_username: 'platform_admin',
    target_type: 'ORGANIZATION',
    target_id: 'org-9',
    target_name: 'Trung tâm Anh ngữ Bright Path',
    description: null,
  },
  {
    id: 'aud-7',
    created_at: '2026-06-03T02:10:00Z',
    action: 'ORG_APPROVED',
    actor_username: 'system',
    target_type: 'ORGANIZATION',
    target_id: 'org-4',
    target_name: 'Trung tâm Tin học Sao Việt',
    description: null,
  },
]

// ============================================================================
// Phase 1 — Academic Setup Mock Fixtures (D-01 to D-15)
// ============================================================================

export const OTHER_ORG_ID = '22222222-2222-4222-8222-222222222222'

export interface MockSubject extends Subject {
  orgId: string
}

export const mockSubjects: MockSubject[] = [
  {
    id: 'sub-toan',
    code: 'TOAN',
    name: 'Toán học',
    description: 'Chương trình toán chuẩn THPT',
    active: true,
    orgId: DEMO_ORG_ID,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: null,
  },
  {
    id: 'sub-ly',
    code: 'LY',
    name: 'Vật lý',
    description: 'Vật lý đại cương và nâng cao',
    active: true,
    orgId: DEMO_ORG_ID,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: null,
  },
  {
    id: 'sub-hoa',
    code: 'HOA',
    name: 'Hóa học',
    description: 'Hóa học cơ bản và thực hành',
    active: true,
    orgId: DEMO_ORG_ID,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: null,
  },
  {
    id: 'sub-tin',
    code: 'TIN',
    name: 'Tin học',
    description: 'Lập trình và thuật toán',
    active: true,
    orgId: DEMO_ORG_ID,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: null,
  },
  // D-04: Môn học code = null (hợp lệ trong cùng tổ chức)
  {
    id: 'sub-van',
    code: null,
    name: 'Ngữ văn',
    description: 'Văn học Việt Nam và thế giới',
    active: true,
    orgId: DEMO_ORG_ID,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: null,
  },
  // D-04: Thêm một môn khác cũng có code = null trong cùng tổ chức
  {
    id: 'sub-anh',
    code: null,
    name: 'Tiếng Anh',
    description: 'Giao tiếp và ngữ pháp tiếng Anh',
    active: true,
    orgId: DEMO_ORG_ID,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: null,
  },
  // Môn đã ngừng hoạt động (inactive)
  {
    id: 'sub-gdcd',
    code: 'GDCD',
    name: 'Giáo dục công dân',
    description: 'Môn đã ngừng dùng',
    active: false,
    orgId: DEMO_ORG_ID,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  // Dữ liệu thuộc tổ chức khác (để test cách ly tổ chức)
  {
    id: 'sub-other-toan',
    code: 'TOAN',
    name: 'Toán học (Org 2)',
    description: 'Môn toán của tổ chức 2',
    active: true,
    orgId: OTHER_ORG_ID,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: null,
  },
]

// ----------------------------------------------------------------------------
// Curricula Mock Fixtures (D-02, D-03, D-07, D-12)
// ----------------------------------------------------------------------------

export const mockCurricula: Curriculum[] = [
  {
    id: 'c0000000-0000-4000-8000-000000000001',
    orgId: DEMO_ORG_ID,
    code: 'CT-K10-2026',
    name: 'Chương trình Khối 10 – 2026',
    description: 'Khung chương trình chuẩn Khối 10 áp dụng từ năm học 2026-2027',
    gradeLevel: 'K10',
    majorCode: 'THPT-CHUNG',
    isActive: true,
    version: 1,
    subjectCount: 3,
    createdAt: '2026-08-10T00:00:00Z',
    updatedAt: null,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000002',
    orgId: DEMO_ORG_ID,
    code: 'CT-K11-2026',
    name: 'Chương trình Khối 11 – 2026',
    description: 'Khung chương trình chuẩn Khối 11',
    gradeLevel: 'K11',
    majorCode: 'THPT-CHUNG',
    isActive: true,
    version: 2,
    subjectCount: 2,
    createdAt: '2026-08-11T00:00:00Z',
    updatedAt: null,
  },
  {
    id: 'c0000000-0000-4000-8000-000000000003',
    orgId: DEMO_ORG_ID,
    code: 'CT-CU',
    name: 'Chương trình niên khóa cũ',
    description: 'Chương trình đã ngừng sử dụng',
    gradeLevel: 'K12',
    majorCode: null,
    isActive: false,
    version: 0,
    subjectCount: 1,
    createdAt: '2025-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
  },
  // Thuộc tổ chức khác
  {
    id: 'c0000000-0000-4000-8000-000000000099',
    orgId: OTHER_ORG_ID,
    code: 'CT-OTHER',
    name: 'Chương trình trường khác',
    description: null,
    gradeLevel: 'K10',
    majorCode: null,
    isActive: true,
    version: 0,
    subjectCount: 1,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: null,
  },
]

export const mockCurriculumSubjects: CurriculumSubject[] = [
  // CT-K10-2026:
  // 1. Toán: không có tiên quyết
  {
    curriculumId: 'c0000000-0000-4000-8000-000000000001',
    subjectId: 'sub-toan',
    subjectCode: 'TOAN',
    subjectName: 'Toán học',
    sequenceNo: 1,
    requiredSessions: 60,
    sessionMinutes: 45,
    theoryHours: 45,
    practiceHours: 15,
    isRequired: true,
    notes: 'Toán học cơ sở',
    prerequisiteSubjectIds: [],
    prerequisites: [],
  },
  // 2. Vật lý: tiên quyết là Toán
  {
    curriculumId: 'c0000000-0000-4000-8000-000000000001',
    subjectId: 'sub-ly',
    subjectCode: 'LY',
    subjectName: 'Vật lý',
    sequenceNo: 2,
    requiredSessions: 45,
    sessionMinutes: 45,
    theoryHours: 30,
    practiceHours: 15,
    isRequired: true,
    notes: 'Cơ học và nhiệt học',
    prerequisiteSubjectIds: ['sub-toan'],
    prerequisites: [{ subjectId: 'sub-toan', subjectCode: 'TOAN', subjectName: 'Toán học' }],
  },
  // 3. Tin học: D-07 nhiều tiên quyết (Toán VÀ Vật lý)
  {
    curriculumId: 'c0000000-0000-4000-8000-000000000001',
    subjectId: 'sub-tin',
    subjectCode: 'TIN',
    subjectName: 'Tin học',
    sequenceNo: 3,
    requiredSessions: 30,
    sessionMinutes: 90,
    theoryHours: 0,
    practiceHours: 30,
    isRequired: false,
    notes: 'Thực hành phòng máy',
    prerequisiteSubjectIds: ['sub-toan', 'sub-ly'],
    prerequisites: [
      { subjectId: 'sub-toan', subjectCode: 'TOAN', subjectName: 'Toán học' },
      { subjectId: 'sub-ly', subjectCode: 'LY', subjectName: 'Vật lý' },
    ],
  },
  // CT-K11-2026:
  {
    curriculumId: 'c0000000-0000-4000-8000-000000000002',
    subjectId: 'sub-hoa',
    subjectCode: 'HOA',
    subjectName: 'Hóa học',
    sequenceNo: 1,
    requiredSessions: 45,
    sessionMinutes: 45,
    theoryHours: 30,
    practiceHours: 15,
    isRequired: true,
    notes: null,
    prerequisiteSubjectIds: [],
    prerequisites: [],
  },
  {
    curriculumId: 'c0000000-0000-4000-8000-000000000002',
    subjectId: 'sub-tin',
    subjectCode: 'TIN',
    subjectName: 'Tin học',
    sequenceNo: 2,
    requiredSessions: 30,
    sessionMinutes: 90,
    theoryHours: 10,
    practiceHours: 20,
    isRequired: true,
    notes: null,
    prerequisiteSubjectIds: [],
    prerequisites: [],
  },
]

// ----------------------------------------------------------------------------
// Specialty Subjects Mock Fixtures (D-06)
// ----------------------------------------------------------------------------

export interface MockSpecialtySubject {
  specialtyId: string
  subjectIds: string[]
  orgId: string
}

export const mockSpecialtySubjects: MockSpecialtySubject[] = [
  { specialtyId: 'spec-toan', subjectIds: ['sub-toan', 'sub-tin'], orgId: DEMO_ORG_ID },
  { specialtyId: 'spec-ly', subjectIds: ['sub-ly'], orgId: DEMO_ORG_ID },
  { specialtyId: 'spec-tin', subjectIds: ['sub-tin'], orgId: DEMO_ORG_ID },
  { specialtyId: 'spec-van', subjectIds: ['sub-van'], orgId: DEMO_ORG_ID },
  { specialtyId: 'spec-anh', subjectIds: ['sub-anh'], orgId: DEMO_ORG_ID },
]

// ----------------------------------------------------------------------------
// Teacher Subjects Mock Fixtures (D-06, D-06a)
// D-06a: status chỉ là APPROVED hoặc REVOKED (không có PENDING)
// ----------------------------------------------------------------------------

export interface MockTeacherSubjectProfile {
  userId: string
  version: number // staff_profile.version
  orgId: string
  items: TeacherSubject[]
}

export const mockTeacherSubjectProfiles: MockTeacherSubjectProfile[] = [
  {
    userId: 'acc-academic-2', // Ngô Thanh Vũ
    version: 16,
    orgId: DEMO_ORG_ID,
    items: [
      {
        subjectId: 'sub-toan',
        subjectCode: 'TOAN',
        subjectName: 'Toán học',
        status: 'APPROVED',
        source: 'SPECIALTY',
        createdAt: '2026-08-15T00:00:00Z',
      },
      {
        subjectId: 'sub-tin',
        subjectCode: 'TIN',
        subjectName: 'Tin học',
        status: 'APPROVED',
        source: 'SPECIALTY',
        createdAt: '2026-08-15T00:00:00Z',
      },
      {
        subjectId: 'sub-ly',
        subjectCode: 'LY',
        subjectName: 'Vật lý',
        status: 'APPROVED',
        source: 'MANUAL',
        createdAt: '2026-09-01T00:00:00Z',
      },
    ],
  },
  {
    userId: 'acc-academic-1', // Nguyễn Thu Trang
    version: 4,
    orgId: DEMO_ORG_ID,
    items: [
      {
        subjectId: 'sub-van',
        subjectCode: null,
        subjectName: 'Ngữ văn',
        status: 'APPROVED',
        source: 'SPECIALTY',
        createdAt: '2026-08-15T00:00:00Z',
      },
    ],
  },
]

// ----------------------------------------------------------------------------
// Class & Class Subject Mock Fixtures (D-01, D-08, D-09, D-15)
// ----------------------------------------------------------------------------

export interface MockAcademicClass {
  id: string
  orgId: string
  classCode: string
  name: string
  status: 'CHUA_BAT_DAU' | 'DANG_DIEN_RA' | 'DA_KET_THUC' | 'DA_HUY' | 'CLOSED'
  version: number
  subjectId: string | null // legacy primary subject pointer (D-15)
  teacherId: string | null // legacy teacher pointer
  curriculumId: string | null
}

export const mockAcademicClasses: MockAcademicClass[] = [
  {
    id: 'cls-c001',
    orgId: DEMO_ORG_ID,
    classCode: '10A1',
    name: 'Lớp 10A1 Chuẩn',
    status: 'CHUA_BAT_DAU',
    version: 1,
    subjectId: 'sub-toan',
    teacherId: 'acc-academic-2',
    curriculumId: 'c0000000-0000-4000-8000-000000000001',
  },
  {
    id: 'cls-c002',
    orgId: DEMO_ORG_ID,
    classCode: '10A2',
    name: 'Lớp 10A2 Nâng cao',
    status: 'DANG_DIEN_RA',
    version: 4,
    subjectId: 'sub-toan',
    teacherId: 'acc-academic-2',
    curriculumId: 'c0000000-0000-4000-8000-000000000001',
  },
  {
    id: 'cls-c003',
    orgId: DEMO_ORG_ID,
    classCode: '12C1',
    name: 'Lớp 12C1 Tốt nghiệp',
    status: 'DA_KET_THUC',
    version: 10,
    subjectId: 'sub-toan',
    teacherId: 'acc-academic-2',
    curriculumId: null,
  },
  // Lớp legacy không có bản ghi class_subject nào (để test fallback D-09 & D-15)
  {
    id: 'cls-legacy-01',
    orgId: DEMO_ORG_ID,
    classCode: 'LEGACY-10',
    name: 'Lớp Legacy Chưa Chuyển Đổi',
    status: 'CHUA_BAT_DAU',
    version: 1,
    subjectId: 'sub-toan',
    teacherId: 'acc-academic-2',
    curriculumId: null,
  },
]

export const mockClassSubjects: ClassSubject[] = [
  // Lớp cls-c001 (CHUA_BAT_DAU):
  {
    classId: 'cls-c001',
    subjectId: 'sub-toan',
    subjectCode: 'TOAN',
    subjectName: 'Toán học',
    source: 'CURRICULUM',
    curriculumId: 'c0000000-0000-4000-8000-000000000001',
    requiredSessions: 60,
    plannedSessions: 60,
    sessionMinutes: 45,
    teacherId: 'acc-academic-2',
    teacherName: 'Ngô Thanh Vũ',
    isPrimary: true, // D-15: dòng primary khớp school_class.subject_id
    status: 'PLANNED',
  },
  {
    classId: 'cls-c001',
    subjectId: 'sub-ly',
    subjectCode: 'LY',
    subjectName: 'Vật lý',
    source: 'CURRICULUM',
    curriculumId: 'c0000000-0000-4000-8000-000000000001',
    requiredSessions: 45,
    plannedSessions: 45,
    sessionMinutes: 45,
    teacherId: null, // D-09: teacherId null -> "Chưa phân công", KHÔNG fallback
    teacherName: null,
    isPrimary: false,
    status: 'PLANNED',
  },
  {
    classId: 'cls-c001',
    subjectId: 'sub-tin',
    subjectCode: 'TIN',
    subjectName: 'Tin học',
    source: 'CURRICULUM',
    curriculumId: 'c0000000-0000-4000-8000-000000000001',
    requiredSessions: 30,
    plannedSessions: 30,
    sessionMinutes: 90,
    teacherId: null,
    teacherName: null,
    isPrimary: false,
    status: 'PLANNED',
  },

  // Lớp cls-c002 (DANG_DIEN_RA):
  {
    classId: 'cls-c002',
    subjectId: 'sub-toan',
    subjectCode: 'TOAN',
    subjectName: 'Toán học',
    source: 'CURRICULUM',
    curriculumId: 'c0000000-0000-4000-8000-000000000001',
    requiredSessions: 60,
    plannedSessions: 60,
    sessionMinutes: 45,
    teacherId: 'acc-academic-2',
    teacherName: 'Ngô Thanh Vũ',
    isPrimary: true,
    status: 'IN_PROGRESS',
  },
  {
    classId: 'cls-c002',
    subjectId: 'sub-ly',
    subjectCode: 'LY',
    subjectName: 'Vật lý',
    source: 'CURRICULUM',
    curriculumId: 'c0000000-0000-4000-8000-000000000001',
    requiredSessions: 45,
    plannedSessions: 45,
    sessionMinutes: 45,
    teacherId: null, // teacherId null, KHÔNG fallback
    teacherName: null,
    isPrimary: false,
    status: 'IN_PROGRESS',
  },

  // Lớp cls-c003 (DA_KET_THUC):
  {
    classId: 'cls-c003',
    subjectId: 'sub-toan',
    subjectCode: 'TOAN',
    subjectName: 'Toán học',
    source: 'LEGACY',
    curriculumId: null,
    requiredSessions: 60,
    plannedSessions: 60,
    sessionMinutes: 45,
    teacherId: 'acc-academic-2',
    teacherName: 'Ngô Thanh Vũ',
    isPrimary: true,
    status: 'COMPLETED',
  },
]

export const mockClassSubjectHistory: ClassSubjectHistory[] = [
  {
    id: 'hist-001',
    classId: 'cls-c002',
    oldSubjectId: 'sub-van',
    oldSubjectCode: null,
    oldSubjectName: 'Ngữ văn',
    oldTeacherId: 'acc-academic-1',
    oldTeacherName: 'Nguyễn Thu Trang',
    oldSource: 'LEGACY',
    newSubjectId: 'sub-toan',
    newSubjectCode: 'TOAN',
    newSubjectName: 'Toán học',
    newSource: 'CURRICULUM',
    reason: 'Điều chỉnh môn học chính của lớp theo định hướng chuyên môn mới.',
    operationId: '0f5f7c1e-0d5a-4a6e-9d3b-2f3c1a9b7e10',
    changedBy: 'acc-owner-1',
    changedByName: 'sample_owner',
    changedAt: '2026-09-05T08:30:00Z',
  },
]

