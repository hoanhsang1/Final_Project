import { describe, expect, it } from 'vitest';
import { activeAcademicMenuKey, getAcademicMenu } from '../sprint4/academicMenu';
import { MSG_SELF } from '../sprint4/sprint4Messages';
import {
  PERMISSION_ALIASES,
  canAccessAcademicArea,
  canAccessFacilityArea,
  canViewClasses,
  canViewStudentClasses,
  canViewStudentSelf,
  canViewTeacherClasses,
  canViewTeacherSelf,
  canViewTeachers,
  hasAnyPermissionWithAliases,
  normalizePermissionCode,
} from './permissions';

describe('chuẩn hoá mã quyền legacy', () => {
  it('normalizePermissionCode trả về mã UPPERCASE chuẩn cho mọi mã legacy', () => {
    expect(normalizePermissionCode('PEOPLE_READ')).toBe('PEOPLE_VIEW');
    expect(normalizePermissionCode('PEOPLE_WRITE')).toBe('PEOPLE_EDIT');
    expect(normalizePermissionCode('CLASS_READ')).toBe('CLASS_VIEW');
    expect(normalizePermissionCode('CLASS_WRITE')).toBe('CLASS_EDIT');
    expect(normalizePermissionCode('SCHEDULE_READ')).toBe('SCHEDULE_VIEW');
    expect(normalizePermissionCode('SCHEDULE_WRITE')).toBe('SCHEDULE_UPDATE');
    expect(normalizePermissionCode('FACILITY_READ')).toBe('FACILITY_VIEW');
    expect(normalizePermissionCode('FACILITY_WRITE')).toBe('FACILITY_MANAGE');
    expect(normalizePermissionCode('INCIDENT_CREATE')).toBe('FACILITY_ISSUE_REPORT');
    expect(normalizePermissionCode('INCIDENT_MANAGE')).toBe('FACILITY_ISSUE_RESOLVE');
  });

  it('không làm đổi reverse map của PERMISSION_ALIASES', () => {
    expect(PERMISSION_ALIASES['employee.view']).toBe('PEOPLE_VIEW');
    expect(PERMISSION_ALIASES.CLASS_VIEW).toBe('class.view');
    expect(PERMISSION_ALIASES.FACILITY_ISSUE_REPORT).toBe('facility.issue.report');
  });
});

describe('gate theo token legacy', () => {
  it('helper alias hiểu mã legacy UPPERCASE', () => {
    expect(hasAnyPermissionWithAliases(['CLASS_READ'], ['class.view'])).toBe(true);
    expect(canViewTeachers(false, ['PEOPLE_READ'])).toBe(true);
    expect(canViewClasses(false, ['CLASS_READ'])).toBe(true);
    expect(
      canAccessAcademicArea({
        backendRoles: ['ACADEMIC_STAFF'],
        permissions: ['CLASS_READ', 'PEOPLE_READ', 'SCHEDULE_READ', 'REPORT_READ'],
      }),
    ).toBe(true);
  });

  it('canAccessFacilityArea chấp nhận cả mã legacy lẫn mã dotted', () => {
    expect(
      canAccessFacilityArea({
        backendRoles: ['FACILITY_STAFF'],
        permissions: ['FACILITY_READ', 'INCIDENT_CREATE'],
      }),
    ).toBe(true);
    expect(
      canAccessFacilityArea({ backendRoles: [], permissions: ['facility.issue.resolve'] }),
    ).toBe(true);
    expect(canAccessFacilityArea({ backendRoles: [], permissions: ['CLASS_READ'] })).toBe(false);
  });
});

describe('hasAnyPermissionWithAliases', () => {
  it('nhận diện mã UPPERCASE cũ', () => {
    expect(hasAnyPermissionWithAliases(['PEOPLE_VIEW'], ['PEOPLE_VIEW'])).toBe(true);
    expect(hasAnyPermissionWithAliases(['CLASS_VIEW'], ['CLASS_VIEW'])).toBe(true);
  });

  it('nhận diện mã dotted từ JWT mới', () => {
    expect(hasAnyPermissionWithAliases(['employee.view'], ['PEOPLE_VIEW'])).toBe(true);
    expect(hasAnyPermissionWithAliases(['schedule.view'], ['SCHEDULE_VIEW'])).toBe(true);
  });

  it('trộn 2 dạng mã vẫn thỏa (cả chiều dotted → UPPERCASE và ngược lại)', () => {
    const permissions = ['PEOPLE_VIEW', 'class.view'];
    expect(hasAnyPermissionWithAliases(permissions, ['employee.view'])).toBe(true);
    expect(hasAnyPermissionWithAliases(permissions, ['CLASS_VIEW'])).toBe(true);
    expect(hasAnyPermissionWithAliases(['employee.view'], ['STUDENT_VIEW'])).toBe(false);
  });
});

