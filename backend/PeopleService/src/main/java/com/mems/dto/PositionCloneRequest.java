package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Nhân bản chức danh sang phòng ban khác. {@code name} trống = "<tên gốc> (bản sao)". */
public record PositionCloneRequest(
    @Size(max = 200, message = "NAME_TOO_LONG") String name,
    @NotBlank(message = "DEPARTMENT_REQUIRED") String departmentId
) {}
