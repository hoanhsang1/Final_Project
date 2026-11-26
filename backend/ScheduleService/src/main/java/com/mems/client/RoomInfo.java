package com.mems.client;

/** Phòng từ FacilityService `GET /internal/rooms/{id}`. */
public record RoomInfo(String id, String code, String name, int capacity, String status,
                       String departmentId, int brokenEquipmentCount, String roomType) {

    /** Tương thích cho nơi không quan tâm loại phòng. */
    public RoomInfo(String id, String code, String name, int capacity, String status,
                    String departmentId, int brokenEquipmentCount) {
        this(id, code, name, capacity, status, departmentId, brokenEquipmentCount, null);
    }

    public boolean isComputerRoom() {
        return "computer_room".equalsIgnoreCase(roomType);
    }
}
