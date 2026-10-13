package com.mems.identity.enums;

public enum ModuleCode {
    student_management, teacher_management, class_management, schedule_management,
    staff_management, classroom_management, computer_room_management,
    equipment_management, teacher_assignment, room_usage_management;

    // 4 module Core — KHÔNG được phép tắt (BR trong SRS Phần 10.1 / Product Backlog)
    public boolean isCore() {
        return this == student_management || this == teacher_management
                || this == class_management || this == schedule_management;
    }
}
