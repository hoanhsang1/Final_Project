import { describe, expect, it } from 'vitest';
import { mapBackendRole } from './backendRoles';

describe('mapBackendRole', () => {
  it('ánh xạ SUPER_ADMIN → platform-admin', () => {
    expect(mapBackendRole(['SUPER_ADMIN'])).toBe('platform-admin');
  });

  it('ánh xạ TEACHER → teacher', () => {
    expect(mapBackendRole(['TEACHER'])).toBe('teacher');
  });

  it('ánh xạ STUDENT → student', () => {
    expect(mapBackendRole(['STUDENT'])).toBe('student');
  });

  it('ánh xạ ACADEMIC_STAFF → academic-staff', () => {
    expect(mapBackendRole(['ACADEMIC_STAFF'])).toBe('academic-staff');
  });

  it('trả về null với role chưa có màn hình ở Sprint 1 (FACILITY_STAFF)', () => {
    expect(mapBackendRole(['FACILITY_STAFF'])).toBeNull();
  });

  it('trả về null với ORG_ADMIN chưa có slug FE', () => {
    expect(mapBackendRole(['ORG_ADMIN'])).toBeNull();
  });

  it('trả về null khi mảng rỗng', () => {
    expect(mapBackendRole([])).toBeNull();
  });

  it('lấy role đầu tiên khớp khi user có nhiều role', () => {
    expect(mapBackendRole(['FACILITY_STAFF', 'TEACHER'])).toBe('teacher');
  });
});
