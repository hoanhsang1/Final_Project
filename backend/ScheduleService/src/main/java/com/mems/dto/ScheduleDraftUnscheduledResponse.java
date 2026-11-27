package com.mems.dto;

public record ScheduleDraftUnscheduledResponse(
    String id, String classId, String subjectId, Integer sessionNo, String reason
) {}
