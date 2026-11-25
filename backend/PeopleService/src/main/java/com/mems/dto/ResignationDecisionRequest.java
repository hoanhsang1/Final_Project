package com.mems.dto;

import jakarta.validation.constraints.Size;

public record ResignationDecisionRequest(
    @Size(max = 1000, message = "NOTE_TOO_LONG") String note
) {}
