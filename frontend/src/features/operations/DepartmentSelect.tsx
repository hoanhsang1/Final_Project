import { Alert, Select } from 'antd';
import { MSG_OPS } from './operationsMessages';
import type { useDepartmentScope } from './useDepartmentScope';

type Scope = ReturnType<typeof useDepartmentScope>;

/** Chọn phòng ban cho màn lịch học/cơ sở vật chất; nhân sự thường bị khóa theo JWT. */
export default function DepartmentSelect({ scope }: { scope: Scope }) {
  if (!scope.needsPicker) return null;

  if (!scope.canListDepartments && scope.options.length === 0) {
    return <Alert type="warning" showIcon message={MSG_OPS.DEPARTMENT_MISSING} />;
  }

  return (
    <Select
      showSearch
      optionFilterProp="label"
      aria-label={MSG_OPS.DEPARTMENT_LABEL}
      placeholder={MSG_OPS.DEPARTMENT_LABEL}
      style={{ minWidth: 240 }}
      loading={scope.loading}
      value={scope.departmentId ?? undefined}
      options={scope.options}
      onChange={(value: string) => scope.setDepartmentId(value)}
    />
  );
}
