package com.mems.time;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

/**
 * Quy đổi giữa giờ địa phương và Instant theo múi giờ nghiệp vụ.
 *
 * Giờ người dùng nhập (LocalDate + LocalTime) luôn hiểu là giờ của {@code app.timezone}
 * (mặc định Asia/Ho_Chi_Minh), không phải UTC. Đây là điểm quy đổi duy nhất để tránh
 * lệch múi giờ giữa lúc ghi và lúc hiển thị.
 */
@Component
public class SchoolClock {

    private final ZoneId zone;

    public SchoolClock(@Value("${app.timezone:Asia/Ho_Chi_Minh}") String zoneId) {
        this.zone = ZoneId.of(zoneId);
    }

    /** Giờ địa phương (ngày + giờ) -> Instant. */
    public Instant toInstant(LocalDate date, LocalTime time) {
        return date.atTime(time).atZone(zone).toInstant();
    }

    /** Instant -> ngày theo múi giờ nghiệp vụ. */
    public LocalDate toLocalDate(Instant instant) {
        return instant.atZone(zone).toLocalDate();
    }

    /** Instant -> giờ theo múi giờ nghiệp vụ. */
    public LocalTime toLocalTime(Instant instant) {
        return instant.atZone(zone).toLocalTime();
    }

    /**
     * Danh sách ngày có thứ {@code weekday} trong khoảng [from, to] (bao gồm hai đầu).
     * weekday: 1 = Thứ 2 … 7 = Chủ nhật.
     */
    public List<LocalDate> datesOfWeekday(LocalDate from, LocalDate to, int weekday) {
        DayOfWeek day = DayOfWeek.of(weekday);
        List<LocalDate> dates = new ArrayList<>();
        LocalDate current = from.with(TemporalAdjusters.nextOrSame(day));
        while (!current.isAfter(to)) {
            dates.add(current);
            current = current.plusWeeks(1);
        }
        return dates;
    }
}