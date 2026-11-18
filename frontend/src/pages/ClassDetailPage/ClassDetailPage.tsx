import {
  Badge,
  Banner,
  Button,
  Dialog,
  DialogHeader,
  DropdownMenu,
  HStack,
  MetadataList,
  MetadataListItem,
  Pagination,
  RadioList,
  RadioListItem,
  Stack,
  Tab,
  TabList,
  Table,
  Text,
  TextArea,
  TextInput,
  VStack,
  pixel,
  proportional,
} from '@astryxdesign/core';
import type { DropdownMenuOption, TableColumn } from '@astryxdesign/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DetailSection from '../../components/DetailSection/DetailSection';
import EmptyState from '../../components/EmptyState/EmptyState';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { canViewClasses, hasPermission, isOwnerRole } from '../../features/auth/permissions';
import {
  CLASS_STATUS_BADGE,
  CLASS_STATUS_LABEL,
  CLOSE_ACTION_LABEL,
  CLOSE_STATE_BADGE,
  CLOSE_STATE_LABEL,
  TEACHING_STATUS_BADGE,
  TEACHING_STATUS_LABEL,
  formatDate,
  formatDateTime,
  formatPeriod,
  labelOf,
} from '../../features/sprint4/labels';
import { MSG_CLASS, MSG_S4 } from '../../features/sprint4/sprint4Messages';
import {
  approveClose,
  assignTeacher,
  cancelClass,
  fetchAssignableTeachers,
  fetchClassDetail,
  fetchCloseEvents,
  fetchStatusLogs,
  isForbiddenError,
  isNotFoundError,
  isStaleConflict,
  rejectClose,
  reopenClass,
  requestClose,
  sprint4ErrorMessage,
} from '../../features/sprint4/sprint4Api';
import type {
  AssignableTeacher,
  ClassDetail,
  CloseEventItem,
  StatusLogItem,
} from '../../features/sprint4/types';
import { useFormState } from '../../hooks/useFormState';
import { useNotify } from '../../hooks/useNotify';
import { useAuthStore } from '../../stores/authStore';

type ModalKind = 'assign' | 'cancel' | 'requestClose' | 'approve' | 'reject' | 'reopen' | null;

/** §6.4 — chỉ hủy được lớp chưa bắt đầu / đang diễn ra và chưa xin đóng. */
const CANCELLABLE_STATUSES = ['CHUA_BAT_DAU', 'DANG_DIEN_RA'];

/** Kích thước trang mặc định cho danh sách chọn giáo viên trong dialog. */
const ASSIGN_PAGE_SIZE = 10;

/**
 * `Table` của Astryx buộc `T extends Record<string, unknown>`, còn DTO là interface
 * nên không có index signature. Giao thêm `Record<string, unknown>` để thoả ràng
 * buộc mà **không** nới lỏng DTO — xem `docs/ui-conventions.md` mục 6.9.
 *
 * `rowKey` là field tổng hợp `${at}-${index}`: `idKey` của Astryx không nhận
 * index (antd `rowKey(record, index)` thì có), mà 2 tab lịch sử không có id ổn
 * định trong dữ liệu.
 */
type StatusLogRow = StatusLogItem & Record<string, unknown> & { rowKey: string };
type CloseEventRow = CloseEventItem & Record<string, unknown> & { rowKey: string };

/** Giá trị form của 3 dialog nhập lý do (hủy / từ chối / mở lại). */
type ReasonFormValues = { reason: string };

/** Giá trị form "Yêu cầu đóng" — ghi chú là tùy chọn. */
type RequestNoteFormValues = { note: string };

/** Ràng buộc chung cho lý do: bắt buộc (không chỉ khoảng trắng) + tối đa 500 ký tự. */
const REASON_VALIDATORS = {
  reason: (value: string) => {
    if (!value.trim()) return MSG_CLASS.REASON_REQUIRED;
    if (value.length > 500) return MSG_CLASS.REASON_MAX;
    return undefined;
  },
};

/**
 * Màn 6 — chi tiết lớp học (§6.2–§6.5).
 *
 * - Nút hành động đổi theo `status` + `closeState` + quyền; người gửi yêu cầu
 *   đóng không thấy nút Duyệt/Từ chối (đối chiếu sự kiện `REQUESTED` cuối).
 * - Mọi thao tác gửi kèm `version` đang đọc; 409 khoá lạc quan → tải lại, báo
 *   lỗi, không gửi lại version cũ.
 * - Lớp `CLOSED`: chỉ xem (không gán giáo viên).
 * - 5 state cho trang và cho 2 tab lịch sử.
 * - Một primary duy nhất (duyệt → hoặc yêu cầu đóng); hành động phá huỷ gom vào
 *   "Thao tác khác" và tô đỏ.
 */
