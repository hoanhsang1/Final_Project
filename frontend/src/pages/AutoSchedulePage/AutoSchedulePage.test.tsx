import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MSG_AUTO, classOptionLabel } from '../../features/schedule/autoScheduleMessages';
import { activeAcademicMenuKey, getAcademicMenu } from '../../features/sprint4/academicMenu';
import type { ClassListItem } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';
import AutoSchedulePage from './AutoSchedulePage';

const notifySpies = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../../hooks/useNotify', () => ({
  useNotify: () => ({ success: notifySpies.success, error: notifySpies.error }),
}));

vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return { ...actual, fetchClasses: vi.fn() };
});

vi.mock('../../features/schedule/autoScheduleApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/schedule/autoScheduleApi')>();
  return { ...actual, generateAutoSchedule: vi.fn() };
});

const { fetchClasses } = await import('../../features/sprint4/sprint4Api');
const { generateAutoSchedule } = await import('../../features/schedule/autoScheduleApi');
const { routes } = await import('../../router');

const mockFetch = vi.mocked(fetchClasses);
const mockGenerate = vi.mocked(generateAutoSchedule);

const LOP_01 = {
  id: 'c1',
  classCode: 'LOP-01',
  name: 'Toán 10A1',
  startDate: '2025-09-05',
  endDate: '2026-05-30',
  version: 1,
  academicYear: '2025-2026',
  status: 'DANG_DIEN_RA',
  closeState: 'NONE',
  teacher: null,
  studentCount: 42,
} satisfies ClassListItem;

const paged = (items: ClassListItem[]) => ({
  items,
  total: items.length,
  page: 1,
  size: 20,
  pages: 1,
});

const DRAFT_RESULT = {
  scheduled: [
    {
      id: 'PREVIEW-1',
      classId: 'c1',
      className: 'LOP-01 — Toán 10A1',
      subjectName: 'Toán',
      teacherName: 'Nguyễn Văn A',
      roomCode: 'P101',
      startTime: '2026-12-01T07:30:00',
      endTime: '2026-12-01T08:15:00',
      status: 'scheduled',
    },
  ],
  unscheduled: [
    {
      classId: 'c2',
      className: 'LOP-02',
      subjectName: 'Lý',
      reason: 'Không có giáo viên đủ điều kiện.',
    },
  ],
  summary: { totalRequested: 2, scheduled: 1, unscheduled: 1 },
};

function renderPage(permissions: string[] = ['schedule.create']) {
  useAuthStore.setState({
    userId: 'u1',
    username: 'giao.vu',
    isAuthenticated: true,
    role: null,
    backendRoles: [],
    permissions,
    mustChangePassword: false,
    passwordChangeRequiredByApi: false,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[
          '/dao-tao/tu-dong-xep-lich?departmentId=d1&from=2026-12-01&to=2026-12-07',
        ]}
      >
        <AutoSchedulePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { invalidateQueriesSpy };
}

async function fillRequiredFields() {
  await userEvent.click(await screen.findByRole('combobox', { name: MSG_AUTO.CLASS_LABEL }));
  await userEvent.click(await screen.findByRole('option', { name: classOptionLabel(LOP_01) }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Thứ Hai' }));
}

beforeEach(() => {
  mockFetch.mockReset();
  mockGenerate.mockReset();
  notifySpies.success.mockReset();
  notifySpies.error.mockReset();
  mockFetch.mockResolvedValue(paged([LOP_01]));
  mockGenerate.mockResolvedValue(DRAFT_RESULT);
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
    passwordChangeRequiredByApi: false,
  });
});

describe('AutoSchedulePage — quyền', () => {
  it('chỉ có schedule.view thì không thấy form, không gọi API', () => {
    renderPage(['schedule.view']);

    expect(screen.getByText(MSG_AUTO.NO_PERMISSION_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: MSG_AUTO.SUBMIT_DRAFT })).toBeNull();
    expect(screen.queryByRole('button', { name: MSG_AUTO.SUBMIT_CONFIRM })).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('có schedule.create thì mở form, mặc định nguồn chương trình / auto bật / 45 phút', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: MSG_AUTO.TITLE })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: MSG_AUTO.SOURCE_CURRICULUM })).toBeChecked();
    expect(screen.getByRole('switch', { name: MSG_AUTO.AUTO_TOGGLE_LABEL })).toBeChecked();
    expect(screen.queryByRole('spinbutton', { name: MSG_AUTO.SESSIONS_LABEL })).toBeNull();
    expect(screen.getByRole('textbox', { name: `${MSG_AUTO.SLOT_START_LABEL} 1` })).toHaveValue(
      '07:30',
    );
    expect(screen.getByRole('textbox', { name: `${MSG_AUTO.SLOT_END_LABEL} 1` })).toHaveValue(
      '08:15',
    );

    await screen.findByRole('combobox', { name: MSG_AUTO.CLASS_LABEL });
    expect(mockFetch).toHaveBeenCalledWith({ page: 1, size: 100 });
    const draft = screen.getByRole('button', { name: MSG_AUTO.SUBMIT_DRAFT });
    expect(draft.getAttribute('aria-disabled')).not.toBe('true');
    const confirm = screen.getByRole('button', { name: MSG_AUTO.SUBMIT_CONFIRM });
    expect(confirm.getAttribute('aria-disabled')).toBe('true');
  });

  it('chuyển sang nhập tay thì hiện số buổi/tuần và số phút/buổi', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('radio', { name: MSG_AUTO.SOURCE_MANUAL }));
    expect(screen.getByRole('spinbutton', { name: MSG_AUTO.SESSIONS_LABEL })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: MSG_AUTO.MINUTES_LABEL })).toHaveValue('45');
  });
});

