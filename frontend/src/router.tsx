import { Spin, Typography, theme } from 'antd';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import AdminConsoleLayout from './components/AdminConsoleLayout/AdminConsoleLayout';
import AdminGuard from './components/AdminGuard/AdminGuard';
import DocumentTitle from './components/DocumentTitle/DocumentTitle';
import OwnerConsoleLayout from './components/OwnerConsoleLayout/OwnerConsoleLayout';
import OwnerGuard from './components/OwnerGuard/OwnerGuard';
import AcademicConsoleLayout from './components/AcademicConsoleLayout/AcademicConsoleLayout';
import AcademicGuard from './components/AcademicGuard/AcademicGuard';
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
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage/DepartmentsPage'));
const DepartmentDetailPage = lazy(
  () => import('./pages/DepartmentDetailPage/DepartmentDetailPage'),
);
const PositionsPage = lazy(() => import('./pages/PositionsPage/PositionsPage'));
const TeachersPage = lazy(() => import('./pages/TeachersPage/TeachersPage'));
const TeacherDetailPage = lazy(() => import('./pages/TeacherDetailPage/TeacherDetailPage'));
const ClassesPage = lazy(() => import('./pages/ClassesPage/ClassesPage'));
const ClassDetailPage = lazy(() => import('./pages/ClassDetailPage/ClassDetailPage'));

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
const PositionManagementPage = lazy(
  () => import('./pages/PositionManagementPage/PositionManagementPage'),
);
const MemberManagementPage = lazy(
  () => import('./pages/MemberManagementPage/MemberManagementPage'),
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
        // Hai bước của luồng quên mật khẩu: xin liên kết qua email → đặt mật khẩu
        // mới bằng token trong liên kết (`?token=…`).
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
        // Khu vực của chủ tổ chức (Sprint 3) — song song với `/quan-tri` nhưng
        // dành cho role `OWNER`, dùng chung khung `ConsoleShell`.
        //
        // Thứ tự route con: `chuc-vu` phải khai TRƯỚC `phong-ban/:id` để không bị
        // nuốt; màn chi tiết phòng ban nằm dưới `phong-ban/:id`.
        path: 'to-chuc',
        element: (
          <OwnerGuard>
            <OwnerConsoleLayout />
          </OwnerGuard>
        ),
        handle: { title: 'Khu vực tổ chức' },
        children: [
          { index: true, element: <DepartmentsPage />, handle: { title: 'Phòng ban' } },
          { path: 'chuc-vu', element: <PositionsPage />, handle: { title: 'Chức vụ' } },
          {
            path: 'phong-ban/:id',
            element: <DepartmentDetailPage />,
            handle: { title: 'Chi tiết phòng ban' },
          },
        ],
      },
      {
        // Sprint 4 (option B): khu vực Đào tạo — quyền theo PEOPLE_*/CLASS_* (và OWNER).
        // `/to-chuc` Owner Console giữ nguyên.
        path: 'dao-tao',
        element: (
          <AcademicGuard>
            <AcademicConsoleLayout />
          </AcademicGuard>
        ),
        handle: { title: 'Đào tạo' },
        children: [
          { index: true, element: <Navigate to="giao-vien" replace /> },
          { path: 'giao-vien', element: <TeachersPage />, handle: { title: 'Giáo viên' } },
          {
            path: 'giao-vien/:id',
            element: <TeacherDetailPage />,
            handle: { title: 'Chi tiết giáo viên' },
          },
          { path: 'lop-hoc', element: <ClassesPage />, handle: { title: 'Lớp học' } },
          { path: 'lop-hoc/:id', element: <ClassDetailPage />, handle: { title: 'Chi tiết lớp học' } },
        ],
      },
      { path: '*', element: <NotFoundPage />, handle: { title: 'Không tìm thấy trang' } },
    ],
  },
];

export const router = createBrowserRouter(routes);
