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
  permissions: string[];
  /** `TEACHER` chỉ gán được qua luồng tạo giáo viên (cần hồ sơ giáo viên). */
  profileType?: 'TEACHER' | 'GENERAL' | null;
}

/** `PermissionResponse` — `GET /permissions`. Danh mục quyền toàn hệ thống (5 mã). */
export interface Permission {
  code: string;
  description: string;
  /** Module gate quyền này — cũng là tập module hợp lệ để gán cho phòng ban. */
  moduleCode?: string | null;
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
  permissions: string[];
}

/** Body của `POST /departments/{id}/members`. */
export interface MemberPayload {
  username: string;
  email: string;
  /** BE chỉ nhận `MANAGER` hoặc `STAFF` (pattern trong `MemberRequest`). */
  role: 'MANAGER' | 'STAFF';
  positionIds: string[];
}
