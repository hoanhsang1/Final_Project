import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MSG_S4, MSG_SELF } from '../../features/sprint4/sprint4Messages';
import { MSG_SCHEDULE } from '../../features/schedule/scheduleMessages';
import { useAuthStore } from '../../stores/authStore';
import SelfHomePage from './SelfHomePage';

/** Trang cá nhân là màn điều hướng thuần — không được gọi wrapper API nào. */
vi.mock('../../features/sprint4/sprint4Api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/sprint4/sprint4Api')>();
  return {
    ...actual,
    fetchTeacherSelf: vi.fn(),
    fetchTeacherSelfClasses: vi.fn(),
    fetchMyClassStudents: vi.fn(),
    fetchStudentSelf: vi.fn(),
    fetchStudentSelfClasses: vi.fn(),
  };
});

const sprint4Api = await import('../../features/sprint4/sprint4Api');
const apiMocks = [
  vi.mocked(sprint4Api.fetchTeacherSelf),
  vi.mocked(sprint4Api.fetchTeacherSelfClasses),
  vi.mocked(sprint4Api.fetchMyClassStudents),
  vi.mocked(sprint4Api.fetchStudentSelf),
  vi.mocked(sprint4Api.fetchStudentSelfClasses),
];

/** JWT của cả GV lẫn HS đều mang đủ 3 self-permission. */
const SELF_PERMISSIONS = ['class.self_view', 'student.self_view', 'schedule.self_view'];

function renderPage(backendRoles: string[], permissions: string[] = SELF_PERMISSIONS) {
  useAuthStore.setState({
    userId: 'u1',
    username: 'toi',
    role: null,
    backendRoles,
    permissions,
    isAuthenticated: true,
  });
  render(
    <MemoryRouter initialEntries={['/dao-tao/trang-ca-nhan']}>
      <SelfHomePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  apiMocks.forEach((mock) => mock.mockReset());
});

afterEach(() => {
  useAuthStore.setState({
    userId: null,
    username: null,
    role: null,
    backendRoles: [],
    permissions: [],
    isAuthenticated: false,
  });
});

describe('SelfHomePage', () => {
  it('TEACHER thấy đúng 3 liên kết tới hồ sơ/lớp/lịch của giáo viên', () => {
    renderPage(['TEACHER']);

    expect(screen.getByRole('heading', { level: 1, name: MSG_SELF.TITLE_HOME })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: MSG_SELF.OPEN_PROFILE })).toHaveAttribute(
      'href',
      '/dao-tao/giao-vien/cua-toi',
    );
    expect(screen.getByRole('link', { name: MSG_SELF.OPEN_CLASSES })).toHaveAttribute(
      'href',
      '/dao-tao/lop-hoc-cua-toi',
    );
    expect(screen.getByRole('link', { name: MSG_SCHEDULE.MENU_MY_SCHEDULE })).toHaveAttribute(
      'href',
      '/dao-tao/lich-cua-toi',
    );
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('STUDENT thấy đúng 3 liên kết tới hồ sơ/lớp/lịch của học sinh', () => {
    renderPage(['STUDENT']);

    expect(screen.getByRole('link', { name: MSG_SELF.OPEN_PROFILE })).toHaveAttribute(
      'href',
      '/dao-tao/hoc-sinh/cua-toi',
    );
    expect(screen.getByRole('link', { name: MSG_SELF.OPEN_CLASSES })).toHaveAttribute(
      'href',
      '/dao-tao/hoc-sinh/lop-cua-toi',
    );
    expect(screen.getByRole('link', { name: MSG_SCHEDULE.MENU_MY_SCHEDULE })).toHaveAttribute(
      'href',
      '/dao-tao/lich-cua-toi',
    );
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('role khác thì hiện forbidden, không render liên kết self', () => {
    renderPage(['ACCOUNTANT']);

    expect(screen.getByText(MSG_S4.NO_PERMISSION)).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('không gọi API dù có đủ self-permission', () => {
    renderPage(['TEACHER']);

    apiMocks.forEach((mock) => expect(mock).not.toHaveBeenCalled());
  });
});
