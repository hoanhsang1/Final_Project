package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Tập ngoại lệ môn học (APPROVED/MANUAL) của một giáo viên. */
public record TeacherSubjectUpdateRequest(
    @NotNull(message = "SUBJECT_IDS_REQUIRED")
    @Size(max = 100, message = "SUBJECT_IDS_TOO_MANY")
    List<@NotBlank(message = "SUBJECT_ID_REQUIRED")
        @Size(max = 36, message = "SUBJECT_ID_TOO_LONG") String> subjectIds) {}
