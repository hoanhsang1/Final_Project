import { Spin, Typography, theme } from 'antd';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import AdminConsoleLayout from './components/AdminConsoleLayout/AdminConsoleLayout';
import AdminGuard from './components/AdminGuard/AdminGuard';
import DocumentTitle from './components/DocumentTitle/DocumentTitle';
import SessionWatcher from './components/SessionWatcher/SessionWatcher';
import LoginPage from './pages/LoginPage/LoginPage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage';
import RolePreviewPage from './pages/RolePreviewPage/RolePreviewPage';

const { Text } = Typography;

const AccountDetailPage = lazy(() => import('./pages/AccountDetailPage/AccountDetailPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage/AccountsPage'));
const AllOrganizationsPage = lazy(() => import('./pages/AllOrganizationsPage/AllOrganizationsPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage/AuditLogPage'));
const ModuleCatalogPage = lazy(() => import('./pages/ModuleCatalogPage/ModuleCatalogPage'));
const OrganizationAuditPage = lazy(
  () => import('./pages/OrganizationAuditPage/OrganizationAuditPage'),
);
const OrganizationDetailPage = lazy(
  () => import('./pages/OrganizationDetailPage/OrganizationDetailPage'),
);
const OverviewPage = lazy(() => import('./pages/OverviewPage/OverviewPage'));
const PendingOrganizationsPage = lazy(
  () => import('./pages/PendingOrganizationsPage/PendingOrganizationsPage'),
);

// Phân hệ Quản lý tổ chức, Sinh viên, Lớp học & Phòng ban
const OrganizationPortalLayout = lazy(
  () => import('./components/OrganizationPortalLayout/OrganizationPortalLayout'),
);
const StudentManagementPage = lazy(
  () => import('./pages/StudentManagementPage/StudentManagementPage'),
);
const ClassManagementPage = lazy(
  () => import('./pages/ClassManagementPage/ClassManagementPage'),
);
const ClassDetailPage = lazy(
  () => import('./pages/ClassDetailPage/ClassDetailPage'),
);
const DepartmentManagementPage = lazy(
  () => import('./pages/DepartmentManagementPage/DepartmentManagementPage'),
);

function RouteFallback() {
  const { token } = theme.useToken();
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: token.paddingSM,
        paddingBlock: token.paddingLG,
      }}
    >
      <Spin />
      <Text type="secondary">Đang tải màn hình…</Text>
    </div>
  );
}

function RootLayout() {
  return (
    <>
      <DocumentTitle />
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
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
      { path: 'dang-nhap', element: <LoginPage />, handle: { title: 'Đăng nhập' } },
      { path: 'dang-ky', element: <RegisterPage />, handle: { title: 'Đăng ký tổ chức' } },
      {
        path: 'quen-mat-khau',
        element: <ForgotPasswordPage />,
        handle: { title: 'Quên mật khẩu' },
      },
      {
        path: 'dat-lai-mat-khau',
        element: <ResetPasswordPage />,
        handle: { title: 'Đặt lại mật khẩu' },
      },
      {
        path: 'xem-thu/:vaiTro',
        element: <RolePreviewPage />,
        handle: { title: 'Xem thử vai trò' },
      },
      {
        path: 'quan-tri',
        element: (
          <AdminGuard>
            <AdminConsoleLayout />
          </AdminGuard>
        ),
        handle: { title: 'Khu vực quản trị' },
        children: [
          { index: true, element: <OverviewPage />, handle: { title: 'Tổng quan' } },
          {
            path: 'to-chuc',
            element: <PendingOrganizationsPage />,
            handle: { title: 'Tổ chức chờ duyệt' },
          },
          {
            path: 'to-chuc/tat-ca',
            element: <AllOrganizationsPage />,
            handle: { title: 'Tất cả tổ chức' },
          },
          {
            path: 'to-chuc/:id',
            element: <OrganizationDetailPage />,
            handle: { title: 'Chi tiết tổ chức' },
          },
          {
            path: 'to-chuc/:id/lich-su',
            element: <OrganizationAuditPage />,
            handle: { title: 'Lịch sử duyệt tổ chức' },
          },
          {
            path: 'module',
            element: <ModuleCatalogPage />,
            handle: { title: 'Danh mục module' },
          },
          { path: 'tai-khoan', element: <AccountsPage />, handle: { title: 'Quản lý tài khoản' } },
          {
            path: 'tai-khoan/:id',
            element: <AccountDetailPage />,
            handle: { title: 'Chi tiết tài khoản' },
          },
          { path: 'nhat-ky', element: <AuditLogPage />, handle: { title: 'Nhật ký hệ thống' } },
        ],
      },
      {
        // Cổng quản lý sinh viên & lớp học dành cho OWNER, MANAGER, STAFF
        path: 'to-chuc',
        element: <OrganizationPortalLayout />,
        handle: { title: 'Cổng quản lý tổ chức' },
        children: [
          { index: true, element: <Navigate to="/to-chuc/sinh-vien" replace /> },
          {
            path: 'sinh-vien',
            element: <StudentManagementPage />,
            handle: { title: 'Quản lý Sinh viên' },
          },
          {
            path: 'lop-hoc',
            element: <ClassManagementPage />,
            handle: { title: 'Quản lý Lớp học' },
          },
          {
            path: 'lop-hoc/:id',
            element: <ClassDetailPage />,
            handle: { title: 'Chi tiết Lớp học' },
          },
          {
            path: 'phong-ban',
            element: <DepartmentManagementPage />,
            handle: { title: 'Quản lý Phòng ban & Module' },
          },
        ],
      },
      { path: '*', element: <NotFoundPage />, handle: { title: 'Không tìm thấy trang' } },
    ],
  },
];

export const router = createBrowserRouter(routes);
