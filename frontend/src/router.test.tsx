import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, vi } from 'vitest';
import { fetchStudentSelfClasses } from './features/sprint4/sprint4Api';
import { MSG_S4, MSG_SELF } from './features/sprint4/sprint4Messages';
import { routes } from './router';
import { useAuthStore } from './stores/authStore';

// Màn lịch chỉ đọc server state; mock ở mức API để test route không gọi mạng.
vi.mock('./features/schedule/scheduleApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./features/schedule/scheduleApi')>();
  return {
    ...actual,
    fetchSchedules: vi.fn().mockResolvedValue([]),
    fetchRoomSuggestions: vi.fn().mockResolvedValue([]),
    fetchImpacts: vi.fn().mockResolvedValue([]),
    fetchMySchedule: vi.fn().mockResolvedValue([]),
  };
});

// Facility chưa được port ở working tree này — mock để test route không gọi mạng.
vi.mock('./features/facility/facilityApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./features/facility/facilityApi')>();
  return {
    ...actual,
    fetchRooms: vi.fn().mockResolvedValue([]),
    fetchEquipment: vi.fn().mockResolvedValue([]),
    fetchFacilityIssues: vi.fn().mockResolvedValue([]),
  };
});

// Index redirect tới /giao-vien cho OWNER — mock danh sách để test không gọi mạng.
vi.mock('./features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./features/sprint4/sprint4Api')>();
  return {
    ...actual,
    fetchTeachers: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    fetchClasses: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    fetchStudents: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    // Route self của học sinh: render H1 không cần network, nhưng phải có payload
    // để page hồ sơ không rơi vào state empty.
    fetchStudentSelf: vi.fn().mockResolvedValue({
      id: 's1',
      studentCode: 'HS001',
      fullName: 'Nguyễn Văn An',
      dateOfBirth: '2010-05-12',
      email: 'demo_student@example.edu.vn',
      phone: '0901234567',
      status: 'active',
      classId: 'c1',
      classCode: '12A1',
      className: '12A1',
      accountUsername: 'demo_student',
      accountCreatedAt: '2025-08-01T00:00:00',
      createdAt: '2025-08-01T00:00:00',
      updatedAt: '2025-09-02T01:02:00',
    }),
    fetchStudentSelfClasses: vi.fn().mockResolvedValue([]),
  };
});

const ORIGINAL_MATCH_MEDIA = window.matchMedia;

