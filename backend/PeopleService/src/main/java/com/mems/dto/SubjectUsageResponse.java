package com.mems.dto;

import java.util.List;

public record SubjectUsageResponse(
    String subjectId,
    int classesUsingSubject,
    List<SubjectClassUsageItem> classes
) {
    public record SubjectClassUsageItem(
        String classId,
        String classCode,
        String name,
        String status
    ) {}
}
