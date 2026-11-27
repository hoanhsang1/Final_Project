import {
  Badge,
  Banner,
  Button,
  HStack,
  MetadataList,
  MetadataListItem,
  Stack,
} from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import DetailSection from '../../components/DetailSection/DetailSection';
import EmptyState from '../../components/EmptyState/EmptyState';
import { canViewTeacherSelf } from '../../features/auth/permissions';
import {
  CONTRACT_TYPE_LABEL,
  TEACHING_STATUS_BADGE,
  TEACHING_STATUS_LABEL,
  formatDate,
  formatDateTime,
  labelOf,
} from '../../features/sprint4/labels';
import {
  fetchTeacherSelf,
  isForbiddenError,
  sprint4ErrorMessage,
} from '../../features/sprint4/sprint4Api';
import { MSG_SELF } from '../../features/sprint4/sprint4Messages';
import { useAuthStore } from '../../stores/authStore';

/**
 * Hồ sơ của chính giáo viên (`/dao-tao/giao-vien/cua-toi`) — chỉ đọc.
 *
 * Gọi `/api/teachers/me` qua wrapper `fetchTeacherSelf`; KHÔNG gọi
 * `/api/teachers/{userId}` hay màn sửa hồ sơ. Gate là `backendRoles` vì JWT
 * TEACHER và STUDENT có chung self-permission.
 * 5 state: forbidden / loading / error(+retry) / empty / success.
 */
export default function TeacherSelfPage() {
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const canView = canViewTeacherSelf({ backendRoles, permissions });

  const selfQuery = useQuery({
    queryKey: ['teacher-self'],
    queryFn: fetchTeacherSelf,
    enabled: canView,
  });

  if (!canView) return <ForbiddenNotice />;
  if (selfQuery.isLoading) return <PageLoading />;

  if (selfQuery.isError) {
    if (isForbiddenError(selfQuery.error)) return <ForbiddenNotice />;
    return (
      <Banner
        status="error"
        title={MSG_SELF.TEACHER_LOAD_ERROR}
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

  const teacher = selfQuery.data;
  if (!teacher) {
    return <EmptyState description={MSG_SELF.TEACHER_PROFILE_EMPTY} />;
  }

  const specialties = teacher.specialties ?? [];
  const classCount = teacher.classCount ?? teacher.classes?.length ?? 0;

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader title={MSG_SELF.PROFILE_TEACHER} subtitle={MSG_SELF.MY_PROFILE_HINT} />
      <DetailSection title={MSG_SELF.PROFILE_DETAILS}>
        <MetadataList columns="multi" label={{ position: 'start', width: 170 }}>
          <MetadataListItem label={MSG_SELF.STAFF_CODE}>
            {teacher.staffCode || '—'}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.FULL_NAME}>
            {teacher.fullName || '—'}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.EMAIL}>{teacher.email || '—'}</MetadataListItem>
          <MetadataListItem label={MSG_SELF.PHONE}>{teacher.phone || '—'}</MetadataListItem>
          <MetadataListItem label={MSG_SELF.UNIT}>{teacher.departmentId || '—'}</MetadataListItem>
          <MetadataListItem label={MSG_SELF.SPECIALTY}>
            {specialties.length > 0 ? (
              <HStack gap={2} wrap="wrap">
                {specialties.map((specialty) => (
                  <Badge key={specialty.id} variant="neutral" label={specialty.name} />
                ))}
              </HStack>
            ) : (
              '—'
            )}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.CONTRACT_TYPE}>
            {labelOf(CONTRACT_TYPE_LABEL, teacher.contractType)}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.TEACHING_STATUS}>
            {teacher.teachingStatus ? (
              <Badge
                variant={TEACHING_STATUS_BADGE[teacher.teachingStatus] ?? 'neutral'}
                label={labelOf(TEACHING_STATUS_LABEL, teacher.teachingStatus)}
              />
            ) : (
              '—'
            )}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.CLASS_COUNT}>{classCount}</MetadataListItem>
          <MetadataListItem label={MSG_SELF.CREATED_AT}>
            {formatDate(teacher.createdAt)}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.UPDATED_AT}>
            {formatDateTime(teacher.updatedAt)}
          </MetadataListItem>
        </MetadataList>
      </DetailSection>
    </Stack>
  );
}
