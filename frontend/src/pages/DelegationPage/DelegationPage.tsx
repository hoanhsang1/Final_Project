import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import type { TableProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';
import PageHeader from '../../components/PageHeader/PageHeader';
import { ownerErrorMessage } from '../../features/owner/ownerApi';
import { MSG_DEL, MSG_OWNER } from '../../features/owner/ownerMessages';
import { moduleLabel, permissionLabel } from '../../features/owner/permissionLabels';
import type {
  Delegation,
  DelegationPayload,
  DelegationUpdatePayload,
  GeneralManager,
  GeneralManagerCandidate,
  Permission,
} from '../../features/owner/types';
import { useDelegationPage } from './use-delegations';

const { Text } = Typography;
const EMPTY_VALUE = '—';
const DATE_FORMAT = 'DD/MM/YYYY HH:mm';

type DurationChoice = '7' | '30' | '90' | 'none' | 'custom';

interface PermissionGroup {
  moduleCode: string | null;
  permissions: Permission[];
}

function formatDate(value: string | null): string {
  if (!value) return EMPTY_VALUE;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(DATE_FORMAT) : EMPTY_VALUE;
}

function personName(item: {
  fullName: string | null;
  username: string | null;
  userId: string;
}): string {
  return item.fullName || item.username || item.userId;
}

function delegateLabel(item: GeneralManagerCandidate | GeneralManager): string {
  const department = item.departmentName ? ` — ${item.departmentName}` : '';
  const username = item.username ? ` (${item.username})` : '';
  return `${personName(item)}${username}${department}`;
}

function statusText(item: Delegation): string {
  if (item.status === 'REVOKED') return MSG_DEL.STATUS_REVOKED;
  if (item.active) return MSG_DEL.STATUS_ACTIVE;
  const now = dayjs();
  if (dayjs(item.effectiveFrom).isAfter(now)) return MSG_DEL.STATUS_SCHEDULED;
  return MSG_DEL.STATUS_EXPIRED;
}

function statusColor(item: Delegation): string {
  if (item.status === 'REVOKED') return 'default';
  if (item.active) return 'success';
  return 'warning';
}

/** Gom quyền theo module để chọn khi ủy quyền. */
function groupPermissions(permissions: Permission[]): PermissionGroup[] {
  const groups = new Map<string | null, Permission[]>();
  permissions.forEach((permission) => {
    const key = permission.moduleCode ?? null;
    groups.set(key, [...(groups.get(key) ?? []), permission]);
  });
  return [...groups.entries()]
    .map(([moduleCode, items]) => ({
      moduleCode,
      permissions: [...items].sort((a, b) => a.code.localeCompare(b.code)),
    }))
    .sort((a, b) => (a.moduleCode ?? '').localeCompare(b.moduleCode ?? ''));
}

function PermissionPicker({
  groupList,
  value,
  onChange,
}: {
  groupList: PermissionGroup[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { token } = theme.useToken();
  return (
    <Flex vertical gap={token.marginSM} style={{ maxHeight: 320, overflowY: 'auto' }}>
      {groupList.map((group) => (
        <div key={group.moduleCode ?? 'common'}>
          <Text strong>{moduleLabel(group.moduleCode)}</Text>
          <Flex vertical gap={4} style={{ marginTop: token.marginXXS }}>
            {group.permissions.map((permission) => (
              <Checkbox
                key={permission.code}
                checked={value.includes(permission.code)}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange([...value, permission.code]);
                  } else {
                    onChange(value.filter((code) => code !== permission.code));
                  }
                }}
              >
                {permissionLabel(permission.code)}{' '}
                <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                  {permission.code}
                </Text>
              </Checkbox>
            ))}
          </Flex>
        </div>
      ))}
    </Flex>
  );
}

