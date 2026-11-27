import { describe, expect, it } from 'vitest';
import { landingPathFor } from './landing';

describe('landingPathFor', () => {
  it('SUPER_ADMIN vào console quản trị', () => {
    expect(
      landingPathFor({
        backendRoles: ['SUPER_ADMIN'],
        permissions: [],
        role: 'platform-admin',
      }),
    ).toBe('/quan-tri');
  });

  it('OWNER vào console tổ chức', () => {
    expect(
      landingPathFor({ backendRoles: ['OWNER'], permissions: [], role: 'org-owner' }),
    ).toBe('/to-chuc');
  });

  it('quyền UPPERCASE legacy của cán bộ đào tạo vào /dao-tao', () => {
    expect(
      landingPathFor({
        backendRoles: ['ACADEMIC_STAFF'],
        permissions: ['CLASS_READ', 'PEOPLE_READ', 'SCHEDULE_READ'],
        role: 'academic-staff',
      }),
    ).toBe('/dao-tao');
  });

  it('quyền dotted của nhân viên vào /dao-tao', () => {
    expect(
      landingPathFor({
        backendRoles: ['STAFF'],
        permissions: ['class.view', 'student.view'],
        role: 'academic-staff',
      }),
    ).toBe('/dao-tao');
  });

  it('nhân viên cơ sở vật chất vào khu vực CSVC', () => {
    expect(
      landingPathFor({
        backendRoles: ['FACILITY_STAFF'],
        permissions: ['FACILITY_READ', 'INCIDENT_CREATE'],
        role: null,
      }),
    ).toBe('/co-so-vat-chat');
  });

  it('TEACHER không có permission vẫn vào trang xem thử', () => {
    expect(
      landingPathFor({ backendRoles: ['TEACHER'], permissions: [], role: 'teacher' }),
    ).toBe('/xem-thu/teacher');
  });

  it('vai trò chưa có màn hình thì không có đích', () => {
    expect(
      landingPathFor({ backendRoles: ['FACILITY_STAFF'], permissions: [], role: null }),
    ).toBeNull();
  });
});
