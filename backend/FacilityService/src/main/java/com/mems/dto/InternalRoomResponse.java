package com.mems.dto;

/** Phòng kèm số thiết bị đang hỏng — ScheduleService dùng để gợi ý phòng trống. */
public record InternalRoomResponse(String id, String code, String name, int capacity,
                                   String status, String departmentId, int brokenEquipmentCount,
                                   String roomType) {}
