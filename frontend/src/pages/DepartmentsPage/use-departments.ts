import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  updateDepartment,
} from '../../features/owner/ownerApi';
import { ownerKeys } from '../../features/owner/ownerKeys';
import type { DepartmentPayload } from '../../features/owner/types';

/**
 * Container của màn Phòng ban (server state + 3 thao tác ghi).
 *
 * Mọi thao tác ghi đều `invalidateQueries` nhóm `['owner','departments']` — nhóm
 * này bao cả danh sách phòng ban lẫn nhân viên của từng phòng ban, nên đổi tên
 * phòng ban thì cả hai nơi đều tươi lại.
 */
export function useDepartmentsPage() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ownerKeys.departments() });

  const list = useQuery({
    queryKey: ownerKeys.departments(),
    queryFn: fetchDepartments,
  });

  const create = useMutation({
    mutationFn: (payload: DepartmentPayload) => createDepartment(payload),
    onSuccess: () => void invalidate(),
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DepartmentPayload }) =>
      updateDepartment(id, payload),
    onSuccess: () => void invalidate(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: () => void invalidate(),
  });

  return { list, create, update, remove };
}
