import {
  Badge,
  Banner,
  Button,
  MetadataList,
  MetadataListItem,
  Stack,
} from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { AppLink } from '../../components/AppLink/AppLink';
import DetailSection from '../../components/DetailSection/DetailSection';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { canViewStudentClasses } from '../../features/auth/permissions';
import {
  CLASS_STATUS_BADGE,
  CLASS_STATUS_LABEL,
  CLOSE_STATE_LABEL,
  formatPeriod,
  labelOf,
} from '../../features/sprint4/labels';
import {
  fetchStudentSelfClasses,
  isForbiddenError,
  sprint4ErrorMessage,
} from '../../features/sprint4/sprint4Api';
import { MSG_SELF } from '../../features/sprint4/sprint4Messages';
import { useAuthStore } from '../../stores/authStore';

/**
 * Chi tiết một lớp của chính học sinh (`/dao-tao/hoc-sinh/lop-cua-toi/:id`) — chỉ đọc.
 *
 * Đọc từ `/api/students/me/classes` rồi tìm theo `id`; KHÔNG gọi
 * `/api/classes/{id}` (BE chỉ cho phép với `student.view`, học sinh không có).
 * Gate: STUDENT **và** `student.self_view` (cả mã legacy lẫn dotted).
 * 5 state: forbidden / loading / error(+retry) / empty / success.
 */
export default function StudentClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const canView = canViewStudentClasses({ backendRoles, permissions });

  const classesQuery = useQuery({
    queryKey: ['student-self-classes'],
    queryFn: fetchStudentSelfClasses,
    enabled: canView,
  });

  if (!canView) return <ForbiddenNotice />;
  if (classesQuery.isLoading) return <PageLoading />;

  if (classesQuery.isError) {
    if (isForbiddenError(classesQuery.error)) return <ForbiddenNotice />;
    return (
      <Banner
        status="error"
        title={MSG_SELF.STUDENT_CLASSES_LOAD_ERROR}
        description={sprint4ErrorMessage(classesQuery.error)}
        collapsible={false}
        role="alert"
        endContent={
          <Button
            variant="secondary"
            size="sm"
            label={MSG_SELF.RETRY}
            onClick={() => void classesQuery.refetch()}
          />
        }
      />
    );
  }

  const classItem = classesQuery.data?.find((item) => item.id === id);
  if (!classItem) {
    return (
      <Stack direction="vertical" gap={4}>
        <PageHeader
          title={MSG_SELF.CLASS_DETAIL_TITLE}
          extra={
            <AppLink to="/dao-tao/hoc-sinh/lop-cua-toi" weight="medium">
              {MSG_SELF.BACK_TO_CLASSES}
            </AppLink>
          }
        />
        <EmptyState description={MSG_SELF.CLASS_DETAIL_EMPTY} />
      </Stack>
    );
  }

  const closeState = labelOf(CLOSE_STATE_LABEL, classItem.closeState);

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title={MSG_SELF.CLASS_DETAIL_TITLE}
        subtitle={MSG_SELF.MY_CLASSES_HINT}
        extra={
          <AppLink to="/dao-tao/hoc-sinh/lop-cua-toi" weight="medium">
            {MSG_SELF.BACK_TO_CLASSES}
          </AppLink>
        }
      />
      <DetailSection title={MSG_SELF.CLASS_DETAILS}>
        <MetadataList columns="multi" label={{ position: 'start', width: 170 }}>
          <MetadataListItem label={MSG_SELF.CLASS_CODE}>
            {classItem.classCode || '—'}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.CLASS_NAME}>{classItem.name || '—'}</MetadataListItem>
          <MetadataListItem label={MSG_SELF.ACADEMIC_YEAR}>
            {classItem.academicYear || '—'}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.PERIOD}>
            {formatPeriod(classItem.startDate, classItem.endDate)}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.STATUS}>
            {classItem.status ? (
              <Badge
                variant={CLASS_STATUS_BADGE[classItem.status] ?? 'neutral'}
                label={labelOf(CLASS_STATUS_LABEL, classItem.status)}
              />
            ) : (
              '—'
            )}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.CLOSE_STATE}>{closeState || '—'}</MetadataListItem>
          <MetadataListItem label={MSG_SELF.TEACHER}>
            {classItem.teacherName || '—'}
          </MetadataListItem>
          <MetadataListItem label={MSG_SELF.SUBJECT}>
            {classItem.subjectName || '—'}
          </MetadataListItem>
        </MetadataList>
      </DetailSection>
    </Stack>
  );
}
