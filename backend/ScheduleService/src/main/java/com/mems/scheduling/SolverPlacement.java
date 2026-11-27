package com.mems.scheduling;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Một buổi đã xếp sau khi bung khung tuần ra ngày cụ thể. */
public record SolverPlacement(
    String classId,
    String subjectId,
    String teacherId,
    String roomId,
    LocalDate date,
    List<Integer> periods,
    Instant start,
    Instant end,
    int weekNo,
    boolean isException,
    String exceptionType,
    String exceptionReason
) {

    public static final String ROOM_CHANGED = "ROOM_CHANGED";
    public static final String PERIOD_CHANGED = "PERIOD_CHANGED";
    public static final String DAY_CHANGED = "DAY_CHANGED";

    public SolverPlacement {
        periods = periods == null ? List.of() : List.copyOf(periods);
    }
}
