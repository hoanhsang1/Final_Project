import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DetailSection from './DetailSection';

describe('DetailSection', () => {
  it('dùng H2 (20px theo thang v2) và giữ mô tả ngắn', () => {
    render(
      <DetailSection title="Thông tin lớp" description="Dữ liệu lấy từ hồ sơ lớp.">
        <p>nội dung khối</p>
      </DetailSection>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Thông tin lớp' })).toBeInTheDocument();
    expect(screen.getByText('Dữ liệu lấy từ hồ sơ lớp.')).toBeInTheDocument();
    expect(screen.getByText('nội dung khối')).toBeInTheDocument();
  });

  it('có hairline phân cách nhưng không bọc Card', () => {
    const { container } = render(
      <DetailSection title="Lịch sử">
        <p>nội dung</p>
      </DetailSection>,
    );

    expect(container.querySelector('[role="separator"]')).not.toBeNull();
    expect(container.querySelector('section')).not.toBeNull();
  });
});
