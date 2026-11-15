import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  DatePicker,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import { useNotify } from '../../components/LiveAnnouncer/LiveAnnouncer';
import PageHeader from '../../components/PageHeader/PageHeader';
import { canCreateClasses, canViewClasses, isOwnerRole } from '../../features/auth/permissions';
import {
  CLASS_STATUS_LABEL,
  CLASS_STATUS_TAG,
  CLOSE_STATE_LABEL,
  CLOSE_STATE_TAG,
  formatPeriod,
  labelOf,
} from '../../features/sprint4/labels';
import { MSG_CLASS, MSG_S4 } from '../../features/sprint4/sprint4Messages';
import { createClass, fetchClasses, fetchSubjects, sprint4ErrorMessage } from '../../features/sprint4/sprint4Api';
import type { ClassListItem, ClassStatus } from '../../features/sprint4/types';
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

/** Giá trị form "Thêm lớp học". */
interface ClassFormValues {
  classCode: string;
  name: string;
  academicYear?: string;
  subjectId?: string;
  startDate?: Dayjs | null;
  endDate?: Dayjs | null;
}

/** §7 — 4 trạng thái lọc của lớp. */
const STATUS_OPTIONS: { value: ClassStatus; label: string }[] = [
  { value: 'CHUA_BAT_DAU', label: CLASS_STATUS_LABEL.CHUA_BAT_DAU },
  { value: 'DANG_DIEN_RA', label: CLASS_STATUS_LABEL.DANG_DIEN_RA },
  { value: 'DA_KET_THUC', label: CLASS_STATUS_LABEL.DA_KET_THUC },
  { value: 'DA_HUY', label: CLASS_STATUS_LABEL.DA_HUY },
];

/**
 * Màn 5 — danh sách lớp học (§6.1).
 *
 * - Lọc `q` + `status` (4 giá trị mới), phân trang `page`/`size`.
 * - `status` và `closeState` là hai trục độc lập: cột trạng thái đóng ẩn khi
 *   `NONE` để bảng không nhiễu.
 * - 5 state: loading / empty / error / success / không có quyền.
 */
