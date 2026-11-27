package com.mems.scheduling;

/** Thống kê một lượt xếp lịch: số bước thử, thời gian, số buổi phải sửa ô mẫu. */
public record SolverStats(long steps, long elapsedMillis, int exceptionCount, boolean complete) {
}
