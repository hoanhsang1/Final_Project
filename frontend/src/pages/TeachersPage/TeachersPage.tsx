import {
  Badge,
  Banner,
  Button,
  Dialog,
  DialogHeader,
  HStack,
  MultiSelector,
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
import type { TableColumn } from '@astryxdesign/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CSSProperties, FormEvent } from 'react';
import { useState } from 'react';
import { AppLink } from '../../components/AppLink/AppLink';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { canEditTeachers, canViewTeachers, isOwnerRole } from '../../features/auth/permissions';
import {
  CONTRACT_TYPE_LABEL,
  TEACHING_STATUS_BADGE,
  TEACHING_STATUS_LABEL,
  labelOf,
} from '../../features/sprint4/labels';
import {
  MSG_S4,
  MSG_TEACHER,
  teacherTotalLabel,
} from '../../features/sprint4/sprint4Messages';
import {
  createSpecialty,
  createTeacher,
  fetchDepartments,
  fetchPositions,
  fetchSpecialties,
  fetchTeachers,
  sprint4ErrorMessage,
} from '../../features/sprint4/sprint4Api';
import type {
  ContractType,
  TeacherCreatedResponse,
  TeacherListItem,
} from '../../features/sprint4/types';
import { useFormState } from '../../hooks/useFormState';
import { useNotify } from '../../hooks/useNotify';
import { useAuthStore } from '../../stores/authStore';
import { numericStyle } from '../../theme';

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn
 * `TeacherListItem` là interface nên không có index signature. Giao thêm
 * `Record<string, unknown>` để thoả ràng buộc mà **không** nới lỏng DTO — xem
 * `docs/ui-conventions.md` mục 6.9.
 */
type TeacherRow = TeacherListItem & Record<string, unknown>;

/**
 * Giá trị form "Thêm giáo viên" (§4.1 + §4.4).
 *
 * Là `type` chứ không phải `interface`: `useFormState<T>` cũng buộc
 * `T extends Record<string, unknown>`, và chỉ type alias của object literal mới
 * có index signature ngầm.
 */
type TeacherFormValues = {
  staffCode: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  departmentId: string;
  positionIds: string[];
  specialtyIds: string[];
  contractType: ContractType | null;
};

/** §7 — 3 trạng thái dạy. */
const TEACHING_STATUS_OPTIONS = [
  { value: 'DANG_DAY', label: TEACHING_STATUS_LABEL.DANG_DAY },
  { value: 'TAM_NGHI', label: TEACHING_STATUS_LABEL.TAM_NGHI },
  { value: 'NGHI_VIEC', label: TEACHING_STATUS_LABEL.NGHI_VIEC },
];

const CONTRACT_TYPE_OPTIONS = [
  { value: 'CO_HUU', label: CONTRACT_TYPE_LABEL.CO_HUU },
  { value: 'THINH_GIANG', label: CONTRACT_TYPE_LABEL.THINH_GIANG },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

/** Khớp ràng buộc BE (§4.1) và giống `RegisterPage` để hai form không lệch nhau. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,100}$/;
const PHONE_PATTERN = /^(\+84|0)\d{9,10}$/;

/**
 * Ô nửa hàng của form: đủ rộng thì hai cột, hẹp thì tự xuống một cột.
 *
 * `FormLayout direction="horizontal"` cũng cho hai cột nhưng **không** tự thu về
 * một cột ở màn hình hẹp (chỉ `horizontal-labels` mới thu), nên ở 320px hai ô sẽ
 * bị bóp. `HStack wrap` + `flex-basis` cho cùng bố cục mà vẫn dùng được ở 320px.
 */
const HALF_FIELD: CSSProperties = { flex: '1 1 240px', minWidth: 0 };

/**
 * Màn 1 + 2 — danh sách giáo viên và dialog tạo giáo viên.
 *
 * - Lọc theo `q`, `specialtyId`, `teachingStatus`; phân trang `page`, `size` (§3).
 * - Tạo bằng cách B `POST /api/teachers` (§4.2) rồi hiện dialog mật khẩu tạm (§4.3).
 * - 5 state: loading / empty / error / success / không có quyền.
 * - BR-08: trạng thái dạy luôn là `Badge` **kèm chữ**, màu chỉ là tín hiệu phụ.
 */
export default function TeachersPage() {
  const notify = useNotify();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const isOwner = isOwnerRole(backendRoles);
  const canView = canViewTeachers(isOwner, permissions);
  const canEdit = canEditTeachers(isOwner, permissions);

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [specialtyId, setSpecialtyId] = useState<string | undefined>();
  const [teachingStatus, setTeachingStatus] = useState<string | undefined>();

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdTeacher, setCreatedTeacher] = useState<TeacherCreatedResponse | null>(null);
  const [specOpen, setSpecOpen] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);

  const form = useFormState<TeacherFormValues>(
    {
      staffCode: '',
      fullName: '',
      username: '',
      email: '',
      phone: '',
      departmentId: '',
      positionIds: [],
      specialtyIds: [],
      contractType: null,
    },
    {
      staffCode: (value) => {
        if (!value.trim()) return 'Vui lòng nhập mã nhân sự';
        return value.trim().length <= 50 ? undefined : 'Mã nhân sự tối đa 50 ký tự';
      },
      fullName: (value) => {
        if (!value.trim()) return 'Vui lòng nhập họ tên';
        return value.trim().length <= 200 ? undefined : 'Họ tên tối đa 200 ký tự';
      },
      username: (value) => {
        if (!value.trim()) return 'Vui lòng nhập tên đăng nhập';
        return USERNAME_PATTERN.test(value.trim())
          ? undefined
          : 'Chỉ dùng chữ, số và . _ - (3–100 ký tự)';
      },
      email: (value) => {
        if (!value.trim()) return 'Vui lòng nhập email';
        return EMAIL_PATTERN.test(value.trim()) ? undefined : 'Email không hợp lệ';
      },
      phone: (value) => {
        if (!value.trim()) return 'Vui lòng nhập số điện thoại';
        return PHONE_PATTERN.test(value.trim()) ? undefined : 'Số điện thoại không hợp lệ';
      },
      departmentId: (value) => (value ? undefined : 'Vui lòng chọn bộ phận'),
      positionIds: (value) =>
        value.length > 0 ? undefined : 'Cần chọn chức vụ Giáo viên',
      specialtyIds: (value) => (value.length > 0 ? undefined : MSG_TEACHER.SPECIALTY_REQUIRED),
    },
  );

  const specForm = useFormState<{ name: string }>(
    { name: '' },
    { name: (value) => (value.trim() ? undefined : 'Nhập tên chuyên môn') },
  );

  const listQuery = useQuery({
    queryKey: ['teachers', { page, size, keyword, specialtyId, teachingStatus }],
    queryFn: () =>
      fetchTeachers({
        page,
        size,
        q: keyword || undefined,
        specialtyId,
        teachingStatus,
      }),
    enabled: canView,
  });

  const specialtiesQuery = useQuery({
    queryKey: ['specialties'],
    queryFn: fetchSpecialties,
    enabled: canView,
  });

  const positionsQuery = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    enabled: createOpen,
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    enabled: createOpen,
  });

  const createMut = useMutation({
    mutationFn: createTeacher,
    onSuccess: (created) => {
      notify.success(MSG_TEACHER.CREATED);
      setCreateError(null);
      setCreateOpen(false);
      form.reset();
      // §4.3 — mật khẩu tạm chỉ hiện một lần, ngay sau khi tạo.
      setCreatedTeacher(created);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (error) => setCreateError(sprint4ErrorMessage(error)),
  });

  const createSpecMut = useMutation({
    mutationFn: createSpecialty,
    onSuccess: () => {
      notify.success(MSG_TEACHER.SPECIALTY_CREATED);
      setSpecError(null);
      specForm.reset();
      queryClient.invalidateQueries({ queryKey: ['specialties'] });
    },
    onError: (error) => setSpecError(sprint4ErrorMessage(error)),
  });

  const specialties = specialtiesQuery.data ?? [];
  const specialtyOptions = specialties.map((s) => ({ value: s.id, label: s.name }));

  // §4.1 — chỉ chức vụ TEACHER mới dùng để tạo giáo viên.
  const positions = positionsQuery.data ?? [];
  const hasProfileType = positions.some((p) => !!p.profileType);
  const teacherPositions = hasProfileType
    ? positions.filter((p) => p.profileType === 'TEACHER')
    : positions;
  const positionOptions = teacherPositions.map((p) => ({ value: p.id, label: p.name }));
  const missingTeacherPosition = hasProfileType && teacherPositions.length === 0;

  const departmentOptions = (departmentsQuery.data ?? []).map((d) => ({
    value: d.id,
    label: d.name,
  }));

  // Server là nguồn sự thật cho phân trang (§3): dùng số BE trả về để nhãn
  // `aria-rowindex` và số trang khớp dữ liệu đang hiện.
  const currentPage = listQuery.data?.page ?? page;
  const pageSize = listQuery.data?.size ?? size;
  const total = listQuery.data?.total ?? 0;
  const rows = (listQuery.data?.items ?? []) as TeacherRow[];

  const pagination = useTablePagination<TeacherRow>({
    page: currentPage,
    onPageChange: setPage,
    totalItems: total,
    pageSize,
    onPageSizeChange: (next) => {
      setSize(next);
      setPage(1);
    },
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    label: MSG_TEACHER.PAGINATION_LABEL,
  });

  const columns: TableColumn<TeacherRow>[] = [
    {
      key: 'staffCode',
      header: 'Mã nhân sự',
      width: pixel(130),
      renderCell: (row) =>
        row.staffCode ? (
          <Text type="supporting" style={numericStyle}>
            {row.staffCode}
          </Text>
        ) : (
          '—'
        ),
    },
    {
      key: 'fullName',
      header: 'Họ tên',
      width: proportional(1, { minWidth: 180 }),
      renderCell: (row) => (
        <AppLink to={`/dao-tao/giao-vien/${row.userId}`} weight="medium">
          {row.fullName || row.userId}
        </AppLink>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      width: pixel(220),
      renderCell: (row) => row.email || '—',
    },
    {
      key: 'phone',
      header: 'Số điện thoại',
      width: pixel(150),
      renderCell: (row) =>
        row.phone ? (
          <Text style={numericStyle}>{row.phone}</Text>
        ) : (
          '—'
        ),
    },
    {
      key: 'specialties',
      header: 'Chuyên môn',
      width: pixel(200),
      renderCell: (row) =>
        row.specialties && row.specialties.length > 0
          ? row.specialties.map((s) => s.name).join(', ')
          : '—',
    },
    {
      key: 'contractType',
      header: 'Loại hợp đồng',
      width: pixel(150),
      renderCell: (row) => labelOf(CONTRACT_TYPE_LABEL, row.contractType),
    },
    {
      key: 'teachingStatus',
      header: 'Trạng thái dạy',
      width: pixel(150),
      renderCell: (row) =>
        row.teachingStatus ? (
          <Badge
            variant={TEACHING_STATUS_BADGE[row.teachingStatus]}
            label={labelOf(TEACHING_STATUS_LABEL, row.teachingStatus)}
          />
        ) : (
          '—'
        ),
    },
    {
      key: 'classes',
      header: MSG_TEACHER.COL_CLASSES,
      width: pixel(160),
      // §3 — server tính `noClass`/`classLabel`, FE không tự đếm lại.
      renderCell: (row) =>
        row.noClass ? (
          <Text type="supporting">{row.classLabel || MSG_TEACHER.NO_CLASS}</Text>
        ) : (
          <Text hasTabularNumbers>{`${row.classCount ?? 0} lớp`}</Text>
        ),
    },
  ];

  if (canEdit) {
    columns.push({
      key: 'actions',
      header: 'Thao tác',
      width: pixel(90),
      renderCell: (row) => (
        <AppLink to={`/dao-tao/giao-vien/${row.userId}?edit=1`}>{MSG_TEACHER.EDIT}</AppLink>
      ),
    });
  }

  /** Áp từ khoá đang gõ và quay về trang 1 — dùng cho cả Enter lẫn nút "Tìm". */
  const applySearch = () => {
    setKeyword(keywordInput);
    setPage(1);
  };

  const openCreate = () => {
    form.reset();
    setCreateError(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateError(null);
    form.reset();
  };

  const openSpecialties = () => {
    specForm.reset();
    setSpecError(null);
    setSpecOpen(true);
  };

  const closeSpecialties = () => {
    setSpecOpen(false);
    setSpecError(null);
    specForm.reset();
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.validate()) return;

    createMut.mutate({
      departmentId: form.values.departmentId,
      username: form.values.username.trim(),
      email: form.values.email.trim(),
      role: 'STAFF',
      positionIds: form.values.positionIds,
      staffCode: form.values.staffCode.trim(),
      fullName: form.values.fullName.trim(),
      phone: form.values.phone.trim(),
      teacherProfile: {
        specialtyIds: form.values.specialtyIds,
        contractType: form.values.contractType,
      },
    });
  };

  const handleAddSpecialty = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!specForm.validate()) return;
    createSpecMut.mutate(specForm.values.name.trim());
  };

  const copyTemporaryPassword = async () => {
    if (!createdTeacher) return;
    try {
      await navigator.clipboard.writeText(createdTeacher.temporaryPassword);
      notify.success(MSG_S4.COPIED);
    } catch {
      notify.error('Không sao chép được tự động. Hãy chọn mật khẩu và sao chép thủ công.');
    }
  };

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        title={MSG_TEACHER.TITLE}
        extra={
          canEdit ? (
            <>
              <Button
                variant="secondary"
                size="lg"
                label={MSG_TEACHER.MANAGE_SPECIALTIES}
                onClick={openSpecialties}
              />
              <Button
                variant="primary"
                size="lg"
                label={MSG_TEACHER.CREATE}
                onClick={openCreate}
              />
            </>
          ) : undefined
        }
      >
        {canView ? (
          <HStack gap={3} wrap="wrap" justify="between" align="end">
            <HStack gap={3} wrap="wrap">
              <Selector
                label={MSG_TEACHER.SPECIALTY_ALL}
                isLabelHidden
                hasClear
                placeholder={MSG_TEACHER.SPECIALTY_ALL}
                options={specialtyOptions}
                isLoading={specialtiesQuery.isLoading}
                value={specialtyId ?? null}
                width={220}
                onChange={(value) => {
                  setSpecialtyId(value ?? undefined);
                  setPage(1);
                }}
              />
              <Selector
                label={MSG_TEACHER.STATUS_ALL}
                isLabelHidden
                hasClear
                placeholder={MSG_TEACHER.STATUS_ALL}
                options={TEACHING_STATUS_OPTIONS}
                value={teachingStatus ?? null}
                width={220}
                onChange={(value) => {
                  setTeachingStatus(value ?? undefined);
                  setPage(1);
                }}
              />
            </HStack>

            <HStack gap={2} wrap="wrap" align="end">
              <TextInput
                type="search"
                label={MSG_TEACHER.SEARCH_LABEL}
                isLabelHidden
                startIcon="search"
                enterKeyHint="search"
                hasClear
                placeholder={MSG_TEACHER.SEARCH_LABEL}
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
          title={MSG_TEACHER.LIST_LOAD_ERROR}
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
          <Text type="supporting">{teacherTotalLabel(total)}</Text>
          <Table<TeacherRow>
            data={rows}
            columns={columns}
            idKey="userId"
            hasHover
            textOverflow="truncate"
            // `aria-rowindex` phải tính theo trang hiện tại, không theo thứ tự
            // trong mảng một trang.
            rowIndexStart={(currentPage - 1) * pageSize + 1}
            rowCount={total}
            emptyState={<EmptyState description={MSG_TEACHER.EMPTY} compact />}
            plugins={{ pagination }}
          />
        </Stack>
      )}

      {/* Màn 2 — tạo giáo viên (§4). `purpose="form"`: bấm ra ngoài KHÔNG đóng
          để không mất dữ liệu đang nhập. */}
      <Dialog
        isOpen={createOpen}
        onOpenChange={(open) => {
          if (!open) closeCreate();
        }}
        purpose="form"
        width={720}
      >
        <DialogHeader
          title={MSG_TEACHER.CREATE}
          onOpenChange={(open) => {
            if (!open) closeCreate();
          }}
        />

        <form noValidate onSubmit={handleCreateSubmit} style={{ marginTop: 'var(--spacing-4)' }}>
          <VStack gap={4}>
            {createError ? (
              <Banner
                status="error"
                title={createError}
                collapsible={false}
                role="alert"
              />
            ) : null}
            {missingTeacherPosition ? (
              <Banner
                status="warning"
                title={MSG_TEACHER.POSITION_EMPTY_TEACHER}
                collapsible={false}
              />
            ) : null}

            <HStack gap={3} wrap="wrap">
              <TextInput
                label="Mã nhân sự"
                value={form.values.staffCode}
                onChange={(value) => form.setValue('staffCode', value)}
                placeholder="VD: GV001"
                autoComplete="off"
                isDisabled={createMut.isPending}
                aria-required="true"
                containerStyle={HALF_FIELD}
                status={
                  form.errorOf('staffCode')
                    ? { type: 'error', message: form.errorOf('staffCode') }
                    : undefined
                }
              />
              <TextInput
                label="Họ tên"
                value={form.values.fullName}
                onChange={(value) => form.setValue('fullName', value)}
                placeholder="Nguyễn Văn An"
                autoComplete="off"
                isDisabled={createMut.isPending}
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
              <TextInput
                label="Tên đăng nhập"
                value={form.values.username}
                onChange={(value) => form.setValue('username', value)}
                placeholder="gv.an"
                autoComplete="off"
                isDisabled={createMut.isPending}
                aria-required="true"
                containerStyle={HALF_FIELD}
                status={
                  form.errorOf('username')
                    ? { type: 'error', message: form.errorOf('username') }
                    : undefined
                }
              />
              <TextInput
                label="Email"
                type="email"
                value={form.values.email}
                onChange={(value) => form.setValue('email', value)}
                placeholder="an@example.edu.vn"
                autoComplete="off"
                isDisabled={createMut.isPending}
                aria-required="true"
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
                isDisabled={createMut.isPending}
                aria-required="true"
                containerStyle={HALF_FIELD}
                status={
                  form.errorOf('phone')
                    ? { type: 'error', message: form.errorOf('phone') }
                    : undefined
                }
              />
              <Selector
                label="Bộ phận"
                placeholder="Chọn bộ phận"
                options={departmentOptions}
                isLoading={departmentsQuery.isLoading}
                value={form.values.departmentId || undefined}
                onChange={(value) => form.setValue('departmentId', value)}
                isDisabled={createMut.isPending}
                aria-required="true"
                containerStyle={HALF_FIELD}
                status={
                  form.errorOf('departmentId')
                    ? { type: 'error', message: form.errorOf('departmentId') }
                    : undefined
                }
              />
            </HStack>

            <MultiSelector
              label="Chức vụ"
              placeholder="Chọn ít nhất một chức vụ Giáo viên"
              options={positionOptions}
              isLoading={positionsQuery.isLoading}
              value={form.values.positionIds}
              onChange={(value) => form.setValue('positionIds', value)}
              isDisabled={createMut.isPending}
              aria-required="true"
              status={
                form.errorOf('positionIds')
                  ? { type: 'error', message: form.errorOf('positionIds') }
                  : undefined
              }
            />

            <MultiSelector
              label="Chuyên môn"
              placeholder="Chọn chuyên môn"
              options={specialtyOptions}
              isLoading={specialtiesQuery.isLoading}
              value={form.values.specialtyIds}
              onChange={(value) => form.setValue('specialtyIds', value)}
              isDisabled={createMut.isPending}
              aria-required="true"
              status={
                form.errorOf('specialtyIds')
                  ? { type: 'error', message: form.errorOf('specialtyIds') }
                  : undefined
              }
            />

            <Selector
              label="Loại hợp đồng"
              placeholder="Không bắt buộc"
              hasClear
              options={CONTRACT_TYPE_OPTIONS}
              value={form.values.contractType}
              onChange={(value) => form.setValue('contractType', value as ContractType | null)}
              isDisabled={createMut.isPending}
            />

            {specialtiesQuery.isError ? (
              <Banner
                status="warning"
                title={MSG_TEACHER.SPECIALTY_LOAD_ERROR}
                collapsible={false}
              />
            ) : null}

            <HStack justify="end" gap={2}>
              <Button
                variant="secondary"
                size="lg"
                label={MSG_S4.CANCEL}
                onClick={closeCreate}
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                label={MSG_S4.CREATE}
                isLoading={createMut.isPending}
              />
            </HStack>
          </VStack>
        </form>
      </Dialog>

      {/* §4.3 — dialog mật khẩu tạm. `purpose="required"` chặn CẢ ESC lẫn bấm ra
          ngoài, và không render nút đóng ở header: mật khẩu chỉ hiện một lần nên
          người dùng phải bấm "Tôi đã lưu mật khẩu" để đóng. */}
      <Dialog
        isOpen={!!createdTeacher}
        onOpenChange={(open) => {
          if (!open) setCreatedTeacher(null);
        }}
        purpose="required"
        width={520}
      >
        <DialogHeader title={MSG_TEACHER.TEMP_PASSWORD_TITLE} />
        {createdTeacher ? (
          <VStack gap={3} style={{ marginTop: 'var(--spacing-4)' }}>
            <Text>
              <Text weight="semibold">{createdTeacher.fullName || '—'}</Text>
              {createdTeacher.staffCode ? ` — ${createdTeacher.staffCode}` : null}
            </Text>
            <Banner
              status="warning"
              title={MSG_TEACHER.TEMP_PASSWORD_HINT}
              collapsible={false}
            />
            <HStack gap={2} align="end">
              <TextInput
                label={MSG_TEACHER.TEMP_PASSWORD_LABEL}
                value={createdTeacher.temporaryPassword}
                onChange={() => {}}
                isReadOnly
                containerStyle={{ flex: 1, minWidth: 0 }}
              />
              <Button
                variant="secondary"
                size="lg"
                label={MSG_S4.COPY}
                onClick={copyTemporaryPassword}
              />
            </HStack>
            <HStack justify="end">
              <Button
                variant="primary"
                size="lg"
                label={MSG_TEACHER.TEMP_PASSWORD_DONE}
                onClick={() => setCreatedTeacher(null)}
              />
            </HStack>
          </VStack>
        ) : null}
      </Dialog>

      {/* Màn 4 — danh mục chuyên môn (dialog). */}
      <Dialog
        isOpen={specOpen}
        onOpenChange={(open) => {
          if (!open) closeSpecialties();
        }}
        width={480}
      >
        <DialogHeader
          title={MSG_TEACHER.MANAGE_SPECIALTIES}
          onOpenChange={(open) => {
            if (!open) closeSpecialties();
          }}
        />

        <VStack gap={4} style={{ marginTop: 'var(--spacing-4)' }}>
          {specError ? (
            <Banner status="error" title={specError} collapsible={false} role="alert" />
          ) : null}

          <form noValidate onSubmit={handleAddSpecialty}>
            <HStack gap={2} align="end">
              <TextInput
                label={MSG_TEACHER.SPECIALTY_PLACEHOLDER}
                isLabelHidden
                placeholder={MSG_TEACHER.SPECIALTY_PLACEHOLDER}
                value={specForm.values.name}
                onChange={(value) => specForm.setValue('name', value)}
                isDisabled={createSpecMut.isPending}
                containerStyle={{ flex: 1, minWidth: 0 }}
                status={
                  specForm.errorOf('name')
                    ? { type: 'error', message: specForm.errorOf('name') }
                    : undefined
                }
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                label={MSG_TEACHER.SPECIALTY_ADD}
                isLoading={createSpecMut.isPending}
              />
            </HStack>
          </form>

          {specialtiesQuery.isLoading ? (
            <Text type="supporting">{MSG_S4.LOADING}</Text>
          ) : specialtiesQuery.isError ? (
            <Banner
              status="error"
              title={MSG_TEACHER.SPECIALTY_LOAD_ERROR}
              collapsible={false}
              role="alert"
            />
          ) : specialties.length === 0 ? (
            <EmptyState compact description={MSG_TEACHER.SPECIALTY_EMPTY} />
          ) : (
            <HStack gap={2} wrap="wrap">
              {specialties.map((specialty) => (
                <Badge key={specialty.id} label={specialty.name} />
              ))}
            </HStack>
          )}
        </VStack>
      </Dialog>
    </Stack>
  );
}
