package com.mems.scheduling;

/** Phòng đã lọc sẵn (đang hoạt động, không hỏng thiết bị) dùng cho bộ xếp lịch thuần. */
public record SolverRoom(String id, String code, int capacity, String roomType) {

    /** Tiền tố của "phòng ảo" dùng khi FacilityService không phản hồi: xếp được giờ nhưng chưa gán phòng. */
    public static final String NO_ROOM_PREFIX = "__no-room__:";

    public boolean isComputerRoom() {
        return "computer_room".equalsIgnoreCase(roomType);
    }

    public boolean synthetic() {
        return id != null && id.startsWith(NO_ROOM_PREFIX);
    }

    /** Mã phòng ảo gắn với đúng một môn của một lớp, không dùng lẫn giữa các môn/lớp. */
    public static String noRoomId(String classId, String subjectId) {
        return NO_ROOM_PREFIX + classId + "|" + subjectId;
    }
}