describe('AutoSchedulePage — nháp → xem trước → xác nhận', () => {
  it('Tạo nháp lịch gọi dryRun=true, hiện preview, chưa báo đã xếp xong', async () => {
    renderPage();
    await fillRequiredFields();

    await userEvent.click(screen.getByRole('button', { name: MSG_AUTO.SUBMIT_DRAFT }));

    expect((await screen.findAllByRole('table')).length).toBeGreaterThan(0);
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate).toHaveBeenCalledWith(
      'd1',
      {
        classIds: ['c1'],
        dateFrom: '2026-12-01',
        dateTo: '2026-12-07',
        slots: [
          { startTime: '07:30', endTime: '08:15' },
          { startTime: '08:15', endTime: '09:00' },
          { startTime: '09:00', endTime: '09:45' },
          { startTime: '09:45', endTime: '10:30' },
        ],
        sessionDays: [1],
      },
      true,
    );
    expect(screen.getByText(MSG_AUTO.PREVIEW_TITLE)).toBeInTheDocument();
    expect(screen.getByText('Không có giáo viên đủ điều kiện.')).toBeInTheDocument();
    expect(screen.queryByText(MSG_AUTO.CONFIRM_SUCCESS)).toBeNull();
  });

  it('nguồn nhập tay gửi số buổi/phút làm override cho BE', async () => {
    renderPage();
    await screen.findByRole('combobox', { name: MSG_AUTO.CLASS_LABEL });
    await userEvent.click(screen.getByRole('radio', { name: MSG_AUTO.SOURCE_MANUAL }));
    const sessions = screen.getByRole('spinbutton', { name: MSG_AUTO.SESSIONS_LABEL });
    await userEvent.clear(sessions);
    await userEvent.type(sessions, '3');
    await fillRequiredFields();

    await userEvent.click(screen.getByRole('button', { name: MSG_AUTO.SUBMIT_DRAFT }));

    await waitFor(() => expect(mockGenerate).toHaveBeenCalledTimes(1));
    expect(mockGenerate).toHaveBeenCalledWith(
      'd1',
      expect.objectContaining({ sessionsPerWeek: 3, sessionMinutes: 45 }),
      true,
    );
  });

  it('Xác nhận xếp lịch gọi dryRun=false rồi mới báo thành công và invalidate', async () => {
    const { invalidateQueriesSpy } = renderPage();
    await fillRequiredFields();
    await userEvent.click(screen.getByRole('button', { name: MSG_AUTO.SUBMIT_DRAFT }));
    expect((await screen.findAllByRole('table')).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: MSG_AUTO.SUBMIT_CONFIRM }));

    expect(await screen.findByText(MSG_AUTO.CONFIRM_SUCCESS)).toBeInTheDocument();
    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(mockGenerate).toHaveBeenLastCalledWith(
      'd1',
      expect.objectContaining({ classIds: ['c1'], sessionDays: [1] }),
      false,
    );
    expect(notifySpies.success).toHaveBeenCalledWith(MSG_AUTO.CONFIRM_SUCCESS);
    await waitFor(() =>
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['schedules', 'd1'] }),
      ),
    );
  });

  it('lỗi 409 hiển thị câu tiếng Việt từ scheduleErrorMessage', async () => {
    mockGenerate.mockRejectedValueOnce({
      response: { status: 409, data: { code: 'ROOM_SCHEDULE_CONFLICT' } },
    });
    renderPage();
    await fillRequiredFields();

    await userEvent.click(screen.getByRole('button', { name: MSG_AUTO.SUBMIT_DRAFT }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Phòng học đã được đặt trong khung giờ này.',
    );
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText(MSG_AUTO.CONFIRM_SUCCESS)).toBeNull();
  });

  it('thiếu ngày học thì không gọi API', async () => {
    renderPage();
    await screen.findByRole('combobox', { name: MSG_AUTO.CLASS_LABEL });
    await userEvent.click(screen.getByRole('button', { name: MSG_AUTO.SUBMIT_DRAFT }));

    expect(await screen.findByText(MSG_AUTO.REQUIRED_DAYS)).toBeInTheDocument();
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});

describe('menu + route', () => {
  it('menu tự động xếp lịch chỉ hiện cho schedule.create, không hiện cho schedule.view', () => {
    expect(getAcademicMenu(['schedule.create'], false).map((i) => i.key)).toContain(
      'tu-dong-xep-lich',
    );
    expect(getAcademicMenu(['schedule.view'], false).map((i) => i.key)).not.toContain(
      'tu-dong-xep-lich',
    );
    expect(getAcademicMenu([], true).map((i) => i.key)).toContain('tu-dong-xep-lich');
  });

  it('activeAcademicMenuKey nhận diện màn trước prefix /lich', () => {
    expect(activeAcademicMenuKey('/dao-tao/tu-dong-xep-lich')).toBe('tu-dong-xep-lich');
    expect(activeAcademicMenuKey('/dao-tao/lich')).toBe('lich');
  });

  it('router khai báo route /dao-tao/tu-dong-xep-lich', async () => {
    const { routes: routeObjects } = await import('../../router');
    const academic = routeObjects
      .flatMap((route) => route.children ?? [])
      .find((route) => route.path === 'dao-tao');

    expect(academic?.children?.some((route) => route.path === 'tu-dong-xep-lich')).toBe(true);
    expect(routes).toBe(routeObjects);
  });
});
