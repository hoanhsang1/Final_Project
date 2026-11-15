package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record IssueReportRequest(@NotBlank String equipmentId,
                                 @NotBlank @Size(max = 2000) String description,
                                 @Size(max = 500) String photoUrl) {}
