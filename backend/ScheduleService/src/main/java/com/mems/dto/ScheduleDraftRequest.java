package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/**
 * Tạo lịch nháp cho nhiều lớp trong một khoảng ngày.
 * Khung giờ lấy từ cấu hình tiết của tổ chức, không nhận từ request.
 */
public record ScheduleDraftRequest(
    @NotEmpty List<@NotBlank String> classIds,
    @NotNull LocalDate dateFrom,
    @NotNull LocalDate dateTo,
    List<Integer> sessionDays
) {}
