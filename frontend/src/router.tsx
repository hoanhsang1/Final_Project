import { createBrowserRouter, Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import LoginPage from './pages/LoginPage/LoginPage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import RolePreviewPage from './pages/RolePreviewPage/RolePreviewPage';

/**
 * Bảng route dùng chung cho app thật (`router`) và cho test (`createMemoryRouter`).
 * Tách riêng để test chạy đúng trên chính bảng route đang chạy thật.
 */
export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/dang-nhap" replace /> },
  { path: '/dang-nhap', element: <LoginPage /> },
  { path: '/dang-ky', element: <RegisterPage /> },
  { path: '/xem-thu/:vaiTro', element: <RolePreviewPage /> },
  { path: '*', element: <NotFoundPage /> },
];

export const router = createBrowserRouter(routes);
