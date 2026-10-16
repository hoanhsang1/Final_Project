export type RoleId = 'platform-admin' | 'academic-staff' | 'teacher' | 'student';

export interface Role {
  id: RoleId;
  label: string;
  description: string;
}

/**
 * Bốn tác nhân của hệ thống. Thứ tự trong mảng này chính là thứ tự hiển thị trên UI.
 *
 * Đây là nguồn sự thật duy nhất: nút chọn tác nhân ở trang đăng nhập và trang xem thử
 * đều đọc từ đây, nên không thể lệch nhau.
 */
export const ROLES: readonly Role[] = [
  {
    id: 'platform-admin',
    label: 'Admin hệ thống',
    description: 'Quản trị toàn nền tảng',
  },
  {
    id: 'academic-staff',
    label: 'Cán bộ quản lý',
    description: 'Giáo vụ của tổ chức',
  },
  {
    id: 'teacher',
    label: 'Giáo viên',
    description: 'Xem lịch dạy, báo sự cố thiết bị',
  },
  {
    id: 'student',
    label: 'Sinh viên',
    description: 'Xem thời khóa biểu',
  },
];

/** Tra tác nhân theo slug trên URL. Nhận thẳng `useParams().vaiTro` nên chịu được `undefined`. */
export function findRole(slug: string | undefined): Role | undefined {
  if (!slug) {
    return undefined;
  }
  return ROLES.find((role) => role.id === slug);
}

export function rolePreviewPath(id: RoleId): string {
  return `/xem-thu/${id}`;
}
