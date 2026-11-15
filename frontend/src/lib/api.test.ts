import { describe, expect, it } from 'vitest';
import { unwrapList } from './api';

describe('unwrapList', () => {
  it('giữ nguyên mảng thuần', () => {
    const items = [{ id: 'a' }];
    expect(unwrapList(items)).toBe(items);
  });

  it('bóc { data: [] }', () => {
    expect(unwrapList({ data: [{ id: 'a' }] })).toEqual([{ id: 'a' }]);
  });

  it('bóc { content: [] } của response phân trang', () => {
    expect(unwrapList({ content: [{ id: 'a' }], total: 1 })).toEqual([{ id: 'a' }]);
  });

  it('trả mảng rỗng với payload lạ (HTML, null, object)', () => {
    expect(unwrapList('<html></html>')).toEqual([]);
    expect(unwrapList(null)).toEqual([]);
    expect(unwrapList({ message: 'ok' })).toEqual([]);
  });
});
