package com.mems.scheduling;

import java.util.List;

/** Khung tuần khả thi của một yêu cầu sau khi lọc điều kiện cứng, đã sắp theo điểm mềm. */
record RequirementPlan(List<WeeklyCandidate> candidates, int cellCount) {

    RequirementPlan {
        candidates = candidates == null ? List.of() : List.copyOf(candidates);
    }
}
