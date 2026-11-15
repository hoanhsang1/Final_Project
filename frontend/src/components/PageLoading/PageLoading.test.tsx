import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PageLoading from './PageLoading';

describe('PageLoading', () => {
  it('báo đang tải cho screen reader, giấu khung xương khỏi cây tiếp cận', () => {
    const { container } = render(<PageLoading />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Đang tải…');

    // Khung xương chỉ là trang trí: không được lọt vào cây tiếp cận.
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('nhận nhãn riêng cho từng màn', () => {
    render(<PageLoading label="Đang tải hồ sơ giáo viên…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải hồ sơ giáo viên…');
  });
});
