package com.mems.dto;

import java.util.List;

public record SubjectUsageResponse(
    String subjectId,
    int classesUsingSubject,
    List<SubjectClassUsageItem> classes,
    int classSubjectsUsingSubject,
    List<SubjectClassUsageItem> classSubjects,
    int curriculaUsingSubject,
    List<CurriculumUsageItem> curricula
) {
    public SubjectUsageResponse(String subjectId, int classesUsingSubject,
                                List<SubjectClassUsageItem> classes) {
        this(subjectId, classesUsingSubject, classes, 0, List.of(), 0, List.of());
    }

    public record SubjectClassUsageItem(
        String classId,
        String classCode,
        String name,
        String status
    ) {}

    public record CurriculumUsageItem(String curriculumId, String code, String name) {}
}
