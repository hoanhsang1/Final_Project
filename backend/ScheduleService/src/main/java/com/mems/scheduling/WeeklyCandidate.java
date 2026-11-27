package com.mems.scheduling;

import java.util.List;

/** Một ô mẫu tuần: thứ + tiết bắt đầu + phòng + giáo viên, kèm điểm mềm đã tính. */
record WeeklyCandidate(
    int weekday,
    int startPeriod,
    List<Integer> periods,
    String roomId,
    String teacherId,
    double coverage,
    int totalDays,
    double score
) {

    WeeklyCandidate {
        periods = periods == null ? List.of() : List.copyOf(periods);
    }
}
