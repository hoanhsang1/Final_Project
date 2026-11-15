import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  clonePosition,
  createPosition,
  deletePosition,
  fetchDepartments,
  fetchPermissionBundles,
  fetchPermissions,
  fetchPositions,
  updatePosition,
} from '../../features/owner/ownerApi';
import { ownerKeys } from '../../features/owner/ownerKeys';
import type { PositionClonePayload, PositionPayload } from '../../features/owner/types';

export function usePositionsPage() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ownerKeys.positions() });
    void queryClient.invalidateQueries({ queryKey: ownerKeys.departments() });
  };

  const list = useQuery({
    queryKey: ownerKeys.positions(),
    queryFn: fetchPositions,
  });

  const permissions = useQuery({
    queryKey: ownerKeys.permissions(),
    queryFn: fetchPermissions,
  });

  const bundles = useQuery({
    queryKey: ownerKeys.bundles(),
    queryFn: fetchPermissionBundles,
  });

  const departments = useQuery({
    queryKey: ownerKeys.departments(),
    queryFn: fetchDepartments,
  });

  const create = useMutation({
    mutationFn: (payload: PositionPayload) => createPosition(payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PositionPayload }) =>
      updatePosition(id, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePosition(id),
    onSuccess: invalidate,
  });

  const clone = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PositionClonePayload }) =>
      clonePosition(id, payload),
    onSuccess: invalidate,
  });

  return { list, permissions, bundles, departments, create, update, remove, clone };
}