/** ConsoleShell ẩn nav trong jsdom (mặc định mobile); bật desktop để test menu. */
function setDesktopViewport() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('min-width: 1024px'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

afterEach(() => {
  window.matchMedia = ORIGINAL_MATCH_MEDIA;
  useAuthStore.setState({
    userId: null,
    username: null,
    role: null,
    backendRoles: [],
    permissions: [],
    isAuthenticated: false,
  });
});

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

it('chuyển hướng gốc về trang đăng nhập', () => {
  const router = renderAt('/');
  expect(router.state.location.pathname).toBe('/dang-nhap');
  // H1 của màn đăng nhập đã rút gọn còn "Đăng nhập" khi dọn lại bố cục (bỏ dòng
  // phụ dài); tiêu đề cũ "Đăng nhập để tiếp tục" không còn tồn tại.
  expect(screen.getByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
});

it('hiện trang đăng ký ở /dang-ky', () => {
  renderAt('/dang-ky');
  expect(screen.getByRole('heading', { name: 'Đăng ký tổ chức' })).toBeInTheDocument();
});

it('hiện 404 ở đường dẫn không tồn tại', () => {
  renderAt('/khong-ton-tai');
  expect(screen.getByText('Không tìm thấy trang')).toBeInTheDocument();
});

it('chưa đăng nhập vào /to-chuc thì bị đưa về /dang-nhap', () => {
  const router = renderAt('/to-chuc');

  expect(router.state.location.pathname).toBe('/dang-nhap');
});

it('SUPER_ADMIN vào /to-chuc thấy 403 của khu vực tổ chức', () => {
  useAuthStore.setState({
    userId: 'admin-1',
    username: 'admin',
    role: null,
    backendRoles: ['SUPER_ADMIN'],
    isAuthenticated: true,
  });

  renderAt('/to-chuc');

  expect(
    screen.getByText('Bạn không có quyền truy cập khu vực quản lý tổ chức.'),
  ).toBeInTheDocument();
});

function signInAcademic(permissions: string[], backendRoles: string[] = []) {
  useAuthStore.setState({
    userId: 'u1',
    username: 'giao.vu',
    role: null,
    backendRoles,
    permissions,
    isAuthenticated: true,
  });
}

it('index /dao-tao của OWNER vẫn tới danh sách giáo viên', async () => {
  useAuthStore.setState({
    userId: 'owner-1',
    username: 'owner',
    role: null,
    backendRoles: ['OWNER'],
    permissions: [],
    isAuthenticated: true,
  });

  const router = renderAt('/dao-tao');

  expect(router.state.location.pathname).toBe('/dao-tao/giao-vien');
  expect(
    await screen.findByRole('heading', { name: 'Giáo viên', level: 1 }, { timeout: 3000 }),
  ).toBeInTheDocument();
});

it('index /dao-tao của user self-only tới trang cá nhân', async () => {
  signInAcademic(
    ['class.self_view', 'student.self_view', 'schedule.self_view'],
    ['TEACHER'],
  );

  const router = renderAt('/dao-tao');

  expect(router.state.location.pathname).toBe('/dao-tao/trang-ca-nhan');
  expect(
    await screen.findByRole('heading', { name: MSG_SELF.TITLE_HOME, level: 1 }, { timeout: 3000 }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: MSG_SELF.OPEN_PROFILE })).toHaveAttribute(
    'href',
    '/dao-tao/giao-vien/cua-toi',
  );
});

it('route self hồ sơ học sinh render H1 (không bị /hoc-sinh/:id nuốt)', async () => {
  signInAcademic(['student.self_view'], ['STUDENT']);
  const router = renderAt('/dao-tao/hoc-sinh/cua-toi');

  expect(router.state.location.pathname).toBe('/dao-tao/hoc-sinh/cua-toi');
  expect(
    await screen.findByRole(
      'heading',
      { level: 1, name: MSG_SELF.PROFILE_STUDENT },
      { timeout: 3000 },
    ),
  ).toBeInTheDocument();
});

it('route self lớp của học sinh render H1 (không bị /hoc-sinh/:id nuốt)', async () => {
  signInAcademic(['student.self_view'], ['STUDENT']);
  const router = renderAt('/dao-tao/hoc-sinh/lop-cua-toi');

  expect(router.state.location.pathname).toBe('/dao-tao/hoc-sinh/lop-cua-toi');
  expect(
    await screen.findByRole(
      'heading',
      { level: 1, name: MSG_SELF.MY_CLASSES },
      { timeout: 3000 },
    ),
  ).toBeInTheDocument();
});

it('route chi tiết lớp của học sinh render H1 (không bị /hoc-sinh/:id nuốt)', async () => {
  vi.mocked(fetchStudentSelfClasses).mockResolvedValueOnce([
    {
      id: 'c1',
      classCode: 'LOP-01',
      name: 'Toán 10A1',
      status: 'DANG_DIEN_RA',
    },
  ]);
  signInAcademic(['student.self_view'], ['STUDENT']);
  const router = renderAt('/dao-tao/hoc-sinh/lop-cua-toi/c1');

  expect(router.state.location.pathname).toBe('/dao-tao/hoc-sinh/lop-cua-toi/c1');
  expect(
    await screen.findByRole(
      'heading',
      { level: 1, name: MSG_SELF.CLASS_DETAIL_TITLE },
      { timeout: 3000 },
    ),
  ).toBeInTheDocument();
  expect(screen.getByText('LOP-01')).toBeInTheDocument();
});

it('index /dao-tao của STAFF có class.view tới danh sách lớp đầu tiên của menu', async () => {
  signInAcademic(['class.view'], ['STAFF']);

  const router = renderAt('/dao-tao');

  await waitFor(() => expect(router.state.location.pathname).toBe('/dao-tao/lop-hoc'));
});

it('index /dao-tao của user có PEOPLE_VIEW vẫn tới danh sách giáo viên', async () => {
  signInAcademic(['PEOPLE_VIEW'], ['TEACHER']);

  const router = renderAt('/dao-tao');

  expect(router.state.location.pathname).toBe('/dao-tao/giao-vien');
});

it('index /dao-tao của SUPER_ADMIN tới khu vực quản trị', async () => {
  useAuthStore.setState({
    userId: 'admin-1',
    username: 'admin',
    role: null,
    backendRoles: ['SUPER_ADMIN'],
    permissions: [],
    isAuthenticated: true,
  });

  const router = renderAt('/dao-tao');

  await waitFor(() => expect(router.state.location.pathname).toBe('/quan-tri'));
});

it('schedule.view vào /dao-tao/lich thấy màn lịch và mục menu lịch', async () => {
  setDesktopViewport();
  signInAcademic(['schedule.view']);
  renderAt('/dao-tao/lich');

  expect(
    await screen.findByRole('heading', { name: 'Lịch đào tạo' }, { timeout: 3000 }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Lịch' }).length).toBeGreaterThan(0);
  expect(screen.queryAllByRole('link', { name: 'Lịch cá nhân' })).toHaveLength(0);
});

it('schedule.self_view vào /dao-tao/lich-cua-toi thấy trang cá nhân', async () => {
  setDesktopViewport();
  signInAcademic(['schedule.self_view']);
  renderAt('/dao-tao/lich-cua-toi');

  expect(
    await screen.findByRole('heading', { name: 'Lịch cá nhân' }, { timeout: 3000 }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Lịch cá nhân' }).length).toBeGreaterThan(0);
  expect(screen.queryAllByRole('link', { name: 'Lịch' })).toHaveLength(0);
});

it('route con /dao-tao/lich/buoi-bi-anh-huong render màn impacts', async () => {
  signInAcademic(['schedule.view']);
  renderAt('/dao-tao/lich/buoi-bi-anh-huong');

  expect(
    await screen.findByRole('heading', { name: 'Buổi bị ảnh hưởng' }, { timeout: 3000 }),
  ).toBeInTheDocument();
});

it('route CSVC có FacilityGuard: OWNER thấy màn phòng và mục menu CSVC', async () => {
  setDesktopViewport();
  useAuthStore.setState({
    userId: 'owner-1',
    username: 'owner',
    role: null,
    backendRoles: ['OWNER'],
    permissions: [],
    isAuthenticated: true,
  });

  const router = renderAt('/co-so-vat-chat?departmentId=d1');
  expect(router.state.location.pathname).toBe('/co-so-vat-chat');

  expect(
    await screen.findByRole('heading', { name: 'Cơ sở vật chất' }, { timeout: 3000 }),
  ).toBeInTheDocument();
  expect(
    screen.getAllByRole('link', { name: 'Cơ sở vật chất' }).length,
  ).toBeGreaterThan(0);
  // Không highlight nhầm "Phòng ban" (fallback /to-chuc).
  expect(screen.getByRole('link', { name: 'Cơ sở vật chất', current: 'page' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Phòng ban', current: 'page' })).toBeNull();
});

it('route sự cố CSVC render màn danh sách sự cố', async () => {
  useAuthStore.setState({
    userId: 'owner-1',
    username: 'owner',
    role: null,
    backendRoles: ['OWNER'],
    permissions: [],
    isAuthenticated: true,
  });

  renderAt('/co-so-vat-chat/su-co?departmentId=d1');

  expect(
    await screen.findByRole('heading', { name: 'Sự cố thiết bị' }, { timeout: 3000 }),
  ).toBeInTheDocument();
});

it('URL CSVC cũ chuyển hướng sang URL mới và giữ departmentId', async () => {
  useAuthStore.setState({
    userId: 'staff-1',
    username: 'facility.staff',
    role: null,
    backendRoles: ['FACILITY_STAFF'],
    permissions: ['FACILITY_READ', 'INCIDENT_CREATE'],
    isAuthenticated: true,
  });

  const router = renderAt('/to-chuc/co-so-vat-chat/su-co?departmentId=d1');

  await waitFor(() => expect(router.state.location.pathname).toBe('/co-so-vat-chat/su-co'));
  expect(router.state.location.search).toBe('?departmentId=d1');
  expect(
    await screen.findByRole('heading', { name: 'Sự cố thiết bị' }, { timeout: 3000 }),
  ).toBeInTheDocument();
});

it('URL CSVC cũ có dấu / cuối chuyển hướng sang URL mới và giữ departmentId', async () => {
  useAuthStore.setState({
    userId: 'staff-1',
    username: 'facility.staff',
    role: null,
    backendRoles: ['FACILITY_STAFF'],
    permissions: ['FACILITY_READ', 'INCIDENT_CREATE'],
    isAuthenticated: true,
  });

  const router = renderAt('/to-chuc/co-so-vat-chat/su-co/?departmentId=d1');

  await waitFor(() => expect(router.state.location.pathname).toBe('/co-so-vat-chat/su-co'));
  expect(router.state.location.search).toBe('?departmentId=d1');
  expect(
    await screen.findByRole('heading', { name: 'Sự cố thiết bị' }, { timeout: 3000 }),
  ).toBeInTheDocument();
});

it('URL CSVC cũ viết hoa chuyển hướng sang URL mới và giữ departmentId', async () => {
  useAuthStore.setState({
    userId: 'staff-1',
    username: 'facility.staff',
    role: null,
    backendRoles: ['FACILITY_STAFF'],
    permissions: ['FACILITY_READ', 'INCIDENT_CREATE'],
    isAuthenticated: true,
  });

  const router = renderAt('/To-Chuc/Co-So-Vat-Chat/Su-Co?departmentId=d1');

  await waitFor(() => expect(router.state.location.pathname).toBe('/co-so-vat-chat/su-co'));
  expect(router.state.location.search).toBe('?departmentId=d1');
  expect(
    await screen.findByRole('heading', { name: 'Sự cố thiết bị' }, { timeout: 3000 }),
  ).toBeInTheDocument();
});

it('URL CSVC cũ ở index có dấu / cuối chuyển hướng sang URL mới', async () => {
  useAuthStore.setState({
    userId: 'staff-1',
    username: 'facility.staff',
    role: null,
    backendRoles: ['FACILITY_STAFF'],
    permissions: ['FACILITY_READ', 'INCIDENT_CREATE'],
    isAuthenticated: true,
  });

  const router = renderAt('/to-chuc/co-so-vat-chat/?departmentId=d1');

  await waitFor(() => expect(router.state.location.pathname).toBe('/co-so-vat-chat'));
  expect(router.state.location.search).toBe('?departmentId=d1');
  expect(
    await screen.findByRole('heading', { name: 'Cơ sở vật chất' }, { timeout: 3000 }),
  ).toBeInTheDocument();
});

it('route CSVC của FACILITY_STAFF + FACILITY_READ hiện nội dung thật, không forbidden', async () => {
  useAuthStore.setState({
    userId: 'staff-1',
    username: 'facility.staff',
    role: null,
    backendRoles: ['FACILITY_STAFF'],
    permissions: ['FACILITY_READ'],
    isAuthenticated: true,
  });

  renderAt('/co-so-vat-chat?departmentId=d1');

  expect(
    await screen.findByRole('textbox', { name: 'Phòng ban (mã)' }, { timeout: 3000 }),
  ).toBeInTheDocument();
  expect(await screen.findByText('Chưa có phòng nào.')).toBeInTheDocument();
  expect(screen.queryByText(MSG_S4.NO_PERMISSION)).toBeNull();
});

it('user có CLASS_READ không vào được /co-so-vat-chat', () => {
  useAuthStore.setState({
    userId: 'staff-2',
    username: 'teacher',
    role: null,
    backendRoles: ['STAFF'],
    permissions: ['CLASS_READ'],
    isAuthenticated: true,
  });

  renderAt('/co-so-vat-chat?departmentId=d1');

  expect(screen.getByText(MSG_S4.NO_PERMISSION)).toBeInTheDocument();
});
