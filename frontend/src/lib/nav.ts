import {
  ArrowLeftRight,
  Bell,
  Blocks,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  DoorOpen,
  FileBadge,
  FileText,
  GraduationCap,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Library,
  Network,
  ScrollText,
  ShieldCheck,
  UserRound,
  Users,
  UsersRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

import { PERM } from '@/lib/permissions'
import type { ModuleState, Session } from '@/types/session'

export type WorkspaceId = 'platform' | 'organization' | 'academic' | 'self'

/** ready = đã có màn hình; planned = đã thiết kế, chưa làm; api-missing = cần backend. */
export type PageStatus = 'ready' | 'planned' | 'api-missing'

export interface NavItem {
  id: string
  label: string
  to: string
  icon: LucideIcon
  /** Có ÍT NHẤT một quyền trong danh sách thì hiện. Rỗng = hiện khi vào được workspace. */
  permissions?: string[]
  /** Phải bật module tương ứng ở tổ chức (và phòng ban) mới hiện. */
  modules?: string[]
  status: PageStatus
  /** Khớp chính xác đường dẫn (dùng cho trang gốc của workspace). */
  end?: boolean
  badge?: 'approvals' | 'notifications' | 'pendingOrganizations'
  /** Hiện khi backend báo người dùng có khả năng duyệt (không cần mã quyền). */
  capability?: 'approvals'
  description?: string
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

export interface Workspace {
  id: WorkspaceId
  label: string
  shortLabel: string
  to: string
  icon: LucideIcon
  /** Tiền tố đường dẫn thuộc workspace (dùng cho breadcrumb + active state). */
  basePath: string
  groups: NavGroup[]
  /** Điều kiện vào workspace — chỉ là UX, backend vẫn kiểm quyền. */
  canEnter: (session: Session) => boolean
}

const OWNER_ROLES = new Set(['OWNER', 'ORG_OWNER'])

export function isOwner(session: Session | null | undefined): boolean {
  return Boolean(session?.roles.some((role) => OWNER_ROLES.has(role)))
}

export function isSuperAdmin(session: Session | null | undefined): boolean {
  return Boolean(session?.roles.includes('SUPER_ADMIN'))
}

export function hasPermission(session: Session | null | undefined, code: string): boolean {
  if (!session) return false
  return isOwner(session) || session.permissions.includes(code)
}

export function hasAnyPermission(session: Session | null | undefined, codes: string[]): boolean {
  if (!session) return false
  if (codes.length === 0) return true
  return isOwner(session) || codes.some((code) => session.permissions.includes(code))
}

/** Trạng thái module; `unknown` khi chưa nạp được (không suy đoán là đã tắt). */
export function moduleState(session: Session | null | undefined, code: string): ModuleState {
  if (!session) return 'unknown'
  return session.moduleStates?.[code] ?? 'unknown'
}

export function hasModule(session: Session | null | undefined, code: string): boolean {
  if (!session) return false
  // Chưa nạp được trạng thái → không ẩn; backend vẫn chặn bằng MODULE_NOT_ENABLED.
  // Chỉ ẩn khi module chưa từng đăng ký. disabled/locked vẫn cho đọc (backend cho phép đọc).
  return moduleState(session, code) !== 'not_registered'
}

/** Ghi dữ liệu (tạo/sửa/xoá) chỉ khi module đang active. */
export function canWriteModule(session: Session | null | undefined, code: string): boolean {
  return moduleState(session, code) === 'active'
}

export function canSeeItem(session: Session | null, item: NavItem): boolean {
  if (!session) return false
  if (item.capability === 'approvals' && session.approvals?.any) return true
  if (item.modules?.length && !item.modules.some((code) => hasModule(session, code))) return false
  if (!item.permissions?.length) return true
  return hasAnyPermission(session, item.permissions)
}

/** Quyền nghiệp vụ mở khu Đào tạo (không tính quyền self). */
const ACADEMIC_PREFIXES = [
  'employee.',
  'position.',
  'department.view',
  'class.',
  'student.create',
  'student.edit',
  'student.delete',
  'student.view',
  'subject.',
  'schedule.',
  'facility.',
  'teacher.',
]

const ORG_PREFIXES = ['employee.', 'position.', 'department.', 'org.', 'delegation.']

function hasPrefixPermission(session: Session, prefixes: string[]): boolean {
  return session.permissions.some((code) => prefixes.some((prefix) => code.startsWith(prefix)))
}

export function canEnterOrganizationWorkspace(session: Session): boolean {
  if (isOwner(session)) return true
  return hasPrefixPermission(session, ORG_PREFIXES)
}

export function canEnterAcademicWorkspace(session: Session): boolean {
  if (isOwner(session)) return true
  return hasPrefixPermission(session, ACADEMIC_PREFIXES)
}

export const WORKSPACES: Workspace[] = [
  {
    id: 'platform',
    label: 'Quản trị hệ thống',
    shortLabel: 'Hệ thống',
    to: '/quan-tri',
    icon: ShieldCheck,
    basePath: '/quan-tri',
    canEnter: (session) => isSuperAdmin(session),
    groups: [
      {
        id: 'platform-overview',
        label: 'Tổng quan',
        items: [
          {
            id: 'platform-dashboard',
            label: 'Bảng điều khiển',
            to: '/quan-tri',
            icon: LayoutDashboard,
            status: 'ready',
            end: true,
          },
        ],
      },
      {
        id: 'platform-organizations',
        label: 'Tổ chức',
        items: [
          {
            id: 'org-pending',
            label: 'Chờ duyệt',
            to: '/quan-tri/to-chuc/cho-duyet',
            icon: Inbox,
            status: 'ready',
            badge: 'pendingOrganizations',
          },
          {
            id: 'org-all',
            label: 'Tất cả tổ chức',
            to: '/quan-tri/to-chuc',
            icon: Building2,
            status: 'ready',
          },
        ],
      },
      {
        id: 'platform-system',
        label: 'Hệ thống',
        items: [
          {
            id: 'module-catalog',
            label: 'Danh mục module',
            to: '/quan-tri/module',
            icon: Blocks,
            status: 'ready',
          },
          {
            id: 'accounts',
            label: 'Tài khoản',
            to: '/quan-tri/tai-khoan',
            icon: UsersRound,
            status: 'ready',
          },
          {
            id: 'platform-audit',
            label: 'Nhật ký hệ thống',
            to: '/quan-tri/nhat-ky',
            icon: ScrollText,
            status: 'ready',
          },
        ],
      },
    ],
  },
  {
    id: 'organization',
    label: 'Tổ chức',
    shortLabel: 'Tổ chức',
    to: '/to-chuc',
    icon: Building2,
    basePath: '/to-chuc',
    canEnter: canEnterOrganizationWorkspace,
    groups: [
      {
        id: 'org-overview',
        label: 'Tổng quan',
        items: [
          {
            id: 'org-dashboard',
            label: 'Bảng điều khiển',
            to: '/to-chuc',
            icon: LayoutDashboard,
            status: 'ready',
            end: true,
          },
        ],
      },
      {
        id: 'org-structure',
        label: 'Cơ cấu tổ chức',
        items: [
          {
            id: 'departments',
            label: 'Phòng ban',
            to: '/to-chuc/phong-ban',
            icon: Network,
            permissions: [PERM.departmentView, PERM.departmentManage, PERM.employeeView],
            status: 'ready',
          },
          {
            id: 'positions',
            label: 'Chức vụ & quyền',
            to: '/to-chuc/chuc-vu',
            icon: KeyRound,
            permissions: [PERM.positionView, PERM.positionManage],
            status: 'ready',
          },
          {
            id: 'employees',
            label: 'Nhân sự',
            to: '/to-chuc/nhan-su',
            icon: Users,
            permissions: [PERM.employeeView],
            status: 'ready',
          },
          {
            id: 'transfers',
            label: 'Điều chuyển',
            to: '/to-chuc/chuyen-phong',
            icon: ArrowLeftRight,
            permissions: [PERM.employeeTransfer, PERM.employeeApproveTransfer, PERM.employeeView],
            status: 'ready',
          },
        ],
      },
      {
        id: 'org-governance',
        label: 'Quản trị tổ chức',
        items: [
          {
            id: 'delegations',
            label: 'Tổng quản lý & ủy quyền',
            to: '/to-chuc/uy-quyen',
            icon: FileBadge,
            permissions: [PERM.employeeAssignPosition],
            status: 'ready',
          },
          {
            id: 'org-modules',
            label: 'Module của tổ chức',
            to: '/to-chuc/module',
            icon: Blocks,
            permissions: [PERM.orgModuleToggle],
            status: 'ready',
          },
          {
            id: 'org-audit',
            label: 'Nhật ký tổ chức',
            to: '/to-chuc/nhat-ky',
            icon: ScrollText,
            permissions: [PERM.orgAuditView],
            status: 'api-missing',
          },
        ],
      },
    ],
  },
  {
    id: 'academic',
    label: 'Đào tạo & vận hành',
    shortLabel: 'Đào tạo',
    to: '/dao-tao',
    icon: GraduationCap,
    basePath: '/dao-tao',
    canEnter: canEnterAcademicWorkspace,
    groups: [
      {
        id: 'academic-teaching',
        label: 'Đào tạo',
        items: [
          {
            id: 'teachers',
            label: 'Giáo viên',
            to: '/dao-tao/giao-vien',
            icon: UserRound,
            permissions: [PERM.employeeView, PERM.teacherChangeStatus, PERM.classAssignTeacher],
            modules: ['TEACHER_MANAGEMENT'],
            status: 'ready',
          },
          {
            id: 'students',
            label: 'Sinh viên',
            to: '/dao-tao/sinh-vien',
            icon: UsersRound,
            permissions: [PERM.studentView],
            modules: ['STUDENT_MANAGEMENT'],
            status: 'ready',
          },
          {
            id: 'subjects',
            label: 'Môn học',
            to: '/dao-tao/mon-hoc',
            icon: Library,
            permissions: [PERM.subjectView],
            status: 'ready',
          },
          {
            id: 'classes',
            label: 'Lớp học',
            to: '/dao-tao/lop-hoc',
            icon: BookOpen,
            permissions: [PERM.classView],
            modules: ['CLASS_MANAGEMENT'],
            status: 'ready',
          },
          {
            id: 'my-classes',
            label: 'Lớp của tôi',
            to: '/dao-tao/lop-cua-toi',
            icon: BookOpen,
            permissions: [PERM.classSelfView],
            modules: ['CLASS_MANAGEMENT'],
            status: 'ready',
          },
        ],
      },
      {
        id: 'academic-calendar',
        label: 'Lịch & điểm danh',
        items: [
          {
            id: 'schedule',
            label: 'Lịch học',
            to: '/dao-tao/lich-hoc',
            icon: CalendarDays,
            permissions: [PERM.scheduleView],
            modules: ['SCHEDULE_MANAGEMENT'],
            status: 'ready',
          },
          {
            id: 'attendance',
            label: 'Điểm danh',
            to: '/dao-tao/diem-danh',
            icon: ClipboardCheck,
            permissions: [PERM.scheduleAttendanceMark, PERM.scheduleAttendanceView],
            modules: ['SCHEDULE_MANAGEMENT'],
            status: 'api-missing',
          },
          {
            id: 'change-requests',
            label: 'Yêu cầu đổi lịch',
            to: '/dao-tao/yeu-cau-doi-lich',
            icon: CalendarRange,
            permissions: [PERM.scheduleChangeRequestCreate, PERM.scheduleChangeRequestApprove],
            modules: ['SCHEDULE_MANAGEMENT'],
            status: 'api-missing',
          },
        ],
      },
      {
        id: 'academic-facility',
        label: 'Cơ sở vật chất',
        items: [
          {
            id: 'facility',
            label: 'Phòng & thiết bị',
            to: '/dao-tao/co-so-vat-chat',
            icon: DoorOpen,
            permissions: [PERM.facilityView, PERM.facilityRoomView],
            modules: ['FACILITY_MANAGEMENT'],
            status: 'ready',
          },
          {
            id: 'facility-issues',
            label: 'Sự cố',
            to: '/dao-tao/co-so-vat-chat/su-co',
            icon: Wrench,
            permissions: [PERM.facilityIssueReport, PERM.facilityIssueResolve],
            modules: ['FACILITY_MANAGEMENT'],
            status: 'ready',
          },
        ],
      },
    ],
  },
  {
    id: 'self',
    label: 'Cá nhân',
    shortLabel: 'Cá nhân',
    to: '/ho-so',
    icon: UserRound,
    basePath: '/',
    canEnter: () => true,
    groups: [
      {
        id: 'self-work',
        label: 'Công việc của tôi',
        items: [
          {
            id: 'approvals-inbox',
            label: 'Việc chờ tôi duyệt',
            to: '/viec-cho-duyet',
            icon: Inbox,
            permissions: [PERM.approvalInboxView, PERM.employeeApproveTransfer, PERM.employeeApproveResignation, PERM.classApproveClose],
            capability: 'approvals',
            status: 'ready',
            badge: 'approvals',
          },
          {
            id: 'my-requests',
            label: 'Yêu cầu của tôi',
            to: '/ho-so/yeu-cau',
            icon: FileText,
            status: 'ready',
          },
          {
            id: 'notifications',
            label: 'Thông báo',
            to: '/thong-bao',
            icon: Bell,
            status: 'ready',
            badge: 'notifications',
          },
          {
            id: 'my-schedule',
            label: 'Lịch của tôi',
            to: '/lich-cua-toi',
            icon: CalendarDays,
            permissions: [PERM.scheduleSelfView, PERM.scheduleView],
            modules: ['SCHEDULE_MANAGEMENT'],
            status: 'ready',
          },
        ],
      },
      {
        id: 'self-portal',
        label: 'Cổng cá nhân',
        items: [
          {
            id: 'profile',
            label: 'Hồ sơ cá nhân',
            to: '/ho-so',
            icon: UserRound,
            status: 'ready',
            end: true,
          },
          {
            id: 'student-portal',
            label: 'Cổng sinh viên',
            to: '/sinh-vien',
            icon: GraduationCap,
            permissions: [PERM.studentSelfView],
            status: 'ready',
          },
          {
            id: 'my-delegations',
            label: 'Quyền được ủy quyền',
            to: '/uy-quyen',
            icon: FileBadge,
            status: 'ready',
          },
        ],
      },
    ],
  },
]

/** Workspace chứa đường dẫn hiện tại (dài nhất khớp trước). */
export function resolveWorkspace(pathname: string): Workspace | undefined {
  return [...WORKSPACES]
    .sort((a, b) => b.basePath.length - a.basePath.length)
    .find((workspace) =>
      workspace.basePath === '/' ? true : pathname === workspace.basePath || pathname.startsWith(`${workspace.basePath}/`),
    )
}

/** Nhóm + mục đã lọc theo quyền và module; bỏ nhóm rỗng. */
export function visibleGroups(session: Session, workspace: Workspace): NavGroup[] {
  return workspace.groups
    .map((group) => ({ ...group, items: group.items.filter((item) => canSeeItem(session, item)) }))
    .filter((group) => group.items.length > 0)
}

export function accessibleWorkspaces(session: Session | null): Workspace[] {
  if (!session) return []
  return WORKSPACES.filter((workspace) => workspace.canEnter(session))
}

/** Route mặc định sau đăng nhập, theo thứ tự ưu tiên đã chốt ở sơ đồ trang 6. */
export function defaultRouteFor(session: Session): string {
  if (isSuperAdmin(session)) return '/quan-tri'
  if (isOwner(session)) return '/to-chuc'
  if (hasPermission(session, PERM.approvalInboxView) || session.approvals?.any) {
    return '/viec-cho-duyet'
  }
  // Người quản lý nhân sự/phòng ban vào tổng quan tổ chức trước khu đào tạo.
  if (canEnterOrganizationWorkspace(session)) return '/to-chuc'
  if (canEnterAcademicWorkspace(session)) return '/dao-tao'
  if (hasPermission(session, PERM.studentSelfView)) return '/sinh-vien'
  return '/ho-so'
}
