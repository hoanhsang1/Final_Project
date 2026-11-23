package com.mems.dto;

import java.util.List;

public record ClassSubjectListResponse(
    String classId,
    String curriculumId,
    List<ClassSubjectResponse> subjects
) {}
