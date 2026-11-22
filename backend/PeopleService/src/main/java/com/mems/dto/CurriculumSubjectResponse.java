package com.mems.dto;

import java.util.List;

public record CurriculumSubjectResponse(
    String curriculumId,
    String subjectId,
    String subjectCode,
    String subjectName,
    int sequenceNo,
    int requiredSessions,
    int sessionMinutes,
    Double theoryHours,
    Double practiceHours,
    boolean isRequired,
    String notes,
    List<String> prerequisiteSubjectIds
) {}
