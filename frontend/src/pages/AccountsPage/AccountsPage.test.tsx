import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountCreatePayload } from '../../features/admin/types';
import AccountsPage from './AccountsPage';

const notifySpies = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const PAYLOAD: AccountCreatePayload = {
  email: 'gv1@school.edu.vn',
  full_name: 'Nguyễn Văn A',
  role: 'TEACHER',
  organization_id: 'org-1',
};

vi.mock('../../hooks/useNotify', () => ({
  useNotify: () => ({ success: notifySpies.success, error: notifySpies.error }),
}));

vi.mock('../../features/admin/adminApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/admin/adminApi')>();
  return {
    ...actual,
    createAccount: vi.fn(),
    fetchOrganizationOptions: vi.fn().mockResolvedValue([]),
  };
});

// Form tạo có Selector phức tạp — test này chỉ cần chứng minh page truyền response
// vào TempPasswordModal, nên thay bằng nút bấm gọi đúng callback `onConfirm`.
vi.mock('../../components/AccountCreateModal/AccountCreateModal', () => ({
  default: ({ onConfirm }: { onConfirm: (payload: AccountCreatePayload) => void }) => (
    <button type="button" onClick={() => onConfirm(PAYLOAD)}>
      Xác nhận tạo nhanh
    </button>
  ),
}));

vi.mock('./use-accounts', () => ({
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [20],
  useAccountsPage: () => ({
    result: {
      data: { items: [], total: 0, page: 1, size: 20 },
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    },
    page: 1,
    size: 20,
    keyword: '',
    status: undefined,
    organizationId: null,
    role: null,
    sort: 'username,asc',
    updateParams: vi.fn(),
  }),
}));

const { createAccount } = await import('../../features/admin/adminApi');
const mockCreateAccount = vi.mocked(createAccount);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/quan-tri/tai-khoan']}>
        <Routes>
          <Route path="/quan-tri/tai-khoan" element={<AccountsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockCreateAccount.mockReset();
  notifySpies.success.mockReset();
  notifySpies.error.mockReset();
});

describe('AccountsPage — mật khẩu tạm sau khi tạo tài khoản', () => {
  it('response 201 có temporaryPassword → mở TempPasswordModal với đúng mật khẩu', async () => {
    mockCreateAccount.mockResolvedValue({
      id: 'acc-1',
      username: 'gv1',
      email: PAYLOAD.email,
      role: 'TEACHER',
      status: 'pending',
      temporaryPassword: 'Tam@12345678',
    });

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận tạo nhanh' }));

    await waitFor(() => expect(mockCreateAccount).toHaveBeenCalledWith(PAYLOAD));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Tam@12345678')).toBeInTheDocument();
    expect(screen.getByText('gv1')).toBeInTheDocument();
  });
});
