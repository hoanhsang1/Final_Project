import { describe, expect, it } from 'vitest';
import { activeOwnerMenuKey, OWNER_MENU } from './ownerMenu';

describe('OWNER_MENU', () => {
  it('có đủ 3 mục: Phòng ban, Chức vụ và Ủy quyền', () => {
    expect(OWNER_MENU.map((item) => item.key)).toEqual(['phong-ban', 'chuc-vu', 'uy-quyen']);
    expect(OWNER_MENU.map((item) => item.path)).toEqual([
      '/to-chuc',
      '/to-chuc/chuc-vu',
      '/to-chuc/uy-quyen',
    ]);
  });
});

describe('activeOwnerMenuKey', () => {
  it('khớp mục Phòng ban ở đúng /to-chuc', () => {
    expect(activeOwnerMenuKey('/to-chuc')).toBe('phong-ban');
  });

  it('màn chi tiết phòng ban vẫn chọn mục Phòng ban', () => {
    expect(activeOwnerMenuKey('/to-chuc/phong-ban/abc')).toBe('phong-ban');
  });

  it('khớp mục Chức vụ ở /to-chuc/chuc-vu', () => {
    expect(activeOwnerMenuKey('/to-chuc/chuc-vu')).toBe('chuc-vu');
  });

  it('khớp mục Ủy quyền ở /to-chuc/uy-quyen', () => {
    expect(activeOwnerMenuKey('/to-chuc/uy-quyen')).toBe('uy-quyen');
  });

  it('đường dẫn ngoài khu vực tổ chức → null', () => {
    expect(activeOwnerMenuKey('/quan-tri')).toBeNull();
    expect(activeOwnerMenuKey('/dang-nhap')).toBeNull();
  });
});
