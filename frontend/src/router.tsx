import { Spinner, Text } from '@astryxdesign/core';
import { lazy, Suspense } from 'react';
import type { PropsWithChildren } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import AcademicConsoleLayout from './components/AcademicConsoleLayout/AcademicConsoleLayout';
import AcademicGuard from './components/AcademicGuard/AcademicGuard';
import AdminConsoleLayout from './components/AdminConsoleLayout/AdminConsoleLayout';
import AdminGuard from './components/AdminGuard/AdminGuard';
import DocumentTitle from './components/DocumentTitle/DocumentTitle';
import FacilityGuard from './components/FacilityGuard/FacilityGuard';
import { landingPathFor } from './features/auth/landing';
import { isOwnerRole, canViewTeachers } from './features/auth/permissions';
import { getAcademicMenu } from './features/sprint4/academicMenu';
import { MSG_SELF } from './features/sprint4/sprint4Messages';
import OwnerConsoleLayout from './components/OwnerConsoleLayout/OwnerConsoleLayout';
import OwnerGuard from './components/OwnerGuard/OwnerGuard';
import SessionWatcher from './components/SessionWatcher/SessionWatcher';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage';
import LoginPage from './pages/LoginPage/LoginPage';
import NotFoundPage from './pages/NotFoundPage/NotFoundPage';
import RegisterPage from './pages/RegisterPage/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage';
import RolePreviewPage from './pages/RolePreviewPage/RolePreviewPage';
import { useAuthStore } from './stores/authStore';

/**
 * 9 màn console tách chunk riêng bằng `React.lazy`.
 *
 * Trước đây toàn bộ 13 màn nằm chung một chunk → mở trang đăng nhập cũng tải
 * đủ mã console. Sau khi tách, cách đo: cộng gzip của các file nằm trong
 * `modulepreload` của `dist/index.html` (payload chính) rồi so với phần còn
 * lại của `dist/assets` (phải tải theo yêu cầu). Phần tách ra chủ yếu là các
 * màn/bảng dữ liệu nặng — chỉ tải khi vào đúng màn đó.
 *
 * Màn đăng nhập / đăng ký / xem thử / 404 giữ **static**: chúng là cửa vào đầu
 * tiên nên nạp sẵn trong payload chính — tách `lazy` chỉ thêm 1 nhịp waterfall
 * không cần thiết. `react-router`
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
const StudentDetailPage = lazy(() => import('./pages/StudentDetailPage/StudentDetailPage'));
const AdminModulesPage = lazy(() => import('./pages/AdminModulesPage/AdminModulesPage'));
const OrganizationModulesPage = lazy(
  () => import('./pages/OrganizationModulesPage/OrganizationModulesPage'),
);
const SchedulePage = lazy(() => import('./pages/SchedulePage/SchedulePage'));
const AutoSchedulePage = lazy(() => import('./pages/AutoSchedulePage/AutoSchedulePage'));
const ImpactsPage = lazy(() => import('./pages/ImpactsPage/ImpactsPage'));
const MySchedulePage = lazy(() => import('./pages/MySchedulePage/MySchedulePage'));
const RoomsPage = lazy(() => import('./pages/RoomsPage/RoomsPage'));
const FacilityIssuesPage = lazy(() => import('./pages/FacilityIssuesPage/FacilityIssuesPage'));
const SelfHomePage = lazy(() => import('./pages/SelfHomePage/SelfHomePage'));
const TeacherSelfPage = lazy(() => import('./pages/TeacherSelfPage/TeacherSelfPage'));
const TeacherMyClassesPage = lazy(
  () => import('./pages/TeacherMyClassesPage/TeacherMyClassesPage'),
);
const MyClassStudentsPage = lazy(() => import('./pages/MyClassStudentsPage/MyClassStudentsPage'));
const StudentSelfPage = lazy(() => import('./pages/StudentSelfPage/StudentSelfPage'));
const StudentMyClassesPage = lazy(
  () => import('./pages/StudentMyClassesPage/StudentMyClassesPage'),
);
const StudentClassDetailPage = lazy(
  () => import('./pages/StudentClassDetailPage/StudentClassDetailPage'),
);

/** Màn chờ trong lúc tải chunk của route — chữ kết bằng "…" (quy ước loading). */
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-3, 12px)',
        paddingBlock: 'var(--spacing-6, 24px)',
      }}
    >
      <Spinner size="md" aria-label="Đang tải" />
      <Text type="body" color="secondary">
        Đang tải màn hình…
      </Text>
    </div>
  );
}

