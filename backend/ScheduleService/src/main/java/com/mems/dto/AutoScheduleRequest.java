package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Yêu cầu xếp lịch tự động cho một hoặc nhiều lớp trong một khoảng thời gian.
 *
 * @param classIds     Danh sách id lớp cần xếp lịch.
 * @param dateFrom     Ngày bắt đầu (inclusive).
 * @param dateTo       Ngày kết thúc (inclusive).
 * @param slots        Các khung giờ trong ngày (mỗi slot: startTime, endTime theo HH:mm).
 * @param sessionDays  Các thứ trong tuần được phép xếp (1=Thứ 2, ..., 7=Chủ nhật). Null = tất cả.
 */
public record AutoScheduleRequest(
    @NotEmpty List<@NotBlank String> classIds,
    @NotNull LocalDate dateFrom,
    @NotNull LocalDate dateTo,
    @NotEmpty List<TimeSlot> slots,
    List<Integer> sessionDays
) {
    public record TimeSlot(@NotNull LocalTime startTime, @NotNull LocalTime endTime) {}
}
