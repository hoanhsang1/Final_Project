import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import { useNotify } from '../../components/LiveAnnouncer/LiveAnnouncer';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { canViewClasses, hasPermission, isOwnerRole } from '../../features/auth/permissions';
import {
  CLASS_STATUS_LABEL,
  CLASS_STATUS_TAG,
  CLOSE_ACTION_LABEL,
  CLOSE_STATE_LABEL,
  CLOSE_STATE_TAG,
  TEACHING_STATUS_LABEL,
  TEACHING_STATUS_TAG,
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
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;
const { TextArea } = Input;

type ModalKind = 'assign' | 'cancel' | 'requestClose' | 'approve' | 'reject' | 'reopen' | null;

/** §6.4 — chỉ hủy được lớp chưa bắt đầu / đang diễn ra và chưa xin đóng. */
const CANCELLABLE_STATUSES = ['CHUA_BAT_DAU', 'DANG_DIEN_RA'];

/** Kích thước trang mặc định cho bảng chọn giáo viên trong modal. */
const ASSIGN_PAGE_SIZE = 10;

/**
 * Màn 6 — chi tiết lớp học (§6.2–§6.5).
 *
 * - Nút hành động đổi theo `status` + `closeState` + quyền; người gửi yêu cầu
 *   đóng không thấy nút Duyệt/Từ chối (đối chiếu sự kiện `REQUESTED` cuối).
 * - Mọi thao tác gửi kèm `version` đang đọc; 409 khoá lạc quan → tải lại, báo
 *   lỗi, không gửi lại version cũ.
 * - Lớp `CLOSED`: chỉ xem (không gán giáo viên).
 * - 5 state cho trang và cho 2 tab lịch sử.
 */
export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = theme.useToken();
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

  const [modal, setModal] = useState<ModalKind>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [assignPage, setAssignPage] = useState(1);
  const [assignKeywordInput, setAssignKeywordInput] = useState('');
  const [assignKeyword, setAssignKeyword] = useState('');

  const [cancelForm] = Form.useForm<{ reason: string }>();
  const [requestForm] = Form.useForm<{ note?: string }>();
  const [rejectForm] = Form.useForm<{ reason: string }>();
  const [reopenForm] = Form.useForm<{ reason: string }>();

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
    cancelForm.resetFields();
    requestForm.resetFields();
    rejectForm.resetFields();
    reopenForm.resetFields();
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

  const logColumns = useMemo<ColumnsType<StatusLogItem>>(
    () => [
      {
        title: 'Thời gian',
        dataIndex: 'at',
        width: 170,
        render: (value: string | null | undefined) => formatDateTime(value),
      },
      {
        title: 'Người thực hiện',
        key: 'actor',
        width: 200,
        render: (_, record) => record.actorName || record.actorId || '—',
      },
      {
        title: 'Từ trạng thái',
        dataIndex: 'fromStatus',
        width: 150,
        render: (value: string | null | undefined) =>
          value ? <Tag color={CLASS_STATUS_TAG[value]}>{labelOf(CLASS_STATUS_LABEL, value)}</Tag> : '—',
      },
      {
        title: 'Sang trạng thái',
        dataIndex: 'toStatus',
        width: 150,
        render: (value: string | null | undefined) =>
          value ? <Tag color={CLASS_STATUS_TAG[value]}>{labelOf(CLASS_STATUS_LABEL, value)}</Tag> : '—',
      },
      {
        title: 'Lý do/Ghi chú',
        dataIndex: 'reason',
        render: (value: string | null | undefined) => value || '—',
      },
    ],
    [],
  );

  const eventColumns = useMemo<ColumnsType<CloseEventItem>>(
    () => [
      {
        title: 'Thời gian',
        dataIndex: 'at',
        width: 170,
        render: (value: string | null | undefined) => formatDateTime(value),
      },
      {
        title: 'Người thực hiện',
        key: 'actor',
        width: 200,
        render: (_, record) => record.actorName || record.actorId || '—',
      },
      {
        title: 'Hành động',
        dataIndex: 'action',
        width: 180,
        render: (value: string | null | undefined) => labelOf(CLOSE_ACTION_LABEL, value),
      },
      {
        title: 'Lý do/Ghi chú',
        key: 'note',
        render: (_, record) => record.note || record.reason || '—',
      },
    ],
    [],
  );

  const assignColumns = useMemo<ColumnsType<AssignableTeacher>>(
    () => [
      {
        title: 'Mã nhân sự',
        dataIndex: 'staffCode',
        width: 130,
        render: (value: string | null | undefined) => value || '—',
      },
      {
        title: 'Họ tên',
        dataIndex: 'fullName',
        render: (value: string | null | undefined, record) => value || record.userId,
      },
      {
        title: 'Trạng thái dạy',
        dataIndex: 'teachingStatus',
        width: 140,
        render: (value: string | null | undefined) =>
          value ? (
            <Tag color={TEACHING_STATUS_TAG[value]}>{labelOf(TEACHING_STATUS_LABEL, value)}</Tag>
          ) : (
            '—'
          ),
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
        <Alert
          type="warning"
          showIcon
          role="alert"
          message={MSG_S4.NOT_FOUND}
          action={<Button onClick={() => navigate('/dao-tao/lop-hoc')}>{MSG_S4.BACK}</Button>}
        />
      );
    }
    return (
      <Alert
        type="error"
        showIcon
        role="alert"
        message={MSG_CLASS.DETAIL_LOAD_ERROR}
        description={sprint4ErrorMessage(detailQuery.error)}
        action={
          <Space>
            <Button onClick={() => detailQuery.refetch()}>{MSG_S4.RETRY}</Button>
            <Button onClick={() => navigate('/dao-tao/lop-hoc')}>{MSG_S4.BACK}</Button>
          </Space>
        }
      />
    );
  }

  if (!detail) return <Alert type="warning" showIcon message={MSG_S4.NOT_FOUND} />;

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

  const submitCancel = async () => {
    try {
      const values = await cancelForm.validateFields();
      setModalError(null);
      cancelMut.mutate(values.reason.trim());
    } catch {
      // Lỗi hiển thị ngay dưới trường — không gửi request.
    }
  };

  const submitRequest = async () => {
    try {
      const values = await requestForm.validateFields();
      setModalError(null);
      requestCloseMut.mutate(values.note?.trim() ? values.note.trim() : null);
    } catch {
      // Ghi chú là tùy chọn — không có lỗi validate cần xử lý.
    }
  };

  const submitReject = async () => {
    try {
      const values = await rejectForm.validateFields();
      setModalError(null);
      rejectMut.mutate(values.reason.trim());
    } catch {
      // Lỗi hiển thị ngay dưới trường — không gửi request.
    }
  };

  const submitReopen = async () => {
    try {
      const values = await reopenForm.validateFields();
      setModalError(null);
      reopenMut.mutate(values.reason.trim());
    } catch {
      // Lỗi hiển thị ngay dưới trường — không gửi request.
    }
  };

  const assignable = assignableQuery.data?.items ?? [];

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader
        breadcrumb={[
          { title: MSG_CLASS.TITLE, href: '/dao-tao/lop-hoc' },
          { title: detail.classCode || detail.name || 'Lớp học' },
        ]}
        title={
          <Space size={token.marginXS} wrap>
            <span>{detail.classCode || detail.name || 'Lớp học'}</span>
            {classStatus && (
              <Tag color={CLASS_STATUS_TAG[classStatus]}>{labelOf(CLASS_STATUS_LABEL, classStatus)}</Tag>
            )}
            {closeState !== 'NONE' && (
              <Tag color={CLOSE_STATE_TAG[closeState]}>{labelOf(CLOSE_STATE_LABEL, closeState)}</Tag>
            )}
          </Space>
        }
        extra={
          <Space wrap>
            {canChangeTeacher && <Button onClick={() => openModal('assign')}>{MSG_CLASS.ASSIGN}</Button>}
            {canRequest && (
              <Button onClick={() => openModal('requestClose')}>{MSG_CLASS.REQUEST_CLOSE}</Button>
            )}
            {canApproveOrReject && (
              <Button type="primary" onClick={() => openModal('approve')}>
                {MSG_CLASS.APPROVE_CLOSE}
              </Button>
            )}
            {canApproveOrReject && (
              <Button danger onClick={() => openModal('reject')}>
                {MSG_CLASS.REJECT_CLOSE}
              </Button>
            )}
            {canReopenClass && <Button onClick={() => openModal('reopen')}>{MSG_CLASS.REOPEN}</Button>}
            {canCancelClass && (
              <Button danger onClick={() => openModal('cancel')}>
                {MSG_CLASS.CANCEL}
              </Button>
            )}
          </Space>
        }
      />

      {isClosed && (
        <Alert
          type="info"
          showIcon
          message="Lớp đã đóng"
          description="Lớp đã đóng nên chỉ xem được thông tin. Hãy mở lại lớp nếu cần thay đổi."
        />
      )}

      {pageError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          closable
          message={pageError}
          onClose={() => setPageError(null)}
        />
      )}

      <Tabs
        items={[
          {
            key: 'info',
            label: MSG_CLASS.TAB_INFO,
            children: (
              <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
                <Descriptions.Item label="Mã lớp">{detail.classCode || '—'}</Descriptions.Item>
                <Descriptions.Item label="Tên lớp">{detail.name || '—'}</Descriptions.Item>
                <Descriptions.Item label="Năm học">{detail.academicYear || '—'}</Descriptions.Item>
                <Descriptions.Item label="Sĩ số">
                  {detail.studentCount == null ? '—' : detail.studentCount}
                </Descriptions.Item>
                <Descriptions.Item label="Thời gian" span={2}>
                  {formatPeriod(detail.startDate, detail.endDate)}
                </Descriptions.Item>
                <Descriptions.Item label={MSG_CLASS.TEACHER_SECTION} span={2}>
                  {detail.teacher?.fullName ? (
                    <Space size={token.marginXS} wrap>
                      <Text strong>{detail.teacher.fullName}</Text>
                      {detail.teacher.code ? (
                        <Text type="secondary">({detail.teacher.code})</Text>
                      ) : null}
                    </Space>
                  ) : (
                    <Text type="secondary">{MSG_CLASS.TEACHER_UNASSIGNED}</Text>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">{formatDate(detail.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Cập nhật gần nhất">
                  {formatDateTime(detail.updatedAt)}
                </Descriptions.Item>
                {detail.cancelReason && (
                  <Descriptions.Item label={MSG_CLASS.CANCEL_REASON_LABEL} span={2}>
                    {detail.cancelReason}
                  </Descriptions.Item>
                )}
                {detail.closeRequestNote && (
                  <Descriptions.Item label="Ghi chú yêu cầu đóng" span={2}>
                    {detail.closeRequestNote}
                  </Descriptions.Item>
                )}
                {detail.closeRejectReason && (
                  <Descriptions.Item label={MSG_CLASS.REJECT_REASON_LABEL} span={2}>
                    {detail.closeRejectReason}
                  </Descriptions.Item>
                )}
              </Descriptions>
            ),
          },
          {
            key: 'status-logs',
            label: MSG_CLASS.TAB_STATUS_LOGS,
            children: logsQuery.isError ? (
              <Alert
                type="error"
                showIcon
                role="alert"
                message={MSG_CLASS.LOGS_LOAD_ERROR}
                description={sprint4ErrorMessage(logsQuery.error)}
                action={
                  <Button size="small" onClick={() => logsQuery.refetch()}>
                    {MSG_S4.RETRY}
                  </Button>
                }
              />
            ) : (
              <Table<StatusLogItem>
                rowKey={(record, index) => `${record.at ?? ''}-${index}`}
                size="small"
                loading={logsQuery.isLoading}
                columns={logColumns}
                dataSource={logsQuery.data ?? []}
                locale={{ emptyText: <Empty description={MSG_CLASS.LOGS_EMPTY} /> }}
                pagination={false}
                scroll={{ x: 820 }}
              />
            ),
          },
          {
            key: 'close-events',
            label: MSG_CLASS.TAB_CLOSE_EVENTS,
            children: eventsQuery.isError ? (
              <Alert
                type="error"
                showIcon
                role="alert"
                message={MSG_CLASS.EVENTS_LOAD_ERROR}
                description={sprint4ErrorMessage(eventsQuery.error)}
                action={
                  <Button size="small" onClick={() => eventsQuery.refetch()}>
                    {MSG_S4.RETRY}
                  </Button>
                }
              />
            ) : (
              <Table<CloseEventItem>
                rowKey={(record, index) => `${record.at ?? ''}-${index}`}
                size="small"
                loading={eventsQuery.isLoading}
                columns={eventColumns}
                dataSource={eventsQuery.data ?? []}
                locale={{ emptyText: <Empty description={MSG_CLASS.EVENTS_EMPTY} /> }}
                pagination={false}
                scroll={{ x: 760 }}
              />
            ),
          },
        ]}
      />

      {/* §6.3 — gán/đổi giáo viên: chỉ giáo viên DANG_DAY, có tìm kiếm + phân trang. */}
      <Modal
        title={MSG_CLASS.ASSIGN_TITLE}
        open={modal === 'assign'}
        onCancel={closeModal}
        onOk={submitAssign}
        okText={MSG_S4.CONFIRM}
        cancelText={MSG_S4.CANCEL}
        confirmLoading={assignMut.isPending}
        okButtonProps={{ disabled: !selectedTeacherId }}
        forceRender
        width={720}
      >
        <Flex vertical gap={token.marginSM}>
          {modalError && <Alert type="error" showIcon role="alert" message={modalError} />}
          <Input.Search
            allowClear
            aria-label={MSG_CLASS.ASSIGN_SEARCH_LABEL}
            placeholder={MSG_CLASS.ASSIGN_SEARCH_LABEL}
            value={assignKeywordInput}
            onChange={(event) => {
              const next = event.target.value;
              setAssignKeywordInput(next);
              if (next === '') {
                setAssignKeyword('');
                setAssignPage(1);
              }
            }}
            onSearch={(value) => {
              setAssignKeyword(value);
              setAssignPage(1);
            }}
          />
          <Table<AssignableTeacher>
            rowKey="userId"
            size="small"
            loading={assignableQuery.isLoading}
            columns={assignColumns}
            dataSource={assignable}
            locale={{
              emptyText: (
                <Empty
                  description={
                    assignableQuery.isLoading ? MSG_S4.LOADING : MSG_CLASS.ASSIGN_EMPTY
                  }
                />
              ),
            }}
            rowSelection={{
              type: 'radio',
              selectedRowKeys: selectedTeacherId ? [selectedTeacherId] : [],
              onChange: (keys) => setSelectedTeacherId(keys.length > 0 ? String(keys[0]) : null),
            }}
            onRow={(record) => ({
              onClick: () => setSelectedTeacherId(record.userId),
            })}
            pagination={{
              current: assignableQuery.data?.page ?? assignPage,
              pageSize: assignableQuery.data?.size ?? ASSIGN_PAGE_SIZE,
              total: assignableQuery.data?.total ?? 0,
              showSizeChanger: false,
              onChange: (nextPage) => setAssignPage(nextPage),
            }}
            scroll={{ x: 560 }}
          />
        </Flex>
      </Modal>

      {/* §6.4 — hủy lớp. */}
      <Modal
        title={MSG_CLASS.CANCEL}
        open={modal === 'cancel'}
        onCancel={closeModal}
        onOk={submitCancel}
        okText={MSG_CLASS.CANCEL}
        cancelText={MSG_S4.CANCEL}
        okButtonProps={{ danger: true }}
        confirmLoading={cancelMut.isPending}
        forceRender
      >
        <Flex vertical gap={token.marginSM}>
          {modalError && <Alert type="error" showIcon role="alert" message={modalError} />}
          <Form form={cancelForm} layout="vertical">
            <Form.Item
              name="reason"
              label={MSG_CLASS.CANCEL_REASON_LABEL}
              rules={[
                { required: true, whitespace: true, message: MSG_CLASS.REASON_REQUIRED },
                { max: 500, message: 'Lý do tối đa 500 ký tự' },
              ]}
            >
              <TextArea rows={3} />
            </Form.Item>
          </Form>
        </Flex>
      </Modal>

      {/* §6.5 — yêu cầu đóng lớp (note tùy chọn). */}
      <Modal
        title={MSG_CLASS.REQUEST_CLOSE}
        open={modal === 'requestClose'}
        onCancel={closeModal}
        onOk={submitRequest}
        okText={MSG_S4.CONFIRM}
        cancelText={MSG_S4.CANCEL}
        confirmLoading={requestCloseMut.isPending}
        forceRender
      >
        <Flex vertical gap={token.marginSM}>
          {modalError && <Alert type="error" showIcon role="alert" message={modalError} />}
          <Form form={requestForm} layout="vertical">
            <Form.Item name="note" label={MSG_CLASS.REQUEST_NOTE_LABEL}>
              <TextArea rows={3} />
            </Form.Item>
          </Form>
        </Flex>
      </Modal>

      <Modal
        title={MSG_CLASS.APPROVE_CLOSE}
        open={modal === 'approve'}
        onCancel={closeModal}
        onOk={() => {
          setModalError(null);
          approveMut.mutate();
        }}
        okText={MSG_CLASS.APPROVE_CLOSE}
        cancelText={MSG_S4.CANCEL}
        confirmLoading={approveMut.isPending}
        forceRender
      >
        <Flex vertical gap={token.marginSM}>
          {modalError && <Alert type="error" showIcon role="alert" message={modalError} />}
          <Text>{MSG_CLASS.APPROVE_CONFIRM}</Text>
        </Flex>
      </Modal>

      <Modal
        title={MSG_CLASS.REJECT_CLOSE}
        open={modal === 'reject'}
        onCancel={closeModal}
        onOk={submitReject}
        okText={MSG_CLASS.REJECT_CLOSE}
        cancelText={MSG_S4.CANCEL}
        okButtonProps={{ danger: true }}
        confirmLoading={rejectMut.isPending}
        forceRender
      >
        <Flex vertical gap={token.marginSM}>
          {modalError && <Alert type="error" showIcon role="alert" message={modalError} />}
          <Form form={rejectForm} layout="vertical">
            <Form.Item
              name="reason"
              label={MSG_CLASS.REJECT_REASON_LABEL}
              rules={[
                { required: true, whitespace: true, message: MSG_CLASS.REASON_REQUIRED },
                { max: 500, message: 'Lý do tối đa 500 ký tự' },
              ]}
            >
              <TextArea rows={3} />
            </Form.Item>
          </Form>
        </Flex>
      </Modal>

      <Modal
        title={MSG_CLASS.REOPEN}
        open={modal === 'reopen'}
        onCancel={closeModal}
        onOk={submitReopen}
        okText={MSG_CLASS.REOPEN}
        cancelText={MSG_S4.CANCEL}
        confirmLoading={reopenMut.isPending}
        forceRender
      >
        <Flex vertical gap={token.marginSM}>
          {modalError && <Alert type="error" showIcon role="alert" message={modalError} />}
          <Text>{MSG_CLASS.REOPEN_CONFIRM}</Text>
          <Form form={reopenForm} layout="vertical">
            <Form.Item
              name="reason"
              label={MSG_CLASS.REOPEN_REASON_LABEL}
              rules={[
                { required: true, whitespace: true, message: MSG_CLASS.REASON_REQUIRED },
                { max: 500, message: 'Lý do tối đa 500 ký tự' },
              ]}
            >
              <TextArea rows={3} />
            </Form.Item>
          </Form>
        </Flex>
      </Modal>
    </Flex>
  );
}
