package com.mems.scheduling;

import java.time.LocalDate;

/** Buổi/môn không xếp được kèm lý do tiếng Việt nêu rõ thiếu gì. */
public record SolverUnscheduled(
    String classId,
    String subjectId,
    Integer sessionNo,
    LocalDate date,
    String reason
) {
}
