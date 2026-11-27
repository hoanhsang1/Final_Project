package com.mems.scheduling;

import com.mems.dto.SessionRequirement;

import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/** Đếm lý do một yêu cầu bị loại để sinh thông điệp tiếng Việt nêu rõ thiếu gì. */
final class Diagnostics {

    static final String NO_TEACHER = "NO_TEACHER";
    static final String NO_ROOM_TYPE = "NO_ROOM_TYPE";
    static final String CAPACITY = "CAPACITY";
    static final String TEACHER_UNAVAILABLE = "TEACHER_UNAVAILABLE";
    static final String CLASS_RULE = "CLASS_RULE";
    static final String NO_CHAIN = "NO_CHAIN";
    static final String NO_WEEKDAY = "NO_WEEKDAY";
    static final String COVERAGE = "COVERAGE";

    private static final List<String> PRIORITY = List.of(
        NO_TEACHER, NO_ROOM_TYPE, CAPACITY, TEACHER_UNAVAILABLE, CLASS_RULE, NO_CHAIN, NO_WEEKDAY, COVERAGE);

    private final Map<String, Integer> counters = new TreeMap<>();

    void hit(String code) {
        counters.merge(code, 1, Integer::sum);
    }

    String reason(SessionRequirement requirement) {
        String name = name(requirement);
        String dominant = null;
        int max = 0;
        for (String code : PRIORITY) {
            int count = counters.getOrDefault(code, 0);
            if (count > max) {
                max = count;
                dominant = code;
            }
        }
        if (dominant == null) return "Không xếp được môn " + name;
        return switch (dominant) {
            case NO_TEACHER -> "Chưa có giáo viên đủ điều kiện dạy môn " + name;
            case NO_ROOM_TYPE -> "Không có phòng máy đủ " + requirement.studentCount() + " chỗ cho môn " + name;
            case CAPACITY -> "Không có phòng đủ " + requirement.studentCount() + " chỗ cho môn " + name;
            case TEACHER_UNAVAILABLE ->
                "Giáo viên bận/không rảnh trong mọi khung giờ có thể xếp của môn " + name;
            case CLASS_RULE, NO_CHAIN ->
                "Khung giờ của lớp quá hẹp cho buổi " + requirement.sessionMinutes() + " phút của môn " + name;
            case NO_WEEKDAY -> "Cửa sổ ngày của môn " + name + " không có thứ phù hợp để xếp";
            case COVERAGE ->
                "Xung đột với buổi đã xếp của lớp/giáo viên/phòng ở hầu hết các tuần của môn " + name;
            default -> "Không xếp được môn " + name;
        };
    }

    static String name(SessionRequirement requirement) {
        if (requirement == null) return "?";
        return requirement.subjectName() != null && !requirement.subjectName().isBlank()
            ? requirement.subjectName() : requirement.subjectId();
    }
}