describe('canAccessAcademicArea (guard /dao-tao)', () => {
  it('chỉ có schedule.view cũng được vào khu vực đào tạo', () => {
    expect(
      canAccessAcademicArea({ backendRoles: [], permissions: ['schedule.view'] }),
    ).toBe(true);
  });

  it('chỉ có employee.view vẫn vào được khu vực đào tạo', () => {
    expect(
      canAccessAcademicArea({ backendRoles: [], permissions: ['employee.view'] }),
    ).toBe(true);
  });
});

describe('alias employee/class trong menu đào tạo', () => {
  it('chỉ có employee.view vẫn thấy mục giáo viên', () => {
    expect(canViewTeachers(false, ['employee.view'])).toBe(true);
    const keys = getAcademicMenu(['employee.view'], false).map((item) => item.key);
    expect(keys).toContain('giao-vien');
  });

  it('class.view tương đương CLASS_VIEW', () => {
    expect(canViewClasses(false, ['class.view'])).toBe(true);
    expect(hasAnyPermissionWithAliases(['CLASS_VIEW'], ['class.view'])).toBe(true);
  });

  it('getAcademicMenu với mảng quyền dotted-only vẫn trả item', () => {
    const keys = getAcademicMenu(['employee.view', 'class.view', 'student.view'], false).map(
      (item) => item.key,
    );
    expect(keys).toEqual(['giao-vien', 'lop-hoc', 'hoc-sinh']);
  });
});

describe('menu lịch theo quyền schedule.*', () => {
  it('chỉ có schedule.self_view thì thấy lịch cá nhân, không thấy lịch phòng ban hay buổi bị ảnh hưởng', () => {
    const keys = getAcademicMenu(['schedule.self_view'], false).map((item) => item.key);
    expect(keys).toContain('lich-cua-toi');
    expect(keys).not.toContain('lich');
    expect(keys).not.toContain('impacts');
  });

  it('chỉ có schedule.view thì thấy lịch phòng ban và buổi bị ảnh hưởng, không thấy lịch cá nhân', () => {
    const keys = getAcademicMenu(['schedule.view'], false).map((item) => item.key);
    expect(keys).toContain('lich');
    expect(keys).toContain('impacts');
    expect(keys[0]).toBe('lich');
    expect(keys.indexOf('impacts')).toBe(keys.indexOf('lich') + 1);
    expect(keys).not.toContain('lich-cua-toi');
  });

  it('owner thấy buổi bị ảnh hưởng mà không đổi mục menu đầu tiên', () => {
    const keys = getAcademicMenu([], true).map((item) => item.key);
    expect(keys).toContain('impacts');
    expect(keys[0]).toBe('giao-vien');
  });

  it('mã UPPERCASE cũ tương đương mã dotted', () => {
    expect(getAcademicMenu(['SCHEDULE_SELF_VIEW'], false).map((i) => i.key)).toContain(
      'lich-cua-toi',
    );
    expect(getAcademicMenu(['SCHEDULE_VIEW'], false).map((i) => i.key)).toContain('lich');
    expect(getAcademicMenu(['SCHEDULE_VIEW'], false).map((i) => i.key)).toContain('impacts');
  });

  it('activeAcademicMenuKey phân biệt lịch phòng ban, buổi bị ảnh hưởng và lịch cá nhân', () => {
    expect(activeAcademicMenuKey('/dao-tao/lich')).toBe('lich');
    expect(activeAcademicMenuKey('/dao-tao/lich/buoi-bi-anh-huong')).toBe('impacts');
    expect(activeAcademicMenuKey('/dao-tao/lich-cua-toi')).toBe('lich-cua-toi');
  });
});

