package com.mems.outbox;

/** Tên event dùng chung giữa PeopleService và ScheduleService. */
public final class OutboxEventTypes {
    public static final String CLASS_TEACHER_CHANGED = "ClassTeacherChanged";
    public static final String CLASS_STATUS_CHANGED = "ClassStatusChanged";

    private OutboxEventTypes() {}
}
