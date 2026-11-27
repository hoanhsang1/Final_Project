import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FacilityIssue } from '../../features/facility/types';
import { MSG_S4 } from '../../features/sprint4/sprint4Messages';
import { useAuthStore } from '../../stores/authStore';
import FacilityIssuesPage from './FacilityIssuesPage';

const notifySpies = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../hooks/useNotify', () => ({
  useNotify: () => ({ success: notifySpies.success, error: notifySpies.error }),
}));

vi.mock('../../features/facility/facilityApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/facility/facilityApi')>();
  return {
    ...actual,
    fetchFacilityIssues: vi.fn(),
    reportFacilityIssue: vi.fn(),
    resolveFacilityIssue: vi.fn(),
  };
});

const { fetchFacilityIssues, reportFacilityIssue, resolveFacilityIssue } = await import(
  '../../features/facility/facilityApi'
);
const mockFetch = vi.mocked(fetchFacilityIssues);
const mockReport = vi.mocked(reportFacilityIssue);
const mockResolve = vi.mocked(resolveFacilityIssue);

const ISSUE: FacilityIssue = {
  id: 'i1',
  equipmentId: 'e1',
  equipmentName: 'Máy chiếu',
  reportedBy: 'u1',
  description: 'Máy chiếu không bật',
  photoUrl: null,
  status: 'open',
  resolvedAt: null,
  createdAt: '2026-11-26T08:00:00Z',
};

const PERMISSIONS = ['facility.issue.report', 'facility.issue.resolve'];

function renderPage(
  permissions: string[] = PERMISSIONS,
  departmentId = 'd1',
  backendRoles: string[] = [],
) {
  useAuthStore.setState({
    userId: 'u1',
    username: 'staff',
    isAuthenticated: true,
    role: null,
    backendRoles,
    permissions,
    mustChangePassword: false,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[
          `/to-chuc/co-so-vat-chat/su-co?departmentId=${encodeURIComponent(departmentId)}`,
        ]}
      >
        <FacilityIssuesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidateQueriesSpy };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockReport.mockReset();
  mockResolve.mockReset();
  notifySpies.success.mockReset();
  notifySpies.error.mockReset();
});

afterEach(() => {
  useAuthStore.setState({
    userId: null,
    username: null,
    isAuthenticated: false,
    role: null,
    backendRoles: [],
    permissions: [],
    mustChangePassword: false,
  });
});

describe('FacilityIssuesPage — danh sách và lọc status', () => {
  it('success: hiện thiết bị/mô tả/trạng thái sự cố', async () => {
    mockFetch.mockResolvedValue([ISSUE]);

    renderPage();

    const row = await screen.findByRole('row', { name: /Máy chiếu/ });
    expect(within(row).getByText('Máy chiếu không bật')).toBeInTheDocument();
    expect(within(row).getByText('open')).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith({ departmentId: 'd1', status: undefined });
  });

  it('gõ trạng thái rồi bấm Tìm thì gửi status cho fetchFacilityIssues', async () => {
    mockFetch.mockResolvedValue([]);

    renderPage();
    await screen.findByText('Chưa có sự cố nào.');
    await userEvent.type(screen.getByRole('textbox', { name: 'Trạng thái' }), 'open');
    await userEvent.click(screen.getByRole('button', { name: 'Tìm' }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith({ departmentId: 'd1', status: 'open' }),
    );
  });

  it('empty/error/forbidden: hiện đúng trạng thái', async () => {
    mockFetch.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Chưa có sự cố nào.')).toBeInTheDocument();
    cleanup();

    mockFetch.mockRejectedValueOnce(new Error('network'));
    renderPage();
    expect(await screen.findByText('Không tải được danh sách sự cố.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });

  it('không có facility.issue.report/resolve thì hiện forbidden, không gọi API', async () => {
    renderPage([]);

    expect(
      await screen.findByText('Bạn không có quyền truy cập khu vực này.'),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('FACILITY_STAFF + FACILITY_READ xem được danh sách sự cố nhưng không báo/xử lý được', async () => {
    mockFetch.mockResolvedValue([ISSUE]);

    renderPage(['FACILITY_READ'], 'd1', ['FACILITY_STAFF']);

    const row = await screen.findByRole('row', { name: /Máy chiếu/ });
    expect(within(row).getByText('Máy chiếu không bật')).toBeInTheDocument();
    expect(screen.queryByText(MSG_S4.NO_PERMISSION)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Báo sự cố' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đánh dấu đã xử lý' })).not.toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith({ departmentId: 'd1', status: undefined });
  });
});

describe('FacilityIssuesPage — báo cáo và xử lý', () => {
  it('bấm Xử lý thì gọi resolveFacilityIssue với departmentId và issueId', async () => {
    mockFetch.mockResolvedValue([ISSUE]);
    mockResolve.mockResolvedValue({ ...ISSUE, status: 'resolved' });
    const { invalidateQueriesSpy } = renderPage();

    const row = await screen.findByRole('row', { name: /Máy chiếu/ });
    await userEvent.click(within(row).getByRole('button', { name: 'Đánh dấu đã xử lý' }));

    await waitFor(() => expect(mockResolve).toHaveBeenCalledWith('d1', 'i1'));
    expect(notifySpies.success).toHaveBeenCalledWith('Đã xử lý sự cố.');
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['facility-issues'] });
  });

  it('báo sự cố gửi equipmentId/description/photoUrl đúng contract', async () => {
    mockFetch.mockResolvedValue([]);
    mockReport.mockResolvedValue(ISSUE);

    renderPage();
    await screen.findByText('Chưa có sự cố nào.');
    await userEvent.click(screen.getByRole('button', { name: 'Báo sự cố' }));

    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: 'Mã thiết bị' }), 'e1');
    await userEvent.type(
      within(dialog).getByRole('textbox', { name: 'Mô tả sự cố' }),
      'Máy chiếu không bật',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi báo cáo' }));

    await waitFor(() =>
      expect(mockReport).toHaveBeenCalledWith('d1', {
        equipmentId: 'e1',
        description: 'Máy chiếu không bật',
        photoUrl: null,
      }),
    );
    expect(notifySpies.success).toHaveBeenCalledWith('Đã báo sự cố.');
  });

  it('chỉ có facility.issue.resolve thì ẩn nút báo sự cố nhưng vẫn xử lý được', async () => {
    mockFetch.mockResolvedValue([ISSUE]);
    mockResolve.mockResolvedValue({ ...ISSUE, status: 'resolved' });

    renderPage(['facility.issue.resolve']);

    expect(await screen.findByRole('row', { name: /Máy chiếu/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Báo sự cố' })).not.toBeInTheDocument();
    const row = screen.getByRole('row', { name: /Máy chiếu/ });
    await userEvent.click(within(row).getByRole('button', { name: 'Đánh dấu đã xử lý' }));
    await waitFor(() => expect(mockResolve).toHaveBeenCalledWith('d1', 'i1'));
  });
});

describe('FacilityIssuesPage — liên kết giữ departmentId', () => {
  it('link Về cơ sở vật chất nối departmentId đã encode', () => {
    renderPage(PERMISSIONS, 'd1 x');

    expect(screen.getByRole('link', { name: 'Về cơ sở vật chất' })).toHaveAttribute(
      'href',
      '/co-so-vat-chat?departmentId=d1%20x',
    );
  });
});
