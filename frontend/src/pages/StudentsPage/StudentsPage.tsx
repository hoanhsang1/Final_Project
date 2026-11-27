import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  DateInput,
  Dialog,
  DialogHeader,
  HStack,
  pixel,
  proportional,
  Selector,
  Stack,
  Table,
  Text,
  TextInput,
  useTablePagination,
  VStack,
} from '@astryxdesign/core';
import type { BadgeVariant, ISODateString, TableColumn } from '@astryxdesign/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CSSProperties, FormEvent } from 'react';
import { useState } from 'react';
import { AppLink } from '../../components/AppLink/AppLink';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { canEditStudents, canViewStudents } from '../../features/auth/permissions';
import { formatDate } from '../../features/sprint4/labels';
import { MSG_S4, MSG_STUDENT, studentTotalLabel } from '../../features/sprint4/sprint4Messages';
import {
  createStudent,
  deleteStudent,
  fetchStudents,
  sprint4ErrorMessage,
  updateStudent,
} from '../../features/sprint4/sprint4Api';
import type {
  StudentCreatePayload,
  StudentListItem,
  StudentUpdatePayload,
} from '../../features/sprint4/types';
import { useFormState } from '../../hooks/useFormState';
import { useNotify } from '../../hooks/useNotify';
import { useAuthStore } from '../../stores/authStore';
import { numericStyle } from '../../theme';

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn
 * `StudentListItem` là interface nên không có index signature. Giao thêm
 * `Record<string, unknown>` để thoả ràng buộc mà **không** nới lỏng DTO.
 */
type StudentRow = StudentListItem & Record<string, unknown>;

/**
 * Giá trị form tạo/sửa học sinh.
 *
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>` và chỉ type alias của object literal mới
 * có index signature ngầm.
 */