export default function ClassesPage() {
  const { token } = theme.useToken();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const isOwner = isOwnerRole(backendRoles);
  const canView = canViewClasses(isOwner, permissions);
  const canCreate = canCreateClasses(isOwner, permissions);

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [keyword, setKeyword] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [status, setStatus] = useState<ClassStatus | undefined>();
  /** Quy tắc 17 — lọc nhanh các lớp đang gắn nhãn cần phân công lại. */
  const [onlyReassignment, setOnlyReassignment] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm] = Form.useForm<ClassFormValues>();

  const listQuery = useQuery({
    queryKey: ['classes', { page, size, keyword, status, onlyReassignment }],
    queryFn: () =>
      fetchClasses({
        page,
        size,
        q: keyword || undefined,
        status,
        needsReassignment: onlyReassignment || undefined,
      }),
    enabled: canView,
  });

  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => fetchSubjects(),
    enabled: canView,
  });

  const createMut = useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      notify.success(MSG_CLASS.CREATED);
      setCreateError(null);
      setCreateOpen(false);
      createForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (error) => setCreateError(sprint4ErrorMessage(error)),
  });

  const closeCreate = () => {
    setCreateOpen(false);
    setCreateError(null);
    createForm.resetFields();
  };

  const columns = useMemo<ColumnsType<ClassListItem>>(
    () => [
      {
        title: 'Mã lớp',
        dataIndex: 'classCode',
        width: 130,
        render: (value: string | null | undefined, record) => (
          <Link to={`/dao-tao/lop-hoc/${record.id}`}>{value || record.id}</Link>
        ),
      },
      {
        title: 'Tên lớp',
        dataIndex: 'name',
        render: (value: string | null | undefined, record) => (
          <Flex vertical gap={4}>
            <Text>{value || '—'}</Text>
            {record.needsReassignment ? (
              <Tag color="orange" title={record.reassignmentReason ?? undefined}>
                Cần phân công lại
              </Tag>
            ) : null}
          </Flex>
        ),
      },
      {
        title: 'Môn học',
        key: 'subject',
        width: 180,
        render: (_, record) =>
          record.subjectName || <Text type="secondary">{MSG_CLASS.SUBJECT_UNASSIGNED}</Text>,
      },
      {
        title: 'Năm học',
        dataIndex: 'academicYear',
        width: 130,
        render: (value: string | null | undefined) => value || '—',
      },
      {
        title: 'Thời gian',
        key: 'period',
        width: 210,
        render: (_, record) => formatPeriod(record.startDate, record.endDate),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        width: 150,
        render: (value: string | null | undefined) =>
          value ? (
            <Tag color={CLASS_STATUS_TAG[value]}>{labelOf(CLASS_STATUS_LABEL, value)}</Tag>
          ) : (
            '—'
          ),
      },
      {
        title: 'Đóng/Hủy',
        key: 'state',
        width: 190,
        render: (_, record) => {
          const hasClose = !!record.closeState && record.closeState !== 'NONE';
          const hasCancel = record.cancelState === 'PENDING';
          if (!hasClose && !hasCancel) return null;
          return (
            <Space size={4} wrap>
              {hasClose && (
                <Tag color={CLOSE_STATE_TAG[record.closeState!]}>
                  {labelOf(CLOSE_STATE_LABEL, record.closeState!)}
                </Tag>
              )}
              {hasCancel && <Tag color="orange">Chờ duyệt hủy</Tag>}
            </Space>
          );
        },
      },
      {
        title: 'Giáo viên',
        key: 'teacher',
        width: 220,
        render: (_, record) =>
          record.teacher?.fullName ? (
            record.teacher.fullName
          ) : (
            <Text type="secondary">{MSG_CLASS.TEACHER_UNASSIGNED}</Text>
          ),
      },
      {
        title: 'Sĩ số',
        dataIndex: 'studentCount',
        width: 90,
        align: 'right',
        render: (value: number | null | undefined) => (value == null ? '—' : value),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 120,
        render: (_, record) => <Link to={`/dao-tao/lop-hoc/${record.id}`}>Xem chi tiết</Link>,
      },
    ],
    [],
  );

  const onTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) setPage(pagination.current);
    if (pagination.pageSize) setSize(pagination.pageSize);
  };

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader
        title={MSG_CLASS.TITLE}
        extra={
          canCreate ? (
            <Button
              type="primary"
              onClick={() => {
                setCreateError(null);
                createForm.resetFields();
                setCreateOpen(true);
              }}
            >
              {MSG_CLASS.CREATE}
            </Button>
          ) : undefined
        }
      >
        {canView ? (
          <Flex gap={token.marginSM} wrap="wrap" style={{ marginTop: token.marginXS }}>
            <Select<ClassStatus>
              allowClear
              aria-label={MSG_CLASS.STATUS_ALL}
              placeholder={MSG_CLASS.STATUS_ALL}
              options={STATUS_OPTIONS}
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              style={{ minWidth: 200 }}
            />
            <Input.Search
              allowClear
              aria-label={MSG_CLASS.SEARCH_LABEL}
              placeholder={MSG_CLASS.SEARCH_LABEL}
              value={keywordInput}
              onChange={(event) => {
                const next = event.target.value;
                setKeywordInput(next);
                // Xoá nhanh: bỏ luôn điều kiện lọc thay vì phải bấm nút tìm.
                if (next === '') {
                  setKeyword('');
                  setPage(1);
                }
              }}
              onSearch={(value) => {
                setKeyword(value);
                setPage(1);
              }}
              style={{ width: 300 }}
            />
            <Space size={token.marginXS}>
              <Switch
                checked={onlyReassignment}
                onChange={(checked) => {
                  setOnlyReassignment(checked);
                  setPage(1);
                }}
                aria-label={MSG_CLASS.REASSIGN_FILTER}
              />
              <Text>{MSG_CLASS.REASSIGN_FILTER}</Text>
            </Space>
          </Flex>
        ) : null}
      </PageHeader>

      {canView && onlyReassignment && (
        <Alert
          type="warning"
          showIcon
          message={MSG_CLASS.REASSIGN_BANNER_TITLE}
          description={MSG_CLASS.REASSIGN_BANNER_DESC}
        />
      )}

      {!canView ? (
        <ForbiddenNotice />
      ) : listQuery.isError ? (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={MSG_CLASS.LIST_LOAD_ERROR}
          description={sprint4ErrorMessage(listQuery.error)}
          action={
            <Button size="small" onClick={() => listQuery.refetch()}>
              {MSG_S4.RETRY}
            </Button>
          }
        />
      ) : (
        <Table<ClassListItem>
          rowKey="id"
          loading={listQuery.isLoading}
          columns={columns}
          dataSource={listQuery.data?.items ?? []}
          locale={{ emptyText: <Empty description={MSG_CLASS.EMPTY} /> }}
          onChange={onTableChange}
          pagination={{
            current: listQuery.data?.page ?? page,
            pageSize: listQuery.data?.size ?? size,
            total: listQuery.data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total) => `${total} lớp`,
          }}
          scroll={{ x: 1240 }}
        />
      )}

      <Modal
        title={MSG_CLASS.CREATE}
        open={createOpen}
        onCancel={closeCreate}
        onOk={() => createForm.submit()}
        okText={MSG_S4.CREATE}
        cancelText={MSG_S4.CANCEL}
        confirmLoading={createMut.isPending}
        width={640}
        forceRender
      >
        {createError && (
          <Alert
            type="error"
            showIcon
            role="alert"
            message={createError}
            style={{ marginBottom: token.margin }}
          />
        )}

        <Form
          form={createForm}
          layout="vertical"
          requiredMark
          onFinish={(values) =>
            createMut.mutate({
              classCode: values.classCode.trim(),
              name: values.name.trim(),
              academicYear: values.academicYear?.trim() || null,
              subjectId: values.subjectId ?? null,
              startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
              endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null,
            })
          }
        >
          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item
              name="classCode"
              label="Mã lớp"
              style={{ flex: 1, minWidth: 220 }}
              rules={[
                { required: true, message: 'Vui lòng nhập mã lớp' },
                { max: 100, message: 'Mã lớp tối đa 100 ký tự' },
              ]}
            >
              <Input autoComplete="off" placeholder="VD: C003" />
            </Form.Item>
            <Form.Item
              name="name"
              label="Tên lớp"
              style={{ flex: 1, minWidth: 220 }}
              rules={[
                { required: true, message: 'Vui lòng nhập tên lớp' },
                { max: 200, message: 'Tên lớp tối đa 200 ký tự' },
              ]}
            >
              <Input autoComplete="off" placeholder="Lớp 10C" />
            </Form.Item>
          </Flex>

          <Form.Item
            name="academicYear"
            label="Niên khóa"
            rules={[{ max: 50, message: 'Niên khóa tối đa 50 ký tự' }]}
          >
            <Input autoComplete="off" placeholder="2026-2027" />
          </Form.Item>

          <Form.Item
            name="subjectId"
            label={MSG_CLASS.SUBJECT}
            rules={[{ required: true, message: MSG_CLASS.SUBJECT_REQUIRED }]}
            extra={MSG_CLASS.SUBJECT_REQUIRED}
          >
            <Select
              showSearch
              optionFilterProp="label"
              loading={subjectsQuery.isLoading}
              placeholder={MSG_CLASS.SUBJECT_PLACEHOLDER}
              options={(subjectsQuery.data ?? []).map((subject) => ({
                value: subject.id,
                label: subject.name,
              }))}
              notFoundContent={
                subjectsQuery.isError ? MSG_CLASS.SUBJECT_LOAD_ERROR : MSG_S4.NOT_FOUND
              }
            />
          </Form.Item>

          <Flex gap={token.marginSM} wrap="wrap">
            <Form.Item name="startDate" label="Ngày bắt đầu" style={{ flex: 1, minWidth: 220 }}>
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
            <Form.Item
              name="endDate"
              label="Ngày kết thúc"
              style={{ flex: 1, minWidth: 220 }}
              dependencies={['startDate']}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value: Dayjs | null | undefined) {
                    const start = getFieldValue('startDate') as Dayjs | null | undefined;
                    if (!value || !start || !value.isBefore(start, 'day')) return Promise.resolve();
                    return Promise.reject(new Error('Ngày kết thúc phải sau ngày bắt đầu'));
                  },
                }),
              ]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày" />
            </Form.Item>
          </Flex>
        </Form>
      </Modal>
    </Flex>
  );
}
