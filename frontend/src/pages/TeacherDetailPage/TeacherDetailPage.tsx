import {
  Badge,
  Banner,
  Button,
  Dialog,
  DialogHeader,
  HStack,
  MetadataList,
  MetadataListItem,
  MultiSelector,
  pixel,
  proportional,
  Selector,
  Stack,
  Tab,
  TabList,
  Table,
  Text,
  TextInput,
  VStack,
} from '@astryxdesign/core';
import type { TableColumn } from '@astryxdesign/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppLink } from '../../components/AppLink/AppLink';
import DetailSection from '../../components/DetailSection/DetailSection';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { canEditTeachers, canViewTeachers, isOwnerRole } from '../../features/auth/permissions';
import {
  CLASS_STATUS_BADGE,
  CLASS_STATUS_LABEL,
  CLOSE_STATE_BADGE,
  CLOSE_STATE_LABEL,
  CONTRACT_TYPE_LABEL,
  FIELD_LABEL,
  TEACHER_HISTORY_ACTION_LABEL,
  TEACHING_STATUS_BADGE,
  TEACHING_STATUS_LABEL,
  formatChangeValue,
  formatDate,
  formatDateTime,
  labelOf,
} from '../../features/sprint4/labels';
import { MSG_S4, MSG_TEACHER } from '../../features/sprint4/sprint4Messages';
import {
  fetchDepartments,
  fetchPositions,
  fetchSpecialties,
  fetchTeacherDetail,
  isForbiddenError,
  isMismatchError,
  isNotFoundError,
  isStaleConflict,
  sprint4ErrorMessage,
  updateTeacher,
} from '../../features/sprint4/sprint4Api';
import type {
  ContractType,
  SpecialtyMismatchClass,
  TeacherClass,
  TeacherUpdatePayload,
} from '../../features/sprint4/types';
import { useFormState } from '../../hooks/useFormState';
import { useNotify } from '../../hooks/useNotify';
import { useAuthStore } from '../../stores/authStore';

const CONTRACT_TYPE_OPTIONS = [
  { value: 'CO_HUU', label: CONTRACT_TYPE_LABEL.CO_HUU },
  { value: 'THINH_GIANG', label: CONTRACT_TYPE_LABEL.THINH_GIANG },
];

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn `TeacherClass`
 * là interface nên không có index signature. Giao thêm `Record<string, unknown>`
 * để thoả ràng buộc mà **không** nới lỏng DTO — xem `docs/ui-conventions.md` 6.9.
 */
type TeacherRow = TeacherClass & Record<string, unknown>;

/**
 * Giá trị form sửa hồ sơ (§5). `staffCode` chỉ đọc nên không nằm trong payload.
 *
 * Là `type` chứ không phải `interface`: `useFormState<T>` buộc
 * `T extends Record<string, unknown>`, và chỉ type alias của object literal mới
 * có index signature ngầm.
 */
type TeacherEditFormValues = {
  staffCode: string;
  fullName: string;
  email: string;
  phone: string;
  specialtyIds: string[];
  contractType: ContractType | null;
};

/** Ô nửa hàng của form: đủ rộng thì hai cột, hẹp thì tự xuống một cột. */
const HALF_FIELD: CSSProperties = { flex: '1 1 240px', minWidth: 0 };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(\+84|0)\d{9,10}$/;

/**
 * Màn 3 — chi tiết & sửa giáo viên (§5).
 *
 * - 3 tab: Thông tin / Lớp phụ trách / Lịch sử thay đổi.
 * - Sửa tại chỗ với `version` đang đọc; 409 `SPECIALTY_MISMATCH` mở dialog xác
 *   nhận rồi gửi lại **cùng payload** với `confirm: true`.
 * - 409 `DATA_CHANGED`: báo lỗi + tải lại, không gửi lại version cũ (§8.1).
 * - 5 state: loading / empty / error / success / không có quyền.
 */
