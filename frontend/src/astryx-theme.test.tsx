import { render, screen } from '@testing-library/react';
import { Banner, Theme } from '@astryxdesign/core';
import { tokenDefaults } from '@astryxdesign/core/theme';
import { memsTheme } from './astryx-theme';

/**
 * Hợp đồng token của theme MEMS.
 *
 * Test này không phải "test cho có": nó chặn đúng ba lỗi đã gặp khi khảo sát.
 *  1. Thêm `extends: neutralTheme` → accent bị HCT đổi thành `#1D5EAC` và radius
 *     thành 6/10/12, cả hai đều sai hợp đồng.
 *  2. Khai `color.accent` mà quên pin `tokens` → cùng lỗi đổi tone như trên.
 *  3. Chỉnh `scale.ratio` → thang chữ lệch khỏi 12/14/17/20/24.
 *
 * Số đo dưới đây lấy từ đúng token Astryx sinh ra, không phải từ giá trị mình
 * tự đặt, nên nếu Astryx đổi cách sinh token thì test sẽ báo.
 */

const token = (name: keyof typeof memsTheme.tokens) => memsTheme.tokens[name];

/**
 * `memsTheme.tokens` chỉ chứa token theme này KHAI (hoặc Astryx sinh từ khai đó);
 * token còn lại lấy default của core. Đọc qua hàm này để test đúng giá trị mà
 * trình duyệt sẽ thấy, không phụ thuộc theme có khai token đó hay không.
 */
const resolved = (name: keyof typeof tokenDefaults) =>
  memsTheme.tokens[name as keyof typeof memsTheme.tokens] ?? tokenDefaults[name];

it('giữ nguyên mã brand, không để HCT đổi tone', () => {
  expect(token('--color-accent')).toBe('#0E4A8B');
  expect(token('--color-on-accent')).toBe('#FFFFFF');
  // Sinh từ `--color-accent` nên tự đi theo, không cần pin riêng.
  expect(token('--color-text-accent')).toBe('var(--color-accent)');
  expect(resolved('--focus-outline-color')).toBe('var(--color-accent)');
});

it('thang chữ là 12 / 14 / 17 / 20 / 24 (display 29 / 35 / 42)', () => {
  expect(token('--font-size-sm')).toBe('0.75rem');
  expect(token('--font-size-base')).toBe('0.875rem');
  expect(token('--font-size-lg')).toBe('1.0625rem');
  expect(token('--font-size-xl')).toBe('1.25rem');
  expect(token('--font-size-2xl')).toBe('1.5rem');
  expect(token('--font-size-3xl')).toBe('1.8125rem');
  expect(token('--font-size-4xl')).toBe('2.1875rem');
  expect(token('--font-size-5xl')).toBe('2.625rem');
});

it('line-height rơi đúng lưới 4px và weight đúng 3 mức', () => {
  // 14 × 1.4286 = 20px; 24 × 1.3333 = 32px; 20 × 1.4 = 28px; 17 × 1.4118 = 24px.
  expect(token('--text-body-leading')).toBe('1.4286');
  expect(token('--text-heading-1-leading')).toBe('1.3333');
  expect(token('--text-heading-2-leading')).toBe('1.4');
  expect(token('--text-heading-3-leading')).toBe('1.4118');
  expect(token('--text-body-weight')).toBe('var(--font-weight-normal)');
  expect(token('--text-label-weight')).toBe('var(--font-weight-medium)');
  expect(token('--text-heading-1-weight')).toBe('var(--font-weight-semibold)');
});

it('màu MEMS đã chốt vẫn là nửa sáng của cặp light-dark', () => {
  expect(token('--color-text-primary')).toBe('light-dark(#101828, #DFE2E5)');
  expect(token('--color-text-secondary')).toBe('light-dark(#475467, #AAAFB5)');
  expect(token('--color-background-body')).toBe('light-dark(#F2F4F7, #111112)');
  expect(token('--color-background-card')).toBe('light-dark(#FFFFFF, #1F1F22)');
  expect(token('--color-border')).toBe('light-dark(#E4E7EC, #F2F4F619)');
  // Viền field phải đủ 3:1 trên cả trắng lẫn canvas (WCAG 1.4.11).
  expect(token('--color-border-emphasized')).toBe('light-dark(#667085, #494D53)');
});

it('đèn báo trạng thái có đủ 3 lớp màu để không chỉ dựa vào màu', () => {
  expect(token('--color-text-error')).toBe('light-dark(#B42318, #FFB2B8)');
  expect(token('--color-text-success')).toBe('light-dark(#067647, #A5F690)');
  expect(token('--color-text-warning')).toBe('light-dark(#B54708, #FBCE03)');
  expect(token('--color-error-muted')).toBe('light-dark(#B4231833, #F5394F3F)');
});

it('bo góc giữ default của core 4 / 8 / 12 / 28', () => {
  expect(resolved('--radius-inner')).toBe('4px');
  expect(resolved('--radius-element')).toBe('8px');
  expect(resolved('--radius-container')).toBe('12px');
  expect(resolved('--radius-page')).toBe('28px');
});

it('render được trong React thật: theme gắn đúng tên và chế độ sáng', () => {
  const { container } = render(
    <Theme theme={memsTheme} mode="light">
      <Banner status="error" title="Không tải được danh sách lớp" />
    </Theme>,
  );

  expect(screen.getByText('Không tải được danh sách lớp')).toBeInTheDocument();

  const wrapper = container.querySelector<HTMLElement>('[data-astryx-theme]');
  expect(wrapper).not.toBeNull();
  expect(wrapper?.dataset.astryxTheme).toBe('mems');
  expect(wrapper?.dataset.theme).toBe('light');
});
