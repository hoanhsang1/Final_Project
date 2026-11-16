/** Kiểu dữ liệu cho lịch học & cơ sở vật chất (Phần 7). */

export interface ScheduleItem {
  id: string;
  classId: string;
  className: string | null;
  teacherId: string | null;
  roomId: string | null;
  /** ISO-8601 UTC. */
  startTime: string;
  /** ISO-8601 UTC. */
  endTime: string;
  /** `scheduled` | `cancelled`. */
  status: string;
  departmentId: string;
}

export interface SchedulePayload {
  classId: string;
  /** Để trống → BE dùng giáo viên phụ trách của lớp. */
  teacherId?: string | null;
  roomId?: string | null;
  /** ISO-8601 UTC. */
  startTime: string;
  endTime: string;
}

export interface RoomSuggestion {
  id: string;
  code: string;
  name: string;
  capacity: number;
  status: string;
}

export interface RoomItem {
  id: string;
  code: string;
  name: string;
  building: string | null;
  floor: string | null;
  capacity: number;
  /** `classroom` | `computer_room`. */
  roomType: string;
  /** `active` | `maintenance` | `closed`. */
  status: string;
}

export interface RoomPayload {
  code: string;
  name: string;
  building?: string | null;
  floor?: string | null;
  capacity: number;
  roomType?: string | null;
  status?: string | null;
}

export interface EquipmentItem {
  id: string;
  assetCode: string;
  name: string;
  equipmentType: string | null;
  roomId: string | null;
  roomName: string | null;
  /** `in_use` | `broken` | `maintenance` | `in_storage` | `retired`. */
  status: string;
  purchaseDate: string | null;
}

export interface EquipmentPayload {
  assetCode: string;
  name: string;
  equipmentType?: string | null;
  roomId?: string | null;
  status?: string | null;
  purchaseDate?: string | null;
}

export interface IssueItem {
  id: string;
  equipmentId: string;
  equipmentName: string | null;
  reportedBy: string | null;
  description: string;
  photoUrl: string | null;
  /** `open` | `resolved`. */
  status: string;
  resolvedAt: string | null;
  createdAt: string;
}

export interface IssuePayload {
  equipmentId: string;
  description: string;
  photoUrl?: string | null;
}
