package com.mems.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CurriculumSubjectRequest(
    @NotBlank(message = "SUBJECT_ID_REQUIRED") String subjectId,
    @NotNull @Min(1) int sequenceNo,
    @NotNull @Min(1) int requiredSessions,
    @NotNull @Min(1) int sessionMinutes,
    @Min(1) Integer sessionsPerWeek,
    Double theoryHours,
    Double practiceHours,
    Boolean isRequired,
    @jakarta.validation.constraints.Size(max = 500) String notes,
    List<String> prerequisiteSubjectIds
) {}
