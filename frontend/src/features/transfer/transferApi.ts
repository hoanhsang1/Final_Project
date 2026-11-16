import { isAxiosError } from 'axios';
import { apiClient, unwrapList } from '../../lib/api';
import { Sprint4ApiError, sprint4ErrorMessage } from '../sprint4/sprint4Api';
import type {
  TransferCreatePayload,
  TransferRequestItem,
  TransferStep,
} from './transferTypes';

/** Lỗi quy trình chuyển phòng — dùng lại bảng mã câu tiếng Việt của Sprint 4. */
async function request<T>(call: () => Promise<{ data: T }>): Promise<T> {
  try {
    const { data } = await call();
    return data;
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status ?? null;
      const body = error.response?.data as { code?: string } | undefined;
      throw new Sprint4ApiError(status, body?.code ?? null, sprint4ErrorMessage(error));
    }
    throw error;
  }
}

/** Bọc lời gọi trả danh sách — mọi shape lạ đều thành mảng. */
function requestList<T>(call: () => Promise<{ data: unknown }>): Promise<T[]> {
  return request(call).then((raw) => unwrapList<T>(raw));
}

export function fetchTransferInbox(): Promise<TransferRequestItem[]> {
  return requestList<TransferRequestItem>(() => apiClient.get('/api/transfer-requests/inbox'));
}

export function fetchMyTransfers(): Promise<TransferRequestItem[]> {
  return requestList<TransferRequestItem>(() => apiClient.get('/api/transfer-requests/mine'));
}

export function fetchTransferDetail(id: string): Promise<TransferRequestItem> {
  return request(() => apiClient.get<TransferRequestItem>(`/api/transfer-requests/${id}`));
}

export function createTransfer(payload: TransferCreatePayload): Promise<TransferRequestItem> {
  return request(() => apiClient.post<TransferRequestItem>('/api/transfer-requests', payload));
}

export function decideTransferStep(
  id: string,
  step: TransferStep,
  approve: boolean,
  note?: string,
): Promise<TransferRequestItem> {
  const action = approve ? 'approve' : 'reject';
  return request(() =>
    apiClient.post<TransferRequestItem>(`/api/transfer-requests/${id}/steps/${step}/${action}`, {
      note: note?.trim() || null,
    }),
  );
}

export function cancelTransfer(id: string, note?: string): Promise<TransferRequestItem> {
  return request(() =>
    apiClient.post<TransferRequestItem>(`/api/transfer-requests/${id}/cancel`, {
      note: note?.trim() || null,
    }),
  );
}
