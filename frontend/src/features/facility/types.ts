/**
 * DTO cơ sở vật chất — khớp `RoomRequest/Response`, `EquipmentRequest/Response`,
 * `IssueReportRequest/IssueResponse` của FacilityService (`origin/main`).
 *
 * Không dùng `/internal/rooms` hay `/outbox/**`: mọi thao tác đi qua route
 * `/api/departments/{d}/facilities/**` của gateway.
 */

export const ROOM_TYPES = ['classroom', 'computer_room'] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_STATUSES = ['active', 'maintenance', 'closed'] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const EQUIPMENT_STATUSES = [
  'in_use',
  'broken',
  'maintenance',
  'in_storage',
  'retired',
] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

export const ISSUE_STATUSES = ['open', 'in_progress', 'resolved', 'unresolved'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export interface Room {
  id: string;
  code: string;
  name: string;
  building?: string | null;
  floor?: string | null;
  capacity: number;
  /** BE trả `classroom|computer_room`; FE chỉ hiển thị, không tự lọc. */
  roomType: RoomType | string;
  status: RoomStatus | string;
}

export interface RoomPayload {
  code: string;
  name: string;
  building: string | null;
  floor: string | null;
  capacity: number;
  roomType: RoomType;
  status: RoomStatus;
}

export interface Equipment {
  id: string;
  assetCode: string;
  name: string;
  equipmentType?: string | null;
  roomId?: string | null;
  roomName?: string | null;
  status: EquipmentStatus | string;
  /** `YYYY-MM-DD` (LocalDate của BE). */
  purchaseDate?: string | null;
}

export interface EquipmentPayload {
  assetCode: string;
  name: string;
  equipmentType: string | null;
  roomId: string | null;
  status: EquipmentStatus;
  purchaseDate: string | null;
}

export interface FacilityIssue {
  id: string;
  equipmentId: string;
  equipmentName?: string | null;
  reportedBy?: string | null;
  description: string;
  photoUrl?: string | null;
  status: IssueStatus | string;
  resolvedAt?: string | null;
  createdAt?: string | null;
}

export interface IssueReportPayload {
  equipmentId: string;
  description: string;
  photoUrl: string | null;
}

export interface FacilityIssueQuery {
  departmentId: string;
  status?: string;
}
