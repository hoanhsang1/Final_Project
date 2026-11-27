package com.mems.scheduling;

import java.util.Comparator;

/**
 * Trọng số điểm mềm của một ô mẫu — nơi duy nhất khai báo các hệ số — và thứ tự
 * chọn phòng khi sửa ô lỗi. Điểm cao hơn được chọn trước.
 */
final class CandidateOrder {

    static final double COVERAGE_WEIGHT = 1_000d;
    static final double REUSE_BONUS = 120d;
    static final double COMPUTER_ROOM_PENALTY = 500d;
    static final double CAPACITY_WEIGHT = 0.2d;
    static final double TEACHER_LOAD_WEIGHT = 3d;
    static final double DAY_LOAD_WEIGHT = 1.5d;

    private CandidateOrder() {
    }

    static double score(double coverage, boolean reuse, boolean anyOnComputerRoom,
                        int capacityWaste, int teacherWeeklyLoad, int weekdayLoad) {
        return COVERAGE_WEIGHT * coverage
            + (reuse ? REUSE_BONUS : 0d)
            - (anyOnComputerRoom ? COMPUTER_ROOM_PENALTY : 0d)
            - CAPACITY_WEIGHT * capacityWaste
            - TEACHER_LOAD_WEIGHT * teacherWeeklyLoad
            - DAY_LOAD_WEIGHT * weekdayLoad;
    }

    static Comparator<WeeklyCandidate> byScore() {
        return Comparator.comparingDouble(WeeklyCandidate::score).reversed()
            .thenComparingInt(WeeklyCandidate::weekday)
            .thenComparingInt(WeeklyCandidate::startPeriod)
            .thenComparing(WeeklyCandidate::roomId)
            .thenComparing(WeeklyCandidate::teacherId, Comparator.nullsFirst(Comparator.naturalOrder()));
    }

    /** Phòng vừa sức chứa nhất trước để không lãng phí phòng lớn. */
    static Comparator<SolverRoom> roomPreference() {
        return Comparator.comparingInt(SolverRoom::capacity).thenComparing(SolverRoom::id);
    }
}
