import { Route, Routes } from 'react-router-dom'

import { AppShell } from '@/layouts/app-shell'
import { SessionWatcher } from '@/layouts/session-watcher'
import { BootSplash, GuestOnly, LandingRedirect, PermissionGuard, RequireAuth, WorkspaceGuard } from '@/routes/guards'
import { AcademicLanding } from '@/routes/academic-landing'
import { NotFoundPage } from '@/routes/not-found-page'
import { PlannedPage } from '@/routes/planned-page'
import { LoginPage } from '@/features/auth/pages/login-page'
import { RegisterPage } from '@/features/auth/pages/register-page'
import { ChangePasswordPage } from '@/features/auth/pages/change-password-page'
import { ProfilePage } from '@/features/auth/pages/profile-page'
import { PublicPlannedPage } from '@/features/auth/pages/public-planned-page'
import { OwnerDashboard } from '@/features/organization/pages/owner-dashboard'
import { DepartmentsPage } from '@/features/organization/pages/departments-page'
import { DepartmentDetailPage } from '@/features/organization/pages/department-detail-page'
import { EmployeesPage } from '@/features/organization/pages/employees-page'
import { OrgModulesPage } from '@/features/organization/pages/org-modules-page'
import { PositionsPage } from '@/features/organization/pages/positions-page'
import { PlatformDashboard } from '@/features/platform/pages/platform-dashboard'
import { OrganizationsPage } from '@/features/platform/pages/organizations-page'
import { OrganizationDetailPage } from '@/features/platform/pages/organization-detail-page'
import { AuditLogsPage } from '@/features/platform/pages/audit-logs-page'
import { AccountsPage } from '@/features/platform/pages/accounts-page'
import { ModuleCatalogPage } from '@/features/platform/pages/module-catalog-page'
import { TransfersPage } from '@/features/workflows/pages/transfers-page'
import { ApprovalsPage } from '@/features/workflows/pages/approvals-page'
import { DelegationsPage } from '@/features/workflows/pages/delegations-page'
import { NotificationsPage } from '@/features/workflows/pages/notifications-page'
import { MyDelegationsPage } from '@/features/workflows/pages/my-delegations-page'
import { MyRequestsPage } from '@/features/workflows/pages/my-requests-page'
import { TeachersPage } from '@/features/academic/pages/teachers-page'
import { StudentsPage } from '@/features/academic/pages/students-page'
import { SubjectsPage } from '@/features/academic/pages/subjects-page'
import { CurriculaPage } from '@/features/academic/pages/curricula-page'
import { CurriculumDetailPage } from '@/features/academic/pages/curriculum-detail-page'
import { ClassesPage } from '@/features/academic/pages/classes-page'
import { MyClassesPage } from '@/features/academic/pages/my-classes-page'
import { StudentPortalPage } from '@/features/academic/pages/student-portal-page'
import { SchedulePage } from '@/features/schedule/pages/schedule-page'
import { MySchedulePage } from '@/features/schedule/pages/my-schedule-page'
import { AutoSchedulePage } from '@/features/schedule/pages/auto-schedule-page'
import { ScheduleConfigPage } from '@/features/schedule/pages/schedule-config-page'
import { FacilityPage } from '@/features/facility/pages/facility-page'
import { FacilityIssuesPage } from '@/features/facility/pages/facility-issues-page'
import { BackendDependencyPage } from '@/routes/backend-dependency-page'
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
        <Route
          path="/dang-ky"
          element={
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          }
        />
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
          <Route
            path="/quan-tri/to-chuc/:id"
            element={
              <WorkspaceGuard workspaceId="platform">
                <OrganizationDetailPage />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/quan-tri/nhat-ky"
            element={
              <WorkspaceGuard workspaceId="platform">
                <AuditLogsPage />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/quan-tri/module"
            element={
              <WorkspaceGuard workspaceId="platform">
                <ModuleCatalogPage />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/quan-tri/tai-khoan"
            element={
              <WorkspaceGuard workspaceId="platform">
                <AccountsPage />
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
          <Route
            path="/to-chuc/module"
            element={
              <WorkspaceGuard workspaceId="organization">
                <PermissionGuard permission={PERM.orgModuleToggle}>
                  <OrgModulesPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/to-chuc/chuc-vu"
            element={
              <WorkspaceGuard workspaceId="organization">
                <PermissionGuard anyOf={[PERM.positionView, PERM.positionManage]}>
                  <PositionsPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/to-chuc/chuyen-phong"
            element={
              <WorkspaceGuard workspaceId="organization">
                <TransfersPage />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/to-chuc/uy-quyen"
            element={
              <WorkspaceGuard workspaceId="organization">
                <DelegationsPage />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/to-chuc/nhat-ky"
            element={
              <WorkspaceGuard workspaceId="organization">
                <PermissionGuard permission={PERM.orgAuditView}>
                  <BackendDependencyPage
                    eyebrow="Tổ chức · Nhật ký"
                    title="Nhật ký tổ chức"
                    description="Nhật ký thao tác trong phạm vi tổ chức dành cho chủ tổ chức."
                    missing={[
                      'GET /api/v1/organizations/audit-logs (hiện chỉ SUPER_ADMIN được đọc /api/v1/audit-logs)',
                    ]}
                    available={[{ label: 'Nhật ký hệ thống (quản trị)', to: '/quan-tri/nhat-ky' }]}
                  />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />

          {/* Đào tạo: màn hình gốc chuyển tới mục đầu tiên mà người dùng dùng được */}
          <Route
            path="/dao-tao"
            element={
              <WorkspaceGuard workspaceId="academic">
                <AcademicLanding />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/giao-vien"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard
                  anyOf={[PERM.employeeView, PERM.teacherChangeStatus, PERM.classAssignTeacher]}
                >
                  <TeachersPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/sinh-vien"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard permission={PERM.studentView}>
                  <StudentsPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/mon-hoc"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard anyOf={[PERM.subjectView, PERM.subjectManage]}>
                  <SubjectsPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/chuong-trinh-dao-tao"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard anyOf={[PERM.curriculumView, PERM.curriculumManage]}>
                  <CurriculaPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/chuong-trinh-dao-tao/:id"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard anyOf={[PERM.curriculumView, PERM.curriculumManage]}>
                  <CurriculumDetailPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/lop-hoc"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard anyOf={[PERM.classView, PERM.classCreate]}>
                  <ClassesPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/lop-cua-toi"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard permission={PERM.classSelfView}>
                  <MyClassesPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/lich-hoc"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard permission={PERM.scheduleView}>
                  <SchedulePage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/tu-dong-xep-lich"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard permission={PERM.scheduleCreate}>
                  <AutoSchedulePage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/cau-hinh-lich"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard permission={PERM.scheduleConfig}>
                  <ScheduleConfigPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/diem-danh"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard anyOf={[PERM.scheduleAttendanceMark, PERM.scheduleAttendanceView]}>
                  <BackendDependencyPage
                    eyebrow="Đào tạo · Điểm danh"
                    title="Điểm danh"
                    description="Điểm danh buổi học và báo cáo chuyên cần."
                    missing={[
                      'GET /api/schedules/{sessionId}/attendance',
                      'POST /api/schedules/{sessionId}/attendance',
                      'GET /api/reports/attendance',
                    ]}
                    available={[{ label: 'Lịch học', to: '/dao-tao/lich-hoc' }]}
                  />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/yeu-cau-doi-lich"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard
                  anyOf={[PERM.scheduleChangeRequestCreate, PERM.scheduleChangeRequestApprove]}
                >
                  <BackendDependencyPage
                    eyebrow="Đào tạo · Đổi lịch"
                    title="Yêu cầu đổi lịch"
                    description="Gửi và duyệt yêu cầu đổi lịch buổi học."
                    missing={[
                      'GET /api/schedules/change-requests',
                      'POST /api/schedules/change-requests',
                      'POST /api/schedules/change-requests/{id}/approve',
                    ]}
                    available={[{ label: 'Lịch học', to: '/dao-tao/lich-hoc' }]}
                  />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/co-so-vat-chat"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard anyOf={[PERM.facilityView, PERM.facilityRoomView]}>
                  <FacilityPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/dao-tao/co-so-vat-chat/su-co"
            element={
              <WorkspaceGuard workspaceId="academic">
                <PermissionGuard anyOf={[PERM.facilityIssueReport, PERM.facilityIssueResolve]}>
                  <FacilityIssuesPage />
                </PermissionGuard>
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
          <Route
            path="/viec-cho-duyet"
            element={
              <WorkspaceGuard workspaceId="self">
                <ApprovalsPage />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/thong-bao"
            element={
              <WorkspaceGuard workspaceId="self">
                <NotificationsPage />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/ho-so/yeu-cau"
            element={
              <WorkspaceGuard workspaceId="self">
                <MyRequestsPage />
              </WorkspaceGuard>
            }
          />
          <Route
            path="/lich-cua-toi"
            element={
              <WorkspaceGuard workspaceId="self">
                <PermissionGuard anyOf={[PERM.scheduleSelfView, PERM.scheduleView]}>
                  <MySchedulePage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/sinh-vien"
            element={
              <WorkspaceGuard workspaceId="self">
                <PermissionGuard permission={PERM.studentSelfView}>
                  <StudentPortalPage />
                </PermissionGuard>
              </WorkspaceGuard>
            }
          />
          <Route
            path="/uy-quyen"
            element={
              <WorkspaceGuard workspaceId="self">
                <MyDelegationsPage />
              </WorkspaceGuard>
            }
          />

          {plannedRoutes}

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  )
}
