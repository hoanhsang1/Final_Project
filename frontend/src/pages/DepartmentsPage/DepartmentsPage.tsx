import { Alert, App, Button, Empty, Flex, Popconfirm, Space, Table, Tag, Typography, theme } from 'antd';
import type { TableProps } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DepartmentFormModal from '../../components/DepartmentFormModal/DepartmentFormModal';
import PageHeader from '../../components/PageHeader/PageHeader';
import {
  fetchModuleCatalog,
  MODULE_CATALOG_STALE_TIME,
  moduleCatalogKey,
} from '../../features/modules/moduleApi';
import {
  fetchDepartmentModuleImpact,
  fetchPermissions,
  ownerErrorMessage,
} from '../../features/owner/ownerApi';
import { MSG_DEPT, MSG_OWNER } from '../../features/owner/ownerMessages';
import { ownerKeys } from '../../features/owner/ownerKeys';
import { permissionLabel } from '../../features/owner/permissionLabels';
import type { Department, DepartmentModuleImpact, DepartmentPayload } from '../../features/owner/types';
import { useDepartmentsPage } from './use-departments';

/** Giá trị hiển thị khi BE trả `null` — không để ô trống, không hiện `null`. */
const EMPTY_VALUE = '—';

function formatDate(value: string): string {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY') : EMPTY_VALUE;
}

/**
 * Màn danh sách phòng ban của Owner (`/to-chuc`) — Sprint 3.
 *
 * Mỗi dòng có 2 lối đi: bấm tên để mở nhân viên của phòng ban, hoặc Sửa/Xoá tại
 * chỗ. Không có cột "số nhân viên" vì PeopleService không trả số đếm — muốn có
 * thì phải gọi N lần `GET /departments/{id}/members`, không đáng.
 */
