import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  createMember,
  deleteMember,
  fetchDepartments,
  fetchMembers,
  fetchPositions,
  updateMemberPositions,
} from '../../features/owner/ownerApi';
import { ownerKeys } from '../../features/owner/ownerKeys';
import type { MemberPayload } from '../../features/owner/types';

export function useDepartmentDetail(departmentId: string) {
  const queryClient = useQueryClient();

  const departments = useQuery({
    queryKey: ownerKeys.departments(),
    queryFn: fetchDepartments,
  });

  const department = useMemo(
    () => departments.data?.find((d) => d.id === departmentId) ?? null,
    [departments.data, departmentId],
  );

  const isMissing = departments.isSuccess && department === null;
  const isLoading = departments.isLoading;

  const members = useQuery({
    queryKey: ownerKeys.members(departmentId),
    queryFn: () => fetchMembers(departmentId),
    enabled: departments.isSuccess && !isMissing,
  });

  const positions = useQuery({
    queryKey: ownerKeys.positions(),
    queryFn: fetchPositions,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ownerKeys.members(departmentId) });
    void queryClient.invalidateQueries({ queryKey: ownerKeys.departments() });
  };

  const create = useMutation({
    mutationFn: (payload: MemberPayload) => createMember(departmentId, payload),
    onSuccess: invalidate,
  });

  const updatePositions = useMutation({
    mutationFn: ({ userId, positionIds }: { userId: string; positionIds: string[] }) =>
      updateMemberPositions(departmentId, userId, positionIds),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (userId: string) => deleteMember(departmentId, userId),
    onSuccess: invalidate,
  });

  return {
    department,
    isLoading,
    isMissing,
    members,
    positions,
    create,
    updatePositions,
    remove,
  };
}
