package com.mems.client;

/** Phòng cấp tổ chức từ FacilityService {@code /internal/rooms}. */
public record RoomInfo(String id, String code, String name, int capacity, String status,
                       String departmentId, int brokenEquipmentCount, String roomType) {

    public boolean isComputerRoom() {
        return "computer_room".equalsIgnoreCase(roomType);
    }
}
