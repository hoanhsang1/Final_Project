package com.mems.dto;

import jakarta.validation.constraints.Size;

/** Quyết định một bước duyệt chuyển phòng; ghi chú tuỳ chọn. */
public record TransferDecisionRequest(
    @Size(max = 1000, message = "NOTE_TOO_LONG")
    String note
) {}
