package com.mems.schedule;

/** Khoảng rảnh/bận theo tuần của giáo viên. */
public record TeacherAvailability(int weekday, int fromPeriod, int toPeriod, Kind kind) {

    public enum Kind {
        AVAILABLE,
        UNAVAILABLE
    }
}
