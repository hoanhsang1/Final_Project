package com.mems.dto;
import jakarta.validation.constraints.*;
import java.util.Set;
public record MemberPositionsRequest(
    @NotNull(message = "POSITION_IDS_REQUIRED")
    @Size(max = 50, message = "POSITION_IDS_TOO_MANY")
    Set<@NotBlank(message = "POSITION_ID_REQUIRED") String> positionIds) {}
