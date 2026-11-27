import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { MSG_S4 } from '../../features/sprint4/sprint4Messages';
import { useAuthStore } from '../../stores/authStore';
import FacilityGuard from './FacilityGuard';

function renderGuard() {
  const router = createMemoryRouter(
    [
      {
        path: '/co-so-vat-chat',
        element: (
          <FacilityGuard>
            <p>Nội dung cơ sở vật chất</p>
          </FacilityGuard>
        ),
      },
      { path: '/dang-nhap', element: <p>Trang đăng nhập</p> },
    ],
    { initialEntries: ['/co-so-vat-chat'] },
  );

  render(<RouterProvider router={router} />);

  return router;
}

beforeEach(() => {
  useAuthStore.setState({
    userId: null,
    username: null,
    role: null,
    backendRoles: [],
    permissions: [],
    isAuthenticated: false,
  });
});

describe('FacilityGuard', () => {
  it('chưa đăng nhập → chuyển về /dang-nhap', () => {
    const router = renderGuard();

    expect(router.state.location.pathname).toBe('/dang-nhap');
    expect(screen.queryByText('Nội dung cơ sở vật chất')).not.toBeInTheDocument();
  });

  it('role FACILITY_STAFF với FACILITY_READ → render nội dung con', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      backendRoles: ['FACILITY_STAFF'],
      permissions: ['FACILITY_READ'],
    });

    renderGuard();

    expect(screen.getByText('Nội dung cơ sở vật chất')).toBeInTheDocument();
  });

  it('quyền CLASS_READ → 403 tại chỗ, không render nội dung', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      backendRoles: ['FACILITY_STAFF'],
      permissions: ['CLASS_READ'],
    });

    renderGuard();

    expect(screen.getByText(MSG_S4.NO_PERMISSION)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Về trang đăng nhập' })).toBeInTheDocument();
    expect(screen.queryByText('Nội dung cơ sở vật chất')).not.toBeInTheDocument();
  });
});
