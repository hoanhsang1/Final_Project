package com.mems.dto;

/** Phòng học trả cho ScheduleService qua API nội bộ. */
public record InternalRoomResponse(
    String id,
    String code,
    String name,
    int capacity,
    String status,
    String departmentId,
    int brokenEquipmentCount,
    String roomType
) {}
