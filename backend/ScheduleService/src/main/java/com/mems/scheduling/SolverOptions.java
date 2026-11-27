package com.mems.scheduling;

import java.util.Collections;
import java.util.Set;
import java.util.TreeSet;

/** Giới hạn tìm kiếm, ngưỡng phủ ngày và trần số buổi/số phút mỗi lớp trong một ngày. */
public record SolverOptions(
    long maxMillis,
    int maxSteps,
    double minCoverage,
    Set<Integer> allowedWeekdays,
    int maxSessionsPerDayPerClass,
    int maxMinutesPerDayPerClass
) {

    public static final long DEFAULT_MAX_MILLIS = 5_000L;
    public static final int DEFAULT_MAX_STEPS = 200_000;
    public static final double DEFAULT_MIN_COVERAGE = 0.5d;
    public static final int DEFAULT_MAX_SESSIONS_PER_DAY_PER_CLASS = 2;
    public static final int DEFAULT_MAX_MINUTES_PER_DAY_PER_CLASS = 240;

    public SolverOptions {
        if (maxMillis <= 0) throw new IllegalArgumentException("maxMillis phải lớn hơn 0");
        if (maxSteps <= 0) throw new IllegalArgumentException("maxSteps phải lớn hơn 0");
        if (minCoverage < 0d || minCoverage > 1d) {
            throw new IllegalArgumentException("minCoverage phải trong khoảng [0,1]");
        }
        if (maxSessionsPerDayPerClass <= 0) {
            throw new IllegalArgumentException("maxSessionsPerDayPerClass phải lớn hơn 0");
        }
        if (maxMinutesPerDayPerClass <= 0) {
            throw new IllegalArgumentException("maxMinutesPerDayPerClass phải lớn hơn 0");
        }
        allowedWeekdays = allowedWeekdays == null || allowedWeekdays.isEmpty()
            ? Set.of()
            : Collections.unmodifiableSet(new TreeSet<>(allowedWeekdays));
    }

    /** Giữ tương thích cho nơi chỉ truyền 4 tham số cũ; áp trần mặc định. */
    public SolverOptions(long maxMillis, int maxSteps, double minCoverage, Set<Integer> allowedWeekdays) {
        this(maxMillis, maxSteps, minCoverage, allowedWeekdays,
            DEFAULT_MAX_SESSIONS_PER_DAY_PER_CLASS, DEFAULT_MAX_MINUTES_PER_DAY_PER_CLASS);
    }

    public static SolverOptions defaults() {
        return new SolverOptions(DEFAULT_MAX_MILLIS, DEFAULT_MAX_STEPS, DEFAULT_MIN_COVERAGE, Set.of(),
            DEFAULT_MAX_SESSIONS_PER_DAY_PER_CLASS, DEFAULT_MAX_MINUTES_PER_DAY_PER_CLASS);
    }

    /** Tập rỗng nghĩa là cho phép mọi thứ trong tuần. */
    public boolean isWeekdayAllowed(int weekday) {
        return allowedWeekdays.isEmpty() || allowedWeekdays.contains(weekday);
    }
}
