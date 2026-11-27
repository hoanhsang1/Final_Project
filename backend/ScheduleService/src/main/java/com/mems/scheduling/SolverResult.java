package com.mems.scheduling;

import java.util.List;

/** Kết quả bộ xếp lịch: các buổi đã xếp, các buổi bỏ lại, thống kê. */
public record SolverResult(
    List<SolverPlacement> placements,
    List<SolverUnscheduled> unscheduled,
    SolverStats stats
) {

    public SolverResult {
        placements = placements == null ? List.of() : List.copyOf(placements);
        unscheduled = unscheduled == null ? List.of() : List.copyOf(unscheduled);
    }
}
