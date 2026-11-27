/**
 * DTO lịch — khớp `ScheduleResponse` / `ScheduleRequest` / `RoomSuggestionResponse`
 * / `SessionImpactResponse` của ScheduleService. FE chỉ đọc thêm các trường mô tả
 * (className/teacherName/…) khi BE có; thiếu thì UI hiện "—".
 *
 * Không có auto-schedule: không định nghĩa DTO `/auto-generate` ở đây.
 */

export interface ScheduleItem {
  id: string;
  classId: string;
  className?: string | null;
  teacherId?: string | null;
  teacherName?: string | null;
  roomId?: string | null;
  roomCode?: string | null;
  subjectName?: string | null;
  /** ISO instant do BE trả; FE format theo giờ địa phương khi hiển thị. */
  startTime: string;
  endTime: string;
  status: string;
  departmentId?: string | null;
}

export interface SchedulePayload {
  classId: string;
  teacherId?: string | null;
  teacherName?: string | null;
  subjectName?: string | null;
  roomId?: string | null;
  startTime: string;
  endTime: string;
}

export interface RoomSuggestion {
  id: string;
  code: string;
  name: string;
  capacity: number;
  status?: string | null;
  /** Chỉ có trên nhánh room-type; FE hiển thị nhưng KHÔNG tự lọc theo trường này. */
  roomType?: string | null;
}

export interface SessionImpact {
  id: string;
  sessionId: string;
  classId: string;
  className?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  startTime: string;
  roomId?: string | null;
  status: string;
  details?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
}
