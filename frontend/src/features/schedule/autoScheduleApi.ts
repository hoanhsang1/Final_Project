import { apiClient } from '../../lib/api';
import { getApiCode } from '../platform/errorCodes';
import { ScheduleApiError, scheduleErrorMessage } from './scheduleApi';
import type { ScheduleItem } from './types';

/** Một tiết gửi cho BE — giờ-local dạng `HH:mm` (D11). */
export interface AutoScheduleSlot {
  startTime: string;
  endTime: string;
}

export interface AutoSchedulePayload {
  classIds: string[];
  /** `YYYY-MM-DD` — lấy trực tiếp từ `DateRangeInput`. */
  dateFrom: string;
  dateTo: string;
  slots: AutoScheduleSlot[];
  /** 1 = Thứ Hai … 7 = Chủ Nhật. */
  sessionDays?: number[];
  /** Chỉ gửi khi chọn nguồn "Nhập tay" — BE dùng làm override của môn (D8). */
  sessionsPerWeek?: number;
  sessionMinutes?: number;
}

export interface AutoScheduleUnscheduled {
  classId: string;
  className: string;
  subjectName: string;
  /** Lý do tiếng Việt do BE trả; FE chỉ hiển thị. */
  reason: string;
}

export interface AutoScheduleSummary {
  totalRequested: number;
  scheduled: number;
  unscheduled: number;
}

export interface AutoScheduleResult {
  scheduled: ScheduleItem[];
  unscheduled: AutoScheduleUnscheduled[];
  summary: AutoScheduleSummary;
}

/** `ScheduleItem` trả về khi dryRun có id dạng `PREVIEW-n` — vẫn chỉ đọc. */
export type PreviewSession = ScheduleItem;

/**
 * Gọi hợp đồng đã chốt:
 * `POST /api/departments/{id}/schedules/auto-generate?dryRun=true|false`.
 *
 * `dryRun=true` trả bản nháp, KHÔNG ghi DB. `dryRun=false` là xác nhận: BE chạy
 * lại thuật toán, kiểm tra xung đột lần cuối rồi mới INSERT.
 *
 * Mọi lỗi đều đi qua `scheduleErrorMessage` để ra câu tiếng Việt; mã lỗi vẫn
 * là CHUỖI (`getApiCode` bỏ mã số).
 */
export async function generateAutoSchedule(
  departmentId: string,
  payload: AutoSchedulePayload,
  dryRun: boolean,
): Promise<AutoScheduleResult> {
  const url = `/api/departments/${encodeURIComponent(
    departmentId,
  )}/schedules/auto-generate?dryRun=${dryRun ? 'true' : 'false'}`;

  try {
    const { data } = await apiClient.post<AutoScheduleResult>(url, payload);
    return data;
  } catch (error) {
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    throw new ScheduleApiError(scheduleErrorMessage(error), {
      code: getApiCode(error),
      status,
    });
  }
}
