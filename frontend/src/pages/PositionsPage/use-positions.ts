import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPosition,
  deletePosition,
  fetchPermissions,
  fetchPositions,
  updatePosition,
} from '../../features/owner/ownerApi';
import { ownerKeys } from '../../features/owner/ownerKeys';
import type { PositionPayload } from '../../features/owner/types';

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

  return { list, permissions, create, update, remove };
}
