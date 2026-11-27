package com.mems.scheduling;

/** Phòng đã lọc sẵn (đang hoạt động, không hỏng thiết bị) dùng cho bộ xếp lịch thuần. */
public record SolverRoom(String id, String code, int capacity, String roomType) {

    public boolean isComputerRoom() {
        return "computer_room".equalsIgnoreCase(roomType);
    }
}
