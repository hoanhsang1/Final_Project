import { useQuery } from '@tanstack/react-query';
import { Alert, Checkbox, Form, Input, Modal, Radio, Select, theme } from 'antd';
import { useEffect, useMemo } from 'react';
import { fetchDepartmentAvailablePermissions, fetchPositionImpact } from '../../features/owner/ownerApi';
import { ownerKeys } from '../../features/owner/ownerKeys';
import { MSG_OWNER, MSG_POS } from '../../features/owner/ownerMessages';
import { permissionLabel } from '../../features/owner/permissionLabels';
import type {
  Department,
  Permission,
  PermissionBundle,
  Position,
  PositionPayload,
} from '../../features/owner/types';
import { usePermission } from '../../hooks/usePermission';

interface PositionFormModalProps {
  open: boolean;
  position: Position | null;
  permissions: Permission[];
  bundles: PermissionBundle[];
  departments: Department[];
  submitting: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (values: PositionPayload) => void;
}

interface FormValues {
  name: string;
  description?: string;
  permissions: string[];
  bundleCodes: string[];
  scope: 'ORGANIZATION' | 'DEPARTMENT';
  departmentId?: string | null;
}

export default function PositionFormModal({
  open,
  position,
  permissions,
  bundles,
  departments,
  submitting,
  error,
  onCancel,
  onSubmit,
}: PositionFormModalProps) {
  const { token } = theme.useToken();
  const { isOwner } = usePermission();
  const [form] = Form.useForm<FormValues>();
  const scope = Form.useWatch('scope', form);
  const departmentId = Form.useWatch('departmentId', form);
  const selectedPermissions = Form.useWatch('permissions', form);
  const selectedBundleCodes = Form.useWatch('bundleCodes', form);
  const isEditing = position !== null;

  const scopedDepartmentId = scope === 'DEPARTMENT' ? departmentId : null;

  const departmentModules = useMemo(() => {
    const map = new Map<string, Set<string>>();
    departments.forEach((d) => map.set(d.id, new Set(d.modules ?? [])));
    return map;
  }, [departments]);

  // BE là nguồn chốt (module phòng + module tổ chức đang bật); lọc tại chỗ chỉ để hiện ngay.
  const availablePermissions = useQuery({
    queryKey: ownerKeys.availablePermissions(scopedDepartmentId ?? ''),
    queryFn: () => fetchDepartmentAvailablePermissions(scopedDepartmentId ?? ''),
    enabled: open && !!scopedDepartmentId,
  });

  const shownPermissions = useMemo(() => {
    if (!scopedDepartmentId) {
      return permissions;
    }
    if (availablePermissions.data) {
      return availablePermissions.data;
    }
    const modules = departmentModules.get(scopedDepartmentId);
    if (!modules) {
      return permissions;
    }
    return permissions.filter((p) => !p.moduleCode || modules.has(p.moduleCode));
  }, [permissions, scopedDepartmentId, availablePermissions.data, departmentModules]);

  // Gói quyền chỉ gán được khi mọi quyền trong gói đều thuộc module của phòng.
  const shownBundles = useMemo(() => {
    if (!scopedDepartmentId) {
      return bundles;
    }
    const codes = new Set(shownPermissions.map((p) => p.code));
    return bundles.filter((b) => b.permissions.every((code) => codes.has(code)));
  }, [bundles, scopedDepartmentId, shownPermissions]);

  const impact = useQuery({
    queryKey: ownerKeys.positionImpact(position?.id ?? ''),
    queryFn: () => fetchPositionImpact(position?.id ?? ''),
    enabled: open && !!position,
  });

  const removesSomething =
    !!position &&
    (position.permissions.some((code) => !(selectedPermissions ?? []).includes(code)) ||
      position.bundleCodes.some((code) => !(selectedBundleCodes ?? []).includes(code)));
  const activeHolders = impact.data?.activeHolders ?? 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    if (position) {
      form.setFieldsValue({
        name: position.name,
        description: position.description ?? '',
        permissions: position.permissions,
        bundleCodes: position.bundleCodes,
        scope: position.scope,
        departmentId: position.departmentId,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ scope: 'DEPARTMENT', permissions: [], bundleCodes: [] });
    }
  }, [open, position, form]);

  const handleDepartmentChange = (value?: string | null) => {
    const modules = value ? departmentModules.get(value) : undefined;
    if (!value || !modules) {
      return;
    }
    const allowedPermissions = new Set(
      permissions.filter((p) => !p.moduleCode || modules.has(p.moduleCode)).map((p) => p.code),
    );
    const allowedBundles = new Set(
      bundles
        .filter((b) => b.permissions.every((code) => allowedPermissions.has(code)))
        .map((b) => b.code),
    );
    form.setFieldsValue({
      permissions: (form.getFieldValue('permissions') ?? []).filter((code: string) =>
        allowedPermissions.has(code),
      ),
      bundleCodes: (form.getFieldValue('bundleCodes') ?? []).filter((code: string) =>
        allowedBundles.has(code),
      ),
    });
  };

  const scopeOptions = [
    { value: 'DEPARTMENT', label: MSG_POS.SCOPE_DEPARTMENT },
    ...(isOwner ? [{ value: 'ORGANIZATION', label: MSG_POS.SCOPE_ORGANIZATION }] : []),
  ];

  return (
    <Modal
      open={open}
      title={isEditing ? MSG_POS.EDIT : MSG_POS.CREATE}
      okText={MSG_OWNER.SAVE}
      cancelText={MSG_OWNER.CANCEL}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitting }}
      onOk={() => form.submit()}
      onCancel={onCancel}
      destroyOnClose
    >
      {open && error && (
        <Alert
          type="error"
          showIcon
          role="alert"
          message={error}
          style={{ marginBottom: token.margin }}
        />
      )}

      {open && removesSomething && activeHolders > 0 && (
        <Alert
          type="warning"
          showIcon
          role="alert"
          message={MSG_POS.IMPACT_HINT(activeHolders)}
          style={{ marginBottom: token.margin }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={(values) =>
          onSubmit({
            name: values.name.trim(),
            description: values.description?.trim() || undefined,
            permissions: values.permissions ?? [],
            bundleCodes: values.bundleCodes ?? [],
            scope: values.scope,
            departmentId: values.scope === 'DEPARTMENT' ? values.departmentId ?? null : null,
          })
        }
      >
        <Form.Item
          label={MSG_POS.NAME}
          name="name"
          rules={[
            { required: true, whitespace: true, message: MSG_POS.NAME_REQUIRED },
            { max: 200, message: MSG_POS.NAME_TOO_LONG },
          ]}
        >
          <Input autoComplete="off" />
        </Form.Item>

        <Form.Item
          label={MSG_POS.DESCRIPTION}
          name="description"
          rules={[{ max: 1000, message: MSG_POS.DESCRIPTION_TOO_LONG }]}
        >
          <Input.TextArea rows={3} maxLength={1000} showCount />
        </Form.Item>

        <Form.Item label={MSG_POS.SCOPE} name="scope" rules={[{ required: true }]}>
          <Radio.Group
            options={scopeOptions}
            onChange={(event) => {
              if (event.target.value === 'ORGANIZATION') {
                form.setFieldValue('departmentId', null);
              }
            }}
          />
        </Form.Item>

        {scope === 'DEPARTMENT' && (
          <Form.Item label={MSG_POS.DEPARTMENT} name="departmentId">
            <Select
              allowClear
              placeholder={MSG_POS.DEPARTMENT_PLACEHOLDER}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              onChange={handleDepartmentChange}
            />
          </Form.Item>
        )}

        <Form.Item
          label={MSG_POS.BUNDLES}
          name="bundleCodes"
          extra={scopedDepartmentId ? MSG_POS.MODULE_FILTERED_HINT : undefined}
        >
          <Select
            mode="multiple"
            allowClear
            placeholder="Chọn gói quyền"
            options={shownBundles.map((b) => ({ value: b.code, label: b.name }))}
          />
        </Form.Item>

        <Form.Item label={MSG_POS.PERMISSIONS} name="permissions" extra={MSG_POS.NO_PERMISSION_HINT}>
          <Checkbox.Group style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}>
            {shownPermissions.map((p) => (
              <Checkbox key={p.code} value={p.code}>
                {permissionLabel(p.code)} ({p.description})
              </Checkbox>
            ))}
          </Checkbox.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
}
