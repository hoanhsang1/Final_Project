import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { fetchDepartments } from '../sprint4/sprint4Api';
import { useAuthStore } from '../../stores/authStore';
import { isOwnerRole } from '../auth/permissions';

export interface DepartmentOptionView {
  value: string;
  label: string;
}

/**
 * Phạm vi phòng ban cho màn lịch học / cơ sở vật chất.
 *
 * - OWNER: chọn bất kỳ phòng ban nào (cần `department.view` để tải danh sách).
 * - Nhân sự thường: mặc định phòng ban trong JWT; nếu JWT không có thì lấy
 *   phòng ban duy nhất trong claim `permissionScopes` (`DEPARTMENT:<id>`).
 */
export function useDepartmentScope() {
  const backendRoles = useAuthStore((s) => s.backendRoles);
  const permissions = useAuthStore((s) => s.permissions);
  const permissionScopes = useAuthStore((s) => s.permissionScopes);
  const storeDepartmentId = useAuthStore((s) => s.departmentId);
  const isOwner = isOwnerRole(backendRoles);
  const canListDepartments = isOwner || permissions.includes('department.view');

  const scopedIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(permissionScopes).forEach((scopes) => {
      scopes.forEach((scope) => {
        if (scope.startsWith('DEPARTMENT:')) ids.add(scope.slice('DEPARTMENT:'.length));
      });
    });
    return Array.from(ids);
  }, [permissionScopes]);

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'operations-scope'],
    queryFn: () => fetchDepartments(),
    enabled: canListDepartments,
    staleTime: 5 * 60 * 1000,
  });

  const options = useMemo<DepartmentOptionView[]>(() => {
    const byId = new Map<string, string>();
    scopedIds.forEach((id) => byId.set(id, id));
    (departmentsQuery.data ?? []).forEach((d) => byId.set(d.id, d.name));
    return Array.from(byId, ([value, label]) => ({ value, label }));
  }, [departmentsQuery.data, scopedIds]);

  // Giữ lựa chọn của chủ tổ chức qua các lần render; nhân sự thường bám theo JWT.
  const [pickedId, setPickedId] = useState<string | undefined>(() => storeDepartmentId ?? undefined);

  useEffect(() => {
    if (isOwner) return;
    if (storeDepartmentId) {
      setPickedId(storeDepartmentId);
      return;
    }
    if (!pickedId && scopedIds.length === 1) setPickedId(scopedIds[0]);
  }, [isOwner, storeDepartmentId, scopedIds, pickedId]);

  const departmentId = !isOwner && storeDepartmentId ? storeDepartmentId : pickedId ?? null;

  return {
    isOwner,
    departmentId,
    setDepartmentId: setPickedId,
    options,
    loading: departmentsQuery.isLoading,
    needsPicker: isOwner || !storeDepartmentId,
    canListDepartments,
  };
}
