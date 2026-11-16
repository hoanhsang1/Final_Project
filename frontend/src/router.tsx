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
import PeopleEditGuard from './components/PeopleEditGuard/PeopleEditGuard';
import RouteErrorBoundary from './components/RouteErrorBoundary/RouteErrorBoundary';
import SessionWatcher from './components/SessionWatcher/SessionWatcher';
import LoginPage from './pages/LoginPage/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage/ChangePasswordPage';
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
const StudentsPage = lazy(() => import('./pages/StudentsPage/StudentsPage'));
const StaffPage = lazy(() => import('./pages/StaffPage/StaffPage'));
const TransferPage = lazy(() => import('./pages/TransferPage/TransferPage'));
const StudentPortalPage = lazy(() => import('./pages/StudentPortalPage/StudentPortalPage'));
const DelegationPage = lazy(() => import('./pages/DelegationPage/DelegationPage'));
const MyDelegationsPage = lazy(() => import('./pages/MyDelegationsPage/MyDelegationsPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage/SchedulePage'));
const MySchedulePage = lazy(() => import('./pages/MySchedulePage/MySchedulePage'));
const FacilityPage = lazy(() => import('./pages/FacilityPage/FacilityPage'));

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
    // Lưới an toàn cho toàn app: thay màn "Unexpected Application Error!" mặc định.
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to="/dang-nhap" replace /> },
      { path: 'dang-nhap', element: <LoginPage />, handle: { title: 'Đăng nhập' } },
      {
        path: 'doi-mat-khau',
        element: <ChangePasswordPage />,
        handle: { title: 'Đổi mật khẩu' },
      },
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
        errorElement: <RouteErrorBoundary />,
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
        errorElement: <RouteErrorBoundary />,
        handle: { title: 'Khu vực tổ chức' },
        children: [
          { index: true, element: <DepartmentsPage />, handle: { title: 'Phòng ban' } },
          { path: 'chuc-vu', element: <PositionsPage />, handle: { title: 'Chức vụ' } },
          {
            path: 'uy-quyen',
            element: <DelegationPage />,
            handle: { title: 'Tổng quản lý & ủy quyền' },
          },
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
        errorElement: <RouteErrorBoundary />,
        handle: { title: 'Đào tạo' },
        children: [
          { index: true, element: <Navigate to="giao-vien" replace /> },
          { path: 'nhan-su', element: <StaffPage />, handle: { title: 'Nhân sự' } },
          {
            path: 'chuyen-phong',
            element: <TransferPage />,
            handle: { title: 'Chuyển phòng ban' },
          },
          {
            path: 'chuc-vu',
            element: (
              <PeopleEditGuard>
                <PositionsPage />
              </PeopleEditGuard>
            ),
            handle: { title: 'Chức vụ' },
          },
          { path: 'giao-vien', element: <TeachersPage />, handle: { title: 'Giáo viên' } },
          {
            path: 'giao-vien/:id',
            element: <TeacherDetailPage />,
            handle: { title: 'Chi tiết giáo viên' },
          },
          { path: 'lop-hoc', element: <ClassesPage />, handle: { title: 'Lớp học' } },
          { path: 'lop-hoc/:id', element: <ClassDetailPage />, handle: { title: 'Chi tiết lớp học' } },
          { path: 'sinh-vien', element: <StudentsPage />, handle: { title: 'Sinh viên' } },
          { path: 'lich-hoc', element: <SchedulePage />, handle: { title: 'Lịch học' } },
          {
            path: 'lich-cua-toi',
            element: <MySchedulePage />,
            handle: { title: 'Lịch của tôi' },
          },
          {
            path: 'co-so-vat-chat',
            element: <FacilityPage />,
            handle: { title: 'Cơ sở vật chất' },
          },
        ],
      },
      {
        // Tổng quản lý (và mọi nhân sự) tự xem quyền được ủy quyền cho mình.
        path: 'uy-quyen',
        element: <MyDelegationsPage />,
        handle: { title: 'Quyền được ủy quyền' },
      },
      {
        // Quy tắc 12 — cổng SELF riêng của sinh viên, tách khỏi khu vực đào tạo.
        path: 'hoc-sinh',
        element: <StudentPortalPage />,
        handle: { title: 'Cổng sinh viên' },
      },
      {
        // Lịch của chính mình — dùng được cho cả giáo viên và sinh viên (SELF).
        path: 'lich-cua-toi',
        element: <MySchedulePage />,
        handle: { title: 'Lịch của tôi' },
      },
      { path: '*', element: <NotFoundPage />, handle: { title: 'Không tìm thấy trang' } },
    ],
  },
];

export const router = createBrowserRouter(routes);
