package com.mems.time;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SchoolClockTest {

    private static final String VN_ZONE = "Asia/Ho_Chi_Minh";

    private final SchoolClock clock = new SchoolClock(VN_ZONE);

    @Test
    @DisplayName("TC-TZ-001: 07:30 ngày 2026-12-01 quy đổi đúng +07:00 (00:30Z)")
    void toInstant_dungMuiGioVietNam() {
        Instant actual = clock.toInstant(LocalDate.of(2026, 12, 1), LocalTime.of(7, 30));

        assertThat(actual).isEqualTo(Instant.parse("2026-12-01T00:30:00Z"));
    }

    @Test
    @DisplayName("TC-TZ-002: 00:30Z quy về đúng 07:30 ngày 01/12/2026 giờ Việt Nam")
    void toLocalDateTime_dungMuiGioVietNam() {
        Instant instant = Instant.parse("2026-12-01T00:30:00Z");

        assertThat(clock.toLocalDate(instant)).isEqualTo(LocalDate.of(2026, 12, 1));
        assertThat(clock.toLocalTime(instant)).isEqualTo(LocalTime.of(7, 30));
    }

    @Test
    @DisplayName("TC-TZ-003: 17:30Z ngày 30/11 là 00:30 ngày 01/12 giờ Việt Nam")
    void toLocalDate_quaNuaDem() {
        Instant instant = Instant.parse("2026-11-30T17:30:00Z");

        assertThat(clock.toLocalDate(instant)).isEqualTo(LocalDate.of(2026, 12, 1));
        assertThat(clock.toLocalTime(instant)).isEqualTo(LocalTime.of(0, 30));
    }

    @Test
    @DisplayName("TC-TZ-004: 8 tuần liên tiếp có đúng 8 ngày Thứ 2")
    void datesOfWeekday_tamTuanThuHai() {
        List<LocalDate> mondays = clock.datesOfWeekday(
            LocalDate.of(2026, 11, 23), LocalDate.of(2027, 1, 17), 1);

        assertThat(mondays).hasSize(8);
        assertThat(mondays.get(0)).isEqualTo(LocalDate.of(2026, 11, 23));
        assertThat(mondays.get(7)).isEqualTo(LocalDate.of(2027, 1, 11));
    }

    @Test
    @DisplayName("TC-TZ-005: datesOfWeekday bao gồm cả hai đầu khoảng")
    void datesOfWeekday_baoGomHaiDau() {
        List<LocalDate> mondays = clock.datesOfWeekday(
            LocalDate.of(2026, 11, 23), LocalDate.of(2026, 11, 30), 1);

        assertThat(mondays).containsExactly(LocalDate.of(2026, 11, 23), LocalDate.of(2026, 11, 30));
    }

    @Test
    @DisplayName("TC-TZ-006: khoảng không có ngày thứ 2 trả về danh sách rỗng")
    void datesOfWeekday_khongCoNgayPhuHop() {
        List<LocalDate> mondays = clock.datesOfWeekday(
            LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 5), 1);

        assertThat(mondays).isEmpty();
    }

    @Test
    @DisplayName("TC-TZ-007: weekday ngoài 1..7 báo lỗi")
    void datesOfWeekday_weekdayKhongHopLe() {
        assertThatThrownBy(() -> clock.datesOfWeekday(
            LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 31), 8))
            .isInstanceOf(java.time.DateTimeException.class);
    }
}