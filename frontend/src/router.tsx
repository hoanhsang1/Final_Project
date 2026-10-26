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

/**
 * 9 màn console tách chunk riêng bằng `React.lazy`.
 *
 * Trước đây toàn bộ 13 màn nằm chung một chunk → mở trang đăng nhập cũng tải
 * đủ mã console. Sau khi tách, cách đo: cộng gzip của các file nằm trong
 * `modulepreload` của `dist/index.html` (payload chính) rồi so với phần còn
 * lại của `dist/assets` (phải tải theo yêu cầu). Phần tách ra chủ yếu là antd
 * `Table` + màn `AuditLogPage` — chỉ tải khi vào đúng màn đó.
 *
 * Màn đăng nhập / đăng ký / xem thử / 404 giữ **static**: chúng là cửa vào đầu
 * tiên nên nạp sẵn trong payload chính — tách `lazy` chỉ thêm 1 nhịp waterfall
 * mà vẫn phải tải antd `Input`/`Form` mà trang đăng nhập dùng. `react-router`
 * cũng cần phần tử đồng bộ cho các test render `routes` (`router.test`,
 * `LoginPage.test`, `RolePreviewPage.test`).
 */
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

/** Màn chờ trong lúc tải chunk của route — chữ kết bằng "…" (quy ước loading). */
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
      <DocumentTitle />
      {/* Route tách chunk → treo tại đây trong lúc tải (không thấy "màn trắng"). */}
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
        // Khu vực quản trị (Sprint 2) — guard chặn TRƯỚC khi màn con gọi API.
        //
        // MỖI nhóm chức năng có đúng 1 màn danh sách, từ đó bấm 1 dòng → màn
        // chi tiết `/:id` (đặc tả mục 1). `/quan-tri` là màn Tổng quan — "page
        // chung" của console, thay cho `Navigate` redirect như trước (`Q-34`).
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
          // Phải khai TRƯỚC `to-chuc/:id` — react-router v6 sắp xếp theo độ
          // cụ thể nên `tat-ca` không bị nuốt bởi `:id`.
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
      { path: '*', element: <NotFoundPage />, handle: { title: 'Không tìm thấy trang' } },
    ],
  },
];

export const router = createBrowserRouter(routes);
