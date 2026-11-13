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
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ForbiddenNotice from '../../components/ForbiddenNotice/ForbiddenNotice';
import { useNotify } from '../../components/LiveAnnouncer/LiveAnnouncer';
import PageHeader from '../../components/PageHeader/PageHeader';
import PageLoading from '../../components/PageLoading/PageLoading';
import { canEditTeachers, canViewTeachers, isOwnerRole } from '../../features/auth/permissions';
import {
  CLASS_STATUS_LABEL,
  CLASS_STATUS_TAG,
  CLOSE_STATE_LABEL,
  CLOSE_STATE_TAG,
  CONTRACT_TYPE_LABEL,
  FIELD_LABEL,
  TEACHER_HISTORY_ACTION_LABEL,
  TEACHING_STATUS_LABEL,
  TEACHING_STATUS_TAG,
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
import { useAuthStore } from '../../stores/authStore';

const { Text } = Typography;

const CONTRACT_TYPE_OPTIONS = [
  { value: 'CO_HUU', label: CONTRACT_TYPE_LABEL.CO_HUU },
  { value: 'THINH_GIANG', label: CONTRACT_TYPE_LABEL.THINH_GIANG },
];

/** Giá trị form sửa hồ sơ (§5). `staffCode` chỉ đọc nên không nằm trong payload. */
interface TeacherEditFormValues {
  staffCode: string;
  fullName: string;
  email: string;
  phone: string;
  specialtyIds: string[];
  contractType?: ContractType;
}

/**
 * Màn 3 — chi tiết & sửa giáo viên (§5).
 *
 * - 3 tab: Thông tin / Lớp phụ trách / Lịch sử thay đổi.
 * - Sửa tại chỗ với `version` đang đọc; 409 `SPECIALTY_MISMATCH` mở modal xác
 *   nhận rồi gửi lại **cùng payload** với `confirm: true`.
 * - 409 `DATA_CHANGED`: báo lỗi + tải lại, không gửi lại version cũ (§8.1).
 * - 5 state: loading / empty / error / success / không có quyền.
 */
export default function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token } = theme.useToken();
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

  const [form] = Form.useForm<TeacherEditFormValues>();

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
    form.setFieldsValue({
      staffCode: teacher.staffCode ?? '',
      fullName: teacher.fullName ?? '',
      email: teacher.email ?? '',
      phone: teacher.phone ?? '',
      specialtyIds: (teacher.specialties ?? []).map((s) => s.id),
      contractType: teacher.contractType ?? undefined,
    });
  }, [teacher, editing, form]);

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
      // §5.1 — lệch môn: mở modal xác nhận, KHÔNG báo thành công.
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
    form.resetFields();
  };

  const submitEdit = async () => {
    if (!teacher) return;
    try {
      const values = await form.validateFields();
      saveMut.mutate({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        specialtyIds: values.specialtyIds,
        contractType: values.contractType ?? null,
        version: teacher.version,
        confirm: false,
      });
    } catch {
      // Lỗi hiển thị ngay dưới từng trường — không gửi request.
    }
  };

  const classColumns = useMemo<ColumnsType<TeacherClass>>(
    () => [
      {
        title: 'Mã lớp',
        dataIndex: 'classCode',
        width: 140,
        render: (value: string | null | undefined, record) => (
          <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/dao-tao/lop-hoc/${record.id}`)}>
            {value || record.id}
          </Button>
        ),
      },
      {
        title: 'Tên lớp',
        dataIndex: 'name',
        render: (value: string | null | undefined) => value || '—',
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        width: 160,
        render: (value: string | null | undefined) =>
          value ? <Tag color={CLASS_STATUS_TAG[value]}>{labelOf(CLASS_STATUS_LABEL, value)}</Tag> : '—',
      },
      {
        title: 'Trạng thái đóng',
        dataIndex: 'closeState',
        width: 170,
        render: (value: string | null | undefined) =>
          value && value !== 'NONE' ? (
            <Tag color={CLOSE_STATE_TAG[value]}>{labelOf(CLOSE_STATE_LABEL, value)}</Tag>
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
    ],
    [navigate],
  );

  const historyItems = useMemo(() => {
    const rows = teacher?.history ?? [];
    return rows.map((item, index) => {
      const changes = Object.entries(item.details ?? {});
      return {
        key: `${item.action}-${index}`,
        color: 'blue' as const,
        children: (
          <Flex vertical gap={token.marginXXS}>
            <Text strong>{labelOf(TEACHER_HISTORY_ACTION_LABEL, item.action)}</Text>
            <Text type="secondary">
              {item.actorName || item.actorUserId || '—'} · {formatDateTime(item.createdAt)}
            </Text>
            {changes.length > 0 && (
              <ul style={{ margin: 0, paddingInlineStart: token.paddingMD }}>
                {changes.map(([field, diff]) => (
                  <li key={field}>
                    {labelOf(FIELD_LABEL, field)}: {formatChangeValue(diff?.before, specialtyName)} →{' '}
                    {formatChangeValue(diff?.after, specialtyName)}
                  </li>
                ))}
              </ul>
            )}
          </Flex>
        ),
      };
    });
  }, [teacher?.history, token.marginXXS, token.paddingMD, specialtyName]);

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
          action={<Button onClick={() => navigate('/dao-tao/giao-vien')}>{MSG_S4.BACK}</Button>}
        />
      );
    }
    return (
      <Alert
        type="error"
        showIcon
        role="alert"
        message={MSG_TEACHER.DETAIL_LOAD_ERROR}
        description={sprint4ErrorMessage(detailQuery.error)}
        action={
          <Space>
            <Button onClick={() => detailQuery.refetch()}>{MSG_S4.RETRY}</Button>
            <Button onClick={() => navigate('/dao-tao/giao-vien')}>{MSG_S4.BACK}</Button>
          </Space>
        }
      />
    );
  }

  if (!teacher) return <Alert type="warning" showIcon message={MSG_S4.NOT_FOUND} />;

  const specialtyTags =
    (teacher.specialties ?? []).length > 0 ? (
      <Space wrap>
        {(teacher.specialties ?? []).map((specialty) => (
          <Tag key={specialty.id}>{specialty.name}</Tag>
        ))}
      </Space>
    ) : (
      '—'
    );

  const positionTags = positionNames(teacher.positionIds);
  const showEditForm = canEdit && editing;

  return (
    <Flex vertical gap={token.marginMD}>
      <PageHeader
        breadcrumb={[
          { title: MSG_TEACHER.TITLE, href: '/dao-tao/giao-vien' },
          { title: teacher.fullName || teacher.staffCode || 'Giáo viên' },
        ]}
        title={teacher.fullName || teacher.staffCode || 'Giáo viên'}
        extra={
          canEdit && activeTab === 'info' ? (
            showEditForm ? (
              <Space wrap>
                <Button onClick={cancelEdit}>{MSG_S4.CANCEL}</Button>
                <Button type="primary" loading={saveMut.isPending} onClick={submitEdit}>
                  {MSG_S4.SAVE}
                </Button>
              </Space>
            ) : (
              <Button type="primary" onClick={startEdit}>
                {MSG_TEACHER.EDIT}
              </Button>
            )
          ) : undefined
        }
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'info',
            label: MSG_TEACHER.TAB_INFO,
            children: showEditForm ? (
              <Flex vertical gap={token.marginSM} style={{ maxWidth: 760 }}>
                {saveError && <Alert type="error" showIcon role="alert" message={saveError} />}
                <Form<TeacherEditFormValues> form={form} layout="vertical" requiredMark>
                  <Form.Item
                    name="staffCode"
                    label="Mã nhân sự"
                    extra={MSG_TEACHER.STAFF_CODE_LOCKED}
                  >
                    <Input readOnly />
                  </Form.Item>

                  <Flex gap={token.marginSM} wrap="wrap">
                    <Form.Item
                      name="fullName"
                      label="Họ tên"
                      style={{ flex: 1, minWidth: 240 }}
                      rules={[
                        { required: true, message: 'Vui lòng nhập họ tên' },
                        { max: 200, message: 'Họ tên tối đa 200 ký tự' },
                      ]}
                    >
                      <Input autoComplete="off" />
                    </Form.Item>
                    <Form.Item
                      name="phone"
                      label="Số điện thoại"
                      style={{ flex: 1, minWidth: 240 }}
                      rules={[
                        { required: true, message: 'Vui lòng nhập số điện thoại' },
                        { pattern: /^(\+84|0)\d{9,10}$/, message: 'Số điện thoại không hợp lệ' },
                      ]}
                    >
                      <Input autoComplete="off" />
                    </Form.Item>
                  </Flex>

                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: 'Vui lòng nhập email' },
                      { type: 'email', message: 'Email không hợp lệ' },
                    ]}
                  >
                    <Input autoComplete="off" />
                  </Form.Item>

                  <Form.Item
                    name="specialtyIds"
                    label="Chuyên môn"
                    rules={[
                      {
                        required: true,
                        type: 'array',
                        min: 1,
                        message: MSG_TEACHER.SPECIALTY_REQUIRED,
                      },
                    ]}
                    extra="Đổi chuyên môn có thể làm lệch môn của lớp đang phụ trách — hệ thống sẽ hỏi lại."
                  >
                    <Select
                      mode="multiple"
                      options={specialtyOptions}
                      loading={specialtiesQuery.isLoading}
                      placeholder="Chọn chuyên môn"
                    />
                  </Form.Item>

                  <Form.Item name="contractType" label="Loại hợp đồng">
                    <Select allowClear options={CONTRACT_TYPE_OPTIONS} placeholder="Không bắt buộc" />
                  </Form.Item>

                  {specialtiesQuery.isError && (
                    <Alert
                      type="warning"
                      showIcon
                      message={MSG_TEACHER.SPECIALTY_LOAD_ERROR}
                      style={{ marginBottom: token.marginSM }}
                    />
                  )}
                </Form>
              </Flex>
            ) : (
              <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
                <Descriptions.Item label="Mã nhân sự">{teacher.staffCode || '—'}</Descriptions.Item>
                <Descriptions.Item label="Họ tên">{teacher.fullName || '—'}</Descriptions.Item>
                <Descriptions.Item label="Email">{teacher.email || '—'}</Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">{teacher.phone || '—'}</Descriptions.Item>
                <Descriptions.Item label="Bộ phận">{departmentName(teacher.departmentId)}</Descriptions.Item>
                <Descriptions.Item label="Chức vụ">
                  {positionTags.length > 0 ? (
                    <Space wrap>
                      {positionTags.map((name, index) => (
                        <Tag key={`${name}-${index}`}>{name}</Tag>
                      ))}
                    </Space>
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Chuyên môn" span={2}>
                  {specialtyTags}
                </Descriptions.Item>
                <Descriptions.Item label="Loại hợp đồng">
                  {labelOf(CONTRACT_TYPE_LABEL, teacher.contractType)}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái dạy">
                  {teacher.teachingStatus ? (
                    <Tag color={TEACHING_STATUS_TAG[teacher.teachingStatus]}>
                      {labelOf(TEACHING_STATUS_LABEL, teacher.teachingStatus)}
                    </Tag>
                  ) : (
                    '—'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">{formatDate(teacher.createdAt)}</Descriptions.Item>
                <Descriptions.Item label="Cập nhật gần nhất">
                  {formatDateTime(teacher.updatedAt)}
                </Descriptions.Item>
              </Descriptions>
            ),
          },
          {
            key: 'classes',
            label: `${MSG_TEACHER.TAB_CLASSES} (${(teacher.classes ?? []).length})`,
            children: (
              <Table<TeacherClass>
                rowKey="id"
                size="small"
                columns={classColumns}
                dataSource={teacher.classes ?? []}
                locale={{ emptyText: <Empty description={MSG_TEACHER.CLASSES_EMPTY} /> }}
                pagination={false}
                scroll={{ x: 620 }}
              />
            ),
          },
          {
            key: 'history',
            label: MSG_TEACHER.TAB_HISTORY,
            children:
              historyItems.length === 0 ? (
                <Empty description={MSG_TEACHER.HISTORY_EMPTY} />
              ) : (
                <Timeline items={historyItems} />
              ),
          },
        ]}
      />

      {/* §5.1 — xác nhận khi đổi chuyên môn làm lệch môn lớp đang phụ trách. */}
      <Modal
        title={MSG_TEACHER.MISMATCH_TITLE}
        open={!!mismatch}
        onCancel={() => setMismatch(null)}
        onOk={() => {
          if (mismatch) confirmMismatchMut.mutate(mismatch.payload);
        }}
        okText={MSG_TEACHER.CONFIRM_UPDATE}
        cancelText={MSG_S4.CANCEL}
        confirmLoading={confirmMismatchMut.isPending}
        maskClosable={false}
      >
        <Flex vertical gap={token.marginSM}>
          {saveError && <Alert type="error" showIcon role="alert" message={saveError} />}
          <Text>{MSG_TEACHER.MISMATCH_DESC}</Text>
          <ul style={{ margin: 0, paddingInlineStart: token.paddingLG }}>
            {(mismatch?.classes ?? []).map((item, index) => (
              <li key={item.id ?? index}>{item.name || item.id || '—'}</li>
            ))}
          </ul>
        </Flex>
      </Modal>
    </Flex>
  );
}