export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const currentUserId = useAuthStore((s) => s.userId);
  const isOwner = isOwnerRole(backendRoles);
  const canView = canViewClasses(isOwner, permissions);

  const canAssign = isOwner || hasPermission(permissions, 'CLASS_ASSIGN_TEACHER');
  const canCancel = isOwner || hasPermission(permissions, 'CLASS_CANCEL');
  const canRequestClose = isOwner || hasPermission(permissions, 'CLASS_CLOSE_REQUEST');
  const canApproveClose = isOwner || hasPermission(permissions, 'CLASS_CLOSE_APPROVE');
  const canReopen = isOwner || hasPermission(permissions, 'CLASS_REOPEN');

  const [activeTab, setActiveTab] = useState('info');
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [assignPage, setAssignPage] = useState(1);
  const [assignKeywordInput, setAssignKeywordInput] = useState('');
  const [assignKeyword, setAssignKeyword] = useState('');

  const cancelForm = useFormState<ReasonFormValues>({ reason: '' }, REASON_VALIDATORS);
  const requestForm = useFormState<RequestNoteFormValues>({ note: '' });
  const rejectForm = useFormState<ReasonFormValues>({ reason: '' }, REASON_VALIDATORS);
  const reopenForm = useFormState<ReasonFormValues>({ reason: '' }, REASON_VALIDATORS);

  const detailQuery = useQuery({
    queryKey: ['class', id],
    queryFn: () => fetchClassDetail(id!),
    enabled: !!id && canView,
  });

  const logsQuery = useQuery({
    queryKey: ['class', id, 'status-logs'],
    queryFn: () => fetchStatusLogs(id!),
    enabled: !!id && canView,
  });

  const eventsQuery = useQuery({
    queryKey: ['class', id, 'close-events'],
    queryFn: () => fetchCloseEvents(id!),
    enabled: !!id && canView,
  });

  const assignableQuery = useQuery({
    queryKey: ['teachers', 'assignable', { assignPage, assignKeyword }],
    queryFn: () =>
      fetchAssignableTeachers({
        page: assignPage,
        size: ASSIGN_PAGE_SIZE,
        q: assignKeyword || undefined,
      }),
    enabled: modal === 'assign',
  });

  const detail = detailQuery.data;

  /** Sự kiện `REQUESTED` mới nhất → biết ai là người gửi yêu cầu đóng. */
  const latestRequesterId = useMemo(() => {
    const requested = (eventsQuery.data ?? []).filter((event) => event.action === 'REQUESTED');
    if (requested.length === 0) return null;
    const ranked = requested.map((event, index) => ({
      event,
      index,
      time: event.at ? Date.parse(event.at) : Number.NaN,
    }));
    ranked.sort((a, b) => {
      const at = Number.isNaN(a.time) ? Number.NEGATIVE_INFINITY : a.time;
      const bt = Number.isNaN(b.time) ? Number.NEGATIVE_INFINITY : b.time;
      return at === bt ? a.index - b.index : at - bt;
    });
    return ranked[ranked.length - 1].event.actorId ?? null;
  }, [eventsQuery.data]);

  const isRequester = !!currentUserId && latestRequesterId === currentUserId;

  /** Sau mọi thao tác: cập nhật cache chi tiết + làm mới danh sách/lịch sử. */
  const applyClassUpdate = (updated: ClassDetail) => {
    if (id) {
      queryClient.setQueryData(['class', id], updated);
      queryClient.invalidateQueries({ queryKey: ['class', id, 'status-logs'] });
      queryClient.invalidateQueries({ queryKey: ['class', id, 'close-events'] });
    }
    queryClient.invalidateQueries({ queryKey: ['classes'] });
    // §3 — số lớp của giáo viên thay đổi khi gán/đổi người phụ trách.
    queryClient.invalidateQueries({ queryKey: ['teachers'] });
  };

  const closeModal = () => {
    setModal(null);
    setModalError(null);
    cancelForm.reset();
    requestForm.reset();
    rejectForm.reset();
    reopenForm.reset();
    setSelectedTeacherId(null);
    setAssignKeyword('');
    setAssignKeywordInput('');
    setAssignPage(1);
  };

  const openModal = (kind: Exclude<ModalKind, null>) => {
    setModalError(null);
    setModal(kind);
  };

  /**
   * Lỗi khi thao tác: luôn báo lỗi (không bao giờ báo thành công — NFR-REL-001).
   * 409 khoá lạc quan → đóng modal, tải lại bản ghi mới nhất.
   */
  const handleMutationError = (error: unknown) => {
    const message = sprint4ErrorMessage(error);
    notify.error(message);
    if (isStaleConflict(error)) {
      setPageError(message);
      closeModal();
      void detailQuery.refetch();
      void eventsQuery.refetch();
      return;
    }
    setModalError(message);
  };

  const assignMut = useMutation({
    mutationFn: (teacherId: string) => {
      const version = detailQuery.data?.version;
      if (version == null) throw new Error(MSG_S4.INTERNAL_ERROR);
      return assignTeacher(id!, { teacherId, version });
    },
    onSuccess: (updated) => {
      notify.success(MSG_CLASS.ASSIGNED);
      applyClassUpdate(updated);
      closeModal();
    },
    onError: handleMutationError,
  });

  const cancelMut = useMutation({
    mutationFn: (reason: string) => {
      const version = detailQuery.data?.version;
      if (version == null) throw new Error(MSG_S4.INTERNAL_ERROR);
      return cancelClass(id!, { reason, version });
    },
    onSuccess: (updated) => {
      notify.success(MSG_CLASS.CANCELED);
      applyClassUpdate(updated);
      closeModal();
    },
    onError: handleMutationError,
  });

  const requestCloseMut = useMutation({
    mutationFn: (note: string | null) => requestClose(id!, { note }),
    onSuccess: (updated) => {
      notify.success(MSG_CLASS.CLOSE_REQUESTED);
      applyClassUpdate(updated);
      closeModal();
    },
    onError: handleMutationError,
  });

  const approveMut = useMutation({
    mutationFn: () => approveClose(id!),
    onSuccess: (updated) => {
      notify.success(MSG_CLASS.CLOSE_APPROVED);
      applyClassUpdate(updated);
      closeModal();
    },
    onError: handleMutationError,
  });

  const rejectMut = useMutation({
    mutationFn: (reason: string) => rejectClose(id!, { reason }),
    onSuccess: (updated) => {
      notify.success(MSG_CLASS.CLOSE_REJECTED);
      applyClassUpdate(updated);
      closeModal();
    },
    onError: handleMutationError,
  });

  const reopenMut = useMutation({
    mutationFn: (reason: string) => reopenClass(id!, { reason }),
    onSuccess: (updated) => {
      notify.success(MSG_CLASS.REOPENED);
      applyClassUpdate(updated);
      closeModal();
    },
    onError: handleMutationError,
  });

  const logColumns: TableColumn<StatusLogRow>[] = useMemo(
    () => [
      {
        key: 'at',
        header: 'Thời gian',
        width: pixel(170),
        renderCell: (row) => formatDateTime(row.at),
      },
      {
        key: 'actor',
        header: 'Người thực hiện',
        width: pixel(200),
        renderCell: (row) => row.actorName || row.actorId || '—',
      },
      {
        key: 'fromStatus',
        header: 'Từ trạng thái',
        width: pixel(150),
        renderCell: (row) =>
          row.fromStatus ? (
            <Badge
              variant={CLASS_STATUS_BADGE[row.fromStatus] ?? 'neutral'}
              label={labelOf(CLASS_STATUS_LABEL, row.fromStatus)}
            />
          ) : (
            '—'
          ),
      },
      {
        key: 'toStatus',
        header: 'Sang trạng thái',
        width: pixel(150),
        renderCell: (row) =>
          row.toStatus ? (
            <Badge
              variant={CLASS_STATUS_BADGE[row.toStatus] ?? 'neutral'}
              label={labelOf(CLASS_STATUS_LABEL, row.toStatus)}
            />
          ) : (
            '—'
          ),
      },
      {
        key: 'reason',
        header: 'Lý do/Ghi chú',
        width: proportional(1, { minWidth: 180 }),
        renderCell: (row) => row.reason || '—',
      },
    ],
    [],
  );

  const eventColumns: TableColumn<CloseEventRow>[] = useMemo(
    () => [
      {
        key: 'at',
        header: 'Thời gian',
        width: pixel(170),
        renderCell: (row) => formatDateTime(row.at),
      },
      {
        key: 'actor',
        header: 'Người thực hiện',
        width: pixel(200),
        renderCell: (row) => row.actorName || row.actorId || '—',
      },
      {
        key: 'action',
        header: 'Hành động',
        width: pixel(180),
        renderCell: (row) => labelOf(CLOSE_ACTION_LABEL, row.action),
      },
      {
        key: 'note',
        header: 'Lý do/Ghi chú',
        width: proportional(1, { minWidth: 180 }),
        renderCell: (row) => row.note || row.reason || '—',
      },
    ],
    [],
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
              onClick={() => navigate('/dao-tao/lop-hoc')}
            />
          }
        />
      );
    }
    return (
      <Banner
        status="error"
        title={MSG_CLASS.DETAIL_LOAD_ERROR}
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
              onClick={() => navigate('/dao-tao/lop-hoc')}
            />
          </HStack>
        }
      />
    );
  }

  if (!detail) {
    return <Banner status="warning" title={MSG_S4.NOT_FOUND} collapsible={false} />;
  }

  const classStatus = detail.status ?? null;
  const closeState = detail.closeState ?? 'NONE';
  const isClosed = closeState === 'CLOSED';
  const isFinished = classStatus === 'DA_KET_THUC' || classStatus === 'DA_HUY';
  const canChangeTeacher = canAssign && !isFinished && !isClosed;
  const canCancelClass =
    canCancel && closeState === 'NONE' && !!classStatus && CANCELLABLE_STATUSES.includes(classStatus);
  const canRequest = canRequestClose && closeState === 'NONE' && classStatus !== 'DA_HUY';
  const canApproveOrReject = closeState === 'PENDING' && canApproveClose && !isRequester;
  const canReopenClass = closeState === 'CLOSED' && canReopen;

  const submitAssign = () => {
    if (!selectedTeacherId) {
      setModalError(MSG_CLASS.ASSIGN_PICK);
      return;
    }
    setModalError(null);
    assignMut.mutate(selectedTeacherId);
  };

  const submitCancel = () => {
    if (!cancelForm.validate()) return;
    setModalError(null);
    cancelMut.mutate(cancelForm.values.reason.trim());
  };

  const submitRequest = () => {
    if (!requestForm.validate()) return;
    setModalError(null);
    const note = requestForm.values.note.trim();
    requestCloseMut.mutate(note ? note : null);
  };

  const submitReject = () => {
    if (!rejectForm.validate()) return;
    setModalError(null);
    rejectMut.mutate(rejectForm.values.reason.trim());
  };

  const submitReopen = () => {
    if (!reopenForm.validate()) return;
    setModalError(null);
    reopenMut.mutate(reopenForm.values.reason.trim());
  };

  const assignable: AssignableTeacher[] = assignableQuery.data?.items ?? [];
  const assignCurrentPage = assignableQuery.data?.page ?? assignPage;
  const assignPageSize = assignableQuery.data?.size ?? ASSIGN_PAGE_SIZE;
  const assignTotal = assignableQuery.data?.total ?? 0;

  const logRows: StatusLogRow[] = (logsQuery.data ?? []).map((item, index) => ({
    ...item,
    rowKey: `${item.at ?? ''}-${index}`,
  }));

  const eventRows: CloseEventRow[] = (eventsQuery.data ?? []).map((item, index) => ({
    ...item,
    rowKey: `${item.at ?? ''}-${index}`,
  }));

  /**
   * Một màn chỉ nên có **một** primary. Trước đây trang bày ra tới 6 nút cùng
   * lúc (gán GV, yêu cầu đóng, duyệt, từ chối, mở lại, huỷ) — mọi hành động
   * nặng như nhau, kể cả hành động phá huỷ nằm cạnh hành động thường.
   *
   * Giờ: primary = bước tiếp theo của quy trình (duyệt → hoặc yêu cầu đóng),
   * gán GV là nút phụ thường dùng, còn lại gom vào "Thao tác khác" (mục nguy
   * hiểm tô đỏ trong menu).
   */
  const primaryAction = canApproveOrReject
    ? { label: MSG_CLASS.APPROVE_CLOSE, onClick: () => openModal('approve') }
    : canRequest
      ? { label: MSG_CLASS.REQUEST_CLOSE, onClick: () => openModal('requestClose') }
      : null;

  const moreItems: DropdownMenuOption[] = [];
  if (canApproveOrReject) {
    moreItems.push({
      id: 'reject',
      label: MSG_CLASS.REJECT_CLOSE,
      variant: 'destructive',
      onClick: () => openModal('reject'),
    });
  }
  if (canRequest && primaryAction?.label !== MSG_CLASS.REQUEST_CLOSE) {
    moreItems.push({
      id: 'requestClose',
      label: MSG_CLASS.REQUEST_CLOSE,
      onClick: () => openModal('requestClose'),
    });
  }
  if (canReopenClass) {
    moreItems.push({
      id: 'reopen',
      label: MSG_CLASS.REOPEN,
      onClick: () => openModal('reopen'),
    });
  }
  if (canCancelClass) {
    moreItems.push({
      id: 'cancel',
      label: MSG_CLASS.CANCEL,
      variant: 'destructive',
      onClick: () => openModal('cancel'),
    });
  }

  return (
    <Stack direction="vertical" gap={4}>
      <PageHeader
        breadcrumb={[
          { title: MSG_CLASS.TITLE, href: '/dao-tao/lop-hoc' },
          { title: detail.classCode || detail.name || 'Lớp học' },
        ]}
        title={
          <span
            style={{
              display: 'inline-flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
            }}
          >
            <span>{detail.classCode || detail.name || 'Lớp học'}</span>
            {classStatus ? (
              <Badge
                variant={CLASS_STATUS_BADGE[classStatus] ?? 'neutral'}
                label={labelOf(CLASS_STATUS_LABEL, classStatus)}
              />
            ) : null}
            {closeState !== 'NONE' ? (
              <Badge
                variant={CLOSE_STATE_BADGE[closeState] ?? 'neutral'}
                label={labelOf(CLOSE_STATE_LABEL, closeState)}
              />
            ) : null}
          </span>
        }
        extra={
          canChangeTeacher || primaryAction || moreItems.length > 0 ? (
            <>
              {canChangeTeacher ? (
                <Button
                  variant="secondary"
                  size="lg"
                  label={MSG_CLASS.ASSIGN}
                  onClick={() => openModal('assign')}
                />
              ) : null}
              {primaryAction ? (
                <Button
                  variant="primary"
                  size="lg"
                  label={primaryAction.label}
                  onClick={primaryAction.onClick}
                />
              ) : null}
              {moreItems.length > 0 ? (
                <DropdownMenu
                  items={moreItems}
                  button={{ label: 'Thao tác khác', variant: 'secondary', size: 'lg' }}
                  placement="below"
                  alignment="end"
                />
              ) : null}
            </>
          ) : undefined
        }
      />

      {isClosed ? (
        <Banner
          status="info"
          title="Lớp đã đóng"
          description="Lớp đã đóng nên chỉ xem được thông tin. Hãy mở lại lớp nếu cần thay đổi."
          collapsible={false}
        />
      ) : null}

      {pageError ? (
        <Banner
          status="error"
          title={pageError}
          collapsible={false}
          role="alert"
          isDismissable
          onDismiss={() => setPageError(null)}
        />
      ) : null}

      <TabList
        value={activeTab}
        onChange={setActiveTab}
        role="tablist"
        hasDivider
        aria-label="Mục thông tin lớp học"
      >
        <Tab value="info" label={MSG_CLASS.TAB_INFO} panelId="class-panel-info" />
        <Tab value="status-logs" label={MSG_CLASS.TAB_STATUS_LOGS} panelId="class-panel-status-logs" />
        <Tab value="close-events" label={MSG_CLASS.TAB_CLOSE_EVENTS} panelId="class-panel-close-events" />
      </TabList>

      <div
        id={`class-panel-${activeTab}`}
        role="tabpanel"
        tabIndex={-1}
        style={{ paddingTop: 'var(--spacing-4)' }}
      >
        {activeTab === 'info' ? (
          <>
            <DetailSection title="Thông tin lớp">
              <MetadataList columns="multi" label={{ position: 'start', width: 170 }}>
                <MetadataListItem label="Mã lớp">{detail.classCode || '—'}</MetadataListItem>
                <MetadataListItem label="Tên lớp">{detail.name || '—'}</MetadataListItem>
                <MetadataListItem label="Năm học">{detail.academicYear || '—'}</MetadataListItem>
                <MetadataListItem label="Sĩ số">
                  <Text hasTabularNumbers>
                    {detail.studentCount == null ? '—' : detail.studentCount}
                  </Text>
                </MetadataListItem>
                <MetadataListItem label="Thời gian">
                  {formatPeriod(detail.startDate, detail.endDate)}
                </MetadataListItem>
                <MetadataListItem label={MSG_CLASS.TEACHER_SECTION}>
                  {detail.teacher?.fullName ? (
                    <HStack gap={1} wrap="wrap" align="center">
                      <Text weight="medium">{detail.teacher.fullName}</Text>
                      {detail.teacher.code ? (
                        <Text type="supporting">({detail.teacher.code})</Text>
                      ) : null}
                    </HStack>
                  ) : (
                    <Text type="supporting">{MSG_CLASS.TEACHER_UNASSIGNED}</Text>
                  )}
                </MetadataListItem>
                <MetadataListItem label="Ngày tạo">{formatDate(detail.createdAt)}</MetadataListItem>
                <MetadataListItem label="Cập nhật gần nhất">
                  {formatDateTime(detail.updatedAt)}
                </MetadataListItem>
              </MetadataList>
            </DetailSection>

            {detail.cancelReason || detail.closeRequestNote || detail.closeRejectReason ? (
              <DetailSection
                title="Ghi nhận đóng / huỷ lớp"
                description="Lấy từ lịch sử trạng thái và sự kiện đóng của lớp."
              >
                <MetadataList columns="single" label={{ position: 'start', width: 170 }}>
                  {detail.cancelReason ? (
                    <MetadataListItem label={MSG_CLASS.CANCEL_REASON_LABEL}>
                      {detail.cancelReason}
                    </MetadataListItem>
                  ) : null}
                  {detail.closeRequestNote ? (
                    <MetadataListItem label="Ghi chú yêu cầu đóng">
                      {detail.closeRequestNote}
                    </MetadataListItem>
                  ) : null}
                  {detail.closeRejectReason ? (
                    <MetadataListItem label={MSG_CLASS.REJECT_REASON_LABEL}>
                      {detail.closeRejectReason}
                    </MetadataListItem>
                  ) : null}
                </MetadataList>
              </DetailSection>
            ) : null}
          </>
        ) : null}

        {activeTab === 'status-logs' ? (
          logsQuery.isError ? (
            <Banner
              status="error"
              title={MSG_CLASS.LOGS_LOAD_ERROR}
              description={sprint4ErrorMessage(logsQuery.error)}
              collapsible={false}
              role="alert"
              endContent={
                <Button
                  variant="secondary"
                  size="sm"
                  label={MSG_S4.RETRY}
                  onClick={() => void logsQuery.refetch()}
                />
              }
            />
          ) : logsQuery.isLoading ? (
            <PageLoading />
          ) : (
            <Table<StatusLogRow>
              data={logRows}
              columns={logColumns}
              idKey="rowKey"
              density="compact"
              hasHover
              textOverflow="truncate"
              emptyState={<EmptyState compact description={MSG_CLASS.LOGS_EMPTY} />}
            />
          )
        ) : null}

        {activeTab === 'close-events' ? (
          eventsQuery.isError ? (
            <Banner
              status="error"
              title={MSG_CLASS.EVENTS_LOAD_ERROR}
              description={sprint4ErrorMessage(eventsQuery.error)}
              collapsible={false}
              role="alert"
              endContent={
                <Button
                  variant="secondary"
                  size="sm"
                  label={MSG_S4.RETRY}
                  onClick={() => void eventsQuery.refetch()}
                />
              }
            />
          ) : eventsQuery.isLoading ? (
            <PageLoading />
          ) : (
            <Table<CloseEventRow>
              data={eventRows}
              columns={eventColumns}
              idKey="rowKey"
              density="compact"
              hasHover
              textOverflow="truncate"
              emptyState={<EmptyState compact description={MSG_CLASS.EVENTS_EMPTY} />}
            />
          )
        ) : null}
      </div>

      {/* §6.3 — gán/đổi giáo viên: chỉ giáo viên DANG_DAY, có tìm kiếm + phân trang.
          Astryx `Table` không có chọn-hàng-đơn, nên danh sách dùng `RadioList`
          (chọn đúng 1) + `Pagination` riêng. `purpose="form"`: bấm ra ngoài KHÔNG
          đóng để không mất lựa chọn; ESC vẫn đóng như bản antd. */}
      <Dialog
        isOpen={modal === 'assign'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        purpose="form"
        width={720}
      >
        <DialogHeader
          title={MSG_CLASS.ASSIGN_TITLE}
          onOpenChange={(open) => {
            if (!open) closeModal();
          }}
        />

        <VStack gap={3} style={{ marginTop: 'var(--spacing-4)' }}>
          {modalError ? (
            <Banner status="error" title={modalError} collapsible={false} role="alert" />
          ) : null}

          <HStack gap={2} align="end" wrap="wrap">
            <TextInput
              type="search"
              label={MSG_CLASS.ASSIGN_SEARCH_LABEL}
              isLabelHidden
              startIcon="search"
              enterKeyHint="search"
              hasClear
              placeholder={MSG_CLASS.ASSIGN_SEARCH_LABEL}
              value={assignKeywordInput}
              containerStyle={{ flex: '1 1 240px', minWidth: 0 }}
              onChange={(value) => {
                setAssignKeywordInput(value);
                if (value === '') {
                  setAssignKeyword('');
                  setAssignPage(1);
                }
              }}
              onEnter={() => {
                setAssignKeyword(assignKeywordInput);
                setAssignPage(1);
              }}
            />
            <Button
              variant="secondary"
              size="lg"
              label={MSG_S4.SEARCH}
              onClick={() => {
                setAssignKeyword(assignKeywordInput);
                setAssignPage(1);
              }}
            />
          </HStack>

          {assignableQuery.isLoading ? (
            <Text type="supporting">{MSG_S4.LOADING}</Text>
          ) : assignable.length === 0 ? (
            <EmptyState compact description={MSG_CLASS.ASSIGN_EMPTY} />
          ) : (
            <RadioList
              label={MSG_CLASS.ASSIGN_LIST_LABEL}
              isLabelHidden
              value={selectedTeacherId ?? ''}
              onChange={setSelectedTeacherId}
              isDisabled={assignMut.isPending}
            >
              {assignable.map((teacher) => (
                <RadioListItem
                  key={teacher.userId}
                  value={teacher.userId}
                  label={teacher.fullName || teacher.userId}
                  description={teacher.staffCode || undefined}
                  endContent={
                    teacher.teachingStatus ? (
                      <Badge
                        variant={TEACHING_STATUS_BADGE[teacher.teachingStatus] ?? 'neutral'}
                        label={labelOf(TEACHING_STATUS_LABEL, teacher.teachingStatus)}
                      />
                    ) : undefined
                  }
                />
              ))}
            </RadioList>
          )}

          {assignTotal > 0 ? (
            <Pagination
              page={assignCurrentPage}
              onChange={setAssignPage}
              totalItems={assignTotal}
              pageSize={assignPageSize}
              label={MSG_CLASS.ASSIGN_PAGINATION_LABEL}
            />
          ) : null}

          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_S4.CANCEL} onClick={closeModal} />
            <Button
              variant="primary"
              size="lg"
              label={MSG_S4.CONFIRM}
              isDisabled={!selectedTeacherId}
              isLoading={assignMut.isPending}
              onClick={submitAssign}
            />
          </HStack>
        </VStack>
      </Dialog>

      {/* §6.4 — hủy lớp. */}
      <Dialog
        isOpen={modal === 'cancel'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        purpose="form"
      >
        <DialogHeader
          title={MSG_CLASS.CANCEL}
          onOpenChange={(open) => {
            if (!open) closeModal();
          }}
        />

        <VStack gap={3} style={{ marginTop: 'var(--spacing-4)' }}>
          {modalError ? (
            <Banner status="error" title={modalError} collapsible={false} role="alert" />
          ) : null}
          <TextArea
            label={MSG_CLASS.CANCEL_REASON_LABEL}
            value={cancelForm.values.reason}
            onChange={(value) => cancelForm.setValue('reason', value)}
            rows={3}
            isDisabled={cancelMut.isPending}
            aria-required="true"
            status={
              cancelForm.errorOf('reason')
                ? { type: 'error', message: cancelForm.errorOf('reason') }
                : undefined
            }
          />
          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_S4.CANCEL} onClick={closeModal} />
            <Button
              variant="destructive"
              size="lg"
              label={MSG_CLASS.CANCEL}
              isLoading={cancelMut.isPending}
              onClick={submitCancel}
            />
          </HStack>
        </VStack>
      </Dialog>

      {/* §6.5 — yêu cầu đóng lớp (note tùy chọn). */}
      <Dialog
        isOpen={modal === 'requestClose'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        purpose="form"
      >
        <DialogHeader
          title={MSG_CLASS.REQUEST_CLOSE}
          onOpenChange={(open) => {
            if (!open) closeModal();
          }}
        />

        <VStack gap={3} style={{ marginTop: 'var(--spacing-4)' }}>
          {modalError ? (
            <Banner status="error" title={modalError} collapsible={false} role="alert" />
          ) : null}
          <TextArea
            label={MSG_CLASS.REQUEST_NOTE_LABEL}
            value={requestForm.values.note}
            onChange={(value) => requestForm.setValue('note', value)}
            rows={3}
            isDisabled={requestCloseMut.isPending}
          />
          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_S4.CANCEL} onClick={closeModal} />
            <Button
              variant="primary"
              size="lg"
              label={MSG_S4.CONFIRM}
              isLoading={requestCloseMut.isPending}
              onClick={submitRequest}
            />
          </HStack>
        </VStack>
      </Dialog>

      <Dialog
        isOpen={modal === 'approve'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        purpose="info"
      >
        <DialogHeader
          title={MSG_CLASS.APPROVE_CLOSE}
          onOpenChange={(open) => {
            if (!open) closeModal();
          }}
        />

        <VStack gap={3} style={{ marginTop: 'var(--spacing-4)' }}>
          {modalError ? (
            <Banner status="error" title={modalError} collapsible={false} role="alert" />
          ) : null}
          <Text>{MSG_CLASS.APPROVE_CONFIRM}</Text>
          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_S4.CANCEL} onClick={closeModal} />
            <Button
              variant="primary"
              size="lg"
              label={MSG_CLASS.APPROVE_CLOSE}
              isLoading={approveMut.isPending}
              onClick={() => {
                setModalError(null);
                approveMut.mutate();
              }}
            />
          </HStack>
        </VStack>
      </Dialog>

      <Dialog
        isOpen={modal === 'reject'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        purpose="form"
      >
        <DialogHeader
          title={MSG_CLASS.REJECT_CLOSE}
          onOpenChange={(open) => {
            if (!open) closeModal();
          }}
        />

        <VStack gap={3} style={{ marginTop: 'var(--spacing-4)' }}>
          {modalError ? (
            <Banner status="error" title={modalError} collapsible={false} role="alert" />
          ) : null}
          <TextArea
            label={MSG_CLASS.REJECT_REASON_LABEL}
            value={rejectForm.values.reason}
            onChange={(value) => rejectForm.setValue('reason', value)}
            rows={3}
            isDisabled={rejectMut.isPending}
            aria-required="true"
            status={
              rejectForm.errorOf('reason')
                ? { type: 'error', message: rejectForm.errorOf('reason') }
                : undefined
            }
          />
          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_S4.CANCEL} onClick={closeModal} />
            <Button
              variant="destructive"
              size="lg"
              label={MSG_CLASS.REJECT_CLOSE}
              isLoading={rejectMut.isPending}
              onClick={submitReject}
            />
          </HStack>
        </VStack>
      </Dialog>

      <Dialog
        isOpen={modal === 'reopen'}
        onOpenChange={(open) => {
          if (!open) closeModal();
        }}
        purpose="form"
      >
        <DialogHeader
          title={MSG_CLASS.REOPEN}
          onOpenChange={(open) => {
            if (!open) closeModal();
          }}
        />

        <VStack gap={3} style={{ marginTop: 'var(--spacing-4)' }}>
          {modalError ? (
            <Banner status="error" title={modalError} collapsible={false} role="alert" />
          ) : null}
          <Text>{MSG_CLASS.REOPEN_CONFIRM}</Text>
          <TextArea
            label={MSG_CLASS.REOPEN_REASON_LABEL}
            value={reopenForm.values.reason}
            onChange={(value) => reopenForm.setValue('reason', value)}
            rows={3}
            isDisabled={reopenMut.isPending}
            aria-required="true"
            status={
              reopenForm.errorOf('reason')
                ? { type: 'error', message: reopenForm.errorOf('reason') }
                : undefined
            }
          />
          <HStack justify="end" gap={2}>
            <Button variant="secondary" size="lg" label={MSG_S4.CANCEL} onClick={closeModal} />
            <Button
              variant="primary"
              size="lg"
              label={MSG_CLASS.REOPEN}
              isLoading={reopenMut.isPending}
              onClick={submitReopen}
            />
          </HStack>
        </VStack>
      </Dialog>
    </Stack>
  );
}
