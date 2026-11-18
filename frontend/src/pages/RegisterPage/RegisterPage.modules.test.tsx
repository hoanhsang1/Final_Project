import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RegisterPage from './RegisterPage';

vi.mock('../../features/modules/moduleApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/modules/moduleApi')>();
  return { ...actual, fetchModuleCatalog: vi.fn() };
});

const { fetchModuleCatalog } = await import('../../features/modules/moduleApi');
const mockFetchModules = vi.mocked(fetchModuleCatalog);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockFetchModules.mockReset();
});

/**
 * `N-01`/`N-02` — hai lỗi UX review ở trạng thái danh mục module của màn Đăng ký.
 * Tách riêng khỏi `RegisterPage.test.tsx` để file kia giữ nguyên hành vi khi danh
 * mục không tải được (không mock).
 */
describe('RegisterPage — danh mục module (N-01, N-02)', () => {
  it('N-02: danh mục rỗng thì báo lý do và tắt nút "Gửi đăng ký"', async () => {
    mockFetchModules.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Chưa có module nào để chọn')).toBeInTheDocument();
    // `Button` của Astryx đánh dấu khoá bằng `aria-disabled`, KHÔNG dùng attribute
    // `disabled` native (xem `docs/ui-conventions.md` §6.11) → không dùng `toBeDisabled()`.
    expect(screen.getByRole('button', { name: 'Gửi đăng ký' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('N-01: danh mục lỗi thì có nút "Thử lại" gọi tải lại danh mục', async () => {
    mockFetchModules.mockRejectedValueOnce(new Error('mạng lỗi'));

    renderPage();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    // Lỗi tải danh mục KHÔNG chặn nút gửi (khác trạng thái rỗng của N-02).
    expect(screen.getByRole('button', { name: 'Gửi đăng ký' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    await waitFor(() => expect(mockFetchModules).toHaveBeenCalledTimes(2));
  });
});
