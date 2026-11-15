import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  appointGeneralManager,
  createDelegation,
  fetchDelegations,
  fetchGeneralManagerCandidates,
  fetchGeneralManagers,
  fetchPermissions,
  removeGeneralManager,
  revokeDelegation,
  updateDelegation,
} from '../../features/owner/ownerApi';
import { ownerKeys } from '../../features/owner/ownerKeys';
import type { DelegationPayload, DelegationUpdatePayload } from '../../features/owner/types';

/** Dữ liệu + thao tác của màn Tổng quản lý & ủy quyền của Owner. */
export function useDelegationPage() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ownerKeys.generalManagers() });
    void queryClient.invalidateQueries({ queryKey: ownerKeys.generalManagerCandidates() });
    void queryClient.invalidateQueries({ queryKey: ownerKeys.delegations() });
  };

  const managers = useQuery({
    queryKey: ownerKeys.generalManagers(),
    queryFn: fetchGeneralManagers,
  });

  const candidates = useQuery({
    queryKey: ownerKeys.generalManagerCandidates(),
    queryFn: fetchGeneralManagerCandidates,
  });

  const delegations = useQuery({
    queryKey: ownerKeys.delegations(),
    queryFn: () => fetchDelegations(false),
  });

  // Quyền Owner có thể ủy quyền = toàn bộ danh mục (BE vẫn chặn nếu vượt quyền).
  const permissions = useQuery({
    queryKey: ownerKeys.permissions(),
    queryFn: fetchPermissions,
  });

  const appoint = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      appointGeneralManager(userId, reason),
    onSuccess: invalidate,
  });

  const removeManager = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      removeGeneralManager(userId, reason),
    onSuccess: invalidate,
  });

  const create = useMutation({
    mutationFn: (payload: DelegationPayload) => createDelegation(payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: DelegationUpdatePayload }) =>
      updateDelegation(id, payload),
    onSuccess: invalidate,
  });

  const revoke = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => revokeDelegation(id, reason),
    onSuccess: invalidate,
  });

  return {
    managers,
    candidates,
    delegations,
    permissions,
    appoint,
    removeManager,
    create,
    update,
    revoke,
  };
}
