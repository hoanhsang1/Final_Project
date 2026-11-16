import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/layouts/app-shell'
import { SessionWatcher } from '@/layouts/session-watcher'
import { BootSplash, GuestOnly, LandingRedirect, PermissionGuard, RequireAuth, WorkspaceGuard } from '@/routes/guards'
import { NotFoundPage } from '@/routes/not-found-page'
import { PlannedPage } from '@/routes/planned-page'
import { LoginPage } from '@/features/auth/pages/login-page'
import { ChangePasswordPage } from '@/features/auth/pages/change-password-page'
import { ProfilePage } from '@/features/auth/pages/profile-page'
import { PublicPlannedPage } from '@/features/auth/pages/public-planned-page'
import { OwnerDashboard } from '@/features/organization/pages/owner-dashboard'
import { DepartmentsPage } from '@/features/organization/pages/departments-page'
import { DepartmentDetailPage } from '@/features/organization/pages/department-detail-page'
import { EmployeesPage } from '@/features/organization/pages/employees-page'
import { PlatformDashboard } from '@/features/platform/pages/platform-dashboard'
import { OrganizationsPage } from '@/features/platform/pages/organizations-page'
import { PERM } from '@/lib/permissions'
import { WORKSPACES } from '@/lib/nav'

/** Mọi màn hình đánh dấu planned trong cấu hình điều hướng đều có route giữ chỗ. */
const plannedRoutes = WORKSPACES.flatMap((workspace) =>
  workspace.groups.flatMap((group) =>
    group.items
      .filter((item) => item.status !== 'ready')
      .map((item) => (
        <Route
          key={`${workspace.id}-${item.id}`}
          path={item.to}
          element={
            <WorkspaceGuard workspaceId={workspace.id}>
              <PlannedPage item={item} workspace={workspace} />
            </WorkspaceGuard>
          }
        />
      )),
  ),
)

export function App() {
  return (
    <>
      <SessionWatcher />
      <Routes>
        <Route path="/" element={<LandingRedirect />} />

        {/* Công khai */}
        <Route
          path="/dang-nhap"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route path="/dang-ky" element={<PublicPlannedPage screen="dang-ky" />} />
        <Route path="/quen-mat-khau" element={<PublicPlannedPage screen="quen-mat-khau" />} />
        <Route path="/dat-lai-mat-khau" element={<PublicPlannedPage screen="dat-lai-mat-khau" />} />

        {/* Đổi mật khẩu: vẫn cần đăng nhập nhưng không dùng shell để tránh đi vòng. */}
        <Route
          path="/doi-mat-khau"
          element={
            <RequireAuth>
              <ChangePasswordPage />
            </RequireAuth>
          }
        />

        {/* Khu vực đã đăng nhập */}
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          {/* Nền tảng */}
          <Route
            path="/quan-tri"
            element={
              <WorkspaceGuard workspaceId="platform">
                <PlatformDashboard />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/quan-tri/to-chuc"
            element={
              <WorkspaceGuard workspaceId="platform">
                <OrganizationsPage />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/quan-tri/to-chuc/cho-duyet"
            element={
              <WorkspaceGuard workspaceId="platform">
                <OrganizationsPage onlyPending />
              </WorkspaceGuard>
            }
          />

          {/* Tổ chức */}
          <Route
            path="/to-chuc"
            element={
              <WorkspaceGuard workspaceId="organization">
                <OwnerDashboard />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/to-chuc/phong-ban"
            element={
              <WorkspaceGuard workspaceId="organization">
                <DepartmentsPage />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/to-chuc/phong-ban/:id"
            element={
              <WorkspaceGuard workspaceId="organization">
                <DepartmentDetailPage />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/to-chuc/nhan-su"
            element={
              <WorkspaceGuard workspaceId="organization">
                <PermissionGuard permission={PERM.employeeView}>
                  <EmployeesPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />

          {/* Đào tạo: màn hình gốc chuyển tới mục đầu tiên */}
          <Route
            path="/dao-tao"
            element={
              <WorkspaceGuard workspaceId="academic">
                <Navigate to="/dao-tao/giao-vien" replace />
              </WorkspaceGuard>
            }
          />

          {/* Cá nhân */}
          <Route
            path="/ho-so"
            element={
              <WorkspaceGuard workspaceId="self">
                <ProfilePage />
              </WorkspaceGuard>
            }
          />
          <Route path="/dang-nhap-lai" element={<BootSplash />} />

          {plannedRoutes}

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
