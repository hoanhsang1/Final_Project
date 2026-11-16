/** Hợp đồng FE cho quy trình chuyển phòng ban 4 bên (quy tắc 15). */

export type TransferStep = 'SOURCE_HEAD' | 'TARGET_HEAD' | 'HR' | 'EMPLOYEE';
export type TransferDecision = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface TransferStepItem {
  step: TransferStep;
  decision: TransferDecision;
  decidedBy?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  note?: string | null;
}

export interface TransferRequestItem {
  id: string;
  userId: string;
  username?: string | null;
  fullName?: string | null;
  fromDepartmentId: string;
  fromDepartmentName?: string | null;
  toDepartmentId: string;
  toDepartmentName?: string | null;
  reason: string;
  status: TransferStatus;
  requestedBy: string;
  requestedByName?: string | null;
  requestedAt: string;
  appliedAt?: string | null;
  appliedBy?: string | null;
  steps: TransferStepItem[];
  /** Các bước người đang đăng nhập được phép quyết định (chỉ khi PENDING). */
  actionableSteps: TransferStep[];
}

export interface TransferCreatePayload {
  userId: string;
  toDepartmentId: string;
  reason: string;
}