/**
 * Index của `/dao-tao`: `/dao-tao` là cổng, không phải màn — phải tiếp tục tới
 * màn đầu tiên có trong menu thực tế (STAFF/class.view → `lop-hoc`; self-only →
 * `trang-ca-nhan`). Giữ ưu tiên `giao-vien` cho OWNER / PEOPLE_VIEW như trước;
  * SUPER_ADMIN thì đi thẳng `/quan-tri` theo `landingPathFor()`.
 * Không gọi API — chỉ đọc phiên từ store.
 */
function AcademicIndexRedirect() {
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const to = landingPathFor({ backendRoles, permissions, role: null });

  if (to === '/dao-tao' || to === '/to-chuc') {
    if (canViewTeachers(isOwnerRole(backendRoles), permissions)) {
      return <Navigate to="/dao-tao/giao-vien" replace />;
    }
    const firstMenuPath = getAcademicMenu(permissions, false, backendRoles)[0]?.path;
    return <Navigate to={firstMenuPath ?? '/dang-nhap'} replace />;
  }
  return <Navigate to={to ?? '/dang-nhap'} replace />;
}

/**
 * `AcademicGuard` nằm trước index nên chặn SUPER_ADMIN (không có permission
 * đào tạo) bằng màn 403 trước khi `AcademicIndexRedirect` kịp chạy. Gate này
 * chỉ xử lý riêng đích `/quan-tri` của admin tại đúng `/dao-tao`; mọi path con
 * khác vẫn đi qua `AcademicGuard` như cũ.
 */
function AcademicAdminIndexGate({ children }: PropsWithChildren) {
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const { pathname } = useLocation();
  const to = landingPathFor({ backendRoles, permissions, role: null });

  if (pathname === '/dao-tao' && to === '/quan-tri') {
    return <Navigate to={to} replace />;
  }
  return <>{children}</>;
}

/** Ánh xạ URL CSVC cũ (dưới `/to-chuc`) sang URL độc lập, giữ nguyên `search`. */
const LEGACY_FACILITY_PATHS: Readonly<Record<string, string>> = {
  '/to-chuc/co-so-vat-chat': '/co-so-vat-chat',
  '/to-chuc/co-so-vat-chat/su-co': '/co-so-vat-chat/su-co',
};

