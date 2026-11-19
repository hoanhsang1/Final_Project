import type { TransferRequest } from '@/features/organization/types'

export type ResignationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface ResignationRequest {
  id: string
  userId: string
  username: string
  fullName: string | null
  departmentId: string
  /** Có thể null với dữ liệu cũ đã xoá phòng ban. */
  departmentName: string | null
  reason: string
  status: ResignationStatus
  requestedBy: string
  requestedByName: string
  requestedAt: string
  decidedBy: string | null
  decidedByName: string | null
  decidedAt: string | null
  decisionNote: string | null
}

export type ClassLifecycleKind = 'CLOSE' | 'CANCEL'

export interface ClassLifecycleInboxItem {
  classId: string
  classCode: string
  className: string
  classStatus: string
  kind: ClassLifecycleKind
  requesterId: string | null
  requesterName: string | null
  reason: string | null
  requestedAt: string | null
  studentCount: number
}

export interface ApprovalInbox {
  transfers: TransferRequest[]
  resignations: ResignationRequest[]
  classLifecycle: ClassLifecycleInboxItem[]
  total: number
}

export type TransferStepCode = 'SOURCE_HEAD' | 'TARGET_HEAD' | 'HR' | 'EMPLOYEE'

export interface TransferDecisionInput {
  note?: string
}

export interface Delegation {
  id: string
  delegatorId: string
  delegatorName: string
  delegateId: string
  delegateName: string
  delegateUsername: string
  delegateDepartmentId: string | null
  delegateDepartmentName: string | null
  permissions: string[]
  scope: string
  effectiveFrom: string
  effectiveTo: string | null
  status: string
  active: boolean
  reason: string | null
  createdAt: string
  revokedAt: string | null
  revokedReason: string | null
}

export interface DelegationInput {
  delegateId: string
  permissions: string[]
  effectiveFrom?: string
  effectiveTo?: string
  reason?: string
}

export interface GeneralManager {
  userId: string
  username: string
  fullName: string | null
  departmentId: string | null
  departmentName: string | null
  appointedAt: string
}

export interface GeneralManagerCandidate {
  userId: string
  username: string
  fullName: string | null
  departmentId: string | null
  departmentName: string | null
}

export interface PermissionDefinition {
  code: string
  description: string
  moduleCode: string | null
  allowedScopes: string[]
}

export interface PermissionBundle {
  code: string
  name: string
  description: string
  permissions: string[]
  allowedScopes: string[]
}

export interface EffectivePermissions {
  userId: string
  orgId: string
  departmentId: string | null
  permissions: string[]
  permissionScopes: Record<string, string[]>
  delegatedPermissions: string[]
}

export const RESIGNATION_STATUS_LABELS: Record<ResignationStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã chấp thuận',
  REJECTED: 'Bị từ chối',
}

export const DELEGATION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Đang hiệu lực',
  REVOKED: 'Đã thu hồi',
  EXPIRED: 'Hết hiệu lực',
}

export type { TransferRequest }
