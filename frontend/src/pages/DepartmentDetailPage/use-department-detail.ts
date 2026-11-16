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
import { fetchSpecialties } from '../../features/sprint4/sprint4Api';

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
  const isLoading = departments.isPending;
  const departmentsError = departments.isError;

  const members = useQuery({
    queryKey: ownerKeys.members(departmentId),
    queryFn: () => fetchMembers(departmentId),
    enabled: departments.isSuccess && !isMissing,
  });

  const positions = useQuery({
    queryKey: ownerKeys.positions(),
    queryFn: fetchPositions,
  });

  // Chuyên môn cần cho form khi chọn chức vụ giáo viên.
  const specialties = useQuery({
    queryKey: ['specialties'],
    queryFn: fetchSpecialties,
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
    mutationFn: ({ userId, positionIds, reason }: { userId: string; positionIds: string[]; reason?: string }) =>
      updateMemberPositions(departmentId, userId, positionIds, reason),
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
    departmentsError,
    refetchDepartments: departments.refetch,
    members,
    positions,
    specialties,
    create,
    updatePositions,
    remove,
  };
}
