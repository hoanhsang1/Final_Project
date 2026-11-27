import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountItem } from '../../features/admin/types';
import AccountDetailPage from './AccountDetailPage';

const notifySpies = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

const ACCOUNT: AccountItem = {
  id: 'acc-1',
  username: 'gv1',
  email: 'gv1@school.edu.vn',
  full_name: 'Nguyễn Văn A',
  organization_id: 'org-1',
  organization_name: 'Trường A',
  role: 'TEACHER',
  status: 'active',
};

vi.mock('../../hooks/useNotify', () => ({
  useNotify: () => ({ success: notifySpies.success, error: notifySpies.error }),
}));

vi.mock('../../features/admin/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/admin/adminApi')>();
  return {
    ...actual,
    resetAccountPassword: vi.fn(),
    updateAccountRole: vi.fn(),
    updateAccountStatus: vi.fn(),
  };
});

vi.mock('./use-account-detail', () => ({
  useAccountDetailQuery: () => ({
    data: ACCOUNT,
    isPending: false,
    isError: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('./use-account-audit', () => ({
  useAccountAudit: () => ({
    data: { items: [], total: 0, page: 1, size: 20 },
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../components/AuditLogTable/AuditLogTable', () => ({
  default: () => <div>Nhật ký tài khoản</div>,
}));

const { resetAccountPassword } = await import('../../features/admin/adminApi');
const mockResetPassword = vi.mocked(resetAccountPassword);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/quan-tri/tai-khoan/acc-1']}>
        <Routes>
          <Route path="/quan-tri/tai-khoan/:id" element={<AccountDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockResetPassword.mockReset();
  notifySpies.success.mockReset();
  notifySpies.error.mockReset();
});

describe('AccountDetailPage — đặt lại mật khẩu trả mật khẩu tạm', () => {
  it('HTTP 200 có temporaryPassword → TempPasswordModal nhận đúng mật khẩu', async () => {
    mockResetPassword.mockResolvedValue({ temporaryPassword: 'Tam@98765432' });

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));

    const resetDialog = screen.getByRole('dialog');
    await userEvent.click(
      within(resetDialog).getByRole('radio', { name: 'Đặt mật khẩu mới thủ công' }),
    );
    await userEvent.type(within(resetDialog).getByLabelText('Mật khẩu mới'), 'MatKhauMoi123');
    await userEvent.click(
      within(resetDialog).getByRole('button', { name: 'Đặt lại mật khẩu' }),
    );

    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith('acc-1', 'MatKhauMoi123'),
    );
    const tempDialog = await screen.findByRole('dialog');
    expect(within(tempDialog).getByText('Tam@98765432')).toBeInTheDocument();
    expect(within(tempDialog).getByText('gv1')).toBeInTheDocument();
  });
});