type StudentFormValues = {
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

/** §4.1 — chỉ 3 giá trị BE chấp nhận cho `status`. */
const STUDENT_STATUS_OPTIONS: { value: StudentListItem['status']; label: string }[] = [
  { value: 'active', label: STUDENT_STATUS_LABEL.active },
  { value: 'inactive', label: STUDENT_STATUS_LABEL.inactive },
  { value: 'suspended', label: STUDENT_STATUS_LABEL.suspended },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/** Khớp ràng buộc BE (`@Email`) — cùng mẫu với form giáo viên. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ô nửa hàng: đủ rộng thì hai cột, hẹp thì tự xuống một cột. */
const HALF_FIELD: CSSProperties = { flex: '1 1 240px', minWidth: 0 };

const CREATED_MESSAGE = 'Đã tạo học sinh.';
const UPDATED_MESSAGE = 'Đã cập nhật học sinh.';
const DELETED_MESSAGE = 'Đã xoá học sinh.';

function toFormValues(student: StudentListItem | null): StudentFormValues {
  return {
    studentCode: student?.studentCode ?? '',
    fullName: student?.fullName ?? '',
    dateOfBirth: student?.dateOfBirth ?? '',
    email: student?.email ?? '',
    phone: student?.phone ?? '',
    status: student?.status ?? 'active',
  };
}

/** Ô trống gửi `null` thay vì chuỗi rỗng để BE lưu "chưa có". */
function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildCreatePayload(values: StudentFormValues): StudentCreatePayload {
  const payload: StudentCreatePayload = {
    fullName: values.fullName.trim(),
    dateOfBirth: emptyToNull(values.dateOfBirth),
    email: emptyToNull(values.email),
    phone: emptyToNull(values.phone),
    status: values.status,
  };
  // §4.1 — bỏ hẳn `studentCode` khi trống để BE tự sinh mã.
  const studentCode = values.studentCode.trim();
  if (studentCode) payload.studentCode = studentCode;
  return payload;
}

function buildUpdatePayload(values: StudentFormValues): StudentUpdatePayload {
  return {
    fullName: values.fullName.trim(),
    dateOfBirth: emptyToNull(values.dateOfBirth),
    email: emptyToNull(values.email),
    phone: emptyToNull(values.phone),
    status: values.status,
  };
}

/**
 * Màn danh sách học sinh (`/dao-tao/hoc-sinh`).
 *
 * - Lọc `q` + `status` (3 giá trị), phân trang `page`/`size` do server làm;
 *   không đưa `classId` lên UI (§4.3).
 * - Mã học sinh là `AppLink` tới hồ sơ `/dao-tao/hoc-sinh/:id` (hồ sơ do Task 3).
 * - 5 state: loading / empty / error / success / không có quyền.
 * - Tạo/sửa dùng chung một Dialog; xoá dùng `AlertDialog`.
 */
export default function StudentsPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const canView = canViewStudents({ backendRoles, permissions });
  const canEdit = canEditStudents({ backendRoles, permissions });

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [status, setStatus] = useState<StudentListItem['status'] | undefined>();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentListItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudentListItem | null>(null);

  const form = useFormState<StudentFormValues>(toFormValues(null), {
    studentCode: (value) => {
      if (value.trim().length > 100) return 'Mã học sinh tối đa 100 ký tự';
      return undefined;
    },
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
    phone: (value) => {
      if (value.trim().length > 50) return 'Số điện thoại tối đa 50 ký tự';
      return undefined;
    },
  });

  const listQuery = useQuery({
    queryKey: ['students', { page, size, keyword, status }],
    queryFn: () =>
      fetchStudents({
        page,
        size,
        q: keyword || undefined,
        status,
      }),
    enabled: canView,
  });

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
    form.reset();
  };

  const createMut = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      notify.success(CREATED_MESSAGE);
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) => setFormError(sprint4ErrorMessage(error)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: StudentUpdatePayload }) =>
      updateStudent(id, payload),
    onSuccess: () => {
      notify.success(UPDATED_MESSAGE);
      closeForm();
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) => setFormError(sprint4ErrorMessage(error)),
  });

  const deleteMut = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      notify.success(DELETED_MESSAGE);
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error) => {
      notify.error(sprint4ErrorMessage(error));
      // `AlertDialog` không tự đóng; đóng sau khi yêu cầu kết thúc để người dùng
      // thấy toast lỗi thay vì hộp thoại treo.
      setPendingDelete(null);
    },
  });

  // Server là nguồn sự thật cho phân trang: dùng số BE trả về để nhãn
  // `aria-rowindex` và số trang khớp dữ liệu đang hiện.
  const currentPage = listQuery.data?.page ?? page;
  const pageSize = listQuery.data?.size ?? size;
  const total = listQuery.data?.total ?? 0;
  const rows = (listQuery.data?.items ?? []) as StudentRow[];

  const pagination = useTablePagination<StudentRow>({
    page: currentPage,
    onPageChange: setPage,
    totalItems: total,
    pageSize,
    onPageSizeChange: (next) => {
      setSize(next);
      setPage(1);
    },
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    label: MSG_STUDENT.PAGINATION_LABEL,
  });

  /** Áp từ khoá đang gõ và quay về trang 1 — dùng cho cả Enter lẫn nút "Tìm". */
  const applySearch = () => {
    setKeyword(keywordInput);
    setPage(1);
  };

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    form.reset(toFormValues(null));
    setFormOpen(true);
  };

  const openEdit = (student: StudentListItem) => {
    setEditing(student);
    setFormError(null);
    form.reset(toFormValues(student));
    setFormOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;

    if (editing) {
      updateMut.mutate({ id: editing.id, payload: buildUpdatePayload(form.values) });
    } else {
      createMut.mutate(buildCreatePayload(form.values));
    }
  };

  const savePending = createMut.isPending || updateMut.isPending;

  const columns: TableColumn<StudentRow>[] = [
    {
      key: 'studentCode',
      header: 'Mã học sinh',
      width: pixel(140),
      renderCell: (row) => (
        // Số/ký tự mã cần thẳng cột; `Text` bên trong `Link` không tự đặt
        // `font-variant-numeric` nên style này kế thừa xuống chữ hiển thị.
        <AppLink to={`/dao-tao/hoc-sinh/${row.id}`} weight="medium" style={numericStyle}>
          {row.studentCode || row.id}
        </AppLink>
      ),
    },
    {
      key: 'fullName',
      header: 'Họ tên',
      width: proportional(1, { minWidth: 180 }),
      renderCell: (row) => row.fullName || '—',
    },
    {
      key: 'class',
      header: 'Lớp',
      width: pixel(200),
      renderCell: (row) => {
        const label = [row.classCode, row.className].filter(Boolean).join(' — ');
        return label ? label : <Text type="supporting">{MSG_STUDENT.NO_CLASS}</Text>;
      },
    },
    {
      key: 'dateOfBirth',
      header: 'Ngày sinh',
      width: pixel(130),
      renderCell: (row) => formatDate(row.dateOfBirth),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: pixel(140),
      renderCell: (row) => (
        <Badge
          variant={STUDENT_STATUS_BADGE[row.status]}
          label={STUDENT_STATUS_LABEL[row.status]}
        />
      ),
    },
  ];

  if (canEdit) {
    columns.push({
      key: 'actions',
      header: 'Thao tác',
      width: pixel(170),
      renderCell: (row) => (
        <HStack gap={2}>
          <Button
            variant="ghost"
            size="sm"
            label={MSG_STUDENT.EDIT}
            aria-label={`${MSG_STUDENT.EDIT} ${row.fullName}`}
            onClick={() => openEdit(row)}
          />
          <Button
            variant="ghost"
            size="sm"
            label={MSG_STUDENT.DELETE}
            aria-label={`${MSG_STUDENT.DELETE} ${row.fullName}`}
            onClick={() => setPendingDelete(row)}
          />
        </HStack>
      ),
    });
  }

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title={MSG_STUDENT.TITLE}
        extra={
          canEdit ? (
            <Button
              variant="primary"
              size="lg"
              label={MSG_STUDENT.CREATE}
              onClick={openCreate}
            />
          ) : undefined
        }
      >
        {canView ? (
          <HStack gap={3} wrap="wrap" justify="between" align="end">
            <Selector
              label={MSG_STUDENT.STATUS_ALL}
              isLabelHidden
              hasClear
              placeholder={MSG_STUDENT.STATUS_ALL}
              options={STUDENT_STATUS_OPTIONS}
              value={status ?? null}
              width={220}
              onChange={(value) => {
                setStatus((value as StudentListItem['status'] | null) ?? undefined);
                setPage(1);
              }}
            />

            <HStack gap={2} wrap="wrap" align="end">
              <TextInput
                type="search"
                label={MSG_STUDENT.SEARCH}
                isLabelHidden
                startIcon="search"
                enterKeyHint="search"
                hasClear
                placeholder={MSG_STUDENT.SEARCH}
                value={keywordInput}
                width={300}
                onChange={(value) => {
                  setKeywordInput(value);
                  // Xoá nhanh: bỏ luôn điều kiện lọc thay vì phải bấm nút tìm.
                  if (value === '') {
                    setKeyword('');
                    setPage(1);
                  }
                }}
                onEnter={applySearch}
              />
              <Button variant="secondary" size="lg" label={MSG_S4.SEARCH} onClick={applySearch} />
            </HStack>
          </HStack>
        ) : null}
      </PageHeader>

      {!canView ? (
        <ForbiddenNotice />
      ) : listQuery.isError ? (
        <Banner
          status="error"
          title="Không tải được danh sách học sinh."
          description={sprint4ErrorMessage(listQuery.error)}
          collapsible={false}
          role="alert"
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_S4.RETRY}
              onClick={() => listQuery.refetch()}
            />
          }
        />
      ) : listQuery.isLoading ? (
        <PageLoading />
      ) : (
        <Stack direction="vertical" gap={3}>
          <Text type="supporting">{studentTotalLabel(total)}</Text>
          <Table<StudentRow>
            data={rows}
            columns={columns}
            idKey="id"
            hasHover
            textOverflow="truncate"
            // `aria-rowindex` phải tính theo trang hiện tại, không theo thứ tự
            // trong mảng một trang.
            rowIndexStart={(currentPage - 1) * pageSize + 1}
            rowCount={total}
            emptyState={<EmptyState description={MSG_STUDENT.EMPTY} compact />}
            plugins={{ pagination }}
          />
        </Stack>
      )}

      {/* Tạo/sửa dùng chung một Dialog. `purpose="form"`: bấm ra ngoài KHÔNG
          đóng để không mất dữ liệu đang nhập. */}
      <Dialog
        isOpen={formOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        purpose="form"
        width={720}
      >
        <DialogHeader
          title={editing ? MSG_STUDENT.EDIT : MSG_STUDENT.CREATE}
          onOpenChange={(open) => {
            if (!open) closeForm();
          }}
        />

        <form noValidate onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
          <VStack gap={4}>
            {formError ? (
              <Banner status="error" title={formError} collapsible={false} role="alert" />
            ) : null}

            <HStack gap={3} wrap="wrap">
              {editing ? null : (
                <TextInput
                  label="Mã học sinh"
                  value={form.values.studentCode}
                  onChange={(value) => form.setValue('studentCode', value)}
                  placeholder="Để trống để hệ thống tự sinh"
                  autoComplete="off"
                  isDisabled={savePending}
                  containerStyle={HALF_FIELD}
                  status={
                    form.errorOf('studentCode')
                      ? { type: 'error', message: form.errorOf('studentCode') }
                      : undefined
                  }
                />
              )}
              <TextInput
                label="Họ tên"
                value={form.values.fullName}
                onChange={(value) => form.setValue('fullName', value)}
                placeholder="Nguyễn Văn An"
                autoComplete="off"
                isDisabled={savePending}
                aria-required="true"
                containerStyle={HALF_FIELD}
                status={
                  form.errorOf('fullName')
                    ? { type: 'error', message: form.errorOf('fullName') }
                    : undefined
                }
              />
            </HStack>

            <HStack gap={3} wrap="wrap">
              <DateInput
                label="Ngày sinh"
                value={(form.values.dateOfBirth || undefined) as ISODateString | undefined}
                onChange={(value) => form.setValue('dateOfBirth', value ?? '')}
                isDisabled={savePending}
                containerStyle={HALF_FIELD}
              />
              <TextInput
                label="Email"
                type="email"
                value={form.values.email}
                onChange={(value) => form.setValue('email', value)}
                placeholder="an@example.edu.vn"
                autoComplete="off"
                isDisabled={savePending}
                containerStyle={HALF_FIELD}
                status={
                  form.errorOf('email')
                    ? { type: 'error', message: form.errorOf('email') }
                    : undefined
                }
              />
            </HStack>

            <HStack gap={3} wrap="wrap">
              <TextInput
                label="Số điện thoại"
                type="tel"
                value={form.values.phone}
                onChange={(value) => form.setValue('phone', value)}
                placeholder="0901234567"
                autoComplete="off"
                isDisabled={savePending}
                containerStyle={HALF_FIELD}
                status={
                  form.errorOf('phone')
                    ? { type: 'error', message: form.errorOf('phone') }
                    : undefined
                }
              />
              <Selector
                label="Trạng thái"
                options={STUDENT_STATUS_OPTIONS}
                value={form.values.status}
                onChange={(value) =>
                  form.setValue(
                    'status',
                    (value as StudentListItem['status'] | null) ?? 'active',
                  )
                }
                isDisabled={savePending}
                containerStyle={HALF_FIELD}
              />
            </HStack>

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
                label={editing ? MSG_S4.SAVE : MSG_S4.CREATE}
                isLoading={savePending}
              />
            </HStack>
          </VStack>
        </form>
      </Dialog>

      {/* Xoá là thao tác phá huỷ → `AlertDialog` thay vì bong bóng neo nút. */}
      <AlertDialog
        isOpen={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={MSG_STUDENT.DELETE}
        description={
          pendingDelete
            ? `Học sinh "${pendingDelete.fullName}" sẽ bị xoá. ${MSG_STUDENT.DELETE_CONFIRM}`
            : ''
        }
        cancelLabel={MSG_S4.CANCEL}
        actionLabel={MSG_STUDENT.DELETE}
        actionVariant="destructive"
        isActionLoading={deleteMut.isPending}
        onAction={() => {
          if (pendingDelete) deleteMut.mutate(pendingDelete.id);
        }}
      />
    </Stack>
  );
}