function DelegationModal({
  mode,
  delegation,
  managers,
  permissions,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  delegation: Delegation | null;
  managers: GeneralManager[];
  permissions: Permission[];
  onClose: () => void;
  onSaved: (
    mode: 'create' | 'edit',
    payload: DelegationPayload | DelegationUpdatePayload,
  ) => Promise<void>;
}) {
  const { token } = theme.useToken();
  const groupList = useMemo(() => groupPermissions(permissions), [permissions]);

  const [delegateId, setDelegateId] = useState<string>(
    delegation?.delegateId ?? managers[0]?.userId ?? '',
  );
  const [selected, setSelected] = useState<string[]>(delegation?.permissions ?? []);
  const [duration, setDuration] = useState<DurationChoice>('30');
  const [until, setUntil] = useState<Dayjs | null>(
    delegation?.effectiveTo ? dayjs(delegation.effectiveTo) : null,
  );
  const [reason, setReason] = useState(delegation?.reason ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    if (mode === 'create' && !delegateId) {
      setError(MSG_DEL.DELEGATION_DELEGATE_REQUIRED);
      return;
    }
    if (selected.length === 0) {
      setError(MSG_DEL.DELEGATION_PERMISSIONS_REQUIRED);
      return;
    }

    let effectiveTo: string | null = null;
    if (mode === 'create') {
      if (duration === 'custom') {
        if (!until) {
          setError(MSG_DEL.DELEGATION_UNTIL_REQUIRED);
          return;
        }
        if (!until.isAfter(dayjs())) {
          setError(MSG_DEL.DELEGATION_UNTIL_FUTURE);
          return;
        }
        effectiveTo = until.toISOString();
      } else if (duration !== 'none') {
        effectiveTo = dayjs().add(Number(duration), 'day').toISOString();
      }
    } else {
      if (until && !until.isAfter(dayjs())) {
        setError(MSG_DEL.DELEGATION_UNTIL_FUTURE);
        return;
      }
      effectiveTo = until ? until.toISOString() : null;
    }

    setSaving(true);
    try {
      if (mode === 'create') {
        await onSaved('create', {
          delegateId,
          permissions: selected,
          effectiveTo,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
      } else {
        await onSaved('edit', {
          permissions: selected,
          effectiveTo,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
      }
    } catch (caught) {
      setError(ownerErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={mode === 'create' ? MSG_DEL.DELEGATION_CREATE : MSG_DEL.DELEGATION_EDIT}
      onCancel={onClose}
      onOk={() => void submit()}
      okText={MSG_OWNER.SAVE}
      cancelText={MSG_OWNER.CANCEL}
      confirmLoading={saving}
      width={720}
      destroyOnHidden
    >
      <Flex vertical gap={token.marginSM}>
        <div>
          <Text strong>{MSG_DEL.DELEGATION_DELEGATE}</Text>
          {mode === 'create' ? (
            <Select
              style={{ width: '100%', marginTop: 4 }}
              value={delegateId || undefined}
              onChange={setDelegateId}
              placeholder={MSG_DEL.DELEGATION_DELEGATE_REQUIRED}
              options={managers.map((manager) => ({
                value: manager.userId,
                label: delegateLabel(manager),
              }))}
            />
          ) : (
            <div style={{ marginTop: 4 }}>
              <Text>
                {delegation
                  ? `${delegation.delegateName || delegation.delegateUsername || delegation.delegateId}${
                      delegation.delegateDepartmentName
                        ? ` — ${delegation.delegateDepartmentName}`
                        : ''
                    }`
                  : EMPTY_VALUE}
              </Text>
            </div>
          )}
        </div>

        <div>
          <Text strong>
            {MSG_DEL.DELEGATION_PERMISSIONS} ({selected.length})
          </Text>
          <div style={{ marginTop: 4 }}>
            <PermissionPicker groupList={groupList} value={selected} onChange={setSelected} />
          </div>
        </div>

        {mode === 'create' && (
          <div>
            <Text strong>{MSG_DEL.DELEGATION_DURATION}</Text>
            <Select<DurationChoice>
              style={{ width: '100%', marginTop: 4 }}
              value={duration}
              onChange={setDuration}
              options={[
                { value: '7', label: MSG_DEL.DURATION_7 },
                { value: '30', label: MSG_DEL.DURATION_30 },
                { value: '90', label: MSG_DEL.DURATION_90 },
                { value: 'none', label: MSG_DEL.DURATION_NONE },
                { value: 'custom', label: MSG_DEL.DURATION_CUSTOM },
              ]}
            />
            {duration === 'custom' && (
              <DatePicker
                style={{ width: '100%', marginTop: 4 }}
                showTime
                value={until}
                onChange={setUntil}
                placeholder={MSG_DEL.DELEGATION_UNTIL}
              />
            )}
          </div>
        )}

        {mode === 'edit' && (
          <div>
            <Text strong>{MSG_DEL.DELEGATION_UNTIL}</Text>
            <DatePicker
              style={{ width: '100%', marginTop: 4 }}
              showTime
              value={until}
              onChange={setUntil}
              placeholder={MSG_DEL.DURATION_NONE}
            />
          </div>
        )}

        <div>
          <Text strong>{MSG_DEL.DELEGATION_REASON}</Text>
          <Input.TextArea
            style={{ marginTop: 4 }}
            rows={2}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={MSG_DEL.DELEGATION_REASON_PLACEHOLDER}
          />
        </div>

        {error && <Alert type="error" showIcon role="alert" message={error} />}
      </Flex>
    </Modal>
  );
}

export default function DelegationPage() {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { managers, candidates, delegations, permissions, appoint, removeManager, create, update, revoke } =
    useDelegationPage();

  const [appointOpen, setAppointOpen] = useState(false);
  const [candidateId, setCandidateId] = useState('');
  const [appointReason, setAppointReason] = useState('');
  const [appointError, setAppointError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Delegation | null>(null);
  const [revoking, setRevoking] = useState<Delegation | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const managerList = managers.data ?? [];
  const managerIds = useMemo(() => new Set(managerList.map((item) => item.userId)), [managerList]);
  const availableCandidates = (candidates.data ?? []).filter(
    (candidate) => !managerIds.has(candidate.userId),
  );

  const openAppoint = () => {
    setCandidateId('');
    setAppointReason('');
    setAppointError(null);
    setAppointOpen(true);
  };

  const submitAppoint = async () => {
    if (!candidateId) {
      setAppointError(MSG_DEL.GM_CANDIDATE_REQUIRED);
      return;
    }
    setAppointError(null);
    try {
      await appoint.mutateAsync({
        userId: candidateId,
        ...(appointReason.trim() ? { reason: appointReason.trim() } : {}),
      });
      message.success(MSG_DEL.GM_APPOINTED);
      setAppointOpen(false);
    } catch (caught) {
      setAppointError(ownerErrorMessage(caught));
    }
  };

  const removeManagerAction = async (manager: GeneralManager) => {
    setActionError(null);
    try {
      await removeManager.mutateAsync({ userId: manager.userId });
      message.success(MSG_DEL.GM_REMOVED);
    } catch (caught) {
      setActionError(ownerErrorMessage(caught));
    }
  };

  const saveDelegation = async (
    mode: 'create' | 'edit',
    payload: DelegationPayload | DelegationUpdatePayload,
  ) => {
    if (mode === 'create') {
      await create.mutateAsync(payload as DelegationPayload);
      message.success(MSG_DEL.DELEGATION_CREATED);
    } else if (editing) {
      await update.mutateAsync({ id: editing.id, payload: payload as DelegationUpdatePayload });
      message.success(MSG_DEL.DELEGATION_UPDATED);
    }
    setModalMode(null);
    setEditing(null);
  };

  const submitRevoke = async () => {
    if (!revoking) return;
    setActionError(null);
    try {
      await revoke.mutateAsync({
        id: revoking.id,
        ...(revokeReason.trim() ? { reason: revokeReason.trim() } : {}),
      });
      message.success(MSG_DEL.DELEGATION_REVOKED);
      setRevoking(null);
      setRevokeReason('');
    } catch (caught) {
      setActionError(ownerErrorMessage(caught));
    }
  };

  const managerColumns: TableProps<GeneralManager>['columns'] = [
    {
      title: MSG_DEL.GM_CANDIDATE,
      key: 'person',
      render: (_, item) => (
        <Flex vertical>
          <Text strong>{personName(item)}</Text>
          <Text type="secondary">{item.username ?? EMPTY_VALUE}</Text>
        </Flex>
      ),
    },
    {
      title: MSG_DEL.DEPARTMENT,
      dataIndex: 'departmentName',
      key: 'departmentName',
      render: (value: string | null) => value ?? EMPTY_VALUE,
    },
    {
      title: 'Ngày bổ nhiệm',
      dataIndex: 'appointedAt',
      key: 'appointedAt',
      render: (value: string | null) => formatDate(value),
    },
    {
      title: MSG_DEL.GM_REMOVE,
      key: 'actions',
      width: 140,
      render: (_, item) => (
        <Popconfirm
          title={MSG_DEL.GM_REMOVE_CONFIRM}
          okText={MSG_OWNER.SAVE}
          cancelText={MSG_OWNER.CANCEL}
          onConfirm={() => void removeManagerAction(item)}
        >
          <Button danger size="small">
            {MSG_DEL.GM_REMOVE}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const delegationColumns: TableProps<Delegation>['columns'] = [
    {
      title: MSG_DEL.DELEGATION_DELEGATE,
      key: 'delegate',
      render: (_, item) => (
        <Flex vertical>
          <Text strong>
            {item.delegateName || item.delegateUsername || item.delegateId}
          </Text>
          <Text type="secondary">
            {item.delegateUsername ?? EMPTY_VALUE}
            {item.delegateDepartmentName ? ` — ${item.delegateDepartmentName}` : ''}
          </Text>
        </Flex>
      ),
    },
    {
      title: MSG_DEL.DELEGATION_PERMISSIONS,
      key: 'permissions',
      width: 260,
      render: (_, item) => (
        <Tooltip
          title={
            <Flex vertical>
              {item.permissions.map((code) => (
                <span key={code}>{permissionLabel(code)}</span>
              ))}
            </Flex>
          }
        >
          <Space wrap size={4}>
            <Tag color="blue">{item.permissions.length} quyền</Tag>
            {item.permissions.slice(0, 2).map((code) => (
              <Tag key={code}>{permissionLabel(code)}</Tag>
            ))}
            {item.permissions.length > 2 && <Tag>+{item.permissions.length - 2}</Tag>}
          </Space>
        </Tooltip>
      ),
    },
    {
      title: MSG_DEL.WINDOW,
      key: 'window',
      render: (_, item) => (
        <Flex vertical>
          <Text>{MSG_DEL.WINDOW_FROM(formatDate(item.effectiveFrom))}</Text>
          <Text type="secondary">
            {item.effectiveTo
              ? MSG_DEL.WINDOW_UNTIL(formatDate(item.effectiveTo))
              : MSG_DEL.WINDOW_FOREVER}
          </Text>
        </Flex>
      ),
    },
    {
      title: MSG_DEL.DELEGATION_STATUS,
      key: 'status',
      width: 130,
      render: (_, item) => <Tag color={statusColor(item)}>{statusText(item)}</Tag>,
    },
    {
      title: MSG_DEL.ACTIONS,
      key: 'actions',
      width: 180,
      render: (_, item) =>
        item.status === 'ACTIVE' ? (
          <Space>
            <Button
              size="small"
              onClick={() => {
                setEditing(item);
                setModalMode('edit');
              }}
            >
              Sửa
            </Button>
            <Button
              size="small"
              danger
              onClick={() => {
                setRevoking(item);
                setRevokeReason('');
                setActionError(null);
              }}
            >
              {MSG_DEL.DELEGATION_REVOKE}
            </Button>
          </Space>
        ) : (
          <Tooltip title={item.revokedReason ?? EMPTY_VALUE}>
            <Text type="secondary">{MSG_DEL.STATUS_REVOKED}</Text>
          </Tooltip>
        ),
    },
  ];

  return (
    <Flex vertical>
      <PageHeader title={MSG_DEL.TITLE} subtitle={MSG_DEL.SUBTITLE} />

      {actionError && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={actionError}
          style={{ marginBottom: token.margin }}
          closable
          onClose={() => setActionError(null)}
        />
      )}

      <Card
        title={MSG_DEL.GM_SECTION}
        style={{ marginBottom: token.marginLG }}
        extra={
          <Button type="primary" onClick={openAppoint} disabled={availableCandidates.length === 0}>
            {MSG_DEL.GM_APPOINT}
          </Button>
        }
        styles={{ body: { padding: managers.isLoading ? token.paddingLG : 0 } }}
      >
        <Table<GeneralManager>
          rowKey="userId"
          size="small"
          columns={managerColumns}
          dataSource={managerList}
          loading={managers.isLoading}
          pagination={false}
          locale={{ emptyText: <Empty description={MSG_DEL.GM_EMPTY} /> }}
        />
      </Card>

      <Card
        title={MSG_DEL.DELEGATION_SECTION}
        extra={
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              setModalMode('create');
            }}
            disabled={managerList.length === 0}
            title={managerList.length === 0 ? MSG_DEL.DELEGATION_NO_MANAGER : undefined}
          >
            {MSG_DEL.DELEGATION_CREATE}
          </Button>
        }
        styles={{ body: { padding: delegations.isLoading ? token.paddingLG : 0 } }}
      >
        <Table<Delegation>
          rowKey="id"
          size="small"
          columns={delegationColumns}
          dataSource={delegations.data ?? []}
          loading={delegations.isLoading}
          pagination={false}
          scroll={{ x: 980 }}
          locale={{ emptyText: <Empty description={MSG_DEL.DELEGATION_EMPTY} /> }}
        />
      </Card>

      {appointOpen && (
        <Modal
          open
          title={MSG_DEL.GM_APPOINT}
          onCancel={() => setAppointOpen(false)}
          onOk={() => void submitAppoint()}
          okText={MSG_OWNER.SAVE}
          cancelText={MSG_OWNER.CANCEL}
          confirmLoading={appoint.isPending}
          destroyOnHidden
        >
          <Flex vertical gap={token.marginSM}>
            <Text type="secondary">{MSG_DEL.GM_APPOINT_HINT}</Text>
            <Select
              style={{ width: '100%' }}
              value={candidateId || undefined}
              onChange={setCandidateId}
              placeholder={
                availableCandidates.length === 0
                  ? MSG_DEL.GM_NO_CANDIDATE
                  : MSG_DEL.GM_CANDIDATE_REQUIRED
              }
              options={availableCandidates.map((candidate) => ({
                value: candidate.userId,
                label: delegateLabel(candidate),
              }))}
            />
            <Input.TextArea
              rows={2}
              maxLength={1000}
              value={appointReason}
              onChange={(event) => setAppointReason(event.target.value)}
              placeholder={MSG_DEL.DELEGATION_REASON_PLACEHOLDER}
            />
            {appointError && <Alert type="error" showIcon role="alert" message={appointError} />}
          </Flex>
        </Modal>
      )}

      {modalMode && (
        <DelegationModal
          mode={modalMode}
          delegation={editing}
          managers={managerList}
          permissions={permissions.data ?? []}
          onClose={() => {
            setModalMode(null);
            setEditing(null);
          }}
          onSaved={saveDelegation}
        />
      )}

      {revoking && (
        <Modal
          open
          title={MSG_DEL.DELEGATION_REVOKE}
          onCancel={() => setRevoking(null)}
          onOk={() => void submitRevoke()}
          okText={MSG_DEL.DELEGATION_REVOKE}
          okButtonProps={{ danger: true }}
          cancelText={MSG_OWNER.CANCEL}
          confirmLoading={revoke.isPending}
          destroyOnHidden
        >
          <Flex vertical gap={token.marginSM}>
            <Text>{MSG_DEL.DELEGATION_REVOKE_CONFIRM}</Text>
            <Input.TextArea
              rows={2}
              maxLength={1000}
              value={revokeReason}
              onChange={(event) => setRevokeReason(event.target.value)}
              placeholder={MSG_DEL.DELEGATION_REVOKE_REASON}
            />
          </Flex>
        </Modal>
      )}
    </Flex>
  );
}
