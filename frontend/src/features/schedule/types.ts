export interface ScheduleSession {
  id: string
  classId: string
  className: string | null
  teacherId: string | null
  teacherName?: string | null
  roomId: string | null
  roomCode?: string | null
  subjectName?: string | null
  startTime: string
  endTime: string
  status: string
  departmentId: string | null
}

export interface ScheduleInput {
  classId: string
  teacherId?: string
  roomId?: string
  startTime: string
  endTime: string
}

export interface RoomSuggestion {
  id: string
  code: string
  name: string
  capacity: number
  status: string
  roomType?: 'classroom' | 'computer_room' | null
}

export const ROOM_TYPE_LABELS: Record<string, string> = {
  classroom: 'Phòng thường',
  computer_room: 'Phòng máy',
}

export const SESSION_STATUS_LABELS: Record<string, string> = {
  draft: 'Chưa bắt đầu',
  ongoing: 'Đang diễn ra',
  cancelled: 'Đã huỷ',
  CHUA_BAT_DAU: 'Chưa bắt đầu',
  DANG_DIEN_RA: 'Đang diễn ra',
  DA_HUY: 'Đã huỷ',
}

// ---- Auto-schedule types ----

export interface TimeSlot {
  startTime: string // "HH:mm"
  endTime: string   // "HH:mm"
}

export interface AutoScheduleRequest {
  classIds: string[]
  dateFrom: string   // "YYYY-MM-DD"
  dateTo: string     // "YYYY-MM-DD"
  slots: TimeSlot[]
  sessionDays?: number[] // 1=Mon…7=Sun, null = all
}

export interface UnscheduledItem {
  classId: string
  className: string | null
  subjectName: string | null
  reason: string
}

export interface AutoScheduleSummary {
  totalRequested: number
  scheduled: number
  unscheduled: number
}

export interface AutoScheduleResult {
  scheduled: ScheduleSession[]
  unscheduled: UnscheduledItem[]
  summary: AutoScheduleSummary
}

// ---- Schedule config types (P1) ----

export interface ScheduleTimeSlot {
  id: string
  periodNo: number
  name: string | null
  startTime: string // "HH:mm"
  endTime: string   // "HH:mm"
  joinsNext: boolean
  isActive: boolean
}

export interface ScheduleTimeSlotInput {
  periodNo: number
  name?: string | null
  startTime: string
  endTime: string
  joinsNext?: boolean
  isActive?: boolean
}

export interface ClassSlotRule {
  weekday: number // 1 = Thứ 2 … 7 = Chủ nhật
  fromPeriod: number
  toPeriod: number
  off: boolean
}

export interface ClassSlotRules {
  classId: string
  rules: ClassSlotRule[]
}

export type TeacherAvailabilityKind = 'AVAILABLE' | 'UNAVAILABLE'

export interface TeacherAvailabilityEntry {
  weekday: number
  fromPeriod: number
  toPeriod: number
  kind: TeacherAvailabilityKind
}

export interface TeacherAvailability {
  teacherId: string
  entries: TeacherAvailabilityEntry[]
}

export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
}

// ---- Lịch nháp (P8) ----

export type ScheduleDraftStatus = 'DRAFT' | 'CONFIRMED' | 'DISCARDED'

export const DRAFT_STATUS_LABELS: Record<ScheduleDraftStatus, string> = {
  DRAFT: 'Bản nháp',
  CONFIRMED: 'Đã xác nhận',
  DISCARDED: 'Đã huỷ',
}

export const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  ROOM_CHANGED: 'Đổi phòng',
  PERIOD_CHANGED: 'Đổi tiết',
  DAY_CHANGED: 'Đổi ngày',
}

export interface ScheduleDraftRequest {
  classIds: string[]
  dateFrom: string // "YYYY-MM-DD"
  dateTo: string   // "YYYY-MM-DD"
  sessionDays?: number[] // 1 = Thứ 2 … 7 = Chủ nhật
}

export interface ScheduleDraftItem {
  id: string
  classId: string
  subjectId: string | null
  subjectName: string | null
  teacherId: string | null
  teacherName: string | null
  roomId: string | null
  roomCode: string | null
  startTime: string
  endTime: string
  date: string // "YYYY-MM-DD"
  periods: number[]
  weekNo: number
  exception: boolean
  exceptionType: string | null
  exceptionReason: string | null
  manualEdit: boolean
}

export interface ScheduleDraftUnscheduled {
  id: string
  classId: string
  subjectId: string | null
  sessionNo: number | null
  reason: string
}

export interface ScheduleDraftSummary {
  id: string
  status: ScheduleDraftStatus
  departmentId: string
  classIds: string[]
  dateFrom: string
  dateTo: string
  itemCount: number
  unscheduledCount: number
  exceptionCount: number
  createdAt: string
  confirmedAt: string | null
}

export interface ScheduleDraftDetail {
  id: string
  status: ScheduleDraftStatus
  departmentId: string
  classIds: string[]
  dateFrom: string
  dateTo: string
  week: number
  totalWeeks: number
  items: ScheduleDraftItem[]
  unscheduled: ScheduleDraftUnscheduled[]
  totalItems: number
  exceptionCount: number
  unscheduledCount: number
  complete: boolean
  steps: number
  elapsedMillis: number
  createdAt: string
  confirmedAt: string | null
}

export interface ScheduleDraftPatch {
  roomId?: string | null
  startTime?: string | null
  endTime?: string | null
  teacherId?: string | null
}

export interface ScheduleDraftConfirmResult {
  created: number
  failed: Array<{
    itemId: string
    classId: string | null
    subjectName: string | null
    reason: string
  }>
}

export const TEACHER_AVAILABILITY_LABELS: Record<TeacherAvailabilityKind, string> = {
  AVAILABLE: 'Có thể dạy',
  UNAVAILABLE: 'Không thể dạy',
}
