/**
 * Kiểu dữ liệu của khu vực Owner — bám 1:1 `dto` của PeopleService.
 *
 * Ghi chú quan trọng: `MemberResponse` của BE **không** trả username/email/họ tên,
 * nên FE không thể hiện tên nhân viên trong bảng. Đó là thiếu sót phía BE, không
 * phải lựa chọn của FE — đừng tự bịa thêm trường.
 */

/** `DepartmentResponse` — `GET /departments`. */
export interface Department {
  id: string;
  name: string;
  /** BE trả `null` khi người dùng không nhập mô tả. */
  description: string | null;
  createdAt: string;
  /** Mã module phòng ban phụ trách — BE trả sẵn trong danh sách. */
  modules: string[];
}

/** `PositionResponse` — `GET /positions`. Đây là "chức vụ": một mẫu gồm nhiều quyền. */
export interface Position {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  /** Quyền lẻ gắn trực tiếp vào chức vụ (có thể rỗng). */
  permissions: string[];
  /** `TEACHER` chỉ gán được qua luồng tạo giáo viên (cần hồ sơ giáo viên). */
  profileType?: 'TEACHER' | 'GENERAL' | null;
  /** Gói quyền (bundle) đính kèm chức vụ. */
  bundleCodes: string[];
  /** Phạm vi áp dụng của chức vụ. */
  scope: 'ORGANIZATION' | 'DEPARTMENT';
  /** Phòng ban sở hữu chức vụ khi `scope = DEPARTMENT`; `null` = theo phòng ban của nhân viên. */
  departmentId: string | null;
}

/** `PermissionResponse` — `GET /permissions`. Danh mục quyền dạng `<module>.<resource>.<action>`. */
export interface Permission {
  code: string;
  description: string;
  /** Module gate quyền này — cũng là tập module hợp lệ để gán cho phòng ban. */
  moduleCode?: string | null;
  /** Phạm vi hợp lệ của quyền: `ORGANIZATION` và/hoặc `DEPARTMENT`. */
  allowedScopes: string[];
}

/** `PermissionBundleResponse` — `GET /permission-bundles`. Gói quyền đính kèm chức vụ. */
export interface PermissionBundle {
  code: string;
  name: string;
  description: string;
  permissions: string[];
  allowedScopes: string[];
}

/** `MemberResponse` — nhân viên trong một phòng ban. */
export interface Member {
  userId: string;
  /** BE trả kèm tên đăng nhập; `null` với dữ liệu cũ chưa có cột này. */
  username: string | null;
  departmentId: string;
  /** `OWNER` | `MANAGER` | `STAFF` — do BE quyết định, FE không tự suy ra. */
  role: string;
  appointedBy: string | null;
  appointedAt: string;
  positionIds: string[];
  /** Quyền hiệu lực = hợp của quyền các chức vụ được gán. */
  permissions: string[];
  /** `ACTIVE` | `RESIGNED` — nhân sự đã nghỉ việc vẫn giữ dòng để xem lịch sử. */
  status?: string;
}

/** `CreatedMemberResponse` — trả về DUY NHẤT khi tạo nhân viên. */
export interface CreatedMember {
  member: Member;
  /** Mật khẩu tạm BE sinh; chỉ hiện được một lần. */
  temporaryPassword: string;
  mustChangePassword: boolean;
}

/** Body của `POST /departments` và `PUT /departments/{id}`. */
export interface DepartmentPayload {
  name: string;
  description?: string;
  /** Luôn gửi mảng (có thể rỗng) — BE bắt buộc trường này không được `null`. */
  moduleCodes: string[];
}

/** Body của `POST /positions` và `PUT /positions/{id}`. */
export interface PositionPayload {
  name: string;
  description?: string;
  /** Có thể rỗng — chức vụ 0 quyền là hợp lệ. */
  permissions: string[];
  bundleCodes: string[];
  scope: 'ORGANIZATION' | 'DEPARTMENT';
  /** Bắt buộc khi `scope = DEPARTMENT` và chức vụ thuộc một phòng ban cụ thể. */
  departmentId?: string | null;
}

