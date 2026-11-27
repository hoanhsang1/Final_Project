import {
  Badge,
  Banner,
  Button,
  HStack,
  Stack,
  Table,
  Text,
  pixel,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
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
  formatPeriod,
  labelOf,
} from '../../features/sprint4/labels';
import {
  fetchStudentSelfClasses,
  isForbiddenError,
  sprint4ErrorMessage,
} from '../../features/sprint4/sprint4Api';
import { MSG_SELF } from '../../features/sprint4/sprint4Messages';
import type { StudentClass } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';

/** `Table` của Astryx buộc dòng phải có index signature (xem ui-conventions 6.9). */
type StudentClassRow = StudentClass & Record<string, unknown>;

/**
 * Lớp của chính học sinh (`/dao-tao/hoc-sinh/lop-cua-toi`) — chỉ đọc.
 *
 * Gọi `/api/students/me/classes`; KHÔNG gọi danh sách/chi tiết lớp quản lý.
 * Mỗi mã lớp là link tới chi tiết self `/dao-tao/hoc-sinh/lop-cua-toi/:id`
 * (route `/dao-tao/lop-hoc-cua-toi/:id` là của giáo viên).
 * Gate: STUDENT **và** `student.self_view`.
 * 5 state: forbidden / loading / error(+retry) / empty / success.
 */
export default function StudentMyClassesPage() {
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const canView = canViewStudentClasses({ backendRoles, permissions });

  const classesQuery = useQuery({
    queryKey: ['student-self-classes'],
    queryFn: fetchStudentSelfClasses,
    enabled: canView,
  });

  const columns = useMemo<TableColumn<StudentClassRow>[]>(
    () => [
      {
        key: 'classCode',
        header: MSG_SELF.CLASS_CODE,
        width: pixel(140),
        renderCell: (row) => (
          <AppLink to={`/dao-tao/hoc-sinh/lop-cua-toi/${row.id}`} weight="medium">
            {row.classCode || row.id || '—'}
          </AppLink>
        ),
      },
      {
        key: 'name',
        header: MSG_SELF.CLASS_NAME,
        width: pixel(180),
        renderCell: (row) => row.name || '—',
      },
      {
        key: 'academicYear',
        header: MSG_SELF.ACADEMIC_YEAR,
        width: pixel(140),
        renderCell: (row) => row.academicYear || '—',
      },
      {
        key: 'period',
        header: MSG_SELF.PERIOD,
        width: pixel(230),
        renderCell: (row) => (
          <Text type="body">{formatPeriod(row.startDate, row.endDate)}</Text>
        ),
      },
      {
        key: 'status',
        header: MSG_SELF.STATUS,
        width: pixel(160),
        renderCell: (row) =>
          row.status ? (
            <Badge
              variant={CLASS_STATUS_BADGE[row.status] ?? 'neutral'}
              label={labelOf(CLASS_STATUS_LABEL, row.status)}
            />
          ) : (
            '—'
          ),
      },
      {
        key: 'teacherName',
        header: MSG_SELF.TEACHER,
        width: pixel(180),
        renderCell: (row) => row.teacherName || '—',
      },
      {
        key: 'subjectName',
        header: MSG_SELF.SUBJECT,
        width: pixel(160),
        renderCell: (row) => row.subjectName || '—',
      },
    ],
    [],
  );

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
          <HStack gap={2}>
            <Button
              variant="secondary"
              size="sm"
              label={MSG_SELF.RETRY}
              onClick={() => void classesQuery.refetch()}
            />
          </HStack>
        }
      />
    );
  }

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader title={MSG_SELF.MY_CLASSES} subtitle={MSG_SELF.MY_CLASSES_HINT} />
      <DetailSection title={MSG_SELF.STUDENT_CLASSES_SECTION}>
        <Table<StudentClassRow>
          data={(classesQuery.data ?? []) as StudentClassRow[]}
          columns={columns}
          idKey="id"
          hasHover
          textOverflow="truncate"
          emptyState={<EmptyState compact description={MSG_SELF.STUDENT_CLASSES_EMPTY} />}
        />
      </DetailSection>
    </Stack>
  );
}
