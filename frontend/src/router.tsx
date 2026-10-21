import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import AdminConsoleLayout from './components/AdminConsoleLayout/AdminConsoleLayout';
import AdminGuard from './components/AdminGuard/AdminGuard';
import SessionWatcher from './components/SessionWatcher/SessionWatcher';
import LoginPage from './pages/LoginPage/LoginPage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';
import OrganizationDetailPage from './pages/OrganizationDetailPage/OrganizationDetailPage';
import PendingOrganizationsPage from './pages/PendingOrganizationsPage/PendingOrganizationsPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import RolePreviewPage from './pages/RolePreviewPage/RolePreviewPage';

/**
 * Khung gốc — gắn `SessionWatcher` để MỌI màn đều xử lý được "phiên hết hạn":
 * interceptor refresh token thất bại → xoá token → đưa về `/dang-nhap`.
 *
 * Bảng route dùng chung cho app thật (`router`) và cho test (`createMemoryRouter`).
 * Tách riêng để test chạy trên chính bảng route đang chạy thật.
 */
function RootLayout() {
  return (
    <>
      <Outlet />
      <SessionWatcher />
    </>
  );
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/dang-nhap" replace /> },
      { path: 'dang-nhap', element: <LoginPage /> },
      { path: 'dang-ky', element: <RegisterPage /> },
      { path: 'xem-thu/:vaiTro', element: <RolePreviewPage /> },
      {
        // Khu vực quản trị (Sprint 2) — guard chặn TRƯỚC khi màn con gọi API.
        path: 'quan-tri',
        element: (
          <AdminGuard>
            <AdminConsoleLayout />
          </AdminGuard>
        ),
        children: [
          { index: true, element: <Navigate to="/quan-tri/to-chuc" replace /> },
          { path: 'to-chuc', element: <PendingOrganizationsPage /> },
          { path: 'to-chuc/:id', element: <OrganizationDetailPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
