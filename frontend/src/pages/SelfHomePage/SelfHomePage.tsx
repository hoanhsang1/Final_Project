import { Stack, Text, VStack } from '@astryxdesign/core';
import { AppLink } from '../../components/AppLink/AppLink';
import DetailSection from '../../components/DetailSection/DetailSection';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import { canViewStudentSelf, canViewTeacherSelf } from '../../features/auth/permissions';
import { MSG_SCHEDULE } from '../../features/schedule/scheduleMessages';
import { MSG_SELF } from '../../features/sprint4/sprint4Messages';
import { useAuthStore } from '../../stores/authStore';

/**
 * Đích mặc định của user self-only tại `/dao-tao/trang-ca-nhan`.
 *
 * Màn điều hướng thuần: KHÔNG gọi API, chỉ đọc vai trò từ phiên để dẫn tới
 * hồ sơ / lớp của mình và lịch cá nhân. TEACHER và STUDENT có chung quyền
 * self-view nên chỉ `backendRoles` được dùng để chọn đường dẫn.
 */
export default function SelfHomePage() {
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const session = { backendRoles, permissions };
  const isTeacher = canViewTeacherSelf(session);
  const isStudent = canViewStudentSelf(session);

  if (!isTeacher && !isStudent) return <ForbiddenNotice />;

  const profilePath = isTeacher
    ? '/dao-tao/giao-vien/cua-toi'
    : '/dao-tao/hoc-sinh/cua-toi';
  const classesPath = isTeacher
    ? '/dao-tao/lop-hoc-cua-toi'
    : '/dao-tao/hoc-sinh/lop-cua-toi';

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader title={MSG_SELF.TITLE_HOME} subtitle={MSG_SELF.HOME_HINT} />
      <DetailSection title={MSG_SELF.MY_PROFILE}>
        <Stack direction="vertical" gap={3}>
          <VStack gap={0.5}>
            <AppLink to={profilePath} weight="medium">
              {MSG_SELF.OPEN_PROFILE}
            </AppLink>
            <Text type="body" color="secondary">
              {MSG_SELF.MY_PROFILE_HINT}
            </Text>
          </VStack>
          <VStack gap={0.5}>
            <AppLink to={classesPath} weight="medium">
              {MSG_SELF.OPEN_CLASSES}
            </AppLink>
            <Text type="body" color="secondary">
              {MSG_SELF.MY_CLASSES_HINT}
            </Text>
          </VStack>
          <VStack gap={0.5}>
            <AppLink to="/dao-tao/lich-cua-toi" weight="medium">
              {MSG_SCHEDULE.MENU_MY_SCHEDULE}
            </AppLink>
          </VStack>
        </Stack>
      </DetailSection>
    </Stack>
  );
}
