package com.mems.client;

/** Phòng từ FacilityService `GET /internal/rooms/{id}`. */
public record RoomInfo(String id, String code, String name, int capacity, String status,
                       String departmentId, int brokenEquipmentCount) {}
