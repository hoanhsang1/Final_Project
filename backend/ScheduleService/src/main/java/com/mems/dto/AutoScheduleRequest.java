package com.mems.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Yêu cầu xếp lịch tự động cho một hoặc nhiều lớp. */
public record AutoScheduleRequest(
    @NotEmpty List<@NotBlank String> classIds,
    @NotNull LocalDate dateFrom,
    @NotNull LocalDate dateTo,
    @NotEmpty List<TimeSlot> slots,
    List<Integer> sessionDays,
    /** Chỉ gửi khi chọn nguồn "Nhập tay": override số buổi/tuần của môn. */
    Integer sessionsPerWeek,
    /** Chỉ gửi khi chọn nguồn "Nhập tay": override số phút/buổi của môn. */
    Integer sessionMinutes
) {
    /** Khung giờ trong ngày; thời lượng phải là bội của 45 phút. */
    public record TimeSlot(@NotNull LocalTime startTime, @NotNull LocalTime endTime) {}
}
