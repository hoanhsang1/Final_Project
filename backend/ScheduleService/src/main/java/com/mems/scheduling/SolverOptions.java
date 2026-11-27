package com.mems.scheduling;

import java.util.Collections;
import java.util.Set;
import java.util.TreeSet;

/** Giới hạn tìm kiếm và ngưỡng phủ ngày của bộ xếp lịch. */
public record SolverOptions(long maxMillis, int maxSteps, double minCoverage, Set<Integer> allowedWeekdays) {

    public static final long DEFAULT_MAX_MILLIS = 5_000L;
    public static final int DEFAULT_MAX_STEPS = 200_000;
    public static final double DEFAULT_MIN_COVERAGE = 0.5d;

    public SolverOptions {
        if (maxMillis <= 0) throw new IllegalArgumentException("maxMillis phải lớn hơn 0");
        if (maxSteps <= 0) throw new IllegalArgumentException("maxSteps phải lớn hơn 0");
        if (minCoverage < 0d || minCoverage > 1d) {
            throw new IllegalArgumentException("minCoverage phải trong khoảng [0,1]");
        }
        allowedWeekdays = allowedWeekdays == null || allowedWeekdays.isEmpty()
            ? Set.of()
            : Collections.unmodifiableSet(new TreeSet<>(allowedWeekdays));
    }

    public static SolverOptions defaults() {
        return new SolverOptions(DEFAULT_MAX_MILLIS, DEFAULT_MAX_STEPS, DEFAULT_MIN_COVERAGE, Set.of());
    }

    /** Tập rỗng nghĩa là cho phép mọi thứ trong tuần. */
    public boolean isWeekdayAllowed(int weekday) {
        return allowedWeekdays.isEmpty() || allowedWeekdays.contains(weekday);
    }
}