/** Body của `POST /departments/{id}/members`. */
export interface MemberPayload {
  username: string;
  email: string;
  /** BE chỉ nhận `MANAGER` hoặc `STAFF` (pattern trong `MemberRequest`). */
  role: 'MANAGER' | 'STAFF';
  positionIds: string[];
  /** Bỏ trống để BE tự sinh `GV…`/`NS…`. */
  staffCode?: string;
  /** Bắt buộc khi chọn chức vụ `TEACHER`. */
  fullName?: string;
  /** Bắt buộc khi chọn chức vụ `TEACHER`. */
  phone?: string;
  /** Chỉ gửi khi chọn ít nhất một chức vụ `TEACHER`. */
  teacherProfile?: {
    specialtyIds: string[];
    contractType?: 'CO_HUU' | 'THINH_GIANG' | null;
  } | null;
}

/** `AssignmentHistoryResponse` — một dòng lịch sử bổ nhiệm/thu hồi. */
export interface AssignmentHistoryItem {
  id: string;
  positionId: string;
  positionName: string;
  scopeType: 'ORGANIZATION' | 'DEPARTMENT';
  departmentId: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  status: string;
  assignedBy: string;
  assignedByName: string | null;
  assignedAt: string;
  reason: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokedByName: string | null;
  revokedReason: string | null;
}

/**
 * `MemberDetailResponse`. Email/điện thoại là `null` khi người gọi không có
 * `employee.view_detail` trong phòng ban — FE hiện "Không có quyền xem".
 */
export interface MemberDetail {
  userId: string;
  username: string | null;
  departmentId: string;
  departmentName: string | null;
  role: string;
  status: string;
  appointedAt: string | null;
  appointedBy: string | null;
  staffCode: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  teacher: boolean;
  contractType: string | null;
  teachingStatus: string | null;
  positionIds: string[];
  permissions: string[];
  classCount: number;
  noClass: boolean;
  classLabel: string | null;
  assignmentHistory: AssignmentHistoryItem[];
}

/** `ResignationResponse`. */
export interface ResignationRequest {
  id: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  departmentId: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;
  requestedBy: string;
  requestedByName: string | null;
  requestedAt: string;
  decidedBy: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

/** `GET /departments/{id}/module-impact` — cảnh báo trước khi gỡ module. */
export interface DepartmentModuleImpact {
  removedModules: string[];
  positions: ImpactedPosition[];
  /** Số người khác nhau đang giữ các chức danh bị ảnh hưởng. */
  affectedMembers: number;
}

export interface ImpactedPosition {
  id: string;
  name: string;
  /** Quyền sẽ mất hiệu lực khi gỡ module. */
  permissions: string[];
  members: number;
}

/** Body của `POST /positions/{id}/clone`. */
export interface PositionClonePayload {
  /** Trống = "<tên gốc> (bản sao)". */
  name?: string;
  departmentId: string;
}

/** `POST /positions/{id}/clone` — chức danh mới + những gì bị loại. */
export interface PositionCloneResult {
  position: Position;
  removedPermissions: string[];
  droppedBundles: string[];
}

/** `GET /positions/{id}/impact`. */
export interface PositionImpact {
  activeHolders: number;
}

/** `DelegationResponse` — một lần ủy quyền quyền hạn (quy tắc 3, 7). */
export interface Delegation {
  id: string;
  delegatorId: string;
  delegatorName: string | null;
  delegateId: string;
  delegateName: string | null;
  delegateUsername: string | null;
  delegateDepartmentId: string | null;
  delegateDepartmentName: string | null;
  permissions: string[];
  scope: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'ACTIVE' | 'REVOKED' | string;
  /** BE tính tại thời điểm trả về: ACTIVE + đang trong khoảng hiệu lực. */
  active: boolean;
  reason: string | null;
  createdAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

/** Body của `POST /delegations`. */
export interface DelegationPayload {
  delegateId: string;
  permissions: string[];
  effectiveFrom?: string;
  effectiveTo?: string | null;
  reason?: string;
  scope?: 'ORGANIZATION';
}

/** Body của `PUT /delegations/{id}` — không đổi được người nhận. */
export interface DelegationUpdatePayload {
  permissions: string[];
  effectiveFrom?: string;
  effectiveTo?: string | null;
  reason?: string;
}

/** `GeneralManagerResponse` — nhân sự đang giữ chức danh Tổng quản lý. */
export interface GeneralManager {
  userId: string;
  username: string | null;
  fullName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  appointedAt: string | null;
}

/** `GeneralManagerCandidateResponse` — nhân sự có thể bổ nhiệm. */
export interface GeneralManagerCandidate {
  userId: string;
  username: string | null;
  fullName: string | null;
  departmentId: string | null;
  departmentName: string | null;
}
