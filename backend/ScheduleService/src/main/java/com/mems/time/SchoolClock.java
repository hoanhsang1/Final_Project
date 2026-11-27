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

/** Quy đổi giờ địa phương ↔ Instant theo múi giờ nghiệp vụ (mặc định Việt Nam). */
@Component
public class SchoolClock {
    private final ZoneId zone;

    public SchoolClock(@Value("${app.timezone:Asia/Ho_Chi_Minh}") String zoneId) {
        this.zone = ZoneId.of(zoneId);
    }

    public Instant toInstant(LocalDate date, LocalTime time) {
        return date.atTime(time).atZone(zone).toInstant();
    }

    public LocalDate toLocalDate(Instant instant) {
        return instant.atZone(zone).toLocalDate();
    }

    /** Các ngày thứ {@code weekday} (1=Thứ 2 … 7=Chủ nhật) trong [from, to]. */
    public List<LocalDate> datesOfWeekday(LocalDate from, LocalDate to, int weekday) {
        List<LocalDate> dates = new ArrayList<>();
        LocalDate current = from.with(TemporalAdjusters.nextOrSame(DayOfWeek.of(weekday)));
        while (!current.isAfter(to)) {
            dates.add(current);
            current = current.plusWeeks(1);
        }
        return dates;
    }
}
