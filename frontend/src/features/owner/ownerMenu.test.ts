import { describe, expect, it } from 'vitest';
import {
  activeFacilityMenuKey,
  activeOwnerMenuKey,
  FACILITY_MENU,
  OWNER_MENU,
} from './ownerMenu';

describe('OWNER_MENU', () => {
  it('có đúng 4 mục: Phòng ban, Chức vụ, Cơ sở vật chất và Module', () => {
    expect(OWNER_MENU.map((item) => item.key)).toEqual([
      'phong-ban',
      'chuc-vu',
      'co-so-vat-chat',
      'module',
    ]);
    expect(OWNER_MENU.map((item) => item.path)).toEqual([
      '/to-chuc',
      '/to-chuc/chuc-vu',
      '/co-so-vat-chat',
      '/to-chuc/module',
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

  it('mục CSVC của OWNER_MENU trỏ tới đường dẫn mới', () => {
    expect(activeOwnerMenuKey('/co-so-vat-chat')).toBe('co-so-vat-chat');
    expect(activeOwnerMenuKey('/co-so-vat-chat/su-co')).toBeNull();
  });

  it('khớp mục Module mà không rơi vào fallback Phòng ban', () => {
    expect(activeOwnerMenuKey('/to-chuc/module')).toBe('module');
  });

  it('đường dẫn ngoài khu vực tổ chức → null', () => {
    expect(activeOwnerMenuKey('/quan-tri')).toBeNull();
    expect(activeOwnerMenuKey('/dang-nhap')).toBeNull();
  });
});

describe('FACILITY_MENU', () => {
  it('có 2 mục độc lập với menu tổ chức', () => {
    expect(OWNER_MENU.find((i) => i.key === 'co-so-vat-chat')?.path).toBe('/co-so-vat-chat');
    expect(FACILITY_MENU.map((i) => i.path)).toEqual([
      '/co-so-vat-chat',
      '/co-so-vat-chat/su-co',
    ]);
  });
});

describe('activeFacilityMenuKey', () => {
  it('khớp màn phòng và màn sự cố', () => {
    expect(activeFacilityMenuKey('/co-so-vat-chat')).toBe('co-so-vat-chat');
    expect(activeFacilityMenuKey('/co-so-vat-chat/su-co')).toBe('su-co');
  });

  it('đường dẫn ngoài khu vực CSVC → null', () => {
    expect(activeFacilityMenuKey('/to-chuc')).toBeNull();
    expect(activeFacilityMenuKey('/dao-tao')).toBeNull();
  });
});