export default function DepartmentsPage() {
  const { token } = theme.useToken();
  const { message, modal } = App.useApp();
  const { list, create, update, remove } = useDepartmentsPage();
  const modules = useQuery({
    queryKey: moduleCatalogKey,
    queryFn: fetchModuleCatalog,
    staleTime: MODULE_CATALOG_STALE_TIME,
  });
  const permissions = useQuery({
    queryKey: ownerKeys.permissions(),
    queryFn: fetchPermissions,
  });
  // BE chỉ nhận module đang gate ít nhất một quyền (validateModules).
  const allowedModuleCodes = new Set(
    (permissions.data ?? []).map((p) => p.moduleCode).filter((code): code is string => !!code),
  );
  const moduleOptions = (modules.data ?? []).filter((m) => allowedModuleCodes.has(m.code));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (department: Department) => {
    setEditing(department);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
  };

  const renderImpactContent = (impact: DepartmentModuleImpact) => (
    <Flex vertical gap={token.marginXS}>
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        {MSG_DEPT.MODULE_REMOVAL_HINT}
      </Typography.Paragraph>
      <ul style={{ margin: 0, paddingInlineStart: token.padding }}>
        {impact.positions.map((position) => (
          <li key={position.id}>
            <Typography.Text strong>{position.name}</Typography.Text>
            {' — '}
            {position.permissions.map((code) => permissionLabel(code)).join(', ')}
            {' '}
            <Typography.Text type="secondary">({position.members})</Typography.Text>
          </li>
        ))}
      </ul>
      <Typography.Text type="secondary">
        {MSG_DEPT.MODULE_REMOVAL_MEMBERS(impact.affectedMembers)}
      </Typography.Text>
    </Flex>
  );

  /**
   * Gỡ module là thay đổi có ảnh hưởng dây chuyền: BE không tự xoá quyền, nhưng
   * quyền ngoài module sẽ mất hiệu lực. Hỏi Owner trước khi lưu, và không bao giờ
   * tự thu hồi ngầm.
   */
  const confirmModuleRemoval = async (
    department: Department,
    payload: DepartmentPayload,
  ): Promise<boolean> => {
    const removed = (department.modules ?? []).filter(
      (code) => !payload.moduleCodes.includes(code),
    );
    if (removed.length === 0) {
      return true;
    }
    let impact: DepartmentModuleImpact;
    try {
      impact = await fetchDepartmentModuleImpact(department.id, payload.moduleCodes);
    } catch (error) {
      setFormError(ownerErrorMessage(error));
      return false;
    }
    if (impact.positions.length === 0) {
      return true;
    }
    return new Promise<boolean>((resolve) => {
      modal.confirm({
        title: MSG_DEPT.MODULE_REMOVAL_TITLE,
        width: 560,
        content: renderImpactContent(impact),
        okText: MSG_DEPT.MODULE_REMOVAL_CONFIRM,
        cancelText: MSG_OWNER.CANCEL,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  };

  const handleSubmit = async (payload: DepartmentPayload) => {
    setFormError(null);
    try {
      if (editing) {
        const proceed = await confirmModuleRemoval(editing, payload);
        if (!proceed) {
          return;
        }
        await update.mutateAsync({ id: editing.id, payload });
        message.success(MSG_DEPT.UPDATED);
      } else {
        await create.mutateAsync(payload);
        message.success(MSG_DEPT.CREATED);
      }
      closeForm();
    } catch (error) {
      // `NFR-REL-001`: lỗi hiện trong modal, modal KHÔNG đóng, không báo thành công.
      setFormError(ownerErrorMessage(error));
    }
  };

  const handleDelete = async (department: Department) => {
    setActionError(null);
    try {
      await remove.mutateAsync(department.id);
      message.success(MSG_DEPT.DELETED);
    } catch (error) {
      setActionError(ownerErrorMessage(error));
    }
  };

  const columns: TableProps<Department>['columns'] = [
    {
      title: MSG_DEPT.NAME,
      dataIndex: 'name',
      key: 'name',
      render: (_, department) => (
        <Link to={`/to-chuc/phong-ban/${department.id}`}>{department.name}</Link>
      ),
    },
    {
      title: MSG_DEPT.DESCRIPTION,
      dataIndex: 'description',
      key: 'description',
      render: (value: string | null) => value || EMPTY_VALUE,
    },
    {
      title: MSG_DEPT.MODULES,
      dataIndex: 'modules',
      key: 'modules',
      render: (codes: string[] | undefined) =>
        codes && codes.length > 0 ? (
          <Space size={[token.marginXS, token.marginXS]} wrap>
            {codes.map((code) => (
              <Tag key={code}>{code}</Tag>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">{EMPTY_VALUE}</Typography.Text>
        ),
    },
    {
      title: MSG_DEPT.CREATED_AT,
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => formatDate(value),
    },
    {
      title: MSG_DEPT.ACTIONS,
      key: 'actions',
      render: (_, department) => (
        <Space size={token.marginXS}>
          <Button
            type="link"
            aria-label={`${MSG_DEPT.EDIT} ${department.name}`}
            onClick={() => openEdit(department)}
          >
            {MSG_DEPT.EDIT_SHORT}
          </Button>
          <Popconfirm
            title={MSG_DEPT.DELETE_CONFIRM_TITLE}
            description={`Phòng ban "${department.name}" sẽ bị xoá. ${MSG_DEPT.DELETE_CONFIRM}`}
            okText={MSG_DEPT.DELETE}
            cancelText={MSG_OWNER.CANCEL}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(department)}
          >
            <Button
              type="link"
              danger
              aria-label={`${MSG_DEPT.DELETE} phòng ban ${department.name}`}
            >
              {MSG_DEPT.DELETE}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const isEmpty = list.isSuccess && list.data.length === 0;

  return (
    <div>
      <PageHeader
        title={MSG_DEPT.TITLE}
        subtitle={MSG_DEPT.SUBTITLE}
        extra={
          !isEmpty ? (
            <Button type="primary" onClick={openCreate}>
              {MSG_DEPT.CREATE}
            </Button>
          ) : undefined
        }
      />

      {actionError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={actionError}
          style={{ marginTop: token.margin }}
        />
      )}

      {list.isError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={MSG_DEPT.LOAD_ERROR}
          style={{ marginTop: token.margin }}
          action={<Button onClick={() => void list.refetch()}>{MSG_OWNER.RETRY}</Button>}
        />
      )}

      {isEmpty && (
        <Empty
          description={<Typography.Text type="secondary">{MSG_DEPT.EMPTY}</Typography.Text>}
          style={{ marginTop: token.marginXXL }}
        >
          <Button type="primary" size="large" onClick={openCreate}>
            {MSG_DEPT.CREATE}
          </Button>
        </Empty>
      )}

      {!isEmpty && !list.isError && (
        <Table<Department>
          rowKey="id"
          columns={columns}
          dataSource={list.data ?? []}
          loading={list.isPending}
          style={{ marginTop: token.margin }}
          pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
          size="middle"
        />
      )}

      <DepartmentFormModal
        open={formOpen}
        department={editing}
        moduleOptions={moduleOptions}
        submitting={create.isPending || update.isPending}
        error={formError}
        onCancel={closeForm}
        onSubmit={(payload) => void handleSubmit(payload)}
      />
    </div>
  );
}
