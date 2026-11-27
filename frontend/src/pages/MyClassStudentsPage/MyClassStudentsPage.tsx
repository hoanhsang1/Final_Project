import {
  Badge,
  Banner,
  Button,
  HStack,
  Stack,
  Table,
  pixel,
} from '@astryxdesign/core';
import type { BadgeVariant, TableColumn } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { AppLink } from '../../components/AppLink/AppLink';
import DetailSection from '../../components/DetailSection/DetailSection';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { canViewTeacherClasses } from '../../features/auth/permissions';
import { labelOf } from '../../features/sprint4/labels';
import {
  fetchMyClassStudents,
  fetchTeacherSelfClasses,
  isForbiddenError,
  sprint4ErrorMessage,
} from '../../features/sprint4/sprint4Api';
import { MSG_SELF } from '../../features/sprint4/sprint4Messages';
import type { StudentListItem } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';

/** `Table` của Astryx buộc dòng phải có index signature (xem ui-conventions 6.9). */
type StudentRow = StudentListItem & Record<string, unknown>;

const STUDENT_STATUS_LABEL: Record<StudentListItem['status'], string> = {
  active: MSG_SELF.STUDENT_ACTIVE,
  inactive: MSG_SELF.STUDENT_INACTIVE,
  suspended: MSG_SELF.STUDENT_SUSPENDED,
};

const STUDENT_STATUS_BADGE: Record<StudentListItem['status'], BadgeVariant> = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'warning',
};

/**
 * Học sinh trong lớp tôi phụ trách (`/dao-tao/lop-hoc-cua-toi/:id`) — chỉ đọc.
 *
 * Gọi `/api/classes/me/{id}/students` qua wrapper; tên lớp lấy từ
 * `fetchTeacherSelfClasses()` chạy song song (fallback là chính `id`) nên
 * KHÔNG cần endpoint chi tiết lớp quản lý `/api/classes/{id}`.
 * Gate: TEACHER **và** `class.self_view`.
 * 5 state: forbidden / loading / error(+retry) / empty / success.
 */
export default function MyClassStudentsPage() {
  const { id } = useParams<{ id: string }>();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const canView = canViewTeacherClasses({ backendRoles, permissions });

  const studentsQuery = useQuery({
    queryKey: ['my-class-students', id],
    queryFn: () => fetchMyClassStudents(id!),
    enabled: !!id && canView,
  });
  const classesQuery = useQuery({
    queryKey: ['teacher-self-classes'],
    queryFn: fetchTeacherSelfClasses,
    enabled: canView,
  });

  const className =
    classesQuery.data?.find((item) => item.id === id)?.name || id || '—';

  const columns = useMemo<TableColumn<StudentRow>[]>(
    () => [
      {
        key: 'studentCode',
        header: MSG_SELF.STUDENT_CODE,
        width: pixel(140),
        renderCell: (row) => row.studentCode || '—',
      },
      {
        key: 'fullName',
        header: MSG_SELF.FULL_NAME,
        width: pixel(180),
        renderCell: (row) => row.fullName || '—',
      },
      {
        key: 'email',
        header: MSG_SELF.EMAIL,
        width: pixel(200),
        renderCell: (row) => row.email || '—',
      },
      {
        key: 'phone',
        header: MSG_SELF.PHONE,
        width: pixel(150),
        renderCell: (row) => row.phone || '—',
      },
      {
        key: 'status',
        header: MSG_SELF.STATUS,
        width: pixel(150),
        renderCell: (row) => (
          <Badge
            variant={STUDENT_STATUS_BADGE[row.status] ?? 'neutral'}
            label={labelOf(STUDENT_STATUS_LABEL, row.status)}
          />
        ),
      },
      {
        key: 'className',
        header: MSG_SELF.CLASS,
        width: pixel(180),
        renderCell: (row) => row.className || row.classCode || className,
      },
    ],
    [className],
  );

  if (!canView) return <ForbiddenNotice />;
  if (studentsQuery.isLoading || classesQuery.isLoading) return <PageLoading />;

  const error = studentsQuery.isError ? studentsQuery.error : classesQuery.error;
  const isError = studentsQuery.isError || classesQuery.isError;
  if (isError) {
    if (isForbiddenError(error)) return <ForbiddenNotice />;
    const retry = () => {
      if (studentsQuery.isError) void studentsQuery.refetch();
      if (classesQuery.isError) void classesQuery.refetch();
    };
    return (
      <Banner
        status="error"
        title={MSG_SELF.CLASS_STUDENTS_LOAD_ERROR}
        description={sprint4ErrorMessage(error)}
        collapsible={false}
        role="alert"
        endContent={
          <HStack gap={2}>
            <Button variant="secondary" size="sm" label={MSG_SELF.RETRY} onClick={retry} />
          </HStack>
        }
      />
    );
  }

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title={MSG_SELF.CLASS_STUDENTS}
        subtitle={className}
        extra={
          <AppLink to="/dao-tao/lop-hoc-cua-toi" weight="medium">
            {MSG_SELF.BACK_TO_CLASSES}
          </AppLink>
        }
      />
      <DetailSection title={MSG_SELF.CLASS_STUDENTS} description={MSG_SELF.CLASS_STUDENTS_HINT}>
        <Table<StudentRow>
          data={(studentsQuery.data ?? []) as StudentRow[]}
          columns={columns}
          idKey="id"
          hasHover
          textOverflow="truncate"
          emptyState={<EmptyState compact description={MSG_SELF.CLASS_STUDENTS_EMPTY} />}
        />
      </DetailSection>
    </Stack>
  );
}
