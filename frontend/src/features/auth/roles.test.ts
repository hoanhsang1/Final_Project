import { ROLES, findRole, rolePreviewPath } from './roles';

it('có đúng 4 tác nhân, đúng thứ tự', () => {
  expect(ROLES.map((r) => r.id)).toEqual([
    'platform-admin',
    'academic-staff',
    'teacher',
    'student',
  ]);
});

it('mọi nhãn đều có chữ tiếng Việt có dấu', () => {
  expect(ROLES.map((r) => r.label)).toContain('Cán bộ quản lý');
  expect(ROLES.map((r) => r.label)).toEqual([
    'Admin hệ thống',
    'Cán bộ quản lý',
    'Giáo viên',
    'Sinh viên',
  ]);
});

it('mỗi tác nhân đều có mô tả dạng chữ, không chỉ màu', () => {
  // Chốt số lượng trước, để test này không thể "pass rỗng" khi ROLES trống.
  expect(ROLES.length).toBeGreaterThan(0);
  for (const role of ROLES) {
    expect(role.label.trim().length).toBeGreaterThan(0);
    expect(role.description.trim().length).toBeGreaterThan(0);
  }
});

it('findRole trả undefined với slug lạ', () => {
  expect(findRole('giao-vien')).toBeUndefined();
});

it('findRole chịu được khi chưa có tham số trên URL', () => {
  expect(findRole(undefined)).toBeUndefined();
});

it('findRole tra đúng tác nhân theo slug', () => {
  expect(findRole('teacher')?.label).toBe('Giáo viên');
});

it('rolePreviewPath ghép đúng', () => {
  expect(rolePreviewPath('teacher')).toBe('/xem-thu/teacher');
});