describe('alias self-permission 2 chiều', () => {
  it('class.self_view được chuẩn hoá thành CLASS_SELF_VIEW ở cả 2 dạng mã', () => {
    expect(PERMISSION_ALIASES['class.self_view']).toBe('CLASS_SELF_VIEW');
    expect(PERMISSION_ALIASES.CLASS_SELF_VIEW).toBe('class.self_view');
    expect(normalizePermissionCode('class.self_view')).toBe('CLASS_SELF_VIEW');
    expect(hasAnyPermissionWithAliases(['CLASS_SELF_VIEW'], ['class.self_view'])).toBe(true);
    expect(hasAnyPermissionWithAliases(['class.self_view'], ['CLASS_SELF_VIEW'])).toBe(true);
  });

  it('student.self_view được chuẩn hoá thành STUDENT_SELF_VIEW ở cả 2 dạng mã', () => {
    expect(PERMISSION_ALIASES['student.self_view']).toBe('STUDENT_SELF_VIEW');
    expect(PERMISSION_ALIASES.STUDENT_SELF_VIEW).toBe('student.self_view');
    expect(normalizePermissionCode('student.self_view')).toBe('STUDENT_SELF_VIEW');
    expect(hasAnyPermissionWithAliases(['STUDENT_SELF_VIEW'], ['student.self_view'])).toBe(true);
    expect(hasAnyPermissionWithAliases(['student.self_view'], ['STUDENT_SELF_VIEW'])).toBe(true);
  });

  it('self-permission đủ để vào khu vực /dao-tao', () => {
    expect(
      canAccessAcademicArea({ backendRoles: [], permissions: ['class.self_view'] }),
    ).toBe(true);
    expect(
      canAccessAcademicArea({ backendRoles: [], permissions: ['student.self_view'] }),
    ).toBe(true);
    expect(
      canAccessAcademicArea({ backendRoles: [], permissions: ['CLASS_SELF_VIEW'] }),
    ).toBe(true);
  });
});

describe('gate trang cá nhân theo backendRoles', () => {
  /** JWT mẫu: cả giáo viên lẫn học sinh đều có cả 2 self-permission. */
  const selfPermissions = ['class.self_view', 'student.self_view', 'schedule.self_view'];

  it('canViewTeacherSelf chỉ nhận role TEACHER', () => {
    expect(canViewTeacherSelf({ backendRoles: ['TEACHER'], permissions: selfPermissions })).toBe(
      true,
    );
    expect(canViewTeacherSelf({ backendRoles: ['STUDENT'], permissions: selfPermissions })).toBe(
      false,
    );
    expect(canViewTeacherSelf({ backendRoles: [], permissions: selfPermissions })).toBe(false);
  });

  it('canViewTeacherClasses cần TEACHER và class.self_view', () => {
    expect(canViewTeacherClasses({ backendRoles: ['TEACHER'], permissions: selfPermissions })).toBe(
      true,
    );
    expect(
      canViewTeacherClasses({ backendRoles: ['TEACHER'], permissions: ['student.self_view'] }),
    ).toBe(false);
    expect(
      canViewTeacherClasses({ backendRoles: ['STUDENT'], permissions: selfPermissions }),
    ).toBe(false);
  });

  it('canViewStudentSelf chỉ nhận role STUDENT', () => {
    expect(canViewStudentSelf({ backendRoles: ['STUDENT'], permissions: selfPermissions })).toBe(
      true,
    );
    expect(canViewStudentSelf({ backendRoles: ['TEACHER'], permissions: selfPermissions })).toBe(
      false,
    );
    expect(canViewStudentSelf({ backendRoles: [], permissions: selfPermissions })).toBe(false);
  });

  it('canViewStudentClasses cần STUDENT và student.self_view', () => {
    expect(canViewStudentClasses({ backendRoles: ['STUDENT'], permissions: selfPermissions })).toBe(
      true,
    );
    expect(
      canViewStudentClasses({ backendRoles: ['STUDENT'], permissions: ['class.self_view'] }),
    ).toBe(false);
    expect(
      canViewStudentClasses({ backendRoles: ['TEACHER'], permissions: selfPermissions }),
    ).toBe(false);
  });
});