function LegacyFacilityRedirect() {
  const { pathname, search } = useLocation();
  // React Router v6 so khớp route bỏ qua chữ hoa/thường và dấu `/` cuối, nhưng
  // `pathname` vẫn giữ nguyên chuỗi gốc → chuẩn hoá trước khi tra cứu, đề phòng
  // `undefined` trong đích chuyển hướng. `/` được giữ lại thay vì rỗng.
  const normalizedPath = (pathname.replace(/\/+$/, '') || '/').toLowerCase();
  const to = LEGACY_FACILITY_PATHS[normalizedPath] ?? '/co-so-vat-chat';
  return <Navigate to={`${to}${search}`} replace />;
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
          {
            // Module của 1 tổ chức — route con của `to-chuc/:id` nhưng thuộc nhóm
            // module (xem matcher trong `consoleMenu.activeMenuKey`).
            path: 'to-chuc/:id/module',
            element: <AdminModulesPage />,
            handle: { title: 'Module của tổ chức' },
          },
        ],
      },
      {
        // Giữ liên kết/đánh dấu cũ hoạt động: chuyển sang khu vực CSVC độc lập.
        path: 'to-chuc/co-so-vat-chat',
        element: <LegacyFacilityRedirect />,
      },
      {
        path: 'to-chuc/co-so-vat-chat/su-co',
        element: <LegacyFacilityRedirect />,
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
          {
            path: 'module',
            element: <OrganizationModulesPage />,
            handle: { title: 'Module tổ chức' },
          },
        ],
      },
      {
        // Khu vực CSVC độc lập — mở cho OWNER hoặc user có quyền facility/issue
        // (chung ConsoleShell với Owner nhưng menu riêng và FacilityGuard).
        path: 'co-so-vat-chat',
        element: (
          <FacilityGuard>
            <OwnerConsoleLayout variant="facility" />
          </FacilityGuard>
        ),
        handle: { title: 'Cơ sở vật chất' },
        children: [
          { index: true, element: <RoomsPage />, handle: { title: 'Cơ sở vật chất' } },
          {
            path: 'su-co',
            element: <FacilityIssuesPage />,
            handle: { title: 'Sự cố thiết bị' },
          },
        ],
      },
      {
        // Sprint 4 (option B): khu vực Đào tạo — quyền theo PEOPLE_*/CLASS_* (và OWNER).
        // `/to-chuc` Owner Console giữ nguyên.
        path: 'dao-tao',
        element: (
          <AcademicAdminIndexGate>
            <AcademicGuard>
              <AcademicConsoleLayout />
            </AcademicGuard>
          </AcademicAdminIndexGate>
        ),
        handle: { title: 'Đào tạo' },
        children: [
          { index: true, element: <AcademicIndexRedirect /> },
          {
            path: 'trang-ca-nhan',
            element: <SelfHomePage />,
            handle: { title: MSG_SELF.TITLE_HOME },
          },
          { path: 'giao-vien', element: <TeachersPage />, handle: { title: 'Giáo viên' } },
          {
            // Self phải khai TRƯỚC `/giao-vien/:id` để không bị nuốt như một id.
            path: 'giao-vien/cua-toi',
            element: <TeacherSelfPage />,
            handle: { title: MSG_SELF.PROFILE_TEACHER },
          },
          {
            path: 'lop-hoc-cua-toi',
            element: <TeacherMyClassesPage />,
            handle: { title: MSG_SELF.MY_CLASSES },
          },
          {
            path: 'lop-hoc-cua-toi/:id',
            element: <MyClassStudentsPage />,
            handle: { title: MSG_SELF.CLASS_STUDENTS },
          },
          {
            path: 'giao-vien/:id',
            element: <TeacherDetailPage />,
            handle: { title: 'Chi tiết giáo viên' },
          },
          { path: 'lop-hoc', element: <ClassesPage />, handle: { title: 'Lớp học' } },
          { path: 'lop-hoc/:id', element: <ClassDetailPage />, handle: { title: 'Chi tiết lớp học' } },
          { path: 'hoc-sinh', element: <StudentsPage />, handle: { title: 'Học sinh' } },
          {
            // Self phải khai TRƯỚC `/hoc-sinh/:id` để không bị nuốt như một id.
            path: 'hoc-sinh/cua-toi',
            element: <StudentSelfPage />,
            handle: { title: MSG_SELF.PROFILE_STUDENT },
          },
          {
            path: 'hoc-sinh/lop-cua-toi',
            element: <StudentMyClassesPage />,
            handle: { title: MSG_SELF.MY_CLASSES },
          },
          {
            // Phải khai TRƯỚC `/hoc-sinh/:id` để id không nuốt route chi tiết self.
            path: 'hoc-sinh/lop-cua-toi/:id',
            element: <StudentClassDetailPage />,
            handle: { title: MSG_SELF.CLASS_DETAIL_TITLE },
          },
          {
            path: 'hoc-sinh/:id',
            element: <StudentDetailPage />,
            handle: { title: 'Hồ sơ học sinh' },
          },
          { path: 'lich', element: <SchedulePage />, handle: { title: 'Lịch đào tạo' } },
          {
            path: 'tu-dong-xep-lich',
            element: <AutoSchedulePage />,
            handle: { title: 'Tự động xếp lịch' },
          },
          {
            path: 'lich/buoi-bi-anh-huong',
            element: <ImpactsPage />,
            handle: { title: 'Buổi bị ảnh hưởng' },
          },
          {
            path: 'lich-cua-toi',
            element: <MySchedulePage />,
            handle: { title: 'Lịch cá nhân' },
          },
        ],
      },
      { path: '*', element: <NotFoundPage />, handle: { title: 'Không tìm thấy trang' } },
    ],
  },
];

export const router = createBrowserRouter(routes);
