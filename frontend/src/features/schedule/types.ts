export interface ScheduleSession {
  id: string
  classId: string
  className: string | null
  teacherId: string | null
  roomId: string | null
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
}

export const SESSION_STATUS_LABELS: Record<string, string> = {
  draft: 'Chưa bắt đầu',
  ongoing: 'Đang diễn ra',
  cancelled: 'Đã huỷ',
  CHUA_BAT_DAU: 'Chưa bắt đầu',
  DANG_DIEN_RA: 'Đang diễn ra',
  DA_HUY: 'Đã huỷ',
}