describe('menu self-service theo backendRoles', () => {
  /** JWT mẫu: cả giáo viên lẫn học sinh đều có cả 2 self-permission. */
  const selfPermissions = ['class.self_view', 'student.self_view', 'schedule.self_view'];

  function menuOf(permissions: string[], backendRoles: string[]) {
    return getAcademicMenu(permissions, false, backendRoles);
  }

  function pathOf(permissions: string[], backendRoles: string[], key: string) {
    return menuOf(permissions, backendRoles).find((item) => item.key === key)?.path;
  }

  it('TEACHER thấy 3 mục self với path của giáo viên', () => {
    const items = menuOf(selfPermissions, ['TEACHER']);
    const keys = items.map((item) => item.key);

    expect(keys).toContain('trang-ca-nhan');
    expect(keys).toContain('ho-so-cua-toi');
    expect(keys).toContain('lop-cua-toi');
    expect(keys).not.toContain('giao-vien');
    expect(keys).not.toContain('hoc-sinh');
    expect(pathOf(selfPermissions, ['TEACHER'], 'trang-ca-nhan')).toBe('/dao-tao/trang-ca-nhan');
    expect(pathOf(selfPermissions, ['TEACHER'], 'ho-so-cua-toi')).toBe(
      '/dao-tao/giao-vien/cua-toi',
    );
    expect(pathOf(selfPermissions, ['TEACHER'], 'lop-cua-toi')).toBe('/dao-tao/lop-hoc-cua-toi');
    const home = items.find((item) => item.key === 'trang-ca-nhan');
    expect(home?.label).toBe(MSG_SELF.TITLE_HOME);
  });

  it('STUDENT thấy 3 mục self với path của học sinh', () => {
    const items = menuOf(selfPermissions, ['STUDENT']);
    const keys = items.map((item) => item.key);

    expect(keys).toContain('trang-ca-nhan');
    expect(keys).toContain('ho-so-cua-toi');
    expect(keys).toContain('lop-cua-toi');
    expect(keys).not.toContain('giao-vien');
    expect(keys).not.toContain('hoc-sinh');
    expect(pathOf(selfPermissions, ['STUDENT'], 'trang-ca-nhan')).toBe('/dao-tao/trang-ca-nhan');
    expect(pathOf(selfPermissions, ['STUDENT'], 'ho-so-cua-toi')).toBe(
      '/dao-tao/hoc-sinh/cua-toi',
    );
    expect(pathOf(selfPermissions, ['STUDENT'], 'lop-cua-toi')).toBe(
      '/dao-tao/hoc-sinh/lop-cua-toi',
    );
  });

  it('không phân vai trò bằng self-permission: role khác thì không có mục self', () => {
    const keys = menuOf(selfPermissions, ['ACCOUNTANT']).map((item) => item.key);
    expect(keys).not.toContain('trang-ca-nhan');
    expect(keys).not.toContain('ho-so-cua-toi');
    expect(keys).not.toContain('lop-cua-toi');
  });

  it('mục lớp của tôi chỉ hiện khi có self-permission tương ứng', () => {
    expect(pathOf(['schedule.self_view'], ['TEACHER'], 'lop-cua-toi')).toBeUndefined();
    expect(pathOf(['schedule.self_view'], ['STUDENT'], 'lop-cua-toi')).toBeUndefined();
    expect(
      pathOf(['schedule.self_view', 'class.self_view'], ['TEACHER'], 'lop-cua-toi'),
    ).toBe('/dao-tao/lop-hoc-cua-toi');
    expect(
      pathOf(['schedule.self_view', 'student.self_view'], ['STUDENT'], 'lop-cua-toi'),
    ).toBe('/dao-tao/hoc-sinh/lop-cua-toi');
  });

  it('mã UPPERCASE alias vẫn hoạt động cho cả GV và HS', () => {
    const uppercase = ['CLASS_SELF_VIEW', 'STUDENT_SELF_VIEW', 'SCHEDULE_SELF_VIEW'];

    expect(pathOf(uppercase, ['TEACHER'], 'lop-cua-toi')).toBe('/dao-tao/lop-hoc-cua-toi');
    expect(pathOf(uppercase, ['STUDENT'], 'lop-cua-toi')).toBe('/dao-tao/hoc-sinh/lop-cua-toi');
  });

  it('gọi 2 tham số vẫn như cũ (backendRoles mặc định rỗng)', () => {
    const keys = getAcademicMenu(selfPermissions, false).map((item) => item.key);
    expect(keys).not.toContain('trang-ca-nhan');
    expect(keys).toContain('lich-cua-toi');
  });

  it('activeAcademicMenuKey nhận diện 6 path mới trước prefix cũ', () => {
    expect(activeAcademicMenuKey('/dao-tao/trang-ca-nhan')).toBe('trang-ca-nhan');
    expect(activeAcademicMenuKey('/dao-tao/giao-vien/cua-toi')).toBe('ho-so-cua-toi');
    expect(activeAcademicMenuKey('/dao-tao/lop-hoc-cua-toi')).toBe('lop-cua-toi');
    expect(activeAcademicMenuKey('/dao-tao/lop-hoc-cua-toi/c1')).toBe('lop-cua-toi');
    expect(activeAcademicMenuKey('/dao-tao/hoc-sinh/cua-toi')).toBe('ho-so-cua-toi');
    expect(activeAcademicMenuKey('/dao-tao/hoc-sinh/lop-cua-toi')).toBe('lop-cua-toi');

    // Prefix cũ vẫn nhận diện đúng.
    expect(activeAcademicMenuKey('/dao-tao/giao-vien')).toBe('giao-vien');
    expect(activeAcademicMenuKey('/dao-tao/lop-hoc')).toBe('lop-hoc');
    expect(activeAcademicMenuKey('/dao-tao/hoc-sinh')).toBe('hoc-sinh');
  });
});
