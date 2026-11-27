import {
  Badge,
  Banner,
  Button,
  DateInput,
  Dialog,
  DialogHeader,
  HStack,
  MetadataList,
  MetadataListItem,
  Selector,
  Stack,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import type { BadgeVariant, ISODateString } from '@astryxdesign/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CSSProperties, FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLink } from '../../components/AppLink/AppLink';
import DetailSection from '../../components/DetailSection/DetailSection';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { canEditStudents, canViewStudents } from '../../features/auth/permissions';
import { formatDate } from '../../features/sprint4/labels';
import { MSG_S4, MSG_STUDENT } from '../../features/sprint4/sprint4Messages';
import {
  fetchStudent,
  isForbiddenError,
  isNotFoundError,
  sprint4ErrorMessage,
  updateStudent,
} from '../../features/sprint4/sprint4Api';
import type { StudentListItem, StudentUpdatePayload } from '../../features/sprint4/types';
import { useFormState } from '../../hooks/useFormState';
import { useNotify } from '../../hooks/useNotify';
import { useAuthStore } from '../../stores/authStore';

/**
 * Giá trị form sửa hồ sơ. `studentCode` chỉ để hiển thị (read-only) và KHÔNG
 * nằm trong payload gửi lên BE.
 *
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>` và chỉ type alias của object literal mới
 * có index signature ngầm.
 */
type StudentEditFormValues = {
  studentCode: string;
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  status: StudentListItem['status'];
};

const STUDENT_STATUS_LABEL: Record<StudentListItem['status'], string> = {
  active: 'Đang học',
  inactive: 'Ngừng học',
  suspended: 'Đình chỉ',
};

const STUDENT_STATUS_BADGE: Record<StudentListItem['status'], BadgeVariant> = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'warning',
};

