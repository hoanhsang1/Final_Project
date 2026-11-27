package com.mems.dto;

import java.util.List;

/** Kết quả dựng yêu cầu xếp lịch cho một lượt: các môn xếp được và các mục bị chặn. */
public record SchedulingRequirements(
    List<SessionRequirement> requirements,
    List<UnschedulableRequirement> unschedulable
) {}
