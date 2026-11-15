import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ForbiddenNotice from './ForbiddenNotice';

describe('ForbiddenNotice', () => {
  it('đọc được cả lý do lẫn gợi ý qua role=status', () => {
    render(<ForbiddenNotice />);

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Bạn không có quyền truy cập khu vực này.');
    expect(notice).toHaveTextContent('hãy liên hệ quản trị viên tổ chức');
  });

  it('cho phép thay câu chính nhưng giữ nguyên gợi ý', () => {
    render(<ForbiddenNotice title="Bạn không có quyền xem lớp này." />);

    expect(screen.getByRole('status')).toHaveTextContent('Bạn không có quyền xem lớp này.');
    expect(screen.queryByText('Bạn không có quyền truy cập khu vực này.')).not.toBeInTheDocument();
  });
});