const STUDENT_STATUS_OPTIONS: { value: StudentListItem['status']; label: string }[] = [
  { value: 'active', label: STUDENT_STATUS_LABEL.active },
  { value: 'inactive', label: STUDENT_STATUS_LABEL.inactive },
  { value: 'suspended', label: STUDENT_STATUS_LABEL.suspended },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HALF_FIELD: CSSProperties = { flex: '1 1 240px', minWidth: 0 };

const LIST_PATH = '/dao-tao/hoc-sinh';
const DETAIL_LOAD_ERROR = 'Không tải được thông tin học sinh.';
const UPDATED_MESSAGE = 'Đã cập nhật học sinh.';
const STUDENT_CODE_LOCKED = 'Mã học sinh chỉ đọc, không thể sửa.';
const DASH = '—';

function toFormValues(student: StudentListItem): StudentEditFormValues {
  return {
    studentCode: student.studentCode,
    fullName: student.fullName ?? '',
    dateOfBirth: student.dateOfBirth ?? '',
    email: student.email ?? '',
    phone: student.phone ?? '',
    status: student.status,
  };
}

/** Ô trống gửi `null` thay vì chuỗi rỗng để BE lưu "chưa có". */
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildUpdatePayload(values: StudentEditFormValues): StudentUpdatePayload {
  return {
    fullName: values.fullName.trim(),
    dateOfBirth: emptyToNull(values.dateOfBirth),
    email: emptyToNull(values.email),
    phone: emptyToNull(values.phone),
    status: values.status,
  };
}

/**
 * Màn hồ sơ học sinh (`/dao-tao/hoc-sinh/:id`) — §4.3.
 *
 * - 3 nhóm thông tin: hồ sơ / lớp hiện tại / tài khoản, kèm ngày tạo-cập nhật.
 * - Sửa bằng chung một payload `updateStudent`; sau lưu vô hiệu cả danh sách
 *   lẫn chi tiết. Mã học sinh chỉ đọc.
 * - 3 trạng thái trang: loading / error(404, 500, forbidden) / success.
 * - BE/DB chưa có `gender`/`version`/lịch sử/lớp quá khứ nên KHÔNG suy diễn.
 */
export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const canView = canViewStudents({ backendRoles, permissions });
  const canEdit = canEditStudents({ backendRoles, permissions });

  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useFormState<StudentEditFormValues>(toFormValuesExEmpty(), {
    fullName: (value) => {
      if (!value.trim()) return 'Vui lòng nhập họ tên';
      return value.trim().length <= 200 ? undefined : 'Họ tên tối đa 200 ký tự';
    },
    email: (value) => {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      if (trimmed.length > 255) return 'Email tối đa 255 ký tự';
      return EMAIL_PATTERN.test(trimmed) ? undefined : 'Email không hợp lệ';
    },
    phone: (value) => (value.trim().length <= 50 ? undefined : 'Số điện thoại tối đa 50 ký tự'),
  });

  const detailQuery = useQuery({
    queryKey: ['students', id],
    queryFn: () => fetchStudent(id!),
    enabled: !!id && canView,
  });

  const student = detailQuery.data;

  const closeForm = () => {
    setFormOpen(false);
    setFormError(null);
  };

  const updateMut = useMutation({
    mutationFn: (payload: StudentUpdatePayload) => updateStudent(id!, payload),
    onSuccess: () => {
      notify.success(UPDATED_MESSAGE);
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students', id] });
    },
    onError: (error) => {
      const message = sprint4ErrorMessage(error);
      setFormError(message);
      notify.error(message);
    },
  });

  if (!canView) return <ForbiddenNotice />;
  if (detailQuery.isLoading) return <PageLoading />;

  if (detailQuery.isError) {
    if (isForbiddenError(detailQuery.error)) return <ForbiddenNotice />;
    if (isNotFoundError(detailQuery.error)) {
      return (
        <Banner
          status="warning"
          title={MSG_S4.NOT_FOUND}
          collapsible={false}
          role="alert"
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_STUDENT.BACK}
              onClick={() => navigate(LIST_PATH)}
            />
          }
        />
      );
    }
    return (
      <Banner
        status="error"
        title={DETAIL_LOAD_ERROR}
        description={sprint4ErrorMessage(detailQuery.error)}
        collapsible={false}
        role="alert"
        endContent={
          <HStack gap={2}>
            <Button
              variant="secondary"
              size="sm"
              label={MSG_S4.RETRY}
              onClick={() => void detailQuery.refetch()}
            />
            <Button
              variant="secondary"
              size="sm"
              label={MSG_STUDENT.BACK}
              onClick={() => navigate(LIST_PATH)}
            />
          </HStack>
        }
      />
    );
  }

  if (!student) {
    return (
      <Banner
        status="warning"
        title={MSG_S4.NOT_FOUND}
        collapsible={false}
        role="alert"
        endContent={
          <Button
            variant="secondary"
            size="sm"
            label={MSG_STUDENT.BACK}
            onClick={() => navigate(LIST_PATH)}
          />
        }
      />
    );
  }

  const classLabel = [student.classCode, student.className].filter(Boolean).join(' — ');
  const title = student.fullName || student.studentCode;

  const openEdit = () => {
    setFormError(null);
    form.reset(toFormValues(student));
    setFormOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;
    updateMut.mutate(buildUpdatePayload(form.values));
  };

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        breadcrumb={[
          { title: MSG_STUDENT.TITLE, href: LIST_PATH },
          { title },
        ]}
        title={title}
        extra={
          <HStack gap={3} wrap="wrap" align="center">
            <AppLink to={LIST_PATH} weight="medium">
              {MSG_STUDENT.BACK}
            </AppLink>
            {canEdit ? (
              <Button variant="primary" size="lg" label={MSG_STUDENT.EDIT} onClick={openEdit} />
            ) : null}
          </HStack>
        }
      />

      <DetailSection title={MSG_STUDENT.PROFILE}>
        <MetadataList columns="multi" label={{ position: 'start', width: 170 }}>
          <MetadataListItem label="Mã học sinh">{student.studentCode || DASH}</MetadataListItem>
          <MetadataListItem label="Họ tên">{student.fullName || DASH}</MetadataListItem>
          <MetadataListItem label="Ngày sinh">{formatDate(student.dateOfBirth)}</MetadataListItem>
          <MetadataListItem label="Email">{student.email || DASH}</MetadataListItem>
          <MetadataListItem label="Điện thoại">{student.phone || DASH}</MetadataListItem>
          <MetadataListItem label="Trạng thái">
            <Badge
              variant={STUDENT_STATUS_BADGE[student.status]}
              label={STUDENT_STATUS_LABEL[student.status]}
            />
          </MetadataListItem>
        </MetadataList>
      </DetailSection>

      <DetailSection title={MSG_STUDENT.CURRENT_CLASS}>
        <MetadataList columns="single" label={{ position: 'start', width: 170 }}>
          <MetadataListItem label="Lớp hiện tại">
            {classLabel || <span>{MSG_STUDENT.NO_CLASS}</span>}
          </MetadataListItem>
        </MetadataList>
      </DetailSection>

      <DetailSection title={MSG_STUDENT.ACCOUNT}>
        <MetadataList columns="single" label={{ position: 'start', width: 170 }}>
          <MetadataListItem label="Tên đăng nhập">
            {student.accountUsername || MSG_STUDENT.NO_ACCOUNT}
          </MetadataListItem>
          <MetadataListItem label="Ngày tạo tài khoản">
            {student.accountCreatedAt ? formatDate(student.accountCreatedAt) : DASH}
          </MetadataListItem>
        </MetadataList>
      </DetailSection>

      <DetailSection title="Thông tin hệ thống">
        <MetadataList columns="multi" label={{ position: 'start', width: 170 }}>
          <MetadataListItem label={MSG_STUDENT.CREATED_AT}>
            {formatDate(student.createdAt)}
          </MetadataListItem>
          <MetadataListItem label={MSG_STUDENT.UPDATED_AT}>
            {formatDate(student.updatedAt)}
          </MetadataListItem>
        </MetadataList>
      </DetailSection>

      {/* `purpose="form"`: bấm ra ngoài KHÔNG đóng để không mất dữ liệu đang nhập. */}
      <Dialog
        isOpen={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        purpose="form"
        width={720}
      >
        <DialogHeader
          title={MSG_STUDENT.EDIT}
          onOpenChange={(open) => {
            if (!open) closeForm();
          }}
        />

        <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
          <VStack gap={4}>
            {formError ? (
              <Banner status="error" title={formError} collapsible={false} role="alert" />
            ) : null}

            <TextInput
              label="Mã học sinh"
              value={form.values.studentCode}
              onChange={() => undefined}
              isReadOnly
              description={STUDENT_CODE_LOCKED}
              autoComplete="off"
            />

            <HStack gap={3} wrap="wrap">
              <TextInput
                label="Họ tên"
                value={form.values.fullName}
                onChange={(value) => form.setValue('fullName', value)}
                placeholder="Nguyễn Văn An"
                autoComplete="off"
                isDisabled={updateMut.isPending}
                aria-required="true"
                containerStyle={HALF_FIELD}
                status={
                  form.errorOf('fullName')
                    ? { type: 'error', message: form.errorOf('fullName') }
                    : undefined
                }
              />
              <DateInput
                label="Ngày sinh"
                value={(form.values.dateOfBirth || undefined) as ISODateString | undefined}
                onChange={(value) => form.setValue('dateOfBirth', value ?? '')}
                isDisabled={updateMut.isPending}
                containerStyle={HALF_FIELD}
              />
            </HStack>

            <HStack gap={3} wrap="wrap">
              <TextInput
                label="Email"
                type="email"
                value={form.values.email}
                onChange={(value) => form.setValue('email', value)}
                placeholder="an@example.edu.vn"
                autoComplete="off"
                isDisabled={updateMut.isPending}
                containerStyle={HALF_FIELD}
                status={
                  form.errorOf('email')
                    ? { type: 'error', message: form.errorOf('email') }
                    : undefined
                }
              />
              <TextInput
                label="Số điện thoại"
                type="tel"
                value={form.values.phone}
                onChange={(value) => form.setValue('phone', value)}
                placeholder="0901234567"
                autoComplete="off"
                isDisabled={updateMut.isPending}
                containerStyle={HALF_FIELD}
                status={
                  form.errorOf('phone')
                    ? { type: 'error', message: form.errorOf('phone') }
                    : undefined
                }
              />
            </HStack>

            <Selector
              label="Trạng thái"
              options={STUDENT_STATUS_OPTIONS}
              value={form.values.status}
              onChange={(value) =>
                form.setValue('status', (value as StudentListItem['status'] | null) ?? 'active')
              }
              isDisabled={updateMut.isPending}
              containerStyle={HALF_FIELD}
            />

            <HStack justify="end" gap={2}>
              <Button
                variant="secondary"
                size="lg"
                label={MSG_S4.CANCEL}
                onClick={closeForm}
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                label={MSG_S4.SAVE}
                isLoading={updateMut.isPending}
              />
            </HStack>
          </VStack>
        </form>
      </Dialog>
    </Stack>
  );
}

/** Form chưa có dữ liệu lúc đầu; `openEdit`/effect sẽ reset khi có `student`. */
function toFormValuesExEmpty(): StudentEditFormValues {
  return { studentCode: '', fullName: '', dateOfBirth: '', email: '', phone: '', status: 'active' };
}