export default function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const isOwner = isOwnerRole(backendRoles);
  const canView = canViewTeachers(isOwner, permissions);
  const canEdit = canEditTeachers(isOwner, permissions);

  const [activeTab, setActiveTab] = useState('info');
  const [editing, setEditing] = useState(() => searchParams.get('edit') === '1');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<{
    classes: SpecialtyMismatchClass[];
    payload: TeacherUpdatePayload;
  } | null>(null);

  const form = useFormState<TeacherEditFormValues>(
    {
      staffCode: '',
      fullName: '',
      email: '',
      phone: '',
      specialtyIds: [],
      contractType: null,
    },
    {
      fullName: (value) => {
        if (!value.trim()) return 'Vui lòng nhập họ tên';
        return value.trim().length <= 200 ? undefined : 'Họ tên tối đa 200 ký tự';
      },
      phone: (value) => {
        if (!value.trim()) return 'Vui lòng nhập số điện thoại';
        return PHONE_PATTERN.test(value.trim()) ? undefined : 'Số điện thoại không hợp lệ';
      },
      email: (value) => {
        if (!value.trim()) return 'Vui lòng nhập email';
        return EMAIL_PATTERN.test(value.trim()) ? undefined : 'Email không hợp lệ';
      },
      specialtyIds: (value) => (value.length > 0 ? undefined : MSG_TEACHER.SPECIALTY_REQUIRED),
    },
  );
  // `reset` có identity ổn định (useCallback deps rỗng) — tách ra để effect bên
  // dưới không phải phụ thuộc vào cả object `form` (đổi mỗi render).
  const resetForm = form.reset;

  // `?edit=1` chỉ dùng một lần để mở form; xoá khỏi URL để reload không mở lại.
  useEffect(() => {
    if (searchParams.has('edit')) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const detailQuery = useQuery({
    queryKey: ['teacher', id],
    queryFn: () => fetchTeacherDetail(id!),
    enabled: !!id && canView,
  });

  const specialtiesQuery = useQuery({
    queryKey: ['specialties'],
    queryFn: fetchSpecialties,
    enabled: canView,
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
    enabled: canView,
  });

  const positionsQuery = useQuery({
    queryKey: ['positions'],
    queryFn: fetchPositions,
    enabled: canView,
  });

  const teacher = detailQuery.data;

  const specialties = specialtiesQuery.data ?? [];
  const specialtyOptions = specialties.map((s) => ({ value: s.id, label: s.name }));
  const specialtyName = useMemo(() => {
    const map = new Map((specialtiesQuery.data ?? []).map((s) => [s.id, s.name]));
    return (specialtyId: string) => map.get(specialtyId) ?? specialtyId;
  }, [specialtiesQuery.data]);

  const departmentName = useMemo(() => {
    const map = new Map((departmentsQuery.data ?? []).map((d) => [d.id, d.name]));
    return (departmentId?: string | null) => (departmentId ? map.get(departmentId) ?? departmentId : '—');
  }, [departmentsQuery.data]);

  const positionNames = useMemo(() => {
    const map = new Map((positionsQuery.data ?? []).map((p) => [p.id, p.name]));
    return (positionIds?: string[] | null) =>
      (positionIds ?? []).map((pid) => map.get(pid) ?? pid);
  }, [positionsQuery.data]);

  // Đổ dữ liệu vào form mỗi khi mở form (kể cả khi mở bằng `?edit=1`).
  useEffect(() => {
    if (!teacher || !editing) return;
    resetForm({
      staffCode: teacher.staffCode ?? '',
      fullName: teacher.fullName ?? '',
      email: teacher.email ?? '',
      phone: teacher.phone ?? '',
      specialtyIds: (teacher.specialties ?? []).map((s) => s.id),
      contractType: teacher.contractType ?? null,
    });
  }, [teacher, editing, resetForm]);

  const refreshAfterSave = () => {
    if (id) {
      queryClient.invalidateQueries({ queryKey: ['teacher', id] });
    }
    // §3: đổi chuyên môn có thể đổi nhãn "lớp đang phụ trách" ở danh sách.
    queryClient.invalidateQueries({ queryKey: ['teachers'] });
    queryClient.invalidateQueries({ queryKey: ['classes'] });
  };

  const saveMut = useMutation({
    mutationFn: (payload: TeacherUpdatePayload) => updateTeacher(id!, payload),
    onSuccess: () => {
      notify.success(MSG_TEACHER.UPDATED);
      setSaveError(null);
      setEditing(false);
      setMismatch(null);
      refreshAfterSave();
    },
    onError: (error, payload) => {
      // §5.1 — lệch môn: mở dialog xác nhận, KHÔNG báo thành công.
      if (isMismatchError(error)) {
        setSaveError(null);
        setMismatch({ classes: error.mismatchClasses, payload });
        return;
      }
      setSaveError(sprint4ErrorMessage(error));
      notify.error(sprint4ErrorMessage(error));
      // §8.1 — dữ liệu đã đổi: tải lại, thoát form, không gửi lại version cũ.
      if (isStaleConflict(error)) {
        setEditing(false);
        void detailQuery.refetch();
      }
    },
  });

  const confirmMismatchMut = useMutation({
    mutationFn: (payload: TeacherUpdatePayload) => updateTeacher(id!, { ...payload, confirm: true }),
    onSuccess: () => {
      notify.success(MSG_TEACHER.UPDATED);
      setMismatch(null);
      setSaveError(null);
      setEditing(false);
      refreshAfterSave();
    },
    onError: (error) => {
      notify.error(sprint4ErrorMessage(error));
      setSaveError(sprint4ErrorMessage(error));
      if (isStaleConflict(error)) {
        setMismatch(null);
        setEditing(false);
        void detailQuery.refetch();
      }
    },
  });

  const startEdit = () => {
    setSaveError(null);
    setActiveTab('info');
    setEditing(true);
  };

  const cancelEdit = () => {
    setSaveError(null);
    setEditing(false);
    resetForm();
  };

  const submitEdit = () => {
    if (!teacher) return;
    if (!form.validate()) return;
    saveMut.mutate({
      fullName: form.values.fullName.trim(),
      email: form.values.email.trim(),
      phone: form.values.phone.trim(),
      specialtyIds: form.values.specialtyIds,
      contractType: form.values.contractType ?? null,
      version: teacher.version,
      confirm: false,
    });
  };

  const classColumns: TableColumn<TeacherRow>[] = useMemo(
    () => [
      {
        key: 'classCode',
        header: 'Mã lớp',
        width: pixel(140),
        renderCell: (row) => (
          <AppLink to={`/dao-tao/lop-hoc/${row.id}`} weight="medium">
            {row.classCode || row.id}
          </AppLink>
        ),
      },
      {
        key: 'name',
        header: 'Tên lớp',
        width: proportional(1, { minWidth: 180 }),
        renderCell: (row) => row.name || '—',
      },
      {
        key: 'status',
        header: 'Trạng thái',
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
        key: 'closeState',
        header: 'Trạng thái đóng',
        width: pixel(170),
        renderCell: (row) =>
          row.closeState && row.closeState !== 'NONE' ? (
            <Badge
              variant={CLOSE_STATE_BADGE[row.closeState] ?? 'neutral'}
              label={labelOf(CLOSE_STATE_LABEL, row.closeState)}
            />
          ) : (
            <Text type="supporting">—</Text>
          ),
      },
    ],
    [],
  );

  /**
   * Lịch sử thay đổi — thay cho dạng timeline. Mỗi mục là một khối "nhật ký"
   * (hành động → ai/lúc nào → các thay đổi), hiển thị bằng `VStack` + hairline
   * giữa các mục để dễ đọc.
   */
  const historyRows = useMemo(
    () =>
      (teacher?.history ?? []).map((item, index) => ({
        key: `${item.action}-${index}`,
        action: labelOf(TEACHER_HISTORY_ACTION_LABEL, item.action),
        actor: item.actorName || item.actorUserId || '—',
        at: formatDateTime(item.createdAt),
        changes: Object.entries(item.details ?? {}).map(([field, diff]) => ({
          field,
          label: labelOf(FIELD_LABEL, field),
          before: formatChangeValue(diff?.before, specialtyName),
          after: formatChangeValue(diff?.after, specialtyName),
        })),
      })),
    [teacher?.history, specialtyName],
  );

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
          endContent={
            <Button
              variant="secondary"
              size="sm"
              label={MSG_S4.BACK}
              onClick={() => navigate('/dao-tao/giao-vien')}
            />
          }
        />
      );
    }
    return (
      <Banner
        status="error"
        title={MSG_TEACHER.DETAIL_LOAD_ERROR}
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
              label={MSG_S4.BACK}
              onClick={() => navigate('/dao-tao/giao-vien')}
            />
          </HStack>
        }
      />
    );
  }

  if (!teacher) {
    return <Banner status="warning" title={MSG_S4.NOT_FOUND} collapsible={false} />;
  }

  const specialtyBadges =
    (teacher.specialties ?? []).length > 0 ? (
      <HStack gap={2} wrap="wrap">
        {(teacher.specialties ?? []).map((specialty) => (
          <Badge key={specialty.id} variant="neutral" label={specialty.name} />
        ))}
      </HStack>
    ) : (
      '—'
    );

  const positionNamesList = positionNames(teacher.positionIds);
  const showEditForm = canEdit && editing;

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        breadcrumb={[
          { title: MSG_TEACHER.TITLE, href: '/dao-tao/giao-vien' },
          { title: teacher.fullName || teacher.staffCode || 'Giáo viên' },
        ]}
        title={teacher.fullName || teacher.staffCode || 'Giáo viên'}
        extra={
          canEdit && activeTab === 'info' ? (
            showEditForm ? (
              <HStack gap={2} wrap="wrap">
                <Button variant="secondary" size="lg" label={MSG_S4.CANCEL} onClick={cancelEdit} />
                <Button
                  variant="primary"
                  size="lg"
                  label={MSG_S4.SAVE}
                  isLoading={saveMut.isPending}
                  onClick={submitEdit}
                />
              </HStack>
            ) : (
              <Button variant="primary" size="lg" label={MSG_TEACHER.EDIT} onClick={startEdit} />
            )
          ) : undefined
        }
      />

      <TabList
        value={activeTab}
        onChange={setActiveTab}
        role="tablist"
        hasDivider
        aria-label="Mục thông tin giáo viên"
      >
        <Tab value="info" label={MSG_TEACHER.TAB_INFO} panelId="teacher-panel-info" />
        <Tab
          value="classes"
          label={`${MSG_TEACHER.TAB_CLASSES} (${(teacher.classes ?? []).length})`}
          panelId="teacher-panel-classes"
        />
        <Tab value="history" label={MSG_TEACHER.TAB_HISTORY} panelId="teacher-panel-history" />
      </TabList>

      <div
        id={`teacher-panel-${activeTab}`}
        role="tabpanel"
        tabIndex={-1}
        style={{ paddingTop: 'var(--spacing-4)' }}
      >
        {activeTab === 'info' ? (
          showEditForm ? (
            <VStack gap={3} style={{ maxWidth: 760 }}>
              {saveError ? (
                <Banner status="error" title={saveError} collapsible={false} role="alert" />
              ) : null}

              <form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  submitEdit();
                }}
              >
                <VStack gap={4}>
                  <TextInput
                    label="Mã nhân sự"
                    value={form.values.staffCode}
                    onChange={(value) => form.setValue('staffCode', value)}
                    isReadOnly
                    description={MSG_TEACHER.STAFF_CODE_LOCKED}
                  />

                  <HStack gap={3} wrap="wrap">
                    <TextInput
                      label="Họ tên"
                      value={form.values.fullName}
                      onChange={(value) => form.setValue('fullName', value)}
                      autoComplete="off"
                      isDisabled={saveMut.isPending}
                      aria-required="true"
                      containerStyle={HALF_FIELD}
                      status={
                        form.errorOf('fullName')
                          ? { type: 'error', message: form.errorOf('fullName') }
                          : undefined
                      }
                    />
                    <TextInput
                      label="Số điện thoại"
                      type="tel"
                      value={form.values.phone}
                      onChange={(value) => form.setValue('phone', value)}
                      autoComplete="off"
                      isDisabled={saveMut.isPending}
                      aria-required="true"
                      containerStyle={HALF_FIELD}
                      status={
                        form.errorOf('phone')
                          ? { type: 'error', message: form.errorOf('phone') }
                          : undefined
                      }
                    />
                  </HStack>

                  <TextInput
                    label="Email"
                    type="email"
                    value={form.values.email}
                    onChange={(value) => form.setValue('email', value)}
                    autoComplete="off"
                    isDisabled={saveMut.isPending}
                    aria-required="true"
                    status={
                      form.errorOf('email')
                        ? { type: 'error', message: form.errorOf('email') }
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
                    isDisabled={saveMut.isPending}
                    aria-required="true"
                    description="Đổi chuyên môn có thể làm lệch môn của lớp đang phụ trách — hệ thống sẽ hỏi lại."
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
                    isDisabled={saveMut.isPending}
                  />

                  {specialtiesQuery.isError ? (
                    <Banner
                      status="warning"
                      title={MSG_TEACHER.SPECIALTY_LOAD_ERROR}
                      collapsible={false}
                    />
                  ) : null}
                </VStack>
              </form>
            </VStack>
          ) : (
            <DetailSection
              title="Hồ sơ giáo viên"
              description="Thông tin nhân sự và chuyên môn đang áp dụng."
            >
              <MetadataList columns="multi" label={{ position: 'start', width: 170 }}>
                <MetadataListItem label="Mã nhân sự">{teacher.staffCode || '—'}</MetadataListItem>
                <MetadataListItem label="Họ tên">{teacher.fullName || '—'}</MetadataListItem>
                <MetadataListItem label="Email">{teacher.email || '—'}</MetadataListItem>
                <MetadataListItem label="Số điện thoại">
                  {teacher.phone || '—'}
                </MetadataListItem>
                <MetadataListItem label="Bộ phận">
                  {departmentName(teacher.departmentId)}
                </MetadataListItem>
                <MetadataListItem label="Chức vụ">
                  {positionNamesList.length > 0 ? (
                    <HStack gap={2} wrap="wrap">
                      {positionNamesList.map((name, index) => (
                        <Badge key={`${name}-${index}`} variant="neutral" label={name} />
                      ))}
                    </HStack>
                  ) : (
                    '—'
                  )}
                </MetadataListItem>
                <MetadataListItem label="Chuyên môn">{specialtyBadges}</MetadataListItem>
                <MetadataListItem label="Loại hợp đồng">
                  {labelOf(CONTRACT_TYPE_LABEL, teacher.contractType)}
                </MetadataListItem>
                <MetadataListItem label="Trạng thái dạy">
                  {teacher.teachingStatus ? (
                    <Badge
                      variant={TEACHING_STATUS_BADGE[teacher.teachingStatus] ?? 'neutral'}
                      label={labelOf(TEACHING_STATUS_LABEL, teacher.teachingStatus)}
                    />
                  ) : (
                    '—'
                  )}
                </MetadataListItem>
                <MetadataListItem label="Ngày tạo">
                  {formatDate(teacher.createdAt)}
                </MetadataListItem>
                <MetadataListItem label="Cập nhật gần nhất">
                  {formatDateTime(teacher.updatedAt)}
                </MetadataListItem>
              </MetadataList>
            </DetailSection>
          )
        ) : null}

        {activeTab === 'classes' ? (
          <Table<TeacherRow>
            data={(teacher.classes ?? []) as TeacherRow[]}
            columns={classColumns}
            idKey="id"
            hasHover
            textOverflow="truncate"
            emptyState={<EmptyState compact description={MSG_TEACHER.CLASSES_EMPTY} />}
          />
        ) : null}

        {activeTab === 'history' ? (
          historyRows.length === 0 ? (
            <EmptyState description={MSG_TEACHER.HISTORY_EMPTY} />
          ) : (
            <VStack gap={0}>
              {historyRows.map((item, index) => (
                <VStack
                  key={item.key}
                  gap={1}
                  style={{
                    paddingBlock: 'var(--spacing-3)',
                    borderTop: index === 0 ? undefined : '1px solid var(--color-border)',
                  }}
                >
                  <Text weight="medium">{item.action}</Text>
                  <Text type="supporting">
                    {item.actor} · {item.at}
                  </Text>
                  {item.changes.length > 0 ? (
                    <ul style={{ margin: 0, paddingInlineStart: 20 }}>
                      {item.changes.map((change) => (
                        <li key={change.field}>
                          {change.label}: {change.before} → {change.after}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </VStack>
              ))}
            </VStack>
          )
        ) : null}
      </div>

      {/* §5.1 — xác nhận khi đổi chuyên môn làm lệch môn lớp đang phụ trách.
          `purpose="form"`: bấm ra ngoài KHÔNG đóng để không mất ngữ cảnh. */}
      <Dialog
        isOpen={!!mismatch}
        onOpenChange={(open) => {
          if (!open) setMismatch(null);
        }}
        purpose="form"
        width={560}
      >
        <DialogHeader
          title={MSG_TEACHER.MISMATCH_TITLE}
          onOpenChange={(open) => {
            if (!open) setMismatch(null);
          }}
        />

        <VStack gap={3} style={{ marginTop: 'var(--spacing-4)' }}>
          {saveError ? (
            <Banner status="error" title={saveError} collapsible={false} role="alert" />
          ) : null}
          <Text>{MSG_TEACHER.MISMATCH_DESC}</Text>
          <ul style={{ margin: 0, paddingInlineStart: 20 }}>
            {(mismatch?.classes ?? []).map((item, index) => (
              <li key={item.id ?? index}>{item.name || item.id || '—'}</li>
            ))}
          </ul>
          <HStack justify="end" gap={2}>
            <Button
              variant="secondary"
              size="lg"
              label={MSG_S4.CANCEL}
              onClick={() => setMismatch(null)}
            />
            <Button
              variant="primary"
              size="lg"
              label={MSG_TEACHER.CONFIRM_UPDATE}
              isLoading={confirmMismatchMut.isPending}
              onClick={() => {
                if (mismatch) confirmMismatchMut.mutate(mismatch.payload);
              }}
            />
          </HStack>
        </VStack>
      </Dialog>
    </Stack>
  );
}
