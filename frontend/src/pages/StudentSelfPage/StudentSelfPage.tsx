import {
  Badge,
  Banner,
  Button,
  MetadataList,
  MetadataListItem,
  Stack,
} from '@astryxdesign/core';
import type { BadgeVariant } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import DetailSection from '../../components/DetailSection/DetailSection';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { canViewStudentSelf } from '../../features/auth/permissions';
import { formatDate, formatDateTime, labelOf } from '../../features/sprint4/labels';
import {
  fetchStudentSelf,
  isForbiddenError,
  sprint4ErrorMessage,
} from '../../features/sprint4/sprint4Api';
import { MSG_SELF } from '../../features/sprint4/sprint4Messages';
import { useAuthStore } from '../../stores/authStore';

const STUDENT_STATUS_LABEL: Record<string, string> = {
  active: MSG_SELF.STUDENT_ACTIVE,
  inactive: MSG_SELF.STUDENT_INACTIVE,
  suspended: MSG_SELF.STUDENT_SUSPENDED,
};

const STUDENT_STATUS_BADGE: Record<string, BadgeVariant> = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'warning',
};

/**
 * Hồ sơ của chính học sinh (`/dao-tao/hoc-sinh/cua-toi`) — chỉ đọc.
 *
 * Gọi `/api/students/me` qua wrapper `fetchStudentSelf`; KHÔNG gọi
 * `/api/students/{id}` hay danh sách quản lý. Gate là `backendRoles` vì JWT
 * TEACHER và STUDENT có chung self-permission.
 * 5 state: forbidden / loading / error(+retry) / empty / success.
 */
export default function StudentSelfPage() {
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const canView = canViewStudentSelf({ backendRoles, permissions });

  const selfQuery = useQuery({
    queryKey: ['student-self'],
    queryFn: fetchStudentSelf,
    enabled: canView,
  });

  if (!canView) return <ForbiddenNotice />;
  if (selfQuery.isLoading) return <PageLoading />;

  if (selfQuery.isError) {
    if (isForbiddenError(selfQuery.error)) return <ForbiddenNotice />;
    return (
      <Banner
        status="error"
        title={MSG_SELF.STUDENT_LOAD_ERROR}
        description={sprint4ErrorMessage(selfQuery.error)}
        collapsible={false}
        role="alert"
        endContent={
          <Button
            variant="secondary"
            size="sm"
            label={MSG_SELF.RETRY}
            onClick={() => void selfQuery.refetch()}
          />
        }
      />
    );
  }

  const student = selfQuery.data;
  if (!student) {
    return <EmptyState description={MSG_SELF.STUDENT_PROFILE_EMPTY} />;
  }

  const currentClass = student.classCode || student.className || student.classId || '—';

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader title={MSG_SELF.PROFILE_STUDENT} subtitle={MSG_SELF.MY_PROFILE_HINT} />
      <DetailSection title={MSG_SELF.PROFILE_DETAILS}>
        <MetadataList columns="multi" label={{ position: 'start', width: 170 }}>
          <MetadataListItem label={MSG_SELF.STUDENT_CODE}>
            {student.studentCode || '—'}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.FULL_NAME}>
            {student.fullName || '—'}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.DATE_OF_BIRTH}>
            {formatDate(student.dateOfBirth)}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.EMAIL}>{student.email || '—'}</MetadataListItem>
          <MetadataListItem label={MSG_SELF.PHONE}>{student.phone || '—'}</MetadataListItem>
          <MetadataListItem label={MSG_SELF.STATUS}>
            <Badge
              variant={STUDENT_STATUS_BADGE[student.status] ?? 'neutral'}
              label={labelOf(STUDENT_STATUS_LABEL, student.status)}
            />
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.CURRENT_CLASS}>{currentClass}</MetadataListItem>
          <MetadataListItem label={MSG_SELF.ACCOUNT}>
            {student.accountUsername || '—'}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.CREATED_AT}>
            {formatDate(student.createdAt)}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.UPDATED_AT}>
            {formatDateTime(student.updatedAt)}
          </MetadataListItem>
        </MetadataList>
      </DetailSection>
    </Stack>
  );
}
