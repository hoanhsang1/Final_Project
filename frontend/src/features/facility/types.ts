export interface Room {
  id: string
  code: string
  name: string
  building: string | null
  floor: string | null
  capacity: number
  roomType: string | null
  status: string
}

export interface RoomInput {
  code: string
  name: string
  building?: string
  floor?: string
  capacity: number
  roomType?: string
  status?: string
}

export interface Equipment {
  id: string
  assetCode: string
  name: string
  equipmentType: string | null
  roomId: string | null
  roomName: string | null
  status: string
  purchaseDate: string | null
}

export interface EquipmentInput {
  assetCode: string
  name: string
  equipmentType?: string
  roomId?: string
  status?: string
  purchaseDate?: string
}

export interface FacilityIssue {
  id: string
  equipmentId: string
  equipmentName: string | null
  reportedBy: string | null
  description: string
  photoUrl: string | null
  status: string
  resolvedAt: string | null
  createdAt: string
}

export interface IssueInput {
  equipmentId: string
  description: string
  photoUrl?: string
}

export const ROOM_STATUS_LABELS: Record<string, string> = {
  active: 'Đang sử dụng',
  maintenance: 'Đang bảo trì',
  closed: 'Đã đóng',
}

export const ROOM_TYPE_LABELS: Record<string, string> = {
  classroom: 'Phòng học',
  computer_room: 'Phòng máy',
}

export const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
  in_use: 'Đang sử dụng',
  broken: 'Hỏng',
  maintenance: 'Bảo trì',
  in_storage: 'Trong kho',
  retired: 'Đã thanh lý',
}

export const ISSUE_STATUS_LABELS: Record<string, string> = {
  open: 'Chờ xử lý',
  in_progress: 'Đang xử lý',
  resolved: 'Đã xử lý',
  unresolved: 'Chưa xử lý được',
}
